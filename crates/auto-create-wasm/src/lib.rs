mod collage;
mod numeric;
mod rng;
mod variant_cache;

use core::slice;
use crate::collage::{CollageEngine, EngineSettings};

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
