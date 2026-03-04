// mini-engine v0.1b — input clavier

/**
 * Branche les listeners clavier et remplit l'objet `keys` (booleans).
 * @param {Record<string, boolean>} keys
 * @param {{ onSpaceRelease?: () => void }} opts
 * @returns {() => void} fonction pour détacher les listeners
 */
export function bindKeyboard(keys, opts = {}) {
  const { onSpaceRelease } = opts;

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if (
      [
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
        ' ', 'spacebar', 'w', 'a', 's', 'd', 'z', 'q', 'shift', 'r', 'v', 'c', 'm', 'j', 'l', 'x'
      ].includes(key) || event.code === 'Space'
    ) {
      event.preventDefault();
    }
    keys[key] = true;
    if (event.code === 'Space') keys[' '] = true;
  }

  function onKeyUp(event) {
    const key = event.key.toLowerCase();
    keys[key] = false;
    if (event.code === 'Space') {
      keys[' '] = false;
      if (typeof onSpaceRelease === 'function') onSpaceRelease();
    }
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp);

  return function unbind() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
}
