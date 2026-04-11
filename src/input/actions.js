// mini-engine v0.2f — actions sémantiques
// Mapping gameplay #38 :
// - WASD = déplacement
// - Q = cycle des modes joueur
// - R = inventaire
// - flèches = caméra (zoom / rotation)
// - clic gauche souris = action principale (build / fire)
// Les raccourcis historiques C / J / L / X restent tolérés en alias léger.
function boolToAxis(positive, negative) {
  return (positive ? 1 : 0) - (negative ? 1 : 0);
}

export function createActionController(input) {
  function getMovementIntent() {
    const left = input.isDown('a');
    const right = input.isDown('d');
    const up = input.isDown('w');
    const down = input.isDown('s');

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
      return input.isDown('space') || input.isDown('mouseleft');
    },
    consumePrimaryActionPress() {
      return input.consumePress('space') || input.consumePress('mouseleft');
    },
    consumePrimaryActionRelease() {
      return input.consumeRelease('space') || input.consumeRelease('mouseleft');
    },
    consumeRestart() {
      return input.consumePress('z');
    },
    consumeCycleCamera() {
      return input.consumePress('c');
    },
    consumeToggleWorldMode() {
      return input.consumePress('m');
    },
    consumeRotateLeft() {
      if (input.isDown('shift')) return false;
      return input.consumePress('arrowleft') || input.consumePress('j');
    },
    consumeRotateRight() {
      if (input.isDown('shift')) return false;
      return input.consumePress('arrowright') || input.consumePress('l');
    },
    consumeZoomIn() {
      if (input.isDown('shift')) return false;
      return input.consumePress('arrowup');
    },
    consumeZoomOut() {
      if (input.isDown('shift')) return false;
      return input.consumePress('arrowdown');
    },
    consumeBuildHeightUp() {
      return input.isDown('shift') && input.consumePress('arrowup');
    },
    consumeBuildHeightDown() {
      return input.isDown('shift') && input.consumePress('arrowdown');
    },
    consumeAssetRotateLeft() {
      return input.isDown('shift') && input.consumePress('arrowleft');
    },
    consumeAssetRotateRight() {
      return input.isDown('shift') && input.consumePress('arrowright');
    },
    consumeInventoryLeft() {
      return input.consumePress('arrowleft') || input.consumePress('a');
    },
    consumeInventoryRight() {
      return input.consumePress('arrowright') || input.consumePress('d');
    },
    consumeInventoryUp() {
      return input.consumePress('arrowup') || input.consumePress('w');
    },
    consumeInventoryDown() {
      return input.consumePress('arrowdown') || input.consumePress('s');
    },
    consumeInventoryConfirm() {
      return input.consumePress('enter');
    },
    consumeInventoryToggle() {
      return input.consumePress('r');
    },

    consumeToggleWallDestroyMode() {
      return input.consumePress('e');
    },
    consumeNextPlayerMode() {
      return input.consumePress('q') || input.consumePress('x');
    },
  };
}
