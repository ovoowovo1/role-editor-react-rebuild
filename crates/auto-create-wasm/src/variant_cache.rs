use std::collections::HashMap;
use crate::numeric::BBox;

#[derive(Clone)]
pub struct MipLevel {
    pub width: i32,
    pub height: i32,
    pub premult: Vec<f32>,
}

pub struct MipmapSource {
    pub levels: Vec<MipLevel>,
}

impl MipmapSource {
    pub fn from_straight_rgba(straight: &[u8], width: i32, height: i32) -> Self {
        let mut l0 = vec![0.0f32; straight.len()];
        for i in (0..straight.len()).step_by(4) {
            let a = straight[i + 3] as f32;
            let af = a * (1.0 / 255.0);
            l0[i] = (straight[i] as f32) * af;
            l0[i + 1] = (straight[i + 1] as f32) * af;
            l0[i + 2] = (straight[i + 2] as f32) * af;
            l0[i + 3] = a;
        }
        let mut levels = vec![MipLevel {
            width,
            height,
            premult: l0,
        }];

        loop {
            let prev = levels.last().unwrap();
            if prev.width <= 2 || prev.height <= 2 {
                break;
            }
            let nw = (prev.width / 2).max(1);
            let nh = (prev.height / 2).max(1);
            let mut next = vec![0.0f32; (nw * nh * 4) as usize];
            let pw = prev.width as usize;
            let ph = prev.height as usize;

            for y in 0..(nh as usize) {
                let sy = (y * 2).min(ph - 1);
                let sy1 = (sy + 1).min(ph - 1);
                for x in 0..(nw as usize) {
                    let sx = (x * 2).min(pw - 1);
                    let sx1 = (sx + 1).min(pw - 1);
                    let i00 = (sy * pw + sx) * 4;
                    let i10 = (sy * pw + sx1) * 4;
                    let i01 = (sy1 * pw + sx) * 4;
                    let i11 = (sy1 * pw + sx1) * 4;
                    let o = (y * nw as usize + x) * 4;
                    for c in 0..4 {
                        next[o + c] = 0.25
                            * (prev.premult[i00 + c]
                                + prev.premult[i10 + c]
                                + prev.premult[i01 + c]
                                + prev.premult[i11 + c]);
                    }
                }
            }

            levels.push(MipLevel {
                width: nw,
                height: nh,
                premult: next,
            });
        }

        Self { levels }
    }

    #[inline]
    pub fn pick_level(&self, target_w: i32, target_h: i32) -> &MipLevel {
        let mut best = &self.levels[0];
        for lvl in &self.levels[1..] {
            if lvl.width >= target_w && lvl.height >= target_h {
                best = lvl;
            } else {
                break;
            }
        }
        best
    }
}

#[derive(Clone)]
pub struct TransformedImage {
    pub width: i32,
    pub height: i32,
    pub data: Vec<u8>,
    pub alpha_bounds: BBox,
    pub alpha_row_start: Vec<i32>,
    pub alpha_row_end: Vec<i32>,
    pub alpha_sum: i64,
}

#[derive(Clone, Copy)]
pub struct VariantGeometry {
    pub resized_width: i32,
    pub resized_height: i32,
    pub width: i32,
    pub height: i32,
    pub rotation: f64,
}

#[inline]
pub fn variant_geometry(thumb_w: i32, thumb_h: i32, sx_internal: f64, sy_internal: f64, r_deg: f64) -> VariantGeometry {
    let resized_width = ((thumb_w as f64) * sx_internal.abs().max(1.0e-6)).round().max(1.0) as i32;
    let resized_height = ((thumb_h as f64) * sy_internal.abs().max(1.0e-6)).round().max(1.0) as i32;
    let rotation = if r_deg.is_finite() && r_deg.abs() > 1.0e-9 { r_deg } else { 0.0 };
    if rotation == 0.0 {
        return VariantGeometry {
            resized_width,
            resized_height,
            width: resized_width,
            height: resized_height,
            rotation,
        };
    }
    let rad = (rotation * core::f64::consts::PI) / 180.0;
    let sin = rad.sin().abs();
    let cos = rad.cos().abs();
    let w = ((resized_width as f64) * cos + (resized_height as f64) * sin).ceil().max(1.0) as i32;
    let h = ((resized_width as f64) * sin + (resized_height as f64) * cos).ceil().max(1.0) as i32;
    VariantGeometry {
        resized_width,
        resized_height,
        width: w,
        height: h,
        rotation,
    }
}

#[derive(Hash, Eq, PartialEq, Clone, Copy)]
struct VariantKey {
    source_idx: usize,
    resized_w: i32,
    resized_h: i32,
    flip_x: bool,
    flip_y: bool,
    rot_bits: u64,
}

struct CacheEntry {
    key: VariantKey,
    value: TransformedImage,
    older: usize,
    newer: usize,
}

const NONE: usize = usize::MAX;

