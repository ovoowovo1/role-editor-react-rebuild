use std::collections::HashMap;
use crate::numeric::{
    bbox_clip, bbox_intersects, BBox, BinaryMaskIndex, ErrorField, TargetMomentIndex, TileSpatialIndex,
    ALPHA_MSE_WEIGHT,
};
use crate::rng::{clamp_f64, clamp_i32, SeededRandom};
use crate::variant_cache::{variant_geometry, MipmapSource, TransformedImage, VariantCache};

#[cfg(target_feature = "simd128")]
use core::arch::wasm32::*;

const INV_255: f32 = 1.0 / 255.0;
const DISCRETE_ROTATIONS: [f64; 14] = [0.0, 15.0, -15.0, 30.0, -30.0, 45.0, -45.0, 60.0, -60.0, 90.0, -90.0, 135.0, -135.0, 180.0];

#[derive(Clone, Copy)]
pub struct EngineSettings {
    pub tile_budget: i32,
    pub candidate_batch: i32,
    pub replace_candidate_batch: i32,
    pub color_topk: i32,
    pub color_sigma: f64,
    pub exploration: f64,
    pub tile_penalty_mse: f64,
    pub gradient_local_radius: i32,
    pub gradient_pixel_mix: f64,
    pub gradient_std_sigma: f64,
    pub gradient_std_weight: f64,
    pub gradient_complexity_threshold: f64,
    pub gradient_original_max_px: f64,
    pub min_rendered_px: f64,
    pub max_rendered_px: f64,
    pub rotation_prob: f64,
    pub flip_prob: f64,
    pub remove_every: i32,
    pub replace_every: i32,
    pub prune_rounds: i32,
    pub prune_sample_size: i32,
    pub prune_penalty_factor: f64,
    pub replace_min_gain_mse: f64,
    pub full_error_recompute_every: i32,
    pub variant_cache_items: usize,
    pub error_cell_size: i32,
    pub role_export_max_side: f64,
}

pub struct SourceEntry {
    pub idx: usize,
    pub thumb_w: i32,
    pub thumb_h: i32,
    pub orig_w: i32,
    pub orig_h: i32,
    pub s_factor: f64,
    pub mean_rgb: [f64; 3],
    pub std_rgb: [f64; 3],
    pub alpha_ratio: f64,
    pub mipmap: MipmapSource,
}

#[derive(Clone, Copy, Default)]
struct MemStat {
    trials: i32,
    accepted: i32,
    gain_sum: f64,
    ema_gain: f64,
}

pub struct ExperienceMemory {
    source_stats: Vec<MemStat>,
    color_stats: HashMap<u64, MemStat>,
}

impl ExperienceMemory {
    pub fn new(n_sources: usize) -> Self {
        Self {
            source_stats: vec![MemStat::default(); n_sources],
            color_stats: HashMap::new(),
        }
    }

    #[inline]
    fn color_bin(color: [f64; 3]) -> u32 {
        let r = clamp_i32((clamp_f64(color[0], 0.0, 255.0) / 16.0).floor() as i32, 0, 15) as u32;
        let g = clamp_i32((clamp_f64(color[1], 0.0, 255.0) / 16.0).floor() as i32, 0, 15) as u32;
        let b = clamp_i32((clamp_f64(color[2], 0.0, 255.0) / 16.0).floor() as i32, 0, 15) as u32;
        (r << 8) | (g << 4) | b
    }

    #[inline]
    fn stat_bonus(stat: MemStat) -> f64 {
        if stat.trials <= 0 {
            return 1.0;
        }
        let trials = (stat.trials as f64).max(1.0);
        let accept_rate = (stat.accepted as f64).max(0.0) / trials;
        let avg_gain = stat.gain_sum / trials;
        let gain_bonus = (clamp_f64(avg_gain + stat.ema_gain, -0.01, 0.01) * 150.0).tanh();
        clamp_f64(1.0 + 0.55 * accept_rate + 0.65 * gain_bonus, 0.35, 2.75)
    }

    #[inline]
    pub fn source_multiplier_for_bin(&self, source_idx: usize, bin: u32) -> f64 {
        let g = Self::stat_bonus(self.source_stats[source_idx]);
        let key = ((source_idx as u64) << 16) | (bin as u64);
        let c = self
            .color_stats
            .get(&key)
            .copied()
            .map(Self::stat_bonus)
            .unwrap_or(1.0);
        g * c
    }

    pub fn note_trial(&mut self, source_idx: usize, color: [f64; 3], accepted: bool, gain_mse: f64) {
        let s = &mut self.source_stats[source_idx];
        s.trials += 1;
        if accepted {
            s.accepted += 1;
        }
        s.gain_sum += gain_mse;
        s.ema_gain = s.ema_gain * 0.92 + gain_mse * 0.08;

        let bin = Self::color_bin(color);
        let key = ((source_idx as u64) << 16) | (bin as u64);
        let c = self.color_stats.entry(key).or_default();
        c.trials += 1;
        if accepted {
            c.accepted += 1;
        }
        c.gain_sum += gain_mse;
        c.ema_gain = c.ema_gain * 0.9 + gain_mse * 0.1;
    }
}

pub struct Candidate {
    pub source_id: usize,
    pub sx_internal: f64,
    pub sy_internal: f64,
    pub r_deg: f64,
    pub center_x: f64,
    pub center_y: f64,
    pub rgba: TransformedImage,
    pub bbox: BBox,
    pub sse_before: f64,
    pub sse_after: f64,
    pub global_gain_mse: f64,
    pub score: f64,
}

pub struct TileRecord {
    pub active: bool,
    pub source_id: usize,
    pub sx_internal: f64,
    pub sy_internal: f64,
    pub r_deg: f64,
    pub bbox: BBox,
    pub center_x: f64,
    pub center_y: f64,
    pub gain_mse: f64,
}

#[derive(Default)]
pub struct DiagCounters {
    pub candidates_proposed: u64,
    pub candidates_evaluated: u64,
    pub candidate_pixels_evaluated: u64,
    pub containment_fast_accepted: u64,
    pub containment_fallbacks: u64,
    pub containment_rejected: u64,
    pub candidate_upper_bound_rejected: u64,
    pub candidate_after_sse_early_rejected: u64,
}

