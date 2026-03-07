// mini-engine v0.1h — input clavier clarifié
// Distinction explicite entre :
// - touche maintenue (`down`)
// - touche pressée ce frame (`pressed`)
// - touche relâchée ce frame (`released`)
// Le module reste volontairement léger et sans dépendance gameplay.

const HANDLED_KEYS = new Set([
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'space',
  'w', 'a', 's', 'd',
  'z', 'q',
  'shift',
  'r', 'v', 'c', 'm',
  'j', 'l', 'x'
]);

function normalizeKey(event) {
  if (event.code === 'Space') return 'space';

  const raw = String(event.key || '').toLowerCase();
  if (raw === ' ' || raw === 'spacebar') return 'space';
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
    released: Object.create(null)
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
    endFrame
  };
}

/**
 * Branche les listeners clavier et alimente `inputState`.
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

  function onBlur() {
    releaseAll(inputState);
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return function unbind() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
  };
}
