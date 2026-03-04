// mini-engine v0.1c — caméra (top/iso/perspective) + orbite 90°

import { rotateVector } from '../utils/math.js';
import { setOrthoSize } from './renderer.js';

export function createCameraController({ THREE, orthoCamera, perspectiveCamera, cameraState, playerPulseLight }) {
  let followMode = 'top';
  let projectionMode = 'iso';
  let orbitSteps = 0;
  let orbitAngle = 0;
  let orthoSize = 22;

  function getFollowMode() { return followMode; }
  function getProjectionMode() { return projectionMode; }
  function getOrbitSteps() { return orbitSteps; }
  function getOrthoSize() { return orthoSize; }

  function toggleView() {
    followMode = followMode === 'top' ? 'camera' : 'top';
  }

  function toggleProjection() {
    projectionMode = projectionMode === 'iso' ? 'perspective' : 'iso';
  }

  function rotateOrbit(step) {
    orbitSteps += step;
  }

  function resetOrbit() {
    orbitSteps = 0;
  }

  /**
   * Update camera and return the active camera.
   * @param {number} delta
   * @param {number} timeElapsed
   * @param {{x:number,z:number,lastMove:{x:number,z:number}}} player
   */
  function update(delta, timeElapsed, player) {
    const posSmooth = 1 - Math.exp(-4.8 * delta);
    const lookSmooth = 1 - Math.exp(-7.2 * delta);
    const orbitSmooth = 1 - Math.exp(-10.5 * delta);

    orbitAngle += (orbitSteps * (Math.PI / 2) - orbitAngle) * orbitSmooth;

    let desiredPos;
    let desiredLook;
    let nextCamera;
    const modeKey = `${followMode}-${projectionMode}`;

    if (followMode === 'top') {
      nextCamera = orthoCamera;
      orthoCamera.up.set(0, 0, -1);
      orthoSize = 25;
      setOrthoSize(orthoCamera, orthoSize);
      desiredPos = new THREE.Vector3(player.x, 46, player.z + 0.001);
      desiredLook = new THREE.Vector3(player.x, 0, player.z);
    } else if (projectionMode === 'iso') {
      nextCamera = orthoCamera;
      orthoCamera.up.set(0, 1, 0);
      orthoSize = 20;
      setOrthoSize(orthoCamera, orthoSize);
      const isoOffset = rotateVector(18, 18, orbitAngle);
      desiredPos = new THREE.Vector3(player.x + isoOffset.x, 18, player.z + isoOffset.z);
      desiredLook = new THREE.Vector3(player.x, 0.7, player.z);
    } else {
      nextCamera = perspectiveCamera;
      const dirX = player.lastMove.x || 0;
      const dirZ = player.lastMove.z || -1;
      const sideX = -dirZ;
      const sideZ = dirX;

      const basePosOffset = rotateVector(-dirX * 10 + sideX * 4, -dirZ * 10 + sideZ * 4, orbitAngle);
      const baseLookOffset = rotateVector(dirX * 2.2, dirZ * 2.2, orbitAngle);

      desiredPos = new THREE.Vector3(player.x + basePosOffset.x, 9.4, player.z + basePosOffset.z);
      desiredLook = new THREE.Vector3(player.x + baseLookOffset.x, 1.0, player.z + baseLookOffset.z);
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

    if (playerPulseLight) {
      playerPulseLight.position.x = player.x;
      playerPulseLight.position.z = player.z;
      playerPulseLight.intensity = 1.1 + Math.sin(timeElapsed * 4.5) * 0.08;
    }

    return nextCamera;
  }

  return {
    update,
    toggleView,
    toggleProjection,
    rotateOrbit,
    resetOrbit,
    getFollowMode,
    getProjectionMode,
    getOrbitSteps,
    getOrthoSize
  };
}
