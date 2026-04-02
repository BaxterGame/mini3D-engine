// mini-engine v0.2f — HUD et UI
// Ajoute un rappel léger du mode player et de l'état d'inventaire.

export function createHud(els, config) {
  function formatStackInfo(model) {
    if (!model || model.playerModeLabel !== 'WALL') return '';
    const level = Number.isFinite(model.wallStackDisplayLevel)
      ? model.wallStackDisplayLevel
      : (Number.isFinite(model.wallStackLevel) ? model.wallStackLevel : 0);
    const step = Number.isFinite(model.wallStackStep) ? model.wallStackStep : 0;
    if (model.wallDestroyMode) {
      return ` • DESTROY • Y ${level} • hold Space • E • ↑/↓ cible`;
    }
    return ` • BUILD • Y ${level} • pas ${step.toFixed(2)} • hold Space • ↑/↓ cible • E destroy`;
  }

  function syncViewUi(model) {
    const modePrefix = model.worldMode === 'exploration' ? 'Exploration' : 'Mission';
    const modeSuffix = model.playerModeLabel ? ` • Mode ${model.playerModeLabel}` : '';
    const stackSuffix = formatStackInfo(model);

    if (model.followMode === 'top') {
      els.viewValue.textContent = 'TOP';
      els.viewValue.style.color = '#74f6ff';
      els.toggleViewBtn.classList.add('is-active');
    } else if (model.cameraProjectionMode === 'iso') {
      els.viewValue.textContent = 'CAMÉRA ISO';
      els.viewValue.style.color = '#7ab6ff';
      els.toggleViewBtn.classList.remove('is-active');
    } else if (model.cameraProjectionMode === 'fps') {
      els.viewValue.textContent = 'CAMÉRA FPS';
      els.viewValue.style.color = '#ff9b7a';
      els.toggleViewBtn.classList.remove('is-active');
    } else {
      els.viewValue.textContent = 'CAMÉRA PERSP';
      els.viewValue.style.color = '#ffd76b';
      els.toggleViewBtn.classList.remove('is-active');
    }

    if (model.cameraProjectionMode === 'top') {
      els.projectionValue.textContent = 'TOP 2D';
    } else if (model.cameraProjectionMode === 'iso') {
      els.projectionValue.textContent = 'ISOMÉTRIQUE';
    } else if (model.cameraProjectionMode === 'fps') {
      els.projectionValue.textContent = 'FIRST PERSON';
    } else {
      els.projectionValue.textContent = 'PERSPECTIVE';
    }

    if (model.inventoryOpen) {
      const selection = model.inventorySelectionLabel ? ` • ${model.inventorySelectionLabel}` : '';
      els.statusText.textContent = `Inventaire ouvert • flèches / WASD = naviguer • R = fermer${selection}${modeSuffix}`;
    } else if (model.followMode === 'top') {
      els.statusText.textContent = `${modePrefix} • Top = lecture claire et déplacement libre${modeSuffix}${stackSuffix}`;
    } else if (model.cameraProjectionMode === 'iso') {
      els.statusText.textContent = `${modePrefix} • Caméra isométrique = lecture douce, style maquette${modeSuffix}${stackSuffix}`;
    } else if (model.cameraProjectionMode === 'fps') {
      els.statusText.textContent = `${modePrefix} • Caméra FPS = immersion open world${modeSuffix}${stackSuffix}`;
    } else {
      els.statusText.textContent = `${modePrefix} • Caméra perspective = angle conservé et lecture cohérente${modeSuffix}${stackSuffix}`;
    }

    els.toggleSandboxBtn.classList.toggle('is-active', model.worldMode === 'exploration');
    els.orbitLeftBtn.classList.toggle('is-active', model.followMode === 'camera');
    els.orbitRightBtn.classList.toggle('is-active', model.followMode === 'camera');
  }

  function refresh(model) {
    els.scoreValue.textContent = `${model.score} / ${config.WIN_SCORE}`;
    els.enemyValue.textContent = `${model.enemiesCount}`;
    els.wallValue.textContent = `${model.wallsCount}`;

    if (model.worldMode === 'exploration') {
      els.missionValue.textContent = 'EXPLORATION';
      els.missionValue.style.color = '#74f6ff';
    } else if (model.missionComplete) {
      els.missionValue.textContent = 'MISSION OK';
      els.missionValue.style.color = '#ffd76b';
    } else {
      els.missionValue.textContent = 'MISSION';
      els.missionValue.style.color = '#7dffba';
    }

    syncViewUi(model);
  }

  return { refresh };
}
