use crate::rng::{clamp_i32, SeededRandom};

pub type BBox = [i32; 4];

pub const ALPHA_MSE_WEIGHT: f32 = 1.0;

#[inline]
pub fn bbox_intersects(a: BBox, b: BBox) -> bool {
    a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]
}

#[inline]
pub fn bbox_clip(b: BBox, width: i32, height: i32) -> Option<BBox> {
    let left = clamp_i32(b[0], 0, width);
    let top = clamp_i32(b[1], 0, height);
    let right = clamp_i32(b[2], 0, width);
    let bottom = clamp_i32(b[3], 0, height);
    if right <= left || bottom <= top {
        None
    } else {
        Some([left, top, right, bottom])
    }
}

pub struct BinaryMaskIndex {
    pub width: i32,
    pub height: i32,
    mask: Vec<u8>,
    integral: Vec<i32>,
    row_min_x: Vec<i32>,
    row_max_x: Vec<i32>,
}

impl BinaryMaskIndex {
    pub fn new(mask: &[u8], width: i32, height: i32) -> Self {
        let w = width as usize;
        let h = height as usize;
        let stride = w + 1;
        let mut integral = vec![0i32; (h + 1) * stride];
        let mut row_min_x = vec![width; h];
        let mut row_max_x = vec![0i32; h];

        for y in 0..h {
            let mut row_sum = 0i32;
            let row_offset = y * w;
            let int_row = (y + 1) * stride;
            let prev_row = y * stride;
            for x in 0..w {
                let val = if mask[row_offset + x] != 0 { 1 } else { 0 };
                if val != 0 {
                    let xi = x as i32;
                    if row_min_x[y] == width {
                        row_min_x[y] = xi;
                    }
                    row_max_x[y] = xi + 1;
                }
                row_sum += val;
                integral[int_row + x + 1] = integral[prev_row + x + 1] + row_sum;
            }
        }

        Self {
            width,
            height,
            mask: mask.to_vec(),
            integral,
            row_min_x,
            row_max_x,
        }
    }

    #[inline]
    pub fn is_set(&self, pixel: usize) -> bool {
        self.mask[pixel] != 0
    }

    #[inline]
    pub fn count(&self, bbox: BBox) -> i32 {
        let Some([left, top, right, bottom]) = bbox_clip(bbox, self.width, self.height) else {
            return 0;
        };
        let stride = (self.width + 1) as usize;
        let t = top as usize * stride;
        let b = bottom as usize * stride;
        let l = left as usize;
        let r = right as usize;
        self.integral[b + r] - self.integral[t + r] - self.integral[b + l] + self.integral[t + l]
    }

    #[inline]
    pub fn row_visible_range(&self, y: i32, left: i32, right: i32) -> Option<(i32, i32)> {
        if y < 0 || y >= self.height {
            return None;
        }
        let yu = y as usize;
        let start = left.max(self.row_min_x[yu]).max(0);
        let end = right.min(self.row_max_x[yu]).min(self.width);
        if end > start {
            Some((start, end))
        } else {
            None
        }
    }
}

pub struct TargetMomentIndex {
    width: i32,
    height: i32,
    count: Vec<i32>,
    sum_rgb: Vec<f64>,
    sum_sq_rgb: Vec<f64>,
}

