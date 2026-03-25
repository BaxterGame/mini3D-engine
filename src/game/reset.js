// mini-engine v0.2a — reset extrait
// Étendu pour remettre à zéro les systèmes liés aux modes du player.

export function createResetSystem(opts) {
  const {
    scene,
    enemies,
    coins,
    particles,
    userWalls,
    userWallSet,
    keyForCell,
    cameraState,
    baseEnemies,
    runtime,
    getParticleSystem,
    getWallsSystem,
    getPlayerSystem,
    getPlayer,
    setPlayer,
    getEnemiesSystem,
    getModeSystem,
    refreshHud,
  } = opts;

  function clearDynamicEntities() {
    while (enemies.length) {
      const enemy = enemies.pop();
      scene.remove(enemy.mesh);
    }

    while (coins.length) {
      const coin = coins.pop();
      scene.remove(coin.group);
    }

    const particleSystem = getParticleSystem ? getParticleSystem() : null;
    if (particleSystem) {
      particleSystem.clear();
    } else {
      while (particles.length) {
        const burst = particles.pop();
        for (const p of burst.parts) scene.remove(p.mesh);
      }
    }

    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (wallsSystem && typeof wallsSystem.clearAllWalls === 'function') {
      wallsSystem.clearAllWalls();
    } else {
      while (userWalls.length) {
        const wall = userWalls.pop();
        userWallSet.delete(keyForCell(wall.x, wall.z));
        if (wall.mesh) scene.remove(wall.mesh);
      }
    }
  }

  function resetGame() {
    clearDynamicEntities();

    runtime.score = 0;
    runtime.missionComplete = false;
    runtime.timeElapsed = 0;
    runtime.actionCooldown = 0;
    runtime.spawnCooldown = 0.4;

    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (wallsSystem) wallsSystem.clearLastActionCell();

    const playerSystem = getPlayerSystem ? getPlayerSystem() : null;
    const player = getPlayer ? getPlayer() : null;

    if (playerSystem) {
      playerSystem.reset();
      if (setPlayer) setPlayer(playerSystem.getPlayer());
    } else if (player) {
      player.x = 0;
      player.z = 0;
      player.lastMove.x = 0;
      player.lastMove.z = -1;
    }

    const modeSystem = getModeSystem ? getModeSystem() : null;
    if (modeSystem && typeof modeSystem.reset === 'function') {
      modeSystem.reset();
    }

    cameraState.ready = false;

    const enemiesSystem = getEnemiesSystem ? getEnemiesSystem() : null;
    for (let i = 0; i < baseEnemies; i += 1) {
      if (enemiesSystem) enemiesSystem.spawnEnemy();
    }

    if (refreshHud) refreshHud();
  }

  return {
    resetGame,
    clearDynamicEntities,
  };
}