pub struct CollageEngine {
    pub width: i32,
    pub height: i32,
    pub settings: EngineSettings,
    pub sources: Vec<SourceEntry>,
    pub target_straight: Vec<u8>,
    pub target_premult: Vec<f32>,
    pub mask: Vec<u8>,
    pub focus_mask: Vec<u8>,
    pub placement_mask: Vec<u8>,
    pub canvas: Vec<f32>,
    pub rng: SeededRandom,
    pub cache: VariantCache,
    pub memory: ExperienceMemory,
    pub mask_index: BinaryMaskIndex,
    pub placement_index: BinaryMaskIndex,
    pub target_moments: TargetMomentIndex,
    pub errors: Option<ErrorField>,
    pub spatial_index: TileSpatialIndex,
    pub tiles: Vec<TileRecord>,
    pub global_den: f64,
    pub active_tile_count: u32,
    pub accepted: u32,
    pub rejected: u32,
    pub pruned: u32,
    pub replaced: u32,
    pub diag: DiagCounters,
    score_scratch: Vec<f64>,
    source_id_scratch: Vec<usize>,
    cum_scratch: Vec<f64>,
    patch_scratch: Vec<f32>,
    spatial_query_scratch: Vec<usize>,
    active_indices_scratch: Vec<usize>,
}

#[inline]
fn round_digits(val: f64, digits: i32) -> f64 {
    let factor = 10.0f64.powi(digits);
    (val * factor).round() / factor
}

#[inline]
#[cfg(target_feature = "simd128")]
unsafe fn hsum_f32x4(v: v128) -> f32 {
    let shuf = i32x4_shuffle::<2, 3, 0, 1>(v, v);
    let sum1 = f32x4_add(v, shuf);
    let shuf2 = i32x4_shuffle::<1, 0, 3, 2>(sum1, sum1);
    let sum2 = f32x4_add(sum1, shuf2);
    f32x4_extract_lane::<0>(sum2)
}

impl CollageEngine {
    pub fn new(
        width: i32,
        height: i32,
        seed: u32,
        settings: EngineSettings,
        target_straight: Vec<u8>,
        mask: Vec<u8>,
        placement_mask: Vec<u8>,
    ) -> Self {
        let n_pixels = (width * height) as usize;
        let mut target_premult = vec![0.0f32; n_pixels * 4];
        let mut mask_count = 0usize;
        let mut focus_mask = vec![0u8; n_pixels];

        for p in 0..n_pixels {
            let o = p * 4;
            let a = target_straight[o + 3] as f32;
            let af = a * INV_255;
            target_premult[o] = (target_straight[o] as f32) * af;
            target_premult[o + 1] = (target_straight[o + 1] as f32) * af;
            target_premult[o + 2] = (target_straight[o + 2] as f32) * af;
            target_premult[o + 3] = a;
            if mask[p] != 0 {
                mask_count += 1;
                if placement_mask[p] != 0 {
                    focus_mask[p] = 1;
                }
            }
        }

        let global_den = (mask_count.max(1) as f64) * (3.0 + ALPHA_MSE_WEIGHT as f64);
        let mask_index = BinaryMaskIndex::new(&mask, width, height);
        let placement_index = BinaryMaskIndex::new(&placement_mask, width, height);
        let target_moments = TargetMomentIndex::new(&target_straight, &mask, width, height);

        Self {
            width,
            height,
            settings,
            sources: Vec::new(),
            target_straight,
            target_premult,
            mask,
            focus_mask,
            placement_mask,
            canvas: vec![0.0f32; n_pixels * 4],
            rng: SeededRandom::new(seed),
            cache: VariantCache::new(settings.variant_cache_items),
            memory: ExperienceMemory::new(0),
            mask_index,
            placement_index,
            target_moments,
            errors: None,
            spatial_index: TileSpatialIndex::new(settings.error_cell_size * 2),
            tiles: Vec::new(),
            global_den,
            active_tile_count: 0,
            accepted: 0,
            rejected: 0,
            pruned: 0,
            replaced: 0,
            diag: DiagCounters::default(),
            score_scratch: Vec::new(),
            source_id_scratch: Vec::new(),
            cum_scratch: Vec::new(),
            patch_scratch: Vec::new(),
            spatial_query_scratch: Vec::new(),
            active_indices_scratch: Vec::new(),
        }
    }

    pub fn add_source(
        &mut self,
        thumb_w: i32,
        thumb_h: i32,
        orig_w: i32,
        orig_h: i32,
        s_factor: f64,
        mean_rgb: [f64; 3],
        std_rgb: [f64; 3],
        alpha_ratio: f64,
        straight_rgba: &[u8],
    ) {
        let idx = self.sources.len();
        let mipmap = MipmapSource::from_straight_rgba(straight_rgba, thumb_w, thumb_h);
        self.sources.push(SourceEntry {
            idx,
            thumb_w,
            thumb_h,
            orig_w,
            orig_h,
            s_factor,
            mean_rgb,
            std_rgb,
            alpha_ratio,
            mipmap,
        });
    }

    pub fn finalize_init(&mut self) {
        let n = self.sources.len();
        self.memory = ExperienceMemory::new(n);
        self.score_scratch.resize(n, 0.0);
        self.cum_scratch.resize(n, 0.0);
        self.errors = Some(ErrorField::new(
            &self.canvas,
            &self.target_premult,
            &self.target_straight,
            &self.mask,
            &self.focus_mask,
            self.width,
            self.height,
            self.settings.error_cell_size,
        ));
    }

    #[inline]
    pub fn current_mse(&self) -> f64 {
        let total = self.errors.as_ref().map(|e| e.total_sse).unwrap_or(0.0);
        total / self.global_den.max(1.0)
    }

    pub fn recompute_errors(&mut self) {
        if let Some(ref mut err) = self.errors {
            err.recompute_all(&self.canvas, &self.target_premult, &self.focus_mask);
        }
    }

    fn local_target_stats(&self, x: i32, y: i32, radius: i32) -> ([f64; 3], [f64; 3], f64) {
        if let Some(stats) = self.target_moments.stats(x, y, radius) {
            return stats;
        }
        let cx = clamp_i32(x, 0, self.width - 1) as usize;
        let cy = clamp_i32(y, 0, self.height - 1) as usize;
        let o = (cy * self.width as usize + cx) * 4;
        (
            [
                self.target_straight[o] as f64,
                self.target_straight[o + 1] as f64,
                self.target_straight[o + 2] as f64,
            ],
            [0.0, 0.0, 0.0],
            0.0,
        )
    }

