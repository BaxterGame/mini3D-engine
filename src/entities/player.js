// mini-engine v0.2a — entities/player
// Le player garde sa logique de déplacement stable,
// mais expose maintenant un mode visuel + un multiplicateur de vitesse.

import { clamp, normalize2D } from '../utils/math.js';
import { INNER_LIMIT as DEFAULT_INNER_LIMIT } from '../config.js';
import { getPlayerModeDef } from './playerModes.js';

function disposeObject3D(object) {
  if (!object) return;

  object.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }

    const { material } = child;
    if (Array.isArray(material)) {
      for (const mat of material) {
        if (mat && typeof mat.dispose === 'function') mat.dispose();
      }
    } else if (material && typeof material.dispose === 'function') {
      material.dispose();
    }
  });
}

export function createPlayerSystem({
  THREE,
  scene,
  keys,
  actions,
  collidesAtPlayer,
  getTimeElapsed,
  getCameraController,
  INNER_LIMIT = DEFAULT_INNER_LIMIT,
}) {
  let player = null;
  let group = null;
  let core = null;
  let halo = null;

  function getLegacyMovementIntent() {
    const left = !!(keys && (keys.arrowleft || keys.q || keys.a));
    const right = !!(keys && (keys.arrowright || keys.d));
    const up = !!(keys && (keys.arrowup || keys.z || keys.w));
    const down = !!(keys && (keys.arrowdown || keys.s));

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      z: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  function getSpeedMultiplier() {
    if (!player) return 1;
    return getPlayerModeDef(player.mode).speedMultiplier ?? 1;
  }

  function rebuildVisualForMode(mode) {
    const def = getPlayerModeDef(mode);

    if (!group) return;

    if (core) {
      group.remove(core);
      disposeObject3D(core);
      core = null;
    }

    if (halo) {
      group.remove(halo);
      disposeObject3D(halo);
      halo = null;
    }

    core = def.createCore(THREE);
    halo = def.createHalo(THREE);

    if (core) group.add(core);
    if (halo) group.add(halo);
  }

  function setMode(mode) {
    if (!player) return;
    if (player.mode === mode) return;

    player.mode = mode;
    rebuildVisualForMode(mode);
  }

  function create() {
    group = new THREE.Group();
    group.position.set(0, 0.95, 0);
    scene.add(group);

    player = {
      x: 0,
      z: 0,
      radius: 0.72,
      speed: 12,
      yaw: 0,
      mode: 'wall',
      lastMove: { x: 0, z: -1 },
    };

    rebuildVisualForMode(player.mode);
    return player;
  }

  function reset() {
    if (!player) return;

    player.x = 0;
    player.z = 0;
    player.yaw = 0;
    player.lastMove.x = 0;
    player.lastMove.z = -1;

    if (group) {
      group.position.set(0, 0.95, 0);
      group.rotation.set(0, 0, 0);
    }
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
      if (
        cameraController &&
        cameraController.getFollowMode() === 'camera' &&
        cameraController.getOrbitSteps() !== 0
      ) {
        cameraController.resetOrbit();
      }
    } else {
      moveX = 0;
      moveZ = 0;
    }

    const sprintHeld = actions ? actions.isSprintHeld() : !!(keys && keys.shift);
    const speed = player.speed * getSpeedMultiplier() * (sprintHeld ? 1.22 : 1.0);

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

      if (player.mode === 'projectile' || player.mode === 'vehicle') {
        group.rotation.y = player.yaw;
      } else {
        group.rotation.y += delta * 1.25;
      }
    }

    if (halo?.material) {
      halo.material.opacity = 0.38 + Math.sin(t * 4.2) * 0.05;
      halo.scale.setScalar(1 + Math.sin(t * 5.2) * 0.03);
    }
  }

  function getPlayer() {
    return player;
  }

  function getMode() {
    return player ? player.mode : 'wall';
  }

  return {
    create,
    update,
    reset,
    getPlayer,
    getMode,
    setMode,
  };
}