pub struct VariantCache {
    capacity: usize,
    map: HashMap<VariantKey, usize>,
    entries: Vec<CacheEntry>,
    head_oldest: usize,
    head_newest: usize,
    pub hits: u64,
    pub misses: u64,
    pub evictions: u64,
    pub rasters_allocated: u64,
}

impl VariantCache {
    pub fn new(capacity: usize) -> Self {
        let cap = capacity.max(16);
        Self {
            capacity: cap,
            map: HashMap::with_capacity(cap),
            entries: Vec::with_capacity(cap),
            head_oldest: NONE,
            head_newest: NONE,
            hits: 0,
            misses: 0,
            evictions: 0,
            rasters_allocated: 0,
        }
    }

    fn key_for(source_idx: usize, geom: VariantGeometry, sx: f64, sy: f64) -> VariantKey {
        let rot = if geom.rotation == 0.0 { 0.0 } else { geom.rotation };
        VariantKey {
            source_idx,
            resized_w: geom.resized_width,
            resized_h: geom.resized_height,
            flip_x: sx < 0.0,
            flip_y: sy < 0.0,
            rot_bits: rot.to_bits(),
        }
    }

    fn touch(&mut self, idx: usize) {
        if idx == self.head_newest {
            return;
        }
        let older = self.entries[idx].older;
        let newer = self.entries[idx].newer;
        if older != NONE {
            self.entries[older].newer = newer;
        } else {
            self.head_oldest = newer;
        }
        if newer != NONE {
            self.entries[newer].older = older;
        }
        self.entries[idx].older = self.head_newest;
        self.entries[idx].newer = NONE;
        if self.head_newest != NONE {
            self.entries[self.head_newest].newer = idx;
        } else {
            self.head_oldest = idx;
        }
        self.head_newest = idx;
    }

    pub fn insert(&mut self, source_idx: usize, geom: VariantGeometry, sx: f64, sy: f64, value: TransformedImage) {
        let key = Self::key_for(source_idx, geom, sx, sy);
        if let Some(&idx) = self.map.get(&key) {
            self.entries[idx].value = value;
            self.touch(idx);
            return;
        }
        if self.entries.len() < self.capacity {
            let idx = self.entries.len();
            self.entries.push(CacheEntry {
                key,
                value,
                older: self.head_newest,
                newer: NONE,
            });
            if self.head_newest != NONE {
                self.entries[self.head_newest].newer = idx;
            } else {
                self.head_oldest = idx;
            }
            self.head_newest = idx;
            self.map.insert(key, idx);
            return;
        }

        // Evict oldest slot in-place
        let evict_idx = self.head_oldest;
        if evict_idx == NONE {
            return;
        }
        let old_key = self.entries[evict_idx].key;
        self.map.remove(&old_key);
        self.evictions += 1;

        self.entries[evict_idx].key = key;
        self.entries[evict_idx].value = value;
        self.map.insert(key, evict_idx);
        self.touch(evict_idx);
    }

    pub fn get_or_render(
        &mut self,
        source_idx: usize,
        mipmap: &MipmapSource,
        thumb_w: i32,
        thumb_h: i32,
        sx_internal: f64,
        sy_internal: f64,
        r_deg: f64,
        cache_result: bool,
    ) -> TransformedImage {
        let geom = variant_geometry(thumb_w, thumb_h, sx_internal, sy_internal, r_deg);
        let key = Self::key_for(source_idx, geom, sx_internal, sy_internal);
        if let Some(&idx) = self.map.get(&key) {
            self.hits += 1;
            self.touch(idx);
            return self.entries[idx].value.clone();
        }
        self.misses += 1;
        let rendered = self.render_from_mipmap(mipmap, geom, sx_internal < 0.0, sy_internal < 0.0);
        if cache_result {
            self.insert(source_idx, geom, sx_internal, sy_internal, rendered.clone());
        }
        rendered
    }