    fn focus_gradient_color(&self, fx: i32, fy: i32) -> ([f64; 3], [f64; 3], f64) {
        let (mean, std, complexity) = self.local_target_stats(fx, fy, self.settings.gradient_local_radius);
        let cx = clamp_i32(fx, 0, self.width - 1) as usize;
        let cy = clamp_i32(fy, 0, self.height - 1) as usize;
        let o = (cy * self.width as usize + cx) * 4;
        let mix = clamp_f64(self.settings.gradient_pixel_mix, 0.0, 1.0);
        let inv_mix = 1.0 - mix;
        let color = [
            (self.target_straight[o] as f64) * mix + mean[0] * inv_mix,
            (self.target_straight[o + 1] as f64) * mix + mean[1] * inv_mix,
            (self.target_straight[o + 2] as f64) * mix + mean[2] * inv_mix,
        ];
        (color, std, complexity)
    }

    fn choose_source_ids(
        &mut self,
        target_color: [f64; 3],
        target_std: [f64; 3],
        topk_override: Option<i32>,
        exploration_override: Option<f64>,
    ) {
        let n = self.sources.len();
        self.source_id_scratch.clear();
        if n == 0 {
            return;
        }

        let sigma_den = (2.0 * self.settings.color_sigma * self.settings.color_sigma).max(1.0);
        let std_den = (2.0 * self.settings.gradient_std_sigma * self.settings.gradient_std_sigma).max(1.0);
        let complexity = (target_std[0] * target_std[0] + target_std[1] * target_std[1] + target_std[2] * target_std[2]).sqrt();
        let mix = clamp_f64(complexity / (self.settings.gradient_complexity_threshold * 3.0).max(1.0), 0.0, 1.0);
        let std_weight = clamp_f64(self.settings.gradient_std_weight * mix, 0.0, 1.0);
        let bin = ExperienceMemory::color_bin(target_color);

        for i in 0..n {
            let s = &self.sources[i];
            let dr = s.mean_rgb[0] - target_color[0];
            let dg = s.mean_rgb[1] - target_color[1];
            let db = s.mean_rgb[2] - target_color[2];
            let mut base = (-(dr * dr + dg * dg + db * db) / sigma_den).exp();
            if std_weight > 0.0 {
                let sr = s.std_rgb[0] - target_std[0];
                let sg = s.std_rgb[1] - target_std[1];
                let sb = s.std_rgb[2] - target_std[2];
                let std_score = (-(sr * sr + sg * sg + sb * sb) / std_den).exp();
                base *= (1.0 - std_weight) + std_weight * std_score;
            }
            let alpha_bonus = 0.7 + 0.6 * (s.alpha_ratio * 2.0).min(1.0);
            let mem_bonus = self.memory.source_multiplier_for_bin(i, bin);
            self.score_scratch[i] = (base * alpha_bonus * mem_bonus).max(1.0e-9);
        }

        let topk = clamp_i32(topk_override.unwrap_or(self.settings.color_topk), 1, n as i32) as usize;
        let exploration = exploration_override.unwrap_or(self.settings.exploration);

        if self.rng.next_f64() < exploration {
            for i in 0..n {
                self.source_id_scratch.push(i);
            }
            self.rng.shuffle_usize(&mut self.source_id_scratch);
            self.source_id_scratch.truncate(topk);
            return;
        }

        for index in 0..n {
            let s_idx = self.score_scratch[index];
            if self.source_id_scratch.len() == topk {
                let last = *self.source_id_scratch.last().unwrap();
                if s_idx <= self.score_scratch[last] {
                    continue;
                }
            }
            let mut insert_at = self.source_id_scratch.len();
            while insert_at > 0 {
                let prev = self.source_id_scratch[insert_at - 1];
                let delta = s_idx - self.score_scratch[prev];
                if delta < 0.0 || (delta == 0.0 && index > prev) {
                    break;
                }
                insert_at -= 1;
            }
            if insert_at >= topk {
                continue;
            }
            if self.source_id_scratch.len() < topk {
                self.source_id_scratch.push(index);
            }
            let end = self.source_id_scratch.len() - 1;
            for move_i in ((insert_at + 1)..=end).rev() {
                self.source_id_scratch[move_i] = self.source_id_scratch[move_i - 1];
            }
            self.source_id_scratch[insert_at] = index;
        }
    }

    fn fill_cumulative_scores(&mut self) {
        let mut total = 0.0f64;
        for (i, &id) in self.source_id_scratch.iter().enumerate() {
            total += self.score_scratch[id].max(1.0e-12);
            self.cum_scratch[i] = total;
        }
    }

    #[inline]
    fn role_export_scale(&self) -> f64 {
        let max_side = (self.width.max(self.height).max(1)) as f64;
        (self.settings.role_export_max_side / max_side).min(1.0)
    }

    #[inline]
    fn auto_max_rendered_px(&self) -> f64 {
        let m = self.width.min(self.height) as f64;
        (m * 0.18).round().clamp(32.0, 160.0)
    }

