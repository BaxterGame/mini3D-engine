// mini-engine v0.2f — HUD et UI
// Ajoute un rappel léger du mode player et de l'état d'inventaire.

export function createHud(els, config) {
  function syncViewUi(model) {
    const modePrefix = model.worldMode === 'exploration' ? 'Exploration' : 'Mission';
    const modeSuffix = model.playerModeLabel ? ` • Mode ${model.playerModeLabel}` : '';

    if (model.followMode === 'top') {
      els.viewValue.textContent = 'TOP';
      els.viewValue.style.color = '#74f6ff';
      els.toggleViewBtn.classList.add('is-active');
    } else if (model.cameraProjectionMode === 'iso') {
      els.viewValue.textContent = 'CAMÉRA ISO';
      els.viewValue.style.color = '#7ab6ff';
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
    } else {
      els.projectionValue.textContent = 'PERSPECTIVE';
    }

    if (model.inventoryOpen) {
      const selection = model.inventorySelectionLabel ? ` • ${model.inventorySelectionLabel}` : '';
      els.statusText.textContent = `Inventaire ouvert • flèches = naviguer • E = fermer${selection}${modeSuffix}`;
    } else if (model.followMode === 'top') {
      els.statusText.textContent = `${modePrefix} • Top = lecture claire et déplacement libre${modeSuffix}`;
    } else if (model.cameraProjectionMode === 'iso') {
      els.statusText.textContent = `${modePrefix} • Caméra isométrique = lecture douce, style maquette${modeSuffix}`;
    } else {
      els.statusText.textContent = `${modePrefix} • Caméra perspective = suivi plus immersif${modeSuffix}`;
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
