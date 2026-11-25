mod collage;
mod numeric;
mod rng;
mod variant_cache;

use core::slice;
use crate::collage::{CollageEngine, EngineSettings, MemStat};

#[no_mangle]
pub extern "C" fn wasm_alloc(bytes: usize) -> *mut u8 {
    let mut buf = Vec::<u8>::with_capacity(bytes);
    let ptr = buf.as_mut_ptr();
    core::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn wasm_dealloc(ptr: *mut u8, bytes: usize) {
    if !ptr.is_null() && bytes > 0 {
        drop(Vec::from_raw_parts(ptr, 0, bytes));
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_create(
    width: i32,
    height: i32,
    seed: u32,
    target_straight_ptr: *const u8,
    mask_ptr: *const u8,
    placement_mask_ptr: *const u8,
    f64_settings_ptr: *const f64,
) -> *mut CollageEngine {
    let n_pixels = (width * height) as usize;
    let target_straight = slice::from_raw_parts(target_straight_ptr, n_pixels * 4).to_vec();
    let mask = slice::from_raw_parts(mask_ptr, n_pixels).to_vec();
    let placement_mask = slice::from_raw_parts(placement_mask_ptr, n_pixels).to_vec();
    let s = slice::from_raw_parts(f64_settings_ptr, 27);

    let settings = EngineSettings {
        tile_budget: s[0] as i32,
        candidate_batch: s[1] as i32,
        replace_candidate_batch: s[2] as i32,
        color_topk: s[3] as i32,
        color_sigma: s[4],
        exploration: s[5],
        tile_penalty_mse: s[6],
        gradient_local_radius: s[7] as i32,
        gradient_pixel_mix: s[8],
        gradient_std_sigma: s[9],
        gradient_std_weight: s[10],
        gradient_complexity_threshold: s[11],
        gradient_original_max_px: s[12],
        min_rendered_px: s[13],
        max_rendered_px: s[14],
        rotation_prob: s[15],
        flip_prob: s[16],
        remove_every: s[17] as i32,
        replace_every: s[18] as i32,
        prune_rounds: s[19] as i32,
        prune_sample_size: s[20] as i32,
        prune_penalty_factor: s[21],
        replace_min_gain_mse: s[22],
        full_error_recompute_every: s[23] as i32,
        variant_cache_items: (s[24] as usize).max(16),
        error_cell_size: s[25] as i32,
        role_export_max_side: s[26],
    };

    Box::into_raw(Box::new(CollageEngine::new(
        width,
        height,
        seed,
        settings,
        target_straight,
        mask,
        placement_mask,
    )))
}

#[no_mangle]
pub unsafe extern "C" fn engine_destroy(ptr: *mut CollageEngine) {
    if !ptr.is_null() {
        drop(Box::from_raw(ptr));
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_add_source(
    ptr: *mut CollageEngine,
    thumb_w: i32,
    thumb_h: i32,
    orig_w: i32,
    orig_h: i32,
    s_factor: f64,
    mean_r: f64,
    mean_g: f64,
    mean_b: f64,
    std_r: f64,
    std_g: f64,
    std_b: f64,
    alpha_ratio: f64,
    straight_rgba_ptr: *const u8,
) {
    let engine = &mut *ptr;
    let len = (thumb_w * thumb_h * 4) as usize;
    let straight_rgba = slice::from_raw_parts(straight_rgba_ptr, len);
    engine.add_source(
        thumb_w,
        thumb_h,
        orig_w,
        orig_h,
        s_factor,
        [mean_r, mean_g, mean_b],
        [std_r, std_g, std_b],
        alpha_ratio,
        straight_rgba,
    );
}

#[no_mangle]
pub unsafe extern "C" fn engine_finalize_init(ptr: *mut CollageEngine) {
    (&mut *ptr).finalize_init();
}

#[no_mangle]
pub unsafe extern "C" fn engine_step(ptr: *mut CollageEngine, step: i32, total_steps: i32) -> u32 {
    if (&mut *ptr).run_step(step, total_steps) {
        1
    } else {
        0
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_final_prune_step(ptr: *mut CollageEngine) -> u32 {
    if (&mut *ptr).try_prune_once() {
        1
    } else {
        0
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_recompute_errors(ptr: *mut CollageEngine) {
    (&mut *ptr).recompute_errors();
}

#[no_mangle]
pub unsafe extern "C" fn engine_current_mse(ptr: *mut CollageEngine) -> f64 {
    (&*ptr).current_mse()
}

#[no_mangle]
pub unsafe extern "C" fn engine_stats(ptr: *mut CollageEngine, out_ptr: *mut u32) {
    let e = &*ptr;
    let out = slice::from_raw_parts_mut(out_ptr, 5);
    out[0] = e.active_tile_count;
    out[1] = e.accepted;
    out[2] = e.rejected;
    out[3] = e.pruned;
    out[4] = e.replaced;
}

#[no_mangle]
pub unsafe extern "C" fn engine_diag_counters(ptr: *mut CollageEngine, out_ptr: *mut f64) {
    let e = &*ptr;
    let out = slice::from_raw_parts_mut(out_ptr, 12);
    out[0] = e.diag.candidates_proposed as f64;
    out[1] = e.diag.candidates_evaluated as f64;
    out[2] = e.diag.candidate_pixels_evaluated as f64;
    out[3] = e.diag.containment_fast_accepted as f64;
    out[4] = e.diag.containment_fallbacks as f64;
    out[5] = e.diag.containment_rejected as f64;
    out[6] = e.diag.candidate_upper_bound_rejected as f64;
    out[7] = e.diag.candidate_after_sse_early_rejected as f64;
    out[8] = e.cache.hits as f64;
    out[9] = e.cache.misses as f64;
    out[10] = e.cache.evictions as f64;
    out[11] = e.cache.rasters_allocated as f64;
}

#[no_mangle]
pub unsafe extern "C" fn engine_write_preview_rgba(ptr: *mut CollageEngine, out_ptr: *mut u8) {
    let e = &*ptr;
    let out = slice::from_raw_parts_mut(out_ptr, e.canvas.len());
    for i in (0..e.canvas.len()).step_by(4) {
        let a = e.canvas[i + 3];
        if a > 1.0e-6 {
            let af = (a / 255.0).max(1.0e-6);
            out[i] = (e.canvas[i] / af).round().clamp(0.0, 255.0) as u8;
            out[i + 1] = (e.canvas[i + 1] / af).round().clamp(0.0, 255.0) as u8;
            out[i + 2] = (e.canvas[i + 2] / af).round().clamp(0.0, 255.0) as u8;
            out[i + 3] = a.round().clamp(0.0, 255.0) as u8;
        } else {
            out[i] = 0;
            out[i + 1] = 0;
            out[i + 2] = 0;
            out[i + 3] = 0;
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_export_tile_count(ptr: *mut CollageEngine) -> u32 {
    (&*ptr).active_tile_count
}

#[no_mangle]
pub unsafe extern "C" fn engine_export_tiles(
    ptr: *mut CollageEngine,
    out_source_ids: *mut u32,
    out_f64_params: *mut f64,
) {
    let e = &*ptr;
    let count = e.active_tile_count as usize;
    let ids = slice::from_raw_parts_mut(out_source_ids, count);
    let params = slice::from_raw_parts_mut(out_f64_params, count * 6);
    let mut k = 0usize;
    for t in &e.tiles {
        if !t.active {
            continue;
        }
        ids[k] = t.source_id as u32;
        let p = k * 6;
        params[p] = t.center_x;
        params[p + 1] = t.center_y;
        params[p + 2] = t.sx_internal;
        params[p + 3] = t.sy_internal;
        params[p + 4] = t.r_deg;
        params[p + 5] = t.gain_mse;
        k += 1;
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_rng_state(ptr: *mut CollageEngine) -> u32 {
    (&*ptr).rng.state
}

#[no_mangle]
pub unsafe extern "C" fn engine_rng_has_spare(ptr: *mut CollageEngine) -> u32 {
    if (&*ptr).rng.spare_normal.is_some() { 1 } else { 0 }
}

#[no_mangle]
pub unsafe extern "C" fn engine_rng_spare(ptr: *mut CollageEngine) -> f64 {
    (&*ptr).rng.spare_normal.unwrap_or(0.0)
}

#[no_mangle]
pub unsafe extern "C" fn engine_set_rng(ptr: *mut CollageEngine, state: u32, has_spare: u32, spare: f64) {
    let e = &mut *ptr;
    e.rng.state = if state == 0 { 0x9e37_79b9 } else { state };
    e.rng.spare_normal = if has_spare != 0 { Some(spare) } else { None };
}

#[no_mangle]
pub unsafe extern "C" fn engine_export_source_stats(
    ptr: *mut CollageEngine,
    out_counts_ptr: *mut i32,
    out_floats_ptr: *mut f64,
) {
    let e = &*ptr;
    let stats = e.memory.source_stats_slice();
    let counts = slice::from_raw_parts_mut(out_counts_ptr, stats.len() * 2);
    let floats = slice::from_raw_parts_mut(out_floats_ptr, stats.len() * 2);
    for (i, s) in stats.iter().enumerate() {
        counts[i * 2] = s.trials;
        counts[i * 2 + 1] = s.accepted;
        floats[i * 2] = s.gain_sum;
        floats[i * 2 + 1] = s.ema_gain;
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_color_stat_count(ptr: *mut CollageEngine) -> u32 {
    (&*ptr).memory.color_stats_len() as u32
}

#[no_mangle]
pub unsafe extern "C" fn engine_export_color_stats(
    ptr: *mut CollageEngine,
    out_keys_ptr: *mut u64,
    out_counts_ptr: *mut i32,
    out_floats_ptr: *mut f64,
) {
    let e = &*ptr;
    let n = e.memory.color_stats_len();
    let keys = slice::from_raw_parts_mut(out_keys_ptr, n);
    let counts = slice::from_raw_parts_mut(out_counts_ptr, n * 2);
    let floats = slice::from_raw_parts_mut(out_floats_ptr, n * 2);
    for (i, (k, s)) in e.memory.color_stats_iter().enumerate() {
        keys[i] = k;
        counts[i * 2] = s.trials;
        counts[i * 2 + 1] = s.accepted;
        floats[i * 2] = s.gain_sum;
        floats[i * 2 + 1] = s.ema_gain;
    }
}

#[no_mangle]
pub unsafe extern "C" fn engine_restore_memory(
    ptr: *mut CollageEngine,
    n_sources: u32,
    src_counts_ptr: *const i32,
    src_floats_ptr: *const f64,
    n_color: u32,
    color_keys_ptr: *const u64,
    color_counts_ptr: *const i32,
    color_floats_ptr: *const f64,
) {
    let e = &mut *ptr;
    let ns = n_sources as usize;
    let src_counts = slice::from_raw_parts(src_counts_ptr, ns * 2);
    let src_floats = slice::from_raw_parts(src_floats_ptr, ns * 2);
    let mut src_stats = Vec::with_capacity(ns);
    for i in 0..ns {
        src_stats.push(MemStat {
            trials: src_counts[i * 2],
            accepted: src_counts[i * 2 + 1],
            gain_sum: src_floats[i * 2],
            ema_gain: src_floats[i * 2 + 1],
        });
    }

    let nc = n_color as usize;
    let c_keys = slice::from_raw_parts(color_keys_ptr, nc);
    let c_counts = slice::from_raw_parts(color_counts_ptr, nc * 2);
    let c_floats = slice::from_raw_parts(color_floats_ptr, nc * 2);
    let mut color_stats = Vec::with_capacity(nc);
    for i in 0..nc {
        color_stats.push((
            c_keys[i],
            MemStat {
                trials: c_counts[i * 2],
                accepted: c_counts[i * 2 + 1],
                gain_sum: c_floats[i * 2],
                ema_gain: c_floats[i * 2 + 1],
            },
        ));
    }

    e.memory.restore_stats(&src_stats, &color_stats);
}

#[no_mangle]
pub unsafe extern "C" fn engine_restore_tiles(
    ptr: *mut CollageEngine,
    count: u32,
    source_ids_ptr: *const u32,
    params_ptr: *const f64,
    accepted: u32,
    rejected: u32,
    pruned: u32,
    replaced: u32,
) -> u32 {
    let e = &mut *ptr;
    let n = count as usize;
    let source_ids = slice::from_raw_parts(source_ids_ptr, n);
    let params = slice::from_raw_parts(params_ptr, n * 6);
    if e.restore_tiles(source_ids, params, accepted, rejected, pruned, replaced) {
        1
    } else {
        0
    }
}
