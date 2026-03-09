// mini-engine v0.2b — entities/playerModes
// Les modes restent simples, mais peuvent maintenant utiliser des assets
// chargés depuis la librairie locale pour remplacer une partie des placeholders.

export const PLAYER_MODE_ORDER = ['wall', 'projectile', 'aqua', 'vehicle'];

export const PLAYER_MODE_DEFS = {
  wall: {
    id: 'wall',
    label: 'WALL',
    speedMultiplier: 1.0,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.72, 0),
        new THREE.MeshStandardMaterial({
          color: 0xa5ffff,
          emissive: 0x57ecff,
          emissiveIntensity: 0.72,
          roughness: 0.24,
          metalness: 0.28,
          flatShading: true,
        }),
      );
      mesh.castShadow = true;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.05, 12, 40),
        new THREE.MeshBasicMaterial({
          color: 0x8df8ff,
          transparent: true,
          opacity: 0.52,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.15;
      return mesh;
    },
  },

  projectile: {
    id: 'projectile',
    label: 'PROJECTILE',
    speedMultiplier: 1.0,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.78, 1.45, 3),
        new THREE.MeshStandardMaterial({
          color: 0xff5a5a,
          emissive: 0xff2a2a,
          emissiveIntensity: 0.78,
          roughness: 0.34,
          metalness: 0.18,
          flatShading: true,
        }),
      );
      mesh.castShadow = true;
      mesh.rotation.x = Math.PI;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.05, 10, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff8c8c,
          transparent: true,
          opacity: 0.48,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.1;
      return mesh;
    },
  },

  aqua: {
    id: 'aqua',
    label: 'AQUA',
    speedMultiplier: 0.96,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.74, 18, 14),
        new THREE.MeshStandardMaterial({
          color: 0x61c8ff,
          emissive: 0x1e8cff,
          emissiveIntensity: 0.52,
          roughness: 0.08,
          metalness: 0.12,
          transparent: true,
          opacity: 0.75,
        }),
      );
      mesh.castShadow = true;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.04, 12, 36),
        new THREE.MeshBasicMaterial({
          color: 0x8fe6ff,
          transparent: true,
          opacity: 0.36,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.2;
      return mesh;
    },
  },

  vehicle: {
    id: 'vehicle',
    label: 'VEHICLE',
    speedMultiplier: 1.65,
    createCore(THREE) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.34, 0.55, 0.96),
        new THREE.MeshStandardMaterial({
          color: 0x59ff8d,
          emissive: 0x16c85b,
          emissiveIntensity: 0.42,
          roughness: 0.38,
          metalness: 0.2,
          flatShading: true,
        }),
      );
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.36, 0.64),
        new THREE.MeshStandardMaterial({
          color: 0xbaf7d4,
          emissive: 0x39d98a,
          emissiveIntensity: 0.18,
          roughness: 0.24,
          metalness: 0.12,
          flatShading: true,
        }),
      );
      cabin.position.y = 0.34;
      cabin.castShadow = true;
      group.add(cabin);

      return group;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.05, 10, 32),
        new THREE.MeshBasicMaterial({
          color: 0x93ffc5,
          transparent: true,
          opacity: 0.3,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.24;
      return mesh;
    },
  },
};

