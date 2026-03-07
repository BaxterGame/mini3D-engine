// mini-engine v0.2a — HUD et UI
// Ajoute un rappel léger du mode player dans le texte de statut.

export function createHud(els, config) {
  function syncViewUi(model) {
    const modePrefix = model.worldMode === 'exploration' ? 'Exploration' : 'Mission';
    const modeSuffix = model.playerModeLabel ? ` • Mode ${model.playerModeLabel}` : '';

    if (model.followMode === 'top') {
      els.viewValue.textContent = 'TOP';
      els.viewValue.style.color = '#74f6ff';
      els.statusText.textContent = `${modePrefix} • Top = lecture claire et déplacement libre${modeSuffix}`;
      els.toggleViewBtn.classList.add('is-active');
    } else if (model.cameraProjectionMode === 'iso') {
      els.viewValue.textContent = 'CAMÉRA ISO';
      els.viewValue.style.color = '#7ab6ff';
      els.statusText.textContent = `${modePrefix} • Caméra isométrique = lecture douce, style maquette${modeSuffix}`;
      els.toggleViewBtn.classList.remove('is-active');
    } else {
      els.viewValue.textContent = 'CAMÉRA PERSP';
      els.viewValue.style.color = '#ffd76b';
      els.statusText.textContent = `${modePrefix} • Caméra perspective = suivi plus immersif${modeSuffix}`;
      els.toggleViewBtn.classList.remove('is-active');
    }

    els.projectionValue.textContent = model.cameraProjectionMode === 'iso' ? 'ISOMÉTRIQUE' : 'PERSPECTIVE';
    els.toggleProjectionBtn.classList.toggle('is-active', model.cameraProjectionMode === 'iso');
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
