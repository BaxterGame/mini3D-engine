// mini-engine v0.2d — HUD et UI
// La caméra utilise désormais un cycle unique sur `C`.

export function createHud(els, config) {
  function syncViewUi(model) {
    const modePrefix = model.worldMode === 'exploration' ? 'Exploration' : 'Mission';
    const modeSuffix = model.playerModeLabel ? ` • Mode ${model.playerModeLabel}` : '';
    const cameraMode = model.cameraMode || model.cameraProjectionMode || 'top';

    els.toggleViewBtn.textContent = 'Cycle caméra (C)';
    els.toggleViewBtn.classList.add('is-active');

    if (els.toggleProjectionBtn) {
      els.toggleProjectionBtn.style.display = 'none';
      els.toggleProjectionBtn.classList.remove('is-active');
    }

    if (cameraMode === 'top') {
      els.viewValue.textContent = 'TOP 2D';
      els.viewValue.style.color = '#74f6ff';
      els.projectionValue.textContent = '2D';
      els.statusText.textContent = `${modePrefix} • Top = lecture claire et navigation libre${modeSuffix}`;
    } else if (cameraMode === 'iso') {
      els.viewValue.textContent = 'CAMÉRA ISO';
      els.viewValue.style.color = '#7ab6ff';
      els.projectionValue.textContent = 'ISOMÉTRIQUE';
      els.statusText.textContent = `${modePrefix} • Isométrique = lecture 3D stable et repères conservés${modeSuffix}`;
    } else {
      els.viewValue.textContent = 'CAMÉRA PERSP';
      els.viewValue.style.color = '#ffd76b';
      els.projectionValue.textContent = 'PERSPECTIVE';
      els.statusText.textContent = `${modePrefix} • Perspective = déplacement aligné à l’écran pour moins se perdre${modeSuffix}`;
    }

    els.toggleSandboxBtn.classList.toggle('is-active', model.worldMode === 'exploration');
    els.orbitLeftBtn.classList.toggle('is-active', cameraMode !== 'top');
    els.orbitRightBtn.classList.toggle('is-active', cameraMode !== 'top');
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