const CONTEXT_MODE_MAP = {
  default: ['wall', 'projectile', 'aqua', 'vehicle'],
  combat: ['wall', 'projectile', 'aqua'],
  travel: ['wall', 'aqua', 'vehicle'],
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function keyForCell(cellX, cellZ) {
  return `${cellX}|${cellZ}`;
}

function getDirectionFromPlayer(player) {
  const x = player?.lastMove?.x ?? 0;
  const z = player?.lastMove?.z ?? -1;
  const length = Math.hypot(x, z) || 1;

  return { x: x / length, z: z / length };
}

function createFallbackProjectileMesh(THREE) {
  const mesh = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff7474,
      emissive: 0xff3434,
      emissiveIntensity: 0.72,
      roughness: 0.3,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}

function createFallbackAquaMesh(THREE) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0x5ebeff,
      emissive: 0x1c7cff,
      emissiveIntensity: 0.32,
      roughness: 0.12,
      metalness: 0.06,
      transparent: true,
      opacity: 0.8,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function getPlayerModeDef(mode) {
  return PLAYER_MODE_DEFS[mode] || PLAYER_MODE_DEFS.wall;
}

export function getAvailableModesForContext(contextProfile = 'default') {
  return CONTEXT_MODE_MAP[contextProfile] || CONTEXT_MODE_MAP.default;
}

export function createPlayerModesSystem({
  THREE,
  scene,
  enemies,
  collidesAt,
  burstAt,
  refreshHud,
  getPlayer,
  getPlayerSystem,
  getWallsSystem,
  getContextProfile,
  assetLibrary = null,
}) {
  let currentMode = 'wall';
  let projectileCooldown = 0;
  let lastAquaActionCellKey = '';

  const projectiles = [];
  const aquaNodes = [];
  const aquaNodeSet = new Set();

  function createProjectileVisual() {
    if (assetLibrary && typeof assetLibrary.createProjectileVisual === 'function') {
      const visual = assetLibrary.createProjectileVisual();
      if (visual) return visual;
    }
    return createFallbackProjectileMesh(THREE);
  }

  function createAquaVisual() {
    if (assetLibrary && typeof assetLibrary.createAquaNodeVisual === 'function') {
      const visual = assetLibrary.createAquaNodeVisual();
      if (visual) return visual;
    }
    return createFallbackAquaMesh(THREE);
  }

  function getCurrentMode() {
    return currentMode;
  }

  function getCurrentModeLabel() {
    return getPlayerModeDef(currentMode).label;
  }

  function getAvailableModes() {
    const contextProfile = getContextProfile ? getContextProfile() : 'default';
    return getAvailableModesForContext(contextProfile);
  }

  function syncPlayerVisual() {
    const playerSystem = getPlayerSystem ? getPlayerSystem() : null;
    if (playerSystem && typeof playerSystem.setMode === 'function') {
      playerSystem.setMode(currentMode);
    }
  }

  function notifyHud() {
    if (typeof refreshHud === 'function') refreshHud();
  }

  function clearActionState() {
    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (wallsSystem && typeof wallsSystem.clearLastActionCell === 'function') {
      wallsSystem.clearLastActionCell();
    }

    lastAquaActionCellKey = '';
  }

  function setMode(nextMode) {
    const availableModes = getAvailableModes();

    if (!availableModes.length) {
      currentMode = 'wall';
      syncPlayerVisual();
      clearActionState();
      notifyHud();
      return currentMode;
    }

    if (!PLAYER_MODE_DEFS[nextMode]) {
      nextMode = availableModes[0];
    }

    if (!availableModes.includes(nextMode)) {
      nextMode = availableModes[0];
    }

    if (currentMode === nextMode) {
      syncPlayerVisual();
      notifyHud();
      return currentMode;
    }

    currentMode = nextMode;
    syncPlayerVisual();
    clearActionState();
    notifyHud();
    return currentMode;
  }

  function ensureCurrentModeAvailable() {
    const availableModes = getAvailableModes();
    if (!availableModes.length) return false;
    if (availableModes.includes(currentMode)) return false;
    setMode(availableModes[0]);
    return true;
  }

  function cycleMode() {
    const availableModes = getAvailableModes();
    if (!availableModes.length) return currentMode;

    const currentIndex = availableModes.indexOf(currentMode);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableModes.length : 0;

    return setMode(availableModes[nextIndex]);
  }

  function removeProjectileAt(index) {
    const projectile = projectiles[index];
    if (!projectile) return;

    scene.remove(projectile.mesh);
    projectiles.splice(index, 1);
  }

  function clearProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      removeProjectileAt(i);
    }
  }

  function clearAquaNodes() {
    while (aquaNodes.length) {
      const aquaNode = aquaNodes.pop();
      aquaNodeSet.delete(aquaNode.key);
      scene.remove(aquaNode.mesh);
    }
  }

  function spawnProjectile() {
    const player = getPlayer ? getPlayer() : null;
    if (!player) return false;
    if (projectileCooldown > 0) return false;

    projectileCooldown = 0.16;

    const direction = getDirectionFromPlayer(player);
    const mesh = createProjectileVisual();
    mesh.rotation.y = Math.atan2(direction.x, direction.z);

    const startX = player.x + direction.x * 0.92;
    const startZ = player.z + direction.z * 0.92;

    mesh.position.set(startX, 0.95, startZ);
    scene.add(mesh);

    projectiles.push({
      x: startX,
      z: startZ,
      dirX: direction.x,
      dirZ: direction.z,
      speed: 21,
      radius: 0.22,
      life: 1.2,
      mesh,
    });

    if (burstAt) {
      burstAt(startX, 0.95, startZ, 0xff7f7f, 2);
    }

    return true;
  }

  function placeAquaNodeAtPlayer() {
    const player = getPlayer ? getPlayer() : null;
    if (!player) return false;

    const cellX = Math.round(player.x);
    const cellZ = Math.round(player.z);
    const key = keyForCell(cellX, cellZ);

    if (lastAquaActionCellKey === key) return false;
    lastAquaActionCellKey = key;

    if (aquaNodeSet.has(key)) return false;

    const mesh = createAquaVisual();
    mesh.position.set(cellX, 0.5, cellZ);

    scene.add(mesh);
    aquaNodeSet.add(key);
    aquaNodes.push({ key, mesh, x: cellX, z: cellZ });

    if (burstAt) {
      burstAt(cellX, 0.5, cellZ, 0x53a9ff, 3);
    }

    return true;
  }

  function hitEnemyWithProjectile(enemy, projectile) {
    enemy.stress = Math.min(8.4, (enemy.stress || 0) + 3.1);
    enemy.bounceChain = Math.min(6, (enemy.bounceChain || 0) + 1.0);
    enemy.dirX = projectile.dirX;
    enemy.dirZ = projectile.dirZ;

    if (enemy.mesh?.material) {
      enemy.mesh.material.emissiveIntensity = Math.max(
        enemy.mesh.material.emissiveIntensity || 0,
        0.82,
      );
    }

    if (burstAt) {
      burstAt(enemy.x, 0.9, enemy.z, 0xff5b5b, 4);
    }
  }

  function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.life -= delta;

      if (projectile.life <= 0) {
        removeProjectileAt(i);
        continue;
      }

      const nextX = projectile.x + projectile.dirX * projectile.speed * delta;
      const nextZ = projectile.z + projectile.dirZ * projectile.speed * delta;

      if (collidesAt && collidesAt(nextX, nextZ, projectile.radius)) {
        if (burstAt) burstAt(nextX, 0.95, nextZ, 0xff8d8d, 2);
        removeProjectileAt(i);
        continue;
      }

      projectile.x = nextX;
      projectile.z = nextZ;

      projectile.mesh.position.set(projectile.x, 0.95, projectile.z);
      projectile.mesh.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
      projectile.mesh.rotation.z += delta * 8.5;

      let consumed = false;

      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = enemies[enemyIndex];
        const dist = Math.hypot(enemy.x - projectile.x, enemy.z - projectile.z);
        if (dist > enemy.radius + projectile.radius + 0.18) continue;

        hitEnemyWithProjectile(enemy, projectile);
        removeProjectileAt(i);
        consumed = true;
        break;
      }

      if (consumed) continue;
    }
  }

  function handlePrimaryActionHeld() {
    ensureCurrentModeAvailable();

    const wallsSystem = getWallsSystem ? getWallsSystem() : null;

    switch (currentMode) {
      case 'wall':
        if (wallsSystem && typeof wallsSystem.toggleWallAtPlayer === 'function') {
          wallsSystem.toggleWallAtPlayer();
        }
        break;

      case 'projectile':
        spawnProjectile();
        break;

      case 'aqua':
        placeAquaNodeAtPlayer();
        break;

      case 'vehicle':
      default:
        break;
    }
  }

  function handlePrimaryActionReleased() {
    const wallsSystem = getWallsSystem ? getWallsSystem() : null;

    if (currentMode === 'wall' && wallsSystem && typeof wallsSystem.clearLastActionCell === 'function') {
      wallsSystem.clearLastActionCell();
    }

    if (currentMode === 'aqua') {
      lastAquaActionCellKey = '';
    }
  }

  function update(delta) {
    projectileCooldown = Math.max(0, projectileCooldown - delta);
    ensureCurrentModeAvailable();
    updateProjectiles(delta);

    const t = clamp01((Math.sin((performance.now?.() || 0) * 0.002) + 1) * 0.5);
    for (const aquaNode of aquaNodes) {
      aquaNode.mesh.scale.setScalar(0.96 + t * 0.1);
    }
  }

  function reset() {
    clearProjectiles();
    clearAquaNodes();
    projectileCooldown = 0;
    lastAquaActionCellKey = '';
    setMode('wall');
  }

  return {
    getCurrentMode,
    getCurrentModeLabel,
    getAvailableModes,
    setMode,
    cycleMode,
    ensureCurrentModeAvailable,
    handlePrimaryActionHeld,
    handlePrimaryActionReleased,
    update,
    reset,
  };
}
