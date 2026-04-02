// mini-engine v0.2i — transitions caméra fluidifiées + angle cohérent + snap diagonal rétabli
// Cycle caméra : top -> iso -> perspective -> fps
// Rotation : pas de 45° partagés entre iso / perspective / fps.
// Zoom : flèches haut / bas + molette souris, avec bascule douce vers le FPS.

import { rotateVector } from '../utils/math.js';
import { setOrthoSize } from './renderer.js';

const CAMERA_MODE_ORDER = ['top', 'iso', 'perspective', 'fps'];
const CAMERA_ORBIT_STEP_ANGLE = Math.PI / 4;
const MIN_ZOOM_LEVEL = -7;
const MAX_PERSPECTIVE_ZOOM_LEVEL = 5;
const DEFAULT_ORTHO_SIZE = 22;
const DEFAULT_PERSPECTIVE_FOV = 56;
const FPS_FOV = 62;
const MODE_TRANSITION_DURATION = 0.24;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - (2 * t));
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
  return clamp(25 - zoomLevel * 2.1, 11, 40);
}

function getIsoOrthoSize(zoomLevel) {
  return clamp(20 - zoomLevel * 1.7, 10, 32);
}

function getPerspectiveDistanceScale(zoomLevel) {
  return clamp(1 - zoomLevel * 0.09, 0.56, 1.7);
}

function normalizeOrbitSteps(orbitSteps) {
  const wrapped = orbitSteps % 8;
  return wrapped < 0 ? wrapped + 8 : wrapped;
}

function normalizeAngleRadians(angle) {
  const tau = Math.PI * 2;
  let wrapped = angle % tau;
  if (wrapped < 0) wrapped += tau;
  return wrapped;
}

function shortestAngleDelta(fromAngle, toAngle) {
  const tau = Math.PI * 2;
  let delta = normalizeAngleRadians(toAngle) - normalizeAngleRadians(fromAngle);
  if (delta > Math.PI) delta -= tau;
  if (delta < -Math.PI) delta += tau;
  return delta;
}

function getViewOffset(distance, orbitAngle) {
  return rotateVector(distance, distance, orbitAngle);
}

function getViewForward(orbitAngle) {
  const offset = getViewOffset(1, orbitAngle);
  return normalize2D(-offset.x, -offset.z);
}

function getProjectionFamily(mode) {
  return mode === 'top' || mode === 'iso' ? 'ortho' : 'perspective';
}

