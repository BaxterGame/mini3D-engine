// mini-engine v0.1b — utilitaires math

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

export function normalize2D(v) {
  const len = Math.hypot(v.x, v.z) || 1;
  v.x /= len;
  v.z /= len;
  return v;
}

export function rotateVector(x, z, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - z * s, z: x * s + z * c };
}