impl TargetMomentIndex {
    pub fn new(target_straight: &[u8], mask: &[u8], width: i32, height: i32) -> Self {
        let w = width as usize;
        let h = height as usize;
        let stride = w + 1;
        let cells = (h + 1) * stride;
        let mut count = vec![0i32; cells];
        let mut sum_rgb = vec![0.0f64; cells * 3];
        let mut sum_sq_rgb = vec![0.0f64; cells * 3];

        for y in 0..h {
            let mut c_row = 0i32;
            let mut sr = 0.0f64;
            let mut sg = 0.0f64;
            let mut sb = 0.0f64;
            let mut qr = 0.0f64;
            let mut qg = 0.0f64;
            let mut qb = 0.0f64;
            let p_row = y * w;
            let i_row = (y + 1) * stride;
            let p_int = y * stride;
            for x in 0..w {
                let p = p_row + x;
                if mask[p] != 0 {
                    let o = p * 4;
                    let r = target_straight[o] as f64;
                    let g = target_straight[o + 1] as f64;
                    let b = target_straight[o + 2] as f64;
                    c_row += 1;
                    sr += r;
                    sg += g;
                    sb += b;
                    qr += r * r;
                    qg += g * g;
                    qb += b * b;
                }
                let dst = i_row + x + 1;
                let above = p_int + x + 1;
                count[dst] = count[above] + c_row;
                let d3 = dst * 3;
                let a3 = above * 3;
                sum_rgb[d3] = sum_rgb[a3] + sr;
                sum_rgb[d3 + 1] = sum_rgb[a3 + 1] + sg;
                sum_rgb[d3 + 2] = sum_rgb[a3 + 2] + sb;
                sum_sq_rgb[d3] = sum_sq_rgb[a3] + qr;
                sum_sq_rgb[d3 + 1] = sum_sq_rgb[a3 + 1] + qg;
                sum_sq_rgb[d3 + 2] = sum_sq_rgb[a3 + 2] + qb;
            }
        }

        Self {
            width,
            height,
            count,
            sum_rgb,
            sum_sq_rgb,
        }
    }

    pub fn stats(&self, cx: i32, cy: i32, radius: i32) -> Option<([f64; 3], [f64; 3], f64)> {
        let r = radius.max(1);
        let left = (cx - r).max(0);
        let top = (cy - r).max(0);
        let right = (cx + r + 1).min(self.width);
        let bottom = (cy + r + 1).min(self.height);
        if right <= left || bottom <= top {
            return None;
        }
        let stride = (self.width + 1) as usize;
        let i_br = bottom as usize * stride + right as usize;
        let i_tr = top as usize * stride + right as usize;
        let i_bl = bottom as usize * stride + left as usize;
        let i_tl = top as usize * stride + left as usize;

        let n = self.count[i_br] - self.count[i_tr] - self.count[i_bl] + self.count[i_tl];
        if n <= 0 {
            return None;
        }
        let nf = n as f64;
        let mut mean = [0.0f64; 3];
        let mut std = [0.0f64; 3];
        for c in 0..3 {
            let s = self.sum_rgb[i_br * 3 + c]
                - self.sum_rgb[i_tr * 3 + c]
                - self.sum_rgb[i_bl * 3 + c]
                + self.sum_rgb[i_tl * 3 + c];
            let q = self.sum_sq_rgb[i_br * 3 + c]
                - self.sum_sq_rgb[i_tr * 3 + c]
                - self.sum_sq_rgb[i_bl * 3 + c]
                + self.sum_sq_rgb[i_tl * 3 + c];
            let m = s / nf;
            mean[c] = m;
            std[c] = (q / nf - m * m).max(0.0).sqrt();
        }
        let complexity = (std[0] * std[0] + std[1] * std[1] + std[2] * std[2]).sqrt();
        Some((mean, std, complexity))
    }
}

pub struct ErrorField {
    pub cell: i32,
    pub gw: i32,
    pub gh: i32,
    width: i32,
    height: i32,
    error_map: Vec<f32>,
    cell_w: Vec<f64>,
    cell_w_cum: Vec<f64>,
    cell_color: Vec<f32>,
    cell_mask_count: Vec<i32>,
    cell_pixels: Vec<Vec<usize>>,
    masked_pixels: Vec<usize>,
    focus_pixels: Vec<usize>,
    pub total_sse: f64,
    pub focus_sse: f64,
}

