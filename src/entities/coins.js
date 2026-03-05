// mini-engine v0.1e — entities/coins
// Responsable de : création + update des pièces (rotation, collecte).
// Refactor only : comportement identique à v0.1d.

import { rand } from '../utils/math.js';

export function createCoinsSystem({
  THREE,
  scene,
  coins,
  shared,
  getPlayer,
  getWorldMode,
  getTimeElapsed,
  burstAt,
  onCollect
}) {
  function createCoinAt(x, z) {
    const group = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), shared.coinCoreMat);
    core.castShadow = true;
    group.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.05, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xffe9aa, transparent: true, opacity: 0.72 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.position.set(x, 1.1, z);
    scene.add(group);
    coins.push({ x, z, group, ring, spin: rand(0.7, 1.5) });
  }

  function update(delta) {
    const t = getTimeElapsed ? getTimeElapsed() : 0;
    const worldMode = getWorldMode ? getWorldMode() : 'mission';
    const player = getPlayer ? getPlayer() : null;

    for (let i = coins.length - 1; i >= 0; i--) {
      const coin = coins[i];
      coin.group.rotation.y += delta * (1.6 + coin.spin);
      coin.group.position.y = 1.08 + Math.sin(t * 3 + coin.spin) * 0.18;
      coin.ring.scale.setScalar(1 + Math.sin(t * 4.2 + coin.spin) * 0.05);

      if (worldMode === 'exploration') continue;
      if (!player) continue;

      if (Math.hypot(player.x - coin.x, player.z - coin.z) < 1.25) {
        if (burstAt) burstAt(coin.x, 1.05, coin.z, 0xffd76b, 10);
        scene.remove(coin.group);
        coins.splice(i, 1);
        if (onCollect) onCollect(coin);
      }
    }
  }

  return { createCoinAt, update };
}
