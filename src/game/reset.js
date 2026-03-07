// mini-engine v0.1g — reset extrait
// Refactor-only: même logique qu'avant, isolée dans un module.

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
    refreshHud,
  } = opts;

  function clearDynamicEntities() {
    // Ennemis
    while (enemies.length) {
      const enemy = enemies.pop();
      scene.remove(enemy.mesh);
    }

    // Pièces
    while (coins.length) {
      const coin = coins.pop();
      scene.remove(coin.group);
    }

    // Particules (v0.1f)
    const particleSystem = getParticleSystem ? getParticleSystem() : null;
    if (particleSystem) {
      particleSystem.clear();
    } else {
      // fallback (ancienne structure)
      while (particles.length) {
        const burst = particles.pop();
        for (const p of burst.parts) scene.remove(p.mesh);
      }
    }

    // Murs posés par l'utilisateur
    while (userWalls.length) {
      const wall = userWalls.pop();
      userWallSet.delete(keyForCell(wall.x, wall.z));
      scene.remove(wall.mesh);
    }
  }

  function resetGame() {
    clearDynamicEntities();

    runtime.score = 0;
    runtime.missionComplete = false;
    runtime.timeElapsed = 0;
    runtime.actionCooldown = 0;

    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (wallsSystem) wallsSystem.clearLastActionCell();

    runtime.spawnCooldown = 0.4;

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

    cameraState.ready = false;

    const enemiesSystem = getEnemiesSystem ? getEnemiesSystem() : null;
    for (let i = 0; i < baseEnemies; i++) {
      if (enemiesSystem) enemiesSystem.spawnEnemy();
    }

    if (refreshHud) refreshHud();
  }

  return {
    resetGame,
    clearDynamicEntities,
  };
}
