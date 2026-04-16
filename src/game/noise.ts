// Value noise (seedable, stable, no sin artifacts).
export function _hash2(x: number, z: number): number {
  let h = (x * 374761393 + z * 668265263) ^ ((x * 668265263) + (z * 374761393));
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function _lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

export function _fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function vnoise(x: number, z: number): number {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = _fade(xf), v = _fade(zf);
  const aa = _hash2(xi, zi), ab = _hash2(xi, zi + 1);
  const ba = _hash2(xi + 1, zi), bb = _hash2(xi + 1, zi + 1);
  return _lerp(_lerp(aa, ba, u), _lerp(ab, bb, u), v);
}

// Fractal Brownian motion.
export function fbm(x: number, z: number, oct = 4, scale = 1, seed = 0): number {
  let v = 0, a = 1, f = scale, m = 0;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f + seed * 17.3, z * f + seed * 31.7) * a;
    m += a;
    a *= 0.5;
    f *= 2;
  }
  return v / m;
}

// 3D noise for caves (interpolated XZ slices along Y).
export function vnoise3(x: number, y: number, z: number): number {
  const yi = Math.floor(y), yf = _fade(y - yi);
  return _lerp(
    vnoise(x + yi * 7.3, z + yi * 13.7),
    vnoise(x + (yi + 1) * 7.3, z + (yi + 1) * 13.7),
    yf,
  );
}