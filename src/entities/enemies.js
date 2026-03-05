// mini-engine v0.1e — entities/enemies
// Responsable de : spawn + update des ennemis (errance, stress, transformation en or).
// Refactor only : comportement identique à v0.1d.

import { clamp, rand, normalize2D, rotateVector } from '../utils/math.js';
import { INNER_LIMIT as DEFAULT_INNER_LIMIT } from '../config.js';

export function createEnemiesSystem({
  THREE,
  scene,
  enemies,
  shared,
  getPlayer,
  getWorldMode,
  getTimeElapsed,
  collidesAt,
  probeBlockedDirections,
  burstAt,
  createCoinAt,
  onEnemyTransformed,
  INNER_LIMIT = DEFAULT_INNER_LIMIT
}) {
  function spawnEnemy() {
    const player = getPlayer();
    if (!player) return;

    let x = 0;
    let z = 0;
    let tries = 0;
    do {
      x = rand(-INNER_LIMIT + 2, INNER_LIMIT - 2);
      z = rand(-INNER_LIMIT + 2, INNER_LIMIT - 2);
      tries += 1;
    } while ((Math.hypot(x - player.x, z - player.z) < 10 || collidesAt(x, z, 0.8)) && tries < 30);

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffba73,
      emissive: 0xff5d84,
      emissiveIntensity: 0.62,
      roughness: 0.35,
      metalness: 0.12,
      flatShading: true
    });
    const mesh = new THREE.Mesh(shared.enemyGeo, mat);
    mesh.castShadow = true;
    mesh.position.set(x, 0.85, z);
    scene.add(mesh);

    const angle = rand(0, Math.PI * 2);
    enemies.push({
      x,
      z,
      radius: 0.66,
      speed: rand(3.2, 4.6),
      dirX: Math.cos(angle),
      dirZ: Math.sin(angle),
      turnTimer: rand(0.6, 1.6),
      stress: 0,
      bounceChain: 0,
      bob: rand(0, Math.PI * 2),
      mesh
    });
  }

  function update(delta) {
    const worldMode = getWorldMode ? getWorldMode() : 'mission';
    const t = getTimeElapsed ? getTimeElapsed() : 0;
    const player = getPlayer();

    if (worldMode === 'exploration') {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.mesh.position.set(enemy.x, 0.84 + Math.sin(t * 2.5 + enemy.bob) * 0.14, enemy.z);
        enemy.mesh.rotation.y += delta * 0.7;
        enemy.mesh.material.emissiveIntensity = 0.55;
        enemy.mesh.scale.setScalar(1);
      }
      return;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      enemy.turnTimer -= delta;
      if (enemy.turnTimer <= 0) {
        const rotated = rotateVector(enemy.dirX, enemy.dirZ, rand(-1.2, 1.2));
        enemy.dirX = rotated.x;
        enemy.dirZ = rotated.z;
        const norm = normalize2D({ x: enemy.dirX, z: enemy.dirZ });
        enemy.dirX = norm.x;
        enemy.dirZ = norm.z;
        enemy.turnTimer = rand(0.5, 1.5);
      }

      const drift = rotateVector(enemy.dirX, enemy.dirZ, rand(-0.8, 0.8) * delta * 0.7);
      enemy.dirX = drift.x;
      enemy.dirZ = drift.z;
      const norm2 = normalize2D({ x: enemy.dirX, z: enemy.dirZ });
      enemy.dirX = norm2.x;
      enemy.dirZ = norm2.z;

      let bounces = 0;
      let nextX = enemy.x + enemy.dirX * enemy.speed * delta;
      if (!collidesAt(nextX, enemy.z, enemy.radius)) {
        enemy.x = nextX;
      } else {
        enemy.dirX *= -1;
        enemy.x = clamp(enemy.x + enemy.dirX * enemy.speed * delta * 0.65, -INNER_LIMIT, INNER_LIMIT);
        bounces += 1;
      }

      let nextZ = enemy.z + enemy.dirZ * enemy.speed * delta;
      if (!collidesAt(enemy.x, nextZ, enemy.radius)) {
        enemy.z = nextZ;
      } else {
        enemy.dirZ *= -1;
        enemy.z = clamp(enemy.z + enemy.dirZ * enemy.speed * delta * 0.65, -INNER_LIMIT, INNER_LIMIT);
        bounces += 1;
      }

      if (player) {
        const sepX = enemy.x - player.x;
        const sepZ = enemy.z - player.z;
        const distToPlayer = Math.hypot(sepX, sepZ) || 1;
        const overlap = player.radius + enemy.radius + 0.15 - distToPlayer;
        if (overlap > 0) {
          enemy.x += (sepX / distToPlayer) * overlap * 0.9;
          enemy.z += (sepZ / distToPlayer) * overlap * 0.9;
          enemy.dirX = sepX / distToPlayer;
          enemy.dirZ = sepZ / distToPlayer;
          bounces += 1;
        }
      }

      enemy.x = clamp(enemy.x, -INNER_LIMIT, INNER_LIMIT);
      enemy.z = clamp(enemy.z, -INNER_LIMIT, INNER_LIMIT);

      const blocked = probeBlockedDirections(enemy.x, enemy.z, enemy.radius);
      const userBlocked = probeBlockedDirections(enemy.x, enemy.z, enemy.radius, true);
      if (userBlocked.count >= 1 && ((bounces > 0 && blocked.count >= 2) || blocked.count >= 3)) {
        enemy.bounceChain = Math.min(6, enemy.bounceChain + delta * 4 + bounces * 0.7);
        enemy.stress += delta * (0.9 + blocked.count * 0.65 + enemy.bounceChain * 0.22);
      } else {
        enemy.bounceChain = Math.max(0, enemy.bounceChain - delta * 2.2);
        enemy.stress = Math.max(0, enemy.stress - delta * (blocked.count <= 1 ? 1.7 : 0.8));
      }

      enemy.mesh.position.set(enemy.x, 0.84 + Math.sin(t * 2.5 + enemy.bob) * 0.14, enemy.z);
      enemy.mesh.rotation.y += delta * 1.2;
      enemy.mesh.material.emissiveIntensity = 0.55 + Math.min(0.85, enemy.stress * 0.08);
      const heat = clamp(enemy.stress / 8.5, 0, 1);
      enemy.mesh.scale.setScalar(1 + heat * 0.16);

      if (enemy.stress >= 8.5) {
        if (burstAt) burstAt(enemy.x, 0.9, enemy.z, 0xffd76b, 10);
        if (createCoinAt) createCoinAt(enemy.x, enemy.z);
        scene.remove(enemy.mesh);
        enemies.splice(i, 1);
        if (onEnemyTransformed) onEnemyTransformed();
      }
    }
  }

  return { spawnEnemy, update };
}
