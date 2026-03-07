// mini-engine v0.1h — entities/player
// Responsable de : création + update du joueur (déplacement + anims légères).
// Refactor only : comportement visé identique, mais lecture des entrées clarifiée.

import { clamp, normalize2D } from '../utils/math.js';
import { INNER_LIMIT as DEFAULT_INNER_LIMIT } from '../config.js';

export function createPlayerSystem({
  THREE,
  scene,
  keys,
  actions,
  collidesAtPlayer,
  getTimeElapsed,
  getCameraController,
  INNER_LIMIT = DEFAULT_INNER_LIMIT
}) {
  let player = null;
  let group = null;
  let halo = null;

  function create() {
    group = new THREE.Group();

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 0),
      new THREE.MeshStandardMaterial({
        color: 0xa5ffff,
        emissive: 0x57ecff,
        emissiveIntensity: 0.72,
        roughness: 0.24,
        metalness: 0.28,
        flatShading: true
      })
    );
    core.castShadow = true;
    group.add(core);

    halo = new THREE.Mesh(
      new THREE.TorusGeometry(1.02, 0.05, 12, 40),
      new THREE.MeshBasicMaterial({
        color: 0x8df8ff,
        transparent: true,
        opacity: 0.52
      })
    );
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.15;
    group.add(halo);

    group.position.set(0, 0.95, 0);
    scene.add(group);

    player = {
      x: 0,
      z: 0,
      radius: 0.72,
      speed: 12,
      yaw: 0,
      lastMove: { x: 0, z: -1 }
    };

    return player;
  }

  function reset() {
    if (!player) return;

    player.x = 0;
    player.z = 0;
    player.lastMove.x = 0;
    player.lastMove.z = -1;

    if (group) {
      group.position.set(0, 0.95, 0);
    }
  }

  function getLegacyMovementIntent() {
    const left = !!(keys && (keys['arrowleft'] || keys['q'] || keys['a']));
    const right = !!(keys && (keys['arrowright'] || keys['d']));
    const up = !!(keys && (keys['arrowup'] || keys['z'] || keys['w']));
    const down = !!(keys && (keys['arrowdown'] || keys['s']));

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      z: (down ? 1 : 0) - (up ? 1 : 0)
    };
  }

  function update(delta) {
    if (!player) return;

    const movement = actions ? actions.getMovementIntent() : getLegacyMovementIntent();

    let moveX = movement.x;
    let moveZ = movement.z;

    if (moveX !== 0 || moveZ !== 0) {
      const norm = normalize2D({ x: moveX, z: moveZ });
      moveX = norm.x;
      moveZ = norm.z;

      player.lastMove.x = moveX;
      player.lastMove.z = moveZ;
      player.yaw = Math.atan2(moveX, moveZ);

      const cameraController = getCameraController ? getCameraController() : null;
      if (cameraController && cameraController.getFollowMode() === 'camera' && cameraController.getOrbitSteps() !== 0) {
        cameraController.resetOrbit();
      }
    } else {
      moveX = 0;
      moveZ = 0;
    }

    const sprintHeld = actions ? actions.isSprintHeld() : !!(keys && keys['shift']);
    const speed = player.speed * (sprintHeld ? 1.22 : 1.0);
    const stepX = moveX * speed * delta;
    const stepZ = moveZ * speed * delta;

    const nextX = clamp(player.x + stepX, -INNER_LIMIT, INNER_LIMIT);
    if (!collidesAtPlayer(nextX, player.z, player.radius)) {
      player.x = nextX;
    }

    const nextZ = clamp(player.z + stepZ, -INNER_LIMIT, INNER_LIMIT);
    if (!collidesAtPlayer(player.x, nextZ, player.radius)) {
      player.z = nextZ;
    }

    const t = getTimeElapsed ? getTimeElapsed() : 0;

    if (group) {
      group.position.x = player.x;
      group.position.z = player.z;
      group.position.y = 0.95 + Math.sin(t * 5.6) * 0.06;
      group.rotation.y += delta * 1.25;
    }

    if (halo) {
      halo.material.opacity = 0.46 + Math.sin(t * 4.2) * 0.05;
      halo.scale.setScalar(1 + Math.sin(t * 5.2) * 0.03);
    }
  }

  function getPlayer() {
    return player;
  }

  return {
    create,
    update,
    reset,
    getPlayer
  };
}