    fn propose_candidate(
        &mut self,
        source_id: usize,
        mut cx: i32,
        mut cy: i32,
        progress: f64,
        desired_px: Option<f64>,
        max_rendered_px: f64,
        rot_prob: f64,
        flip_prob: f64,
        jitter_px: f64,
        incumbent_score: f64,
        check_upper_bound: bool,
    ) -> Option<Candidate> {
        self.diag.candidates_proposed += 1;
        let max_px = if max_rendered_px > 0.0 {
            max_rendered_px
        } else {
            self.auto_max_rendered_px()
        };
        let min_px = self.settings.min_rendered_px.round().max(2.0);
        let mut size_px = if let Some(dpx) = desired_px {
            dpx * self.rng.normal(0.0, 0.22).exp()
        } else {
            let min_dim = (self.width.min(self.height).max(1)) as f64;
            let early = (min_dim * 0.13).max(18.0).min(max_px);
            let late = (min_dim * 0.035).min(24.0).max(min_px);
            let base = early * (1.0 - progress).powf(0.75) + late * progress.powf(0.75);
            base * self.rng.normal(0.0, 0.5).exp()
        };
        size_px = clamp_f64(size_px, min_px, max_px);

        let src = &self.sources[source_id];
        let max_orig = (src.orig_w.max(src.orig_h).max(1)) as f64;
        let final_scale = clamp_f64(size_px / max_orig, min_px / max_orig, 2.0);
        let sx_sign = if self.rng.next_f64() < flip_prob { -1.0 } else { 1.0 };
        let sy_sign = if self.rng.next_f64() < flip_prob { -1.0 } else { 1.0 };
        let aspect_jitter = self.rng.normal(0.0, 0.06).exp();
        let mut sx_internal = (sx_sign * final_scale) / src.s_factor;
        let mut sy_internal = (sy_sign * final_scale * aspect_jitter) / src.s_factor;

        let mut r_deg = 0.0;
        let mut cache_variant = true;
        if self.rng.next_f64() < rot_prob && size_px >= (self.settings.min_rendered_px * 2.0).max(8.0) {
            if self.rng.next_f64() < 0.65 {
                let idx = self.rng.integer(0, DISCRETE_ROTATIONS.len() as i32) as usize;
                r_deg = DISCRETE_ROTATIONS[idx];
            } else {
                r_deg = self.rng.uniform(-180.0, 180.0);
                cache_variant = false;
            }
        }

        let role_scale = self.role_export_scale();
        let scale_den = (src.s_factor * role_scale).max(1.0e-12);
        sx_internal = round_digits(sx_internal * src.s_factor * role_scale, 4) / scale_den;
        sy_internal = round_digits(sy_internal * src.s_factor * role_scale, 4) / scale_den;
        r_deg = round_digits(r_deg, 3);
        if sx_internal == 0.0 || sy_internal == 0.0 {
            return None;
        }

        if jitter_px > 0.0 {
            cx = ((cx as f64) + self.rng.normal(0.0, jitter_px)).round() as i32;
            cy = ((cy as f64) + self.rng.normal(0.0, jitter_px)).round() as i32;
        }
        cx = clamp_i32(cx, 0, (self.width - 1).max(0));
        cy = clamp_i32(cy, 0, (self.height - 1).max(0));

        let geom = variant_geometry(src.thumb_w, src.thumb_h, sx_internal, sy_internal, r_deg);
        if (geom.width as f64) > (self.width as f64) * 1.5 || (geom.height as f64) > (self.height as f64) * 1.5 {
            return None;
        }

        let left = ((cx as f64) - (geom.width as f64) * 0.5).round() as i32;
        let top = ((cy as f64) - (geom.height as f64) * 0.5).round() as i32;
        let bbox = [left, top, left + geom.width, top + geom.height];

        if check_upper_bound {
            if let Some(ref err) = self.errors {
                let upper = err.focus_sse_upper_bound(bbox) / self.global_den.max(1.0) - self.settings.tile_penalty_mse;
                if upper <= incumbent_score {
                    return None;
                }
            }
        }

        let rgba = self.cache.get_or_render(
            source_id,
            &src.mipmap,
            src.thumb_w,
            src.thumb_h,
            sx_internal,
            sy_internal,
            r_deg,
            cache_variant,
        );

        Some(Candidate {
            source_id,
            sx_internal,
            sy_internal,
            r_deg,
            center_x: (left as f64) + (geom.width as f64) * 0.5,
            center_y: (top as f64) + (geom.height as f64) * 0.5,
            rgba,
            bbox,
            sse_before: 0.0,
            sse_after: 0.0,
            global_gain_mse: -1.0e30,
            score: -1.0e30,
        })
    }

    /// Returns 0 = invalid, 1 = fast, 2 = scan
    fn containment_mode(&self, rgba: &TransformedImage, bbox: BBox) -> u8 {
        if rgba.alpha_sum <= 0 {
            return 0;
        }
        let [left, top, _, _] = bbox;
        let [al, at, ar, ab] = rgba.alpha_bounds;
        if ar <= al || ab <= at {
            return 0;
        }
        let vl = left + al;
        let vt = top + at;
        let vr = left + ar;
        let vb = top + ab;
        if vl < 0 || vt < 0 || vr > self.width || vb > self.height {
            return 0;
        }
        let area = (vr - vl) * (vb - vt);
        if self.placement_index.count([vl, vt, vr, vb]) == area {
            1
        } else {
            2
        }
    }

