#[inline]
pub fn clamp_f64(v: f64, lo: f64, hi: f64) -> f64 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

#[inline]
pub fn clamp_i32(v: i32, lo: i32, hi: i32) -> i32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

pub struct SeededRandom {
    pub state: u32,
    pub spare_normal: Option<f64>,
}

impl SeededRandom {
    pub fn new(seed: u32) -> Self {
        let state = if seed == 0 { 0x9e37_79b9 } else { seed };
        Self {
            state,
            spare_normal: None,
        }
    }

    #[inline]
    pub fn next_f64(&mut self) -> f64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.state = x;
        (x as f64) / 4_294_967_296.0
    }

    #[inline]
    pub fn integer(&mut self, min_inc: i32, max_exc: i32) -> i32 {
        let max_eff = if max_exc <= min_inc { min_inc + 1 } else { max_exc };
        min_inc + ((self.next_f64() * ((max_eff - min_inc) as f64)).floor() as i32)
    }

    #[inline]
    pub fn uniform(&mut self, min: f64, max: f64) -> f64 {
        min + (max - min) * self.next_f64()
    }

    pub fn normal(&mut self, mean: f64, std: f64) -> f64 {
        if let Some(val) = self.spare_normal.take() {
            return mean + val * std;
        }
        let u = self.next_f64().max(1.0e-12);
        let v = self.next_f64().max(1.0e-12);
        let mag = (-2.0 * u.ln()).sqrt();
        let angle = core::f64::consts::TAU * v;
        let z0 = mag * angle.cos();
        let z1 = mag * angle.sin();
        self.spare_normal = Some(z1);
        mean + z0 * std
    }

    pub fn shuffle_usize(&mut self, items: &mut [usize]) {
        let len = items.len();
        if len < 2 {
            return;
        }
        for i in (1..len).rev() {
            let j = self.integer(0, (i + 1) as i32) as usize;
            items.swap(i, j);
        }
    }

    #[inline]
    pub fn weighted_index_from_cumulative(&mut self, cumulative: &[f64]) -> usize {
        let len = cumulative.len();
        if len == 0 {
            return 0;
        }
        let total = cumulative[len - 1];
        if !(total > 0.0) {
            return self.integer(0, len as i32) as usize;
        }
        let pick = self.next_f64() * total;
        let mut lo = 0usize;
        let mut hi = len - 1;
        while lo < hi {
            let mid = (lo + hi) >> 1;
            if pick <= cumulative[mid] {
                hi = mid;
            } else {
                lo = mid + 1;
            }
        }
        lo
    }
}
