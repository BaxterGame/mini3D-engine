// mini-engine v0.1f — FX: particules extraites

import { rand } from '../utils/math.js';

/**
 * Système minimal de particules (bursts).
 * Refactor only: conserve le comportement v0.1e.
 */
export function createParticleSystem({ THREE, scene, particles, shared }) {
  function burstAt(x, y, z, color, count) {
    const parts = [];
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
      const mesh = new THREE.Mesh(shared.particleGeo, mat);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      parts.push({
        mesh,
        vx: rand(-4, 4),
        vy: rand(1.4, 4.8),
        vz: rand(-4, 4)
      });
    }
    particles.push({ life: 0.55, parts });
  }

  function update(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const burst = particles[i];
      burst.life -= delta;
      for (const p of burst.parts) {
        p.mesh.position.x += p.vx * delta;
        p.mesh.position.y += p.vy * delta;
        p.mesh.position.z += p.vz * delta;
        p.vy -= 8 * delta;
        p.mesh.material.opacity = Math.max(0, burst.life * 2);
        p.mesh.scale.setScalar(Math.max(0.25, burst.life * 2.4));
      }
      if (burst.life <= 0) {
        for (const p of burst.parts) scene.remove(p.mesh);
        particles.splice(i, 1);
      }
    }
  }

  function clear() {
    while (particles.length) {
      const burst = particles.pop();
      for (const p of burst.parts) scene.remove(p.mesh);
    }
  }

  return {
    burstAt,
    update,
    clear
  };
}