impl ErrorField {
    pub fn new(
        canvas: &[f32],
        target: &[f32],
        target_straight: &[u8],
        mask: &[u8],
        focus_mask: &[u8],
        width: i32,
        height: i32,
        cell_size: i32,
    ) -> Self {
        let cell = cell_size.max(4);
        let gw = (width + cell - 1) / cell;
        let gh = (height + cell - 1) / cell;
        let n_cells = (gw * gh) as usize;
        let n_pixels = (width * height) as usize;

        let mut cell_mask_count = vec![0i32; n_cells];
        let mut color_sums = vec![0.0f64; n_cells * 3];
        let mut cell_pixels = vec![Vec::new(); n_cells];
        let mut masked_pixels = Vec::new();
        let mut focus_pixels = Vec::new();

        let wu = width as usize;
        let hu = height as usize;
        let cu = cell as usize;
        let gwu = gw as usize;

        for y in 0..hu {
            let cell_row = (y / cu) * gwu;
            let pixel_row = y * wu;
            for x in 0..wu {
                let p = pixel_row + x;
                if mask[p] == 0 {
                    continue;
                }
                masked_pixels.push(p);
                if focus_mask[p] == 0 {
                    continue;
                }
                focus_pixels.push(p);
                let c = cell_row + (x / cu);
                cell_pixels[c].push(p);
                cell_mask_count[c] += 1;
                let o = p * 4;
                let b = c * 3;
                color_sums[b] += target_straight[o] as f64;
                color_sums[b + 1] += target_straight[o + 1] as f64;
                color_sums[b + 2] += target_straight[o + 2] as f64;
            }
        }

        let mut cell_color = vec![0.0f32; n_cells * 3];
        for c in 0..n_cells {
            let cnt = cell_mask_count[c];
            if cnt > 0 {
                let cf = cnt as f64;
                let b = c * 3;
                cell_color[b] = (color_sums[b] / cf) as f32;
                cell_color[b + 1] = (color_sums[b + 1] / cf) as f32;
                cell_color[b + 2] = (color_sums[b + 2] / cf) as f32;
            }
        }

        let mut field = Self {
            cell,
            gw,
            gh,
            width,
            height,
            error_map: vec![0.0f32; n_pixels],
            cell_w: vec![0.0f64; n_cells],
            cell_w_cum: vec![0.0f64; n_cells],
            cell_color,
            cell_mask_count,
            cell_pixels,
            masked_pixels,
            focus_pixels,
            total_sse: 0.0,
            focus_sse: 0.0,
        };
        field.recompute_all(canvas, target, focus_mask);
        field
    }

    #[inline]
    fn pixel_error(canvas: &[f32], target: &[f32], pixel: usize) -> f32 {
        let o = pixel * 4;
        let dr = canvas[o] - target[o];
        let dg = canvas[o + 1] - target[o + 1];
        let db = canvas[o + 2] - target[o + 2];
        let da = canvas[o + 3] - target[o + 3];
        dr * dr + dg * dg + db * db + ALPHA_MSE_WEIGHT * da * da
    }

    pub fn recompute_all(&mut self, canvas: &[f32], target: &[f32], focus_mask: &[u8]) {
        self.error_map.fill(0.0);
        self.cell_w.fill(0.0);
        let mut total = 0.0f64;
        let mut focus_total = 0.0f64;
        let wu = self.width as usize;
        let cu = self.cell as usize;
        let gwu = self.gw as usize;

        for &pixel in &self.masked_pixels {
            let y = pixel / wu;
            let x = pixel - y * wu;
            let err = Self::pixel_error(canvas, target, pixel);
            self.error_map[pixel] = err;
            let ed = err as f64;
            total += ed;
            if focus_mask[pixel] != 0 {
                let cell = (y / cu) * gwu + (x / cu);
                self.cell_w[cell] += ed;
                focus_total += ed;
            }
        }
        self.total_sse = total;
        self.focus_sse = focus_total;
    }

    pub fn update_bbox(&mut self, bbox: BBox, canvas: &[f32], target: &[f32], mask: &[u8], focus_mask: &[u8]) {
        let Some([left, top, right, bottom]) = bbox_clip(bbox, self.width, self.height) else {
            return;
        };
        let wu = self.width as usize;
        let cu = self.cell as usize;
        let gwu = self.gw as usize;

        for y in (top as usize)..(bottom as usize) {
            let cell_row = (y / cu) * gwu;
            let pixel_row = y * wu;
            for x in (left as usize)..(right as usize) {
                let p = pixel_row + x;
                if mask[p] == 0 {
                    continue;
                }
                let prev = self.error_map[p];
                let next = Self::pixel_error(canvas, target, p);
                let delta = (next - prev) as f64;
                if delta == 0.0 {
                    continue;
                }
                self.error_map[p] = next;
                self.total_sse += delta;
                if focus_mask[p] != 0 {
                    self.cell_w[cell_row + (x / cu)] += delta;
                    self.focus_sse += delta;
                }
            }
        }
    }