    fn evaluate_candidate_core(&mut self, cand: &mut Candidate, incumbent_score: f64) -> bool {
        self.diag.candidates_evaluated += 1;
        let [left, top, right, bottom] = cand.bbox;
        if cand.rgba.width != right - left || cand.rgba.height != bottom - top || cand.rgba.alpha_sum <= 0 {
            return false;
        }

        let mode = self.containment_mode(&cand.rgba, cand.bbox);
        if mode == 0 {
            self.diag.containment_rejected += 1;
            return false;
        }
        if mode == 1 {
            self.diag.containment_fast_accepted += 1;
        } else {
            self.diag.containment_fallbacks += 1;
        }

        let [al, at, ar, ab] = cand.rgba.alpha_bounds;
        let vis = [left + al, top + at, left + ar, top + ab];
        if self.mask_index.count(vis) <= 0 {
            return false;
        }

        let mut before_sse = 0.0f64;
        let wu = self.width as usize;
        let rw = cand.rgba.width as usize;
        let rh = cand.rgba.height as usize;

        for ly in 0..rh {
            let start = cand.rgba.alpha_row_start[ly];
            let end = cand.rgba.alpha_row_end[ly];
            if end <= start {
                continue;
            }
            let y = (top + ly as i32) as usize;
            let mut src_off = (ly * rw + start as usize) * 4;
            let mut pixel = y * wu + (left + start) as usize;
            for _lx in start..end {
                let alpha_byte = cand.rgba.data[src_off + 3];
                if alpha_byte > 0 {
                    if mode == 2 && self.placement_mask[pixel] == 0 {
                        self.diag.containment_rejected += 1;
                        return false;
                    }
                    if self.mask[pixel] != 0 {
                        self.diag.candidate_pixels_evaluated += 1;
                        let off = pixel * 4;
                        #[cfg(target_feature = "simd128")]
                        unsafe {
                            let c = v128_load(self.canvas.as_ptr().add(off) as *const v128);
                            let t = v128_load(self.target_premult.as_ptr().add(off) as *const v128);
                            let d = f32x4_sub(c, t);
                            let sq = f32x4_mul(d, d);
                            before_sse += hsum_f32x4(sq) as f64;
                        }
                        #[cfg(not(target_feature = "simd128"))]
                        {
                            let dr = self.canvas[off] - self.target_premult[off];
                            let dg = self.canvas[off + 1] - self.target_premult[off + 1];
                            let db = self.canvas[off + 2] - self.target_premult[off + 2];
                            let da = self.canvas[off + 3] - self.target_premult[off + 3];
                            before_sse += (dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da) as f64;
                        }
                    }
                }
                src_off += 4;
                pixel += 1;
            }
        }

        let penalty = self.settings.tile_penalty_mse;
        let den = self.global_den.max(1.0);
        if before_sse / den - penalty <= incumbent_score {
            self.diag.candidate_upper_bound_rejected += 1;
            return false;
        }

        let mut after_sse = 0.0f64;
        let after_limit = if incumbent_score == f64::NEG_INFINITY {
            f64::INFINITY
        } else {
            before_sse - (incumbent_score + penalty) * den
        };

        for ly in 0..rh {
            let start = cand.rgba.alpha_row_start[ly];
            let end = cand.rgba.alpha_row_end[ly];
            if end <= start {
                continue;
            }
            let y = (top + ly as i32) as usize;
            let mut src_off = (ly * rw + start as usize) * 4;
            let mut pixel = y * wu + (left + start) as usize;
            for _lx in start..end {
                let alpha_byte = cand.rgba.data[src_off + 3];
                if alpha_byte > 0 && self.mask[pixel] != 0 {
                    let off = pixel * 4;
                    #[cfg(target_feature = "simd128")]
                    unsafe {
                        let before = v128_load(self.canvas.as_ptr().add(off) as *const v128);
                        let tgt = v128_load(self.target_premult.as_ptr().add(off) as *const v128);
                        let after = if alpha_byte == 255 {
                            f32x4(
                                cand.rgba.data[src_off] as f32,
                                cand.rgba.data[src_off + 1] as f32,
                                cand.rgba.data[src_off + 2] as f32,
                                255.0,
                            )
                        } else {
                            let src_a = (alpha_byte as f32) * INV_255;
                            let inv = 1.0 - src_a;
                            let src_v = f32x4(
                                (cand.rgba.data[src_off] as f32) * src_a,
                                (cand.rgba.data[src_off + 1] as f32) * src_a,
                                (cand.rgba.data[src_off + 2] as f32) * src_a,
                                src_a * 255.0,
                            );
                            f32x4_add(src_v, f32x4_mul(before, f32x4_splat(inv)))
                        };
                        let d = f32x4_sub(after, tgt);
                        let sq = f32x4_mul(d, d);
                        after_sse += hsum_f32x4(sq) as f64;
                    }
                    #[cfg(not(target_feature = "simd128"))]
                    {
                        let (ar_v, ag_v, ab_v, aa_v) = if alpha_byte == 255 {
                            (
                                cand.rgba.data[src_off] as f32,
                                cand.rgba.data[src_off + 1] as f32,
                                cand.rgba.data[src_off + 2] as f32,
                                255.0f32,
                            )
                        } else {
                            let src_a = (alpha_byte as f32) * INV_255;
                            let inv = 1.0 - src_a;
                            (
                                (cand.rgba.data[src_off] as f32) * src_a + self.canvas[off] * inv,
                                (cand.rgba.data[src_off + 1] as f32) * src_a + self.canvas[off + 1] * inv,
                                (cand.rgba.data[src_off + 2] as f32) * src_a + self.canvas[off + 2] * inv,
                                (src_a + self.canvas[off + 3] * INV_255 * inv) * 255.0,
                            )
                        };
                        let ar = ar_v - self.target_premult[off];
                        let ag = ag_v - self.target_premult[off + 1];
                        let ab = ab_v - self.target_premult[off + 2];
                        let aa = aa_v - self.target_premult[off + 3];
                        after_sse += (ar * ar + ag * ag + ab * ab + ALPHA_MSE_WEIGHT * aa * aa) as f64;
                    }

                    if after_sse >= after_limit && (before_sse - after_sse) / den - penalty <= incumbent_score {
                        self.diag.candidate_after_sse_early_rejected += 1;
                        return false;
                    }
                }
                src_off += 4;
                pixel += 1;
            }
        }

        cand.sse_before = before_sse;
        cand.sse_after = after_sse;
        cand.global_gain_mse = (before_sse - after_sse) / den;
        cand.score = cand.global_gain_mse - penalty;
        true
    }

    fn alpha_over_full(&mut self, bbox: BBox, rgba: &TransformedImage) {
        let [left, top, _, _] = bbox;
        let rw = rgba.width as usize;
        let wu = self.width as usize;
        for ly in 0..(rgba.height as usize) {
            let start = rgba.alpha_row_start[ly];
            let end = rgba.alpha_row_end[ly];
            if end <= start {
                continue;
            }
            let y = (top + ly as i32) as usize;
            let mut src_off = (ly * rw + start as usize) * 4;
            let mut dst_off = (y * wu + (left + start) as usize) * 4;
            for _lx in start..end {
                let alpha_byte = rgba.data[src_off + 3];
                if alpha_byte == 255 {
                    self.canvas[dst_off] = rgba.data[src_off] as f32;
                    self.canvas[dst_off + 1] = rgba.data[src_off + 1] as f32;
                    self.canvas[dst_off + 2] = rgba.data[src_off + 2] as f32;
                    self.canvas[dst_off + 3] = 255.0;
                } else if alpha_byte > 0 {
                    let src_a = (alpha_byte as f32) * INV_255;
                    let inv = 1.0 - src_a;
                    self.canvas[dst_off] = (rgba.data[src_off] as f32) * src_a + self.canvas[dst_off] * inv;
                    self.canvas[dst_off + 1] = (rgba.data[src_off + 1] as f32) * src_a + self.canvas[dst_off + 1] * inv;
                    self.canvas[dst_off + 2] = (rgba.data[src_off + 2] as f32) * src_a + self.canvas[dst_off + 2] * inv;
                    self.canvas[dst_off + 3] = (src_a + self.canvas[dst_off + 3] * INV_255 * inv) * 255.0;
                }
                src_off += 4;
                dst_off += 4;
            }
        }
    }

