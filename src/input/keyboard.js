// mini-engine v0.2f — input clavier clarifié
// Mapping recentré sur la tâche #38 :
// - WASD = déplacement
// - Q = cycle des modes joueur
// - E = inventaire (placeholder UI)
// - flèches = caméra (zoom / rotation)
// - clic gauche souris = action principale (build / fire)
const HANDLED_KEYS = new Set([
  'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
  'space', 'enter', 'w', 'a', 's', 'd', 'q', 'e',
  'shift', 'r', 'v', 'c', 'm', 'j', 'l', 'x',
]);

function normalizeKey(event) {
  if (event.code === 'Space') return 'space';
  if (event.code === 'Enter' || event.code === 'NumpadEnter') return 'enter';

  const raw = String(event.key || '').toLowerCase();
  if (raw === ' ' || raw === 'spacebar') return 'space';
  if (raw === 'enter' || raw === 'return') return 'enter';
  return raw;
}

function clearMap(map) {
  for (const key of Object.keys(map)) delete map[key];
}

function releaseAll(inputState) {
  for (const key of Object.keys(inputState.down)) {
    if (!inputState.down[key]) continue;
    inputState.down[key] = false;
    inputState.released[key] = true;
  }
}

export function createInputState() {
  return {
    down: Object.create(null),
    pressed: Object.create(null),
    released: Object.create(null),
  };
}

export function createInputController(inputState) {
  function isDown(key) {
    return !!inputState.down[key];
  }

  function wasPressed(key) {
    return !!inputState.pressed[key];
  }

  function wasReleased(key) {
    return !!inputState.released[key];
  }

  function consumePress(key) {
    if (!inputState.pressed[key]) return false;
    delete inputState.pressed[key];
    return true;
  }

  function consumeRelease(key) {
    if (!inputState.released[key]) return false;
    delete inputState.released[key];
    return true;
  }

  function endFrame() {
    clearMap(inputState.pressed);
    clearMap(inputState.released);
  }

  return {
    isDown,
    wasPressed,
    wasReleased,
    consumePress,
    consumeRelease,
    endFrame,
  };
}

/**
 * Branche les listeners clavier et souris et alimente `inputState`.
 * @param {{down: Record<string, boolean>, pressed: Record<string, boolean>, released: Record<string, boolean>}} inputState
 * @returns {() => void} fonction pour détacher les listeners
 */
export function bindKeyboard(inputState) {
  function onKeyDown(event) {
    const key = normalizeKey(event);
    if (HANDLED_KEYS.has(key)) {
      event.preventDefault();
    }
    if (!key) return;

    if (!inputState.down[key]) {
      inputState.pressed[key] = true;
    }
    inputState.down[key] = true;
  }

  function onKeyUp(event) {
    const key = normalizeKey(event);
    if (!key) return;

    if (inputState.down[key]) {
      inputState.released[key] = true;
    }
    inputState.down[key] = false;
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    const key = 'mouseleft';

    if (!inputState.down[key]) {
      inputState.pressed[key] = true;
    }
    inputState.down[key] = true;
  }

  function onMouseUp(event) {
    if (event.button !== 0) return;
    const key = 'mouseleft';

    if (inputState.down[key]) {
      inputState.released[key] = true;
    }
    inputState.down[key] = false;
  }

  function onBlur() {
    releaseAll(inputState);
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return function unbind() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('blur', onBlur);
  };
}