    fn render_from_mipmap(
        &mut self,
        mipmap: &MipmapSource,
        geom: VariantGeometry,
        flip_x: bool,
        flip_y: bool,
    ) -> TransformedImage {
        self.rasters_allocated += 1;
        let level = mipmap.pick_level(geom.resized_width, geom.resized_height);
        let src = &level.premult;
        let src_w = level.width;
        let src_h = level.height;
        let w = geom.width;
        let h = geom.height;
        let mut data = vec![0u8; (w * h * 4) as usize];
        let mut alpha_row_start = vec![w; h as usize];
        let mut alpha_row_end = vec![0i32; h as usize];

        let rad = (geom.rotation * core::f64::consts::PI) / 180.0;
        let cos = if geom.rotation == 0.0 { 1.0 } else { rad.cos() };
        let sin = if geom.rotation == 0.0 { 0.0 } else { rad.sin() };
        let scale_x = (src_w as f64) / (geom.resized_width as f64);
        let scale_y = (src_h as f64) / (geom.resized_height as f64);
        let sign_x = if flip_x { -1.0 } else { 1.0 };
        let sign_y = if flip_y { -1.0 } else { 1.0 };

        let dsx_dx = sign_x * cos * scale_x;
        let dsy_dx = sign_y * -sin * scale_y;
        let dsx_dy = sign_x * sin * scale_x;
        let dsy_dy = sign_y * cos * scale_y;

        let half_w = (w as f64) * 0.5;
        let half_h = (h as f64) * 0.5;
        let base_sx = (0.5 - half_w) * dsx_dx + (0.5 - half_h) * dsx_dy + (src_w as f64) * 0.5 - 0.5;
        let base_sy = (0.5 - half_w) * dsy_dx + (0.5 - half_h) * dsy_dy + (src_h as f64) * 0.5 - 0.5;

        let mut alpha_sum = 0i64;
        let mut alpha_left = w;
        let mut alpha_top = h;
        let mut alpha_right = 0i32;
        let mut alpha_bottom = 0i32;

        let src_wf = src_w as f64;
        let src_hf = src_h as f64;
        let src_wu = src_w as usize;

        for y in 0..h {
            let mut sx = base_sx + (y as f64) * dsx_dy;
            let mut sy = base_sy + (y as f64) * dsy_dy;
            let mut start = w;
            let mut end = 0i32;
            let mut out_offset = (y * w * 4) as usize;

            for x in 0..w {
                if sx > -1.0 && sx < src_wf && sy > -1.0 && sy < src_hf {
                    let x0 = sx.floor() as i32;
                    let y0 = sy.floor() as i32;
                    let fx = (sx - (x0 as f64)) as f32;
                    let fy = (sy - (y0 as f64)) as f32;
                    let fx1 = 1.0 - fx;
                    let fy1 = 1.0 - fy;

                    let w00 = fx1 * fy1;
                    let w10 = fx * fy1;
                    let w01 = fx1 * fy;
                    let w11 = fx * fy;

                    let mut pr = 0.0f32;
                    let mut pg = 0.0f32;
                    let mut pb = 0.0f32;
                    let mut pa = 0.0f32;

                    if y0 >= 0 && y0 < src_h {
                        let row0 = (y0 as usize) * src_wu;
                        if x0 >= 0 && x0 < src_w {
                            let i00 = (row0 + x0 as usize) * 4;
                            pr += src[i00] * w00;
                            pg += src[i00 + 1] * w00;
                            pb += src[i00 + 2] * w00;
                            pa += src[i00 + 3] * w00;
                        }
                        if x0 + 1 >= 0 && x0 + 1 < src_w {
                            let i10 = (row0 + (x0 + 1) as usize) * 4;
                            pr += src[i10] * w10;
                            pg += src[i10 + 1] * w10;
                            pb += src[i10 + 2] * w10;
                            pa += src[i10 + 3] * w10;
                        }
                    }
                    if y0 + 1 >= 0 && y0 + 1 < src_h {
                        let row1 = ((y0 + 1) as usize) * src_wu;
                        if x0 >= 0 && x0 < src_w {
                            let i01 = (row1 + x0 as usize) * 4;
                            pr += src[i01] * w01;
                            pg += src[i01 + 1] * w01;
                            pb += src[i01 + 2] * w01;
                            pa += src[i01 + 3] * w01;
                        }
                        if x0 + 1 >= 0 && x0 + 1 < src_w {
                            let i11 = (row1 + (x0 + 1) as usize) * 4;
                            pr += src[i11] * w11;
                            pg += src[i11 + 1] * w11;
                            pb += src[i11 + 2] * w11;
                            pa += src[i11 + 3] * w11;
                        }
                    }

                    let alpha_byte = pa.round().clamp(0.0, 255.0) as u8;
                    if alpha_byte > 0 {
                        let inv_a = 255.0 / pa.max(1.0e-6);
                        data[out_offset] = (pr * inv_a).round().clamp(0.0, 255.0) as u8;
                        data[out_offset + 1] = (pg * inv_a).round().clamp(0.0, 255.0) as u8;
                        data[out_offset + 2] = (pb * inv_a).round().clamp(0.0, 255.0) as u8;
                        data[out_offset + 3] = alpha_byte;
                        alpha_sum += alpha_byte as i64;
                        if start == w {
                            start = x;
                        }
                        end = x + 1;
                    }
                }
                sx += dsx_dx;
                sy += dsy_dx;
                out_offset += 4;
            }

            let yu = y as usize;
            alpha_row_start[yu] = start;
            alpha_row_end[yu] = end;
            if end > start {
                if start < alpha_left {
                    alpha_left = start;
                }
                if end > alpha_right {
                    alpha_right = end;
                }
                if alpha_top == h {
                    alpha_top = y;
                }
                alpha_bottom = y + 1;
            }
        }

        let alpha_bounds = if alpha_sum > 0 {
            [alpha_left, alpha_top, alpha_right, alpha_bottom]
        } else {
            [0, 0, 0, 0]
        };
        TransformedImage {
            width: w,
            height: h,
            data,
            alpha_bounds,
            alpha_row_start,
            alpha_row_end,
            alpha_sum,
        }
    }
}