    pub fn try_add(&mut self, step: i32, total_steps: i32) -> bool {
        if self.settings.tile_budget > 0 && (self.active_tile_count as i32) >= self.settings.tile_budget {
            return false;
        }
        let progress = (step as f64) / (total_steps.max(1) as f64);
        let (fx, fy) = {
            let err = self.errors.as_mut().unwrap();
            err.choose_focus(&mut self.rng)
        };
        let (target_color, target_std, complexity) = self.focus_gradient_color(fx, fy);
        self.choose_source_ids(target_color, target_std, None, None);
        if self.source_id_scratch.is_empty() {
            self.rejected += 1;
            return false;
        }
        self.fill_cumulative_scores();

        let batch = self.settings.candidate_batch.max(1) as usize;
        let jitter = (self.settings.error_cell_size as f64 * 0.35).max(1.0);
        let is_grad = complexity >= self.settings.gradient_complexity_threshold;
        let mut desired_px = None;
        let mut max_rendered_px = self.settings.max_rendered_px;
        if is_grad {
            desired_px = Some(self.settings.min_rendered_px.max(self.settings.gradient_original_max_px));
            let auto_max = if max_rendered_px > 0.0 {
                max_rendered_px
            } else {
                self.auto_max_rendered_px()
            };
            max_rendered_px = auto_max.min(self.settings.gradient_original_max_px);
        }

        let mut best: Option<Candidate> = None;
        let n_src_ids = self.source_id_scratch.len();
        for _ in 0..batch {
            let pick_i = self.rng.weighted_index_from_cumulative(&self.cum_scratch[..n_src_ids]);
            let source_id = self.source_id_scratch[pick_i];
            let incumbent = best.as_ref().map(|b| b.score).unwrap_or(f64::NEG_INFINITY);
            if let Some(mut cand) = self.propose_candidate(
                source_id,
                fx,
                fy,
                progress,
                desired_px,
                max_rendered_px,
                self.settings.rotation_prob,
                self.settings.flip_prob,
                jitter,
                incumbent,
                true,
            ) {
                if self.evaluate_candidate_core(&mut cand, incumbent) {
                    if best.as_ref().map(|b| cand.score > b.score).unwrap_or(true) {
                        best = Some(cand);
                    }
                }
            }
        }

        let Some(best_cand) = best else {
            self.rejected += 1;
            return false;
        };

        let eval_color = self.focus_gradient_color(best_cand.center_x.round() as i32, best_cand.center_y.round() as i32).0;
        if best_cand.score > 0.0 {
            self.alpha_over_full(best_cand.bbox, &best_cand.rgba);
            if let Some(ref mut err) = self.errors {
                err.update_bbox(best_cand.bbox, &self.canvas, &self.target_premult, &self.mask, &self.focus_mask);
            }
            let src_thumb_w = self.sources[best_cand.source_id].thumb_w;
            let src_thumb_h = self.sources[best_cand.source_id].thumb_h;
            let geom = variant_geometry(src_thumb_w, src_thumb_h, best_cand.sx_internal, best_cand.sy_internal, best_cand.r_deg);
            self.cache.insert(best_cand.source_id, geom, best_cand.sx_internal, best_cand.sy_internal, best_cand.rgba);

            let tile_idx = self.tiles.len();
            self.tiles.push(TileRecord {
                active: true,
                source_id: best_cand.source_id,
                sx_internal: best_cand.sx_internal,
                sy_internal: best_cand.sy_internal,
                r_deg: best_cand.r_deg,
                bbox: best_cand.bbox,
                center_x: best_cand.center_x,
                center_y: best_cand.center_y,
                gain_mse: best_cand.global_gain_mse,
            });
            self.spatial_index.update(tile_idx, best_cand.bbox);
            self.active_tile_count += 1;
            self.accepted += 1;
            self.memory.note_trial(best_cand.source_id, eval_color, true, best_cand.global_gain_mse);
            true
        } else {
            self.memory.note_trial(best_cand.source_id, eval_color, false, best_cand.global_gain_mse);
            self.rejected += 1;
            false
        }
    }

    fn masked_sse_full(&self, bbox: BBox) -> f64 {
        let [left, top, right, bottom] = bbox;
        let wu = self.width as usize;
        let mut sse = 0.0f64;
        for y in top..bottom {
            let Some((start, end)) = self.mask_index.row_visible_range(y, left, right) else {
                continue;
            };
            let yu = y as usize;
            for x in start..end {
                let p = yu * wu + x as usize;
                if !self.mask_index.is_set(p) {
                    continue;
                }
                let o = p * 4;
                let dr = self.canvas[o] - self.target_premult[o];
                let dg = self.canvas[o + 1] - self.target_premult[o + 1];
                let db = self.canvas[o + 2] - self.target_premult[o + 2];
                let da = self.canvas[o + 3] - self.target_premult[o + 3];
                sse += (dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da) as f64;
            }
        }
        sse
    }

    fn masked_sse_patch(
        &self,
        patch: &[f32],
        bbox: BBox,
        stop_at: f64,
        before_sse: f64,
        incumbent_gain: f64,
        den: f64,
    ) -> f64 {
        let [left, top, right, bottom] = bbox;
        let pw = (right - left) as usize;
        let wu = self.width as usize;
        let mut sse = 0.0f64;
        for y in top..bottom {
            let Some((start, end)) = self.mask_index.row_visible_range(y, left, right) else {
                continue;
            };
            let yu = y as usize;
            let py = (y - top) as usize;
            for x in start..end {
                let p = yu * wu + x as usize;
                if !self.mask_index.is_set(p) {
                    continue;
                }
                let po = (py * pw + (x - left) as usize) * 4;
                let to = p * 4;
                let dr = patch[po] - self.target_premult[to];
                let dg = patch[po + 1] - self.target_premult[to + 1];
                let db = patch[po + 2] - self.target_premult[to + 2];
                let da = patch[po + 3] - self.target_premult[to + 3];
                sse += (dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da) as f64;
                if sse >= stop_at && (before_sse - sse) / den <= incumbent_gain {
                    return sse;
                }
            }
        }
        sse
    }

