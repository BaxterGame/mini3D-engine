// mini-engine v0.2e — caméra simplifiée
// Cycle unique sur `C` : top 2D -> isométrique -> perspective.
// Orbit à 45° et perspective stabilisée pour éviter l'effet "tourner en rond".

import { rotateVector } from '../utils/math.js';
import { setOrthoSize } from './renderer.js';

const CAMERA_MODE_ORDER = ['top', 'iso', 'perspective'];
const ORBIT_STEP_ANGLE = Math.PI / 4;

function normalize2D(x, z) {
  const length = Math.hypot(x, z) || 1;
  return { x: x / length, z: z / length };
}

function basisFromLook(pos, look) {
  const forward = normalize2D(look.x - pos.x, look.z - pos.z);
  return {
    forward,
    right: {
      x: -forward.z,
      z: forward.x,
    },
  };
}

export function createCameraController({ THREE, orthoCamera, perspectiveCamera, cameraState, playerPulseLight }) {
  let cameraMode = 'top';
  let orbitSteps = 0;
  let orbitAngle = 0;
  let orthoSize = 22;
  let movementBasis = {
    forward: { x: 0, z: -1 },
    right: { x: 1, z: 0 },
  };

  function getCameraMode() {
    return cameraMode;
  }

  function getFollowMode() {
    return cameraMode === 'top' ? 'top' : 'camera';
  }

  function getProjectionMode() {
    return cameraMode;
  }

  function getOrbitSteps() {
    return orbitSteps;
  }

  function getOrthoSize() {
    return orthoSize;
  }

  function getMovementBasis() {
    return movementBasis;
  }

  function cycleMode() {
    const currentIndex = CAMERA_MODE_ORDER.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % CAMERA_MODE_ORDER.length;
    cameraMode = CAMERA_MODE_ORDER[nextIndex];
  }

  function rotateOrbit(step) {
    orbitSteps += step;
  }

  function resetOrbit() {
    orbitSteps = 0;
  }

  function update(delta, timeElapsed, player) {
    const posSmooth = 1 - Math.exp(-4.8 * delta);
    const lookSmooth = 1 - Math.exp(-7.2 * delta);
    const orbitSmooth = 1 - Math.exp(-10.5 * delta);

    orbitAngle += (orbitSteps * ORBIT_STEP_ANGLE - orbitAngle) * orbitSmooth;

    let desiredPos;
    let desiredLook;
    let nextCamera;
    let modeKey = cameraMode;

    if (cameraMode === 'top') {
      nextCamera = orthoCamera;
      orthoCamera.up.set(0, 0, -1);
      orthoSize = 25;
      setOrthoSize(orthoCamera, orthoSize);

      desiredPos = new THREE.Vector3(player.x, 46, player.z + 0.001);
      desiredLook = new THREE.Vector3(player.x, 0, player.z);
      movementBasis = {
        forward: { x: 0, z: -1 },
        right: { x: 1, z: 0 },
      };
    } else if (cameraMode === 'iso') {
      nextCamera = orthoCamera;
      orthoCamera.up.set(0, 1, 0);
      orthoSize = 20;
      setOrthoSize(orthoCamera, orthoSize);

      const isoOffset = rotateVector(18, 18, orbitAngle);
      desiredPos = new THREE.Vector3(player.x + isoOffset.x, 18, player.z + isoOffset.z);
      desiredLook = new THREE.Vector3(player.x, 0.7, player.z);
      movementBasis = basisFromLook(desiredPos, desiredLook);
      modeKey = `${cameraMode}-${orbitSteps}`;
    } else {
      nextCamera = perspectiveCamera;

      const perspectiveOffset = rotateVector(10.5, 12.5, orbitAngle);
      desiredPos = new THREE.Vector3(
        player.x + perspectiveOffset.x,
        9.25,
        player.z + perspectiveOffset.z,
      );
      desiredLook = new THREE.Vector3(player.x, 1.05, player.z);
      movementBasis = basisFromLook(desiredPos, desiredLook);
      modeKey = `${cameraMode}-${orbitSteps}`;
    }

    if (!cameraState.ready || cameraState.key !== modeKey) {
      cameraState.pos.copy(desiredPos);
      cameraState.look.copy(desiredLook);
      cameraState.key = modeKey;
      cameraState.ready = true;
    } else {
      cameraState.pos.lerp(desiredPos, posSmooth);
      cameraState.look.lerp(desiredLook, lookSmooth);
    }

    nextCamera.position.copy(cameraState.pos);
    nextCamera.lookAt(cameraState.look);

    if (cameraMode !== 'top') {
      movementBasis = basisFromLook(cameraState.pos, cameraState.look);
    }

    if (playerPulseLight) {
      playerPulseLight.position.x = player.x;
      playerPulseLight.position.z = player.z;
      playerPulseLight.intensity = 1.1 + Math.sin(timeElapsed * 4.5) * 0.08;
    }

    return nextCamera;
  }

  return {
    update,
    cycleMode,
    rotateOrbit,
    resetOrbit,
    getCameraMode,
    getFollowMode,
    getProjectionMode,
    getOrbitSteps,
    getOrthoSize,
    getMovementBasis,
  };
}
