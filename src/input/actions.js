// mini-engine v0.2d — actions sémantiques
// La caméra utilise maintenant un cycle unique sur `C` :
// top 2D -> isométrique -> perspective -> top 2D.
// `X` reste dédié au cycle des modes du player.

function boolToAxis(positive, negative) {
  return (positive ? 1 : 0) - (negative ? 1 : 0);
}

export function createActionController(input) {
  function getMovementIntent() {
    const left = input.isDown('arrowleft') || input.isDown('q') || input.isDown('a');
    const right = input.isDown('arrowright') || input.isDown('d');
    const up = input.isDown('arrowup') || input.isDown('z') || input.isDown('w');
    const down = input.isDown('arrowdown') || input.isDown('s');

    return {
      left,
      right,
      up,
      down,
      x: boolToAxis(right, left),
      z: boolToAxis(down, up),
    };
  }

  return {
    getMovementIntent,

    isSprintHeld() {
      return input.isDown('shift');
    },

    isPrimaryActionHeld() {
      return input.isDown('space');
    },

    consumePrimaryActionRelease() {
      return input.consumeRelease('space');
    },

    consumeRestart() {
      return input.consumePress('r');
    },

    consumeCycleCamera() {
      return input.consumePress('c');
    },

    consumeToggleWorldMode() {
      return input.consumePress('m');
    },

    consumeOrbitLeft() {
      return input.consumePress('j');
    },

    consumeOrbitRight() {
      return input.consumePress('l');
    },

    consumeNextPlayerMode() {
      return input.consumePress('x');
    },
  };
}