    fn alpha_over_patch(
        dst: &mut [f32],
        dst_w: usize,
        src: &TransformedImage,
        src_x: i32,
        src_y: i32,
        dst_x: i32,
        dst_y: i32,
        width: i32,
        height: i32,
    ) {
        let sw = src.width as usize;
        for y in 0..height {
            let sy = (src_y + y) as usize;
            let start = src_x.max(src.alpha_row_start[sy]);
            let end = (src_x + width).min(src.alpha_row_end[sy]);
            if end <= start {
                continue;
            }
            let dy = (dst_y + y) as usize;
            for sx in start..end {
                let so = (sy * sw + sx as usize) * 4;
                let alpha_byte = src.data[so + 3];
                if alpha_byte == 0 {
                    continue;
                }
                let dx = (dst_x + sx - src_x) as usize;
                let doff = (dy * dst_w + dx) * 4;
                if alpha_byte == 255 {
                    dst[doff] = src.data[so] as f32;
                    dst[doff + 1] = src.data[so + 1] as f32;
                    dst[doff + 2] = src.data[so + 2] as f32;
                    dst[doff + 3] = 255.0;
                } else {
                    let src_a = (alpha_byte as f32) * INV_255;
                    let inv = 1.0 - src_a;
                    dst[doff] = (src.data[so] as f32) * src_a + dst[doff] * inv;
                    dst[doff + 1] = (src.data[so + 1] as f32) * src_a + dst[doff + 1] * inv;
                    dst[doff + 2] = (src.data[so + 2] as f32) * src_a + dst[doff + 2] * inv;
                    dst[doff + 3] = (src_a + dst[doff + 3] * INV_255 * inv) * 255.0;
                }
            }
        }
    }

    fn render_patch_from_tiles(
        &mut self,
        bbox: BBox,
        exclude_idx: Option<usize>,
        replace_idx: Option<usize>,
        replacement: Option<&Candidate>,
    ) {
        let [left, top, right, bottom] = bbox;
        let pw = (right - left) as usize;
        let len = pw * ((bottom - top) as usize) * 4;
        if self.patch_scratch.len() < len {
            self.patch_scratch.resize(len, 0.0);
        }
        self.patch_scratch[..len].fill(0.0);

        self.spatial_index.query(bbox, &mut self.spatial_query_scratch);
        if let (Some(r_idx), Some(r_cand)) = (replace_idx, replacement) {
            if bbox_intersects(r_cand.bbox, bbox) && !self.spatial_query_scratch.contains(&r_idx) {
                self.spatial_query_scratch.push(r_idx);
                self.spatial_query_scratch.sort_unstable();
            }
        }

        let n_query = self.spatial_query_scratch.len();
        for qi in 0..n_query {
            let idx = self.spatial_query_scratch[qi];
            if exclude_idx == Some(idx) {
                continue;
            }
            if !self.tiles[idx].active {
                continue;
            }
            let use_rep = replace_idx == Some(idx) && replacement.is_some();
            let tile_box = if use_rep {
                replacement.unwrap().bbox
            } else {
                self.tiles[idx].bbox
            };
            if !bbox_intersects(tile_box, bbox) {
                continue;
            }
            let il = left.max(tile_box[0]);
            let it = top.max(tile_box[1]);
            let ir = right.min(tile_box[2]);
            let ib = bottom.min(tile_box[3]);
            if ir <= il || ib <= it {
                continue;
            }
            if use_rep {
                let r_rgba = &replacement.unwrap().rgba;
                Self::alpha_over_patch(
                    &mut self.patch_scratch[..len],
                    pw,
                    r_rgba,
                    il - tile_box[0],
                    it - tile_box[1],
                    il - left,
                    it - top,
                    ir - il,
                    ib - it,
                );
            } else {
                let t = &self.tiles[idx];
                let s = &self.sources[t.source_id];
                let rgba = self.cache.get_or_render(
                    t.source_id,
                    &s.mipmap,
                    s.thumb_w,
                    s.thumb_h,
                    t.sx_internal,
                    t.sy_internal,
                    t.r_deg,
                    true,
                );
                Self::alpha_over_patch(
                    &mut self.patch_scratch[..len],
                    pw,
                    &rgba,
                    il - tile_box[0],
                    it - tile_box[1],
                    il - left,
                    it - top,
                    ir - il,
                    ib - it,
                );
            }
        }
    }

    fn copy_patch_to_canvas(&mut self, bbox: BBox) {
        let [left, top, right, bottom] = bbox;
        let pw = (right - left) as usize;
        let wu = self.width as usize;
        for y in top..bottom {
            let po = ((y - top) as usize) * pw * 4;
            let co = ((y as usize) * wu + (left as usize)) * 4;
            self.canvas[co..(co + pw * 4)].copy_from_slice(&self.patch_scratch[po..(po + pw * 4)]);
        }
    }

    fn fill_active_indices(&mut self) {
        self.active_indices_scratch.clear();
        for (i, t) in self.tiles.iter().enumerate() {
            if t.active {
                self.active_indices_scratch.push(i);
            }
        }
    }

    pub fn try_prune_once(&mut self) -> bool {
        self.fill_active_indices();
        if self.active_indices_scratch.is_empty() {
            return false;
        }
        let sample_size = self.settings.prune_sample_size.max(1) as usize;
        if self.active_indices_scratch.len() > sample_size {
            self.rng.shuffle_usize(&mut self.active_indices_scratch);
            self.active_indices_scratch.truncate(sample_size);
        }
        let tiles = &self.tiles;
        self.active_indices_scratch
            .sort_by(|&a, &b| tiles[a].gain_mse.total_cmp(&tiles[b].gain_mse));

        let n_sample = self.active_indices_scratch.len();
        for si in 0..n_sample {
            let idx = self.active_indices_scratch[si];
            let tile_bbox = self.tiles[idx].bbox;
            let Some(clipped) = bbox_clip(tile_bbox, self.width, self.height) else {
                self.tiles[idx].active = false;
                self.spatial_index.remove(idx);
                self.active_tile_count = self.active_tile_count.saturating_sub(1);
                self.pruned += 1;
                return true;
            };
            let before = self.masked_sse_full(clipped);
            self.render_patch_from_tiles(clipped, Some(idx), None, None);
            let pw = (clipped[2] - clipped[0]) as usize;
            let ph = (clipped[3] - clipped[1]) as usize;
            let after = self.masked_sse_patch(&self.patch_scratch[..(pw * ph * 4)], clipped, f64::INFINITY, 0.0, f64::INFINITY, 1.0);
            let delta_global = (after - before) / self.global_den.max(1.0);
            if delta_global <= self.settings.tile_penalty_mse * self.settings.prune_penalty_factor {
                self.copy_patch_to_canvas(clipped);
                self.tiles[idx].active = false;
                self.spatial_index.remove(idx);
                self.active_tile_count = self.active_tile_count.saturating_sub(1);
                if let Some(ref mut err) = self.errors {
                    err.update_bbox(clipped, &self.canvas, &self.target_premult, &self.mask, &self.focus_mask);
                }
                self.pruned += 1;
                return true;
            }
        }
        false
    }

