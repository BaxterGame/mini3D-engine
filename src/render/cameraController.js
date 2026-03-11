// mini-engine v0.2f — caméra simplifiée + zoom clavier / molette
// Cycle caméra conservé sur `C` / bouton UI.
// Rotation : pas de 45°.
// Zoom : flèche haut / bas + molette souris.

import { rotateVector } from '../utils/math.js';
import { setOrthoSize } from './renderer.js';

const CAMERA_MODE_ORDER = ['top', 'iso', 'perspective'];
const ORBIT_STEP_ANGLE = Math.PI / 4;
const MIN_ZOOM_LEVEL = -4;
const MAX_ZOOM_LEVEL = 5;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

function getTopOrthoSize(zoomLevel) {
  return clamp(25 - zoomLevel * 2.1, 11, 34);
}

function getIsoOrthoSize(zoomLevel) {
  return clamp(20 - zoomLevel * 1.7, 10, 28);
}

function getPerspectiveDistanceScale(zoomLevel) {
  return clamp(1 - zoomLevel * 0.09, 0.56, 1.6);
}

export function createCameraController({ THREE, orthoCamera, perspectiveCamera, cameraState, playerPulseLight }) {
  let cameraMode = 'top';
  let orbitSteps = 0;
  let orbitAngle = 0;
  let orthoSize = 22;
  let zoomLevel = 0;
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

  function getZoomLevel() {
    return zoomLevel;
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

  function zoomBy(step) {
    zoomLevel = clamp(zoomLevel + step, MIN_ZOOM_LEVEL, MAX_ZOOM_LEVEL);
    return zoomLevel;
  }

  function zoomFromWheel(deltaY) {
    if (deltaY === 0) return zoomLevel;
    return zoomBy(deltaY < 0 ? 1 : -1);
  }

  function resetOrbit() {
    orbitSteps = 0;
  }

  function resetZoom() {
    zoomLevel = 0;
  }

  function update(delta, timeElapsed, player) {
    const posSmooth = 1 - Math.exp(-4.8 * delta);
    const lookSmooth = 1 - Math.exp(-7.2 * delta);
    const orbitSmooth = 1 - Math.exp(-10.5 * delta);

    orbitAngle += (orbitSteps * ORBIT_STEP_ANGLE - orbitAngle) * orbitSmooth;

    let desiredPos;
    let desiredLook;
    let nextCamera;
    let modeKey = `${cameraMode}-${orbitSteps}-${zoomLevel}`;

    if (cameraMode === 'top') {
      nextCamera = orthoCamera;
      orthoCamera.up.set(0, 0, -1);
      orthoSize = getTopOrthoSize(zoomLevel);
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
      orthoSize = getIsoOrthoSize(zoomLevel);
      setOrthoSize(orthoCamera, orthoSize);

      const isoDistanceScale = clamp(1 - zoomLevel * 0.05, 0.72, 1.3);
      const isoOffset = rotateVector(18 * isoDistanceScale, 18 * isoDistanceScale, orbitAngle);
      const isoHeight = clamp(18 * isoDistanceScale, 12.5, 24);

      desiredPos = new THREE.Vector3(player.x + isoOffset.x, isoHeight, player.z + isoOffset.z);
      desiredLook = new THREE.Vector3(player.x, 0.7, player.z);
      movementBasis = basisFromLook(desiredPos, desiredLook);
    } else {
      nextCamera = perspectiveCamera;

      const distanceScale = getPerspectiveDistanceScale(zoomLevel);
      const perspectiveOffset = rotateVector(10.5 * distanceScale, 12.5 * distanceScale, orbitAngle);
      const perspectiveHeight = clamp(9.25 * distanceScale, 5.4, 15.5);

      desiredPos = new THREE.Vector3(
        player.x + perspectiveOffset.x,
        perspectiveHeight,
        player.z + perspectiveOffset.z,
      );
      desiredLook = new THREE.Vector3(player.x, 1.05, player.z);
      movementBasis = basisFromLook(desiredPos, desiredLook);
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
    zoomBy,
    zoomFromWheel,
    resetOrbit,
    resetZoom,
    getCameraMode,
    getFollowMode,
    getProjectionMode,
    getOrbitSteps,
    getOrthoSize,
    getZoomLevel,
    getMovementBasis,
  };
}