export function createCameraController({ THREE, orthoCamera, perspectiveCamera, cameraState, playerPulseLight }) {
  let cameraMode = 'top';
  let renderMode = 'top';
  let fpsFromZoom = false;
  let orbitSteps = 1;
  let orbitAngle = CAMERA_ORBIT_STEP_ANGLE;
  let orthoSize = DEFAULT_ORTHO_SIZE;
  let zoomLevel = 0;
  let movementBasis = {
    forward: { x: 0, z: -1 },
    right: { x: 1, z: 0 },
  };

  const transitionState = {
    active: false,
    elapsed: 0,
    duration: MODE_TRANSITION_DURATION,
    startPos: new THREE.Vector3(),
    startLook: new THREE.Vector3(),
    startOrthoSize: DEFAULT_ORTHO_SIZE,
    startFov: DEFAULT_PERSPECTIVE_FOV,
    startRenderMode: 'top',
  };

  function getCameraMode() {
    return cameraMode;
  }

  function getFollowMode() {
    return renderMode === 'top' ? 'top' : 'camera';
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

  function getModeDescriptor(mode, playerRef) {
    if (mode === 'top') {
      return {
        mode,
        projectionFamily: 'ortho',
        orthoSize: getTopOrthoSize(zoomLevel),
        fov: DEFAULT_PERSPECTIVE_FOV,
        topUp: getViewForward(orbitAngle),
        pos: new THREE.Vector3(playerRef.x, 46, playerRef.z),
        look: new THREE.Vector3(playerRef.x, 0, playerRef.z),
      };
    }

    if (mode === 'iso') {
      const isoDistanceScale = clamp(1 - zoomLevel * 0.05, 0.72, 1.3);
      const isoOffset = getViewOffset(18 * isoDistanceScale, orbitAngle);
      const isoHeight = clamp(18 * isoDistanceScale, 12.5, 24);

      return {
        mode,
        projectionFamily: 'ortho',
        orthoSize: getIsoOrthoSize(zoomLevel),
        fov: DEFAULT_PERSPECTIVE_FOV,
        pos: new THREE.Vector3(playerRef.x + isoOffset.x, isoHeight, playerRef.z + isoOffset.z),
        look: new THREE.Vector3(playerRef.x, 0.7, playerRef.z),
      };
    }

    if (mode === 'perspective') {
      const distanceScale = getPerspectiveDistanceScale(zoomLevel);
      const perspectiveOffset = getViewOffset(8.85 * distanceScale, orbitAngle);
      const perspectiveHeight = clamp(9.25 * distanceScale, 5.4, 16.5);

      return {
        mode,
        projectionFamily: 'perspective',
        orthoSize: getIsoOrthoSize(zoomLevel),
        fov: DEFAULT_PERSPECTIVE_FOV,
        pos: new THREE.Vector3(
          playerRef.x + perspectiveOffset.x,
          perspectiveHeight,
          playerRef.z + perspectiveOffset.z,
        ),
        look: new THREE.Vector3(playerRef.x, 1.05, playerRef.z),
      };
    }

    const forward = getViewForward(orbitAngle);
    const cameraBack = 1.0;
    const cameraLift = 1.5;
    const lookAhead = 12;
    const lookLift = 1.1;

    return {
      mode,
      projectionFamily: 'perspective',
      orthoSize: getIsoOrthoSize(zoomLevel),
      fov: FPS_FOV,
      pos: new THREE.Vector3(
        playerRef.x - (forward.x * cameraBack),
        cameraLift,
        playerRef.z - (forward.z * cameraBack),
      ),
      look: new THREE.Vector3(
        playerRef.x + (forward.x * lookAhead),
        lookLift,
        playerRef.z + (forward.z * lookAhead),
      ),
    };
  }

  function beginTransition(nextMode) {
    if (!nextMode) return;
    if (!cameraState.ready) {
      cameraMode = nextMode;
      renderMode = nextMode;
      return;
    }

    transitionState.active = true;
    transitionState.elapsed = 0;
    transitionState.startPos.copy(cameraState.pos);
    transitionState.startLook.copy(cameraState.look);
    transitionState.startOrthoSize = orthoSize;
    transitionState.startFov = perspectiveCamera.fov || DEFAULT_PERSPECTIVE_FOV;
    transitionState.startRenderMode = renderMode;
    cameraMode = nextMode;
  }

  function cycleMode() {
    const currentIndex = CAMERA_MODE_ORDER.indexOf(cameraMode);
    const nextIndex = (currentIndex + 1) % CAMERA_MODE_ORDER.length;
    const nextMode = CAMERA_MODE_ORDER[nextIndex];

    fpsFromZoom = false;
    beginTransition(nextMode);
  }

  function rotateOrbit(step) {
    if (step === 0) return;
    fpsFromZoom = false;
    orbitSteps = normalizeOrbitSteps(orbitSteps + step);
  }

  function zoomBy(step) {
    if (step === 0) return zoomLevel;

    if (cameraMode === 'perspective' && step > 0 && zoomLevel >= MAX_PERSPECTIVE_ZOOM_LEVEL) {
      fpsFromZoom = true;
      beginTransition('fps');
      return zoomLevel;
    }

    if (cameraMode === 'fps') {
      if (fpsFromZoom && step < 0) {
        fpsFromZoom = false;
        beginTransition('perspective');
      }
      return zoomLevel;
    }

    zoomLevel = clamp(zoomLevel + step, MIN_ZOOM_LEVEL, MAX_PERSPECTIVE_ZOOM_LEVEL);
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
    fpsFromZoom = false;
    if (cameraMode === 'fps') {
      beginTransition('perspective');
    }
  }

  function update(delta, timeElapsed, player) {
    const defaultPosSmooth = 1 - Math.exp(-5.4 * delta);
    const defaultLookSmooth = 1 - Math.exp(-7.8 * delta);
    const defaultOrbitSmooth = 1 - Math.exp(-12 * delta);
    const fpsPosSmooth = 1 - Math.exp(-8.8 * delta);
    const fpsLookSmooth = 1 - Math.exp(-11 * delta);
    const fpsOrbitSmooth = 1 - Math.exp(-13 * delta);
    const orthoSmooth = 1 - Math.exp(-10 * delta);

    const targetOrbitAngle = normalizeAngleRadians(orbitSteps * CAMERA_ORBIT_STEP_ANGLE);
    const orbitSmooth = cameraMode === 'fps' ? fpsOrbitSmooth : defaultOrbitSmooth;
    orbitAngle = normalizeAngleRadians(orbitAngle + (shortestAngleDelta(orbitAngle, targetOrbitAngle) * orbitSmooth));

    const descriptor = getModeDescriptor(cameraMode, player);
    const posSmooth = cameraMode === 'fps' ? fpsPosSmooth : defaultPosSmooth;
    const lookSmooth = cameraMode === 'fps' ? fpsLookSmooth : defaultLookSmooth;

    let desiredPos = descriptor.pos;
    let desiredLook = descriptor.look;
    let targetOrthoSize = descriptor.orthoSize;
    let targetFov = descriptor.fov;
    let targetTopUp = descriptor.topUp || { x: 0, z: -1 };
    let nextRenderMode = cameraMode;

    if (transitionState.active) {
      transitionState.elapsed += Math.max(0, delta);
      const rawProgress = clamp(transitionState.elapsed / transitionState.duration, 0, 1);
      const eased = smoothstep01(rawProgress);

      desiredPos = transitionState.startPos.clone().lerp(descriptor.pos, eased);
      desiredLook = transitionState.startLook.clone().lerp(descriptor.look, eased);
      targetOrthoSize = lerp(transitionState.startOrthoSize, descriptor.orthoSize, eased);
      targetFov = lerp(transitionState.startFov, descriptor.fov, eased);
      targetTopUp = descriptor.topUp || targetTopUp;

      const startFamily = getProjectionFamily(transitionState.startRenderMode);
      const targetFamily = getProjectionFamily(cameraMode);
      if (startFamily !== targetFamily && rawProgress < 0.5) {
        nextRenderMode = transitionState.startRenderMode;
      }

      if (rawProgress >= 1) {
        transitionState.active = false;
        nextRenderMode = cameraMode;
      }
    }

    renderMode = nextRenderMode;

    if (renderMode === 'top' || renderMode === 'iso') {
      if (renderMode === 'top') {
        orthoCamera.up.set(targetTopUp.x, 0, targetTopUp.z);
      } else {
        orthoCamera.up.set(0, 1, 0);
      }
      orthoSize += (targetOrthoSize - orthoSize) * orthoSmooth;
      setOrthoSize(orthoCamera, orthoSize);
    }

    perspectiveCamera.up.set(0, 1, 0);
    perspectiveCamera.fov = targetFov;
    perspectiveCamera.updateProjectionMatrix();

    if (!cameraState.ready) {
      cameraState.pos.copy(desiredPos);
      cameraState.look.copy(desiredLook);
      cameraState.ready = true;
    } else {
      cameraState.pos.lerp(desiredPos, posSmooth);
      cameraState.look.lerp(desiredLook, lookSmooth);
    }

    const nextCamera = getProjectionFamily(renderMode) === 'ortho' ? orthoCamera : perspectiveCamera;
    nextCamera.position.copy(cameraState.pos);
    nextCamera.lookAt(cameraState.look);

    if (renderMode === 'top') {
      const topForward = getViewForward(orbitAngle);
      movementBasis = {
        forward: topForward,
        right: { x: -topForward.z, z: topForward.x },
      };
    } else {
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