    pub fn try_prune(&mut self, rounds: i32) {
        for _ in 0..rounds.max(1) {
            if !self.try_prune_once() {
                break;
            }
        }
    }

    pub fn try_replace_once(&mut self, step: i32, total_steps: i32) -> bool {
        self.fill_active_indices();
        if self.active_indices_scratch.is_empty() {
            return false;
        }
        let pick = self.rng.integer(0, self.active_indices_scratch.len() as i32) as usize;
        let tile_idx = self.active_indices_scratch[pick];
        let old_bbox = self.tiles[tile_idx].bbox;
        let old_cx = self.tiles[tile_idx].center_x;
        let old_cy = self.tiles[tile_idx].center_y;
        if bbox_clip(old_bbox, self.width, self.height).is_none() {
            return false;
        }

        let (target_color, target_std, _) = self.focus_gradient_color(old_cx.round() as i32, old_cy.round() as i32);
        self.choose_source_ids(
            target_color,
            target_std,
            Some((self.settings.color_topk / 2).max(4)),
            Some(self.settings.exploration.max(0.1)),
        );
        if self.source_id_scratch.is_empty() {
            return false;
        }
        self.fill_cumulative_scores();

        let desired_px = ((old_bbox[2] - old_bbox[0]).max(old_bbox[3] - old_bbox[1]).max(4)) as f64;
        let progress = (step as f64) / (total_steps.max(1) as f64);
        let rot_prob = (self.settings.rotation_prob + 0.1).min(0.5);
        let jitter = (self.settings.error_cell_size as f64 * 0.1).max(1.0);
        let den = self.global_den.max(1.0);
        let mut best_gain = self.settings.replace_min_gain_mse;
        let mut best: Option<Candidate> = None;
        let batch = self.settings.replace_candidate_batch.max(1) as usize;
        let n_src_ids = self.source_id_scratch.len();

        for _ in 0..batch {
            let pick_i = self.rng.weighted_index_from_cumulative(&self.cum_scratch[..n_src_ids]);
            let source_id = self.source_id_scratch[pick_i];
            let Some(mut cand) = self.propose_candidate(
                source_id,
                old_cx.round() as i32,
                old_cy.round() as i32,
                progress,
                Some(desired_px),
                self.settings.max_rendered_px,
                rot_prob,
                self.settings.flip_prob,
                jitter,
                f64::NEG_INFINITY,
                false,
            ) else {
                continue;
            };
            if self.containment_mode(&cand.rgba, cand.bbox) == 0 {
                self.diag.containment_rejected += 1;
                continue;
            }
            let Some(union) = bbox_clip(
                [
                    old_bbox[0].min(cand.bbox[0]),
                    old_bbox[1].min(cand.bbox[1]),
                    old_bbox[2].max(cand.bbox[2]),
                    old_bbox[3].max(cand.bbox[3]),
                ],
                self.width,
                self.height,
            ) else {
                continue;
            };
            let before_union = self.masked_sse_full(union);
            let stop_at = before_union - best_gain * den;
            self.render_patch_from_tiles(union, None, Some(tile_idx), Some(&cand));
            let pw = (union[2] - union[0]) as usize;
            let ph = (union[3] - union[1]) as usize;
            let after_union = self.masked_sse_patch(
                &self.patch_scratch[..(pw * ph * 4)],
                union,
                stop_at,
                before_union,
                best_gain,
                den,
            );
            let gain_mse = (before_union - after_union) / den;
            if gain_mse > best_gain {
                cand.sse_before = before_union;
                cand.sse_after = after_union;
                cand.global_gain_mse = gain_mse;
                cand.score = gain_mse;
                best_gain = gain_mse;
                best = Some(cand);
            }
        }

        let Some(best_cand) = best else {
            return false;
        };
        let union = bbox_clip(
            [
                old_bbox[0].min(best_cand.bbox[0]),
                old_bbox[1].min(best_cand.bbox[1]),
                old_bbox[2].max(best_cand.bbox[2]),
                old_bbox[3].max(best_cand.bbox[3]),
            ],
            self.width,
            self.height,
        )
        .unwrap();
        self.render_patch_from_tiles(union, None, Some(tile_idx), Some(&best_cand));
        self.copy_patch_to_canvas(union);

        let s = &self.sources[best_cand.source_id];
        let geom = variant_geometry(s.thumb_w, s.thumb_h, best_cand.sx_internal, best_cand.sy_internal, best_cand.r_deg);
        self.cache.insert(best_cand.source_id, geom, best_cand.sx_internal, best_cand.sy_internal, best_cand.rgba);

        self.tiles[tile_idx] = TileRecord {
            active: true,
            source_id: best_cand.source_id,
            sx_internal: best_cand.sx_internal,
            sy_internal: best_cand.sy_internal,
            r_deg: best_cand.r_deg,
            bbox: best_cand.bbox,
            center_x: best_cand.center_x,
            center_y: best_cand.center_y,
            gain_mse: best_cand.global_gain_mse,
        };
        self.spatial_index.update(tile_idx, best_cand.bbox);
        if let Some(ref mut err) = self.errors {
            err.update_bbox(union, &self.canvas, &self.target_premult, &self.mask, &self.focus_mask);
        }
        self.replaced += 1;
        self.memory.note_trial(best_cand.source_id, target_color, true, best_cand.global_gain_mse);
        true
    }

    pub fn run_step(&mut self, step: i32, total_steps: i32) -> bool {
        let mut did_work = false;
        let active = self.active_tile_count as i32;
        if self.settings.tile_budget > 0 && active >= self.settings.tile_budget {
            if step % 2 == 0 {
                did_work = self.try_replace_once(step, total_steps);
            }
            if !did_work {
                did_work = self.try_prune_once();
            }
        } else {
            did_work = self.try_add(step, total_steps);
            if step % self.settings.remove_every.max(1) == 0 && self.active_tile_count > 0 {
                self.try_prune(self.settings.prune_rounds);
            }
            if step % self.settings.replace_every.max(1) == 0 && self.active_tile_count > 0 {
                self.try_replace_once(step, total_steps);
            }
        }
        if step % self.settings.full_error_recompute_every.max(250) == 0 {
            self.recompute_errors();
        }
        did_work
    }
}