    #[inline]
    pub fn focus_sse_upper_bound(&self, bbox: BBox) -> f64 {
        let Some([left, top, right, bottom]) = bbox_clip(bbox, self.width, self.height) else {
            return 0.0;
        };
        let c_left = left / self.cell;
        let c_top = top / self.cell;
        let c_right = (right - 1).max(left) / self.cell;
        let c_bottom = (bottom - 1).max(top) / self.cell;
        let mut upper = 0.0f64;
        for cy in c_top..=c_bottom {
            let row = (cy * self.gw) as usize;
            for cx in c_left..=c_right {
                let cell = row + cx as usize;
                upper += self.cell_w[cell].max(0.0) + (self.cell_mask_count[cell] as f64) * 0.02;
            }
        }
        upper
    }

    pub fn choose_focus(&mut self, rng: &mut SeededRandom) -> (i32, i32) {
        if !(self.focus_sse > 1.0e-9) || !self.focus_sse.is_finite() {
            if !self.focus_pixels.is_empty() {
                let p = self.focus_pixels[rng.integer(0, self.focus_pixels.len() as i32) as usize];
                let y = (p / self.width as usize) as i32;
                let x = (p % self.width as usize) as i32;
                return (x, y);
            }
            return (0, 0);
        }

        let mut running = 0.0f64;
        for (i, &w) in self.cell_w.iter().enumerate() {
            running += w.max(0.0);
            self.cell_w_cum[i] = running;
        }
        let cell_idx = rng.weighted_index_from_cumulative(&self.cell_w_cum);
        let candidates = &self.cell_pixels[cell_idx];
        if candidates.is_empty() {
            let cy = (cell_idx as i32) / self.gw;
            let cx = (cell_idx as i32) % self.gw;
            return (cx * self.cell, cy * self.cell);
        }
        let p = candidates[rng.integer(0, candidates.len() as i32) as usize];
        ((p % self.width as usize) as i32, (p / self.width as usize) as i32)
    }
}

pub struct TileSpatialIndex {
    cell_size: i32,
    buckets: std::collections::HashMap<(i32, i32), Vec<usize>>,
    tile_cells: std::collections::HashMap<usize, Vec<(i32, i32)>>,
}

impl TileSpatialIndex {
    pub fn new(cell_size: i32) -> Self {
        Self {
            cell_size: cell_size.max(8),
            buckets: std::collections::HashMap::new(),
            tile_cells: std::collections::HashMap::new(),
        }
    }

    pub fn remove(&mut self, tile_idx: usize) {
        if let Some(cells) = self.tile_cells.remove(&tile_idx) {
            for cell in cells {
                if let Some(bucket) = self.buckets.get_mut(&cell) {
                    if let Some(pos) = bucket.iter().position(|&id| id == tile_idx) {
                        bucket.swap_remove(pos);
                    }
                    if bucket.is_empty() {
                        self.buckets.remove(&cell);
                    }
                }
            }
        }
    }

    pub fn update(&mut self, tile_idx: usize, bbox: BBox) {
        self.remove(tile_idx);
        let c_left = bbox[0].div_euclid(self.cell_size);
        let c_top = bbox[1].div_euclid(self.cell_size);
        let c_right = (bbox[2] - 1).max(bbox[0]).div_euclid(self.cell_size);
        let c_bottom = (bbox[3] - 1).max(bbox[1]).div_euclid(self.cell_size);
        let mut cells = Vec::new();
        for cy in c_top..=c_bottom {
            for cx in c_left..=c_right {
                let key = (cx, cy);
                self.buckets.entry(key).or_default().push(tile_idx);
                cells.push(key);
            }
        }
        self.tile_cells.insert(tile_idx, cells);
    }

    pub fn query(&self, bbox: BBox, out: &mut Vec<usize>) {
        out.clear();
        let c_left = bbox[0].div_euclid(self.cell_size);
        let c_top = bbox[1].div_euclid(self.cell_size);
        let c_right = (bbox[2] - 1).max(bbox[0]).div_euclid(self.cell_size);
        let c_bottom = (bbox[3] - 1).max(bbox[1]).div_euclid(self.cell_size);
        for cy in c_top..=c_bottom {
            for cx in c_left..=c_right {
                if let Some(bucket) = self.buckets.get(&(cx, cy)) {
                    out.extend_from_slice(bucket);
                }
            }
        }
        out.sort_unstable();
        out.dedup();
    }
}
