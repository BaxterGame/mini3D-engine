// mini-engine v0.1h — actions sémantiques au-dessus du clavier brut
// Ce module sépare :
// - l'état physique des touches
// - les actions gameplay/UI consommées par le reste du code

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
      z: boolToAxis(down, up)
    };
  }

  function consumeOrbitRight() {
    return input.consumePress('l') || input.consumePress('x');
  }

  return {
    getMovementIntent,

    isSprintHeld() {
      return input.isDown('shift');
    },

    isWallActionHeld() {
      return input.isDown('space');
    },

    consumeWallActionRelease() {
      return input.consumeRelease('space');
    },

    consumeRestart() {
      return input.consumePress('r');
    },

    consumeToggleView() {
      return input.consumePress('v');
    },

    consumeToggleProjection() {
      return input.consumePress('c');
    },

    consumeToggleWorldMode() {
      return input.consumePress('m');
    },

    consumeOrbitLeft() {
      return input.consumePress('j');
    },

    consumeOrbitRight
  };
}
