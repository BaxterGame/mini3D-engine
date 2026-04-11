// mini-engine v0.2e — entities/player
// Déplacement reprojeté selon la caméra en 3D, sans perdre les assets du player.

import { clamp, normalize2D } from '../utils/math.js';
import { INNER_LIMIT as DEFAULT_INNER_LIMIT } from '../config.js';
import { getPlayerModeDef } from './playerModes.js';

const WALL_GRID_SNAP_EPSILON = 0.001;
const WALL_GRID_SNAP_LERP_SPEED = 12;

function smoothToward(current, target, delta, speed) {
  if (!Number.isFinite(current) || !Number.isFinite(target)) return target;
  const factor = 1 - Math.exp(-Math.max(0, speed) * Math.max(0, delta));
  return current + ((target - current) * factor);
}

function disposeObject3D(object) {
  if (!object) return;

  object.traverse((child) => {
    if (child.geometry && typeof child.geometry.dispose === 'function') {
      child.geometry.dispose();
    }

    const { material } = child;
    if (Array.isArray(material)) {
      for (const mat of material) {
        if (mat && typeof mat.dispose === 'function') mat.dispose();
      }
    } else if (material && typeof material.dispose === 'function') {
      material.dispose();
    }
  });
}

function projectMovementToCamera(movement, cameraController) {
  if (!cameraController || cameraController.getFollowMode() === 'top') {
    return { x: movement.x, z: movement.z };
  }

  const basis = cameraController.getMovementBasis?.();
  if (!basis?.right || !basis?.forward) {
    return { x: movement.x, z: movement.z };
  }

  const horizontal = movement.x;
  const vertical = -movement.z;

  return {
    x: basis.right.x * horizontal + basis.forward.x * vertical,
    z: basis.right.z * horizontal + basis.forward.z * vertical,
  };
}


function getNormalizedWallMovementConstraint(constraint) {
  if (!constraint?.active) return null;

  const stepX = Number.isFinite(constraint.stepX) ? constraint.stepX : 0;
  const stepZ = Number.isFinite(constraint.stepZ) ? constraint.stepZ : 0;
  if (stepX === 0 && stepZ === 0) return null;

  const direction = normalize2D({ x: stepX, z: stepZ });
  return {
    anchorX: Number.isFinite(constraint.anchorX) ? constraint.anchorX : 0,
    anchorZ: Number.isFinite(constraint.anchorZ) ? constraint.anchorZ : 0,
    directionX: direction.x,
    directionZ: direction.z,
  };
}

function projectPointToConstraintLine(x, z, constraint) {
  if (!constraint) return { x, z };

  const dx = x - constraint.anchorX;
  const dz = z - constraint.anchorZ;
  const distanceOnLine = (dx * constraint.directionX) + (dz * constraint.directionZ);

  return {
    x: constraint.anchorX + (constraint.directionX * distanceOnLine),
    z: constraint.anchorZ + (constraint.directionZ * distanceOnLine),
  };
}

export function createPlayerSystem({
  THREE,
  scene,
  keys,
  actions,
  collidesAtPlayer,
  getTimeElapsed,
  getCameraController,
  getWallMovementConstraint = null,
  getWallGridSnapTarget = null,
  getBuildPreviewDescriptor = null,
  assetLibrary = null,
  INNER_LIMIT = DEFAULT_INNER_LIMIT,
}) {
  let player = null;
  let group = null;
  let core = null;
  let halo = null;
  let editPreview = null;
  let editPreviewKey = '';
  let editPreviewVisible = false;
  let directionHint = null;
  const buildIndicator = {
    active: false,
    level: 0,
    destroyMode: false,
    previewBaseY: 0,
    previewCenterY: 0.5,
    previewTopY: 1.0,
    previewCellX: 0,
    previewCellZ: 0,
    stepHeight: 1,
    rotationY: 0,
    showDirectionHint: false,
  };

  function getLegacyMovementIntent() {
    const left = !!(keys && (keys.arrowleft || keys.q || keys.a));
    const right = !!(keys && (keys.arrowright || keys.d));
    const up = !!(keys && (keys.arrowup || keys.z || keys.w));
    const down = !!(keys && (keys.arrowdown || keys.s));

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      z: (down ? 1 : 0) - (up ? 1 : 0),
    };
  }

  function getSpeedMultiplier() {
    if (!player) return 1;
    return getPlayerModeDef(player.mode).speedMultiplier ?? 1;
  }

  function createCoreVisual(mode, def) {
    if (assetLibrary && typeof assetLibrary.createPlayerModeVisual === 'function') {
      const visual = assetLibrary.createPlayerModeVisual(mode);
      if (visual) return visual;
    }

    return def.createCore(THREE);
  }

  function clearEditPreview() {
    if (!group || !editPreview) return;
    group.remove(editPreview);
    disposeObject3D(editPreview);
    editPreview = null;
    editPreviewKey = '';
  }

  function setCoreVisible(visible) {
    if (core) core.visible = visible;
  }

  function buildPreviewKey(descriptor) {
    if (!descriptor) return '';
    return [
      descriptor.variantId || 'none',
      Number.isFinite(descriptor.rotationY) ? descriptor.rotationY.toFixed(3) : '0',
      Number.isFinite(descriptor.tiltX) ? descriptor.tiltX.toFixed(3) : '0',
      Number.isFinite(descriptor.rotationZ) ? descriptor.rotationZ.toFixed(3) : '0',
      Number.isFinite(descriptor.offsetY) ? descriptor.offsetY.toFixed(3) : '0',
    ].join('|');
  }

  function createEditPreviewVisual(descriptor) {
    if (!descriptor) return null;

    if (typeof descriptor.createPreview === 'function') {
      const preview = descriptor.createPreview();
      if (preview) return preview;
    }

    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.72, 0.72),
      new THREE.MeshStandardMaterial({
        color: 0x66ccff,
        transparent: true,
        opacity: 0.82,
        roughness: 0.55,
        metalness: 0.04,
      }),
    );
    fallback.castShadow = true;
    fallback.receiveShadow = true;
    return fallback;
  }

  function alignPreviewCenterToLocalY(targetLocalCenterY = 0) {
    if (!editPreview || !group) return;
    editPreview.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(editPreview);
    if (!Number.isFinite(bounds.min.y) || !Number.isFinite(bounds.max.y)) return;
    const localCenterY = ((bounds.min.y + bounds.max.y) * 0.5) - group.position.y;
    editPreview.position.y += targetLocalCenterY - localCenterY;
    editPreview.updateMatrixWorld(true);
  }

  function applyEditPreviewTransform(descriptor) {
    if (!editPreview || !descriptor) return;

    editPreview.position.set(
      Number.isFinite(descriptor.offsetX) ? descriptor.offsetX : 0,
      Number.isFinite(descriptor.offsetY) ? descriptor.offsetY : 0,
      Number.isFinite(descriptor.offsetZ) ? descriptor.offsetZ : 0,
    );

    editPreview.rotation.set(
      Number.isFinite(descriptor.tiltX) ? descriptor.tiltX : 0,
      Number.isFinite(descriptor.rotationY) ? descriptor.rotationY : 0,
      Number.isFinite(descriptor.rotationZ) ? descriptor.rotationZ : 0,
    );

    alignPreviewCenterToLocalY(Number.isFinite(descriptor.offsetY) ? descriptor.offsetY : 0);
  }

  function syncEditPreview(descriptor) {
    const nextKey = buildPreviewKey(descriptor);
    if (!descriptor) {
      clearEditPreview();
      return;
    }

    if (!editPreview || editPreviewKey !== nextKey) {
      clearEditPreview();
      editPreview = createEditPreviewVisual(descriptor);
      editPreviewKey = nextKey;
      if (editPreview) group.add(editPreview);
    }

    applyEditPreviewTransform(descriptor);
  }

  
  function getIndicatorLocalY() {
    if (!group) return 0;
    const previewCenterY = Number.isFinite(buildIndicator.previewCenterY) ? buildIndicator.previewCenterY : 0.5;
    const supportTopY = Number.isFinite(buildIndicator.supportTopY) ? buildIndicator.supportTopY : 0;
    const manualBaseY = Number.isFinite(buildIndicator.manualBaseY) ? buildIndicator.manualBaseY : 0;
    const selectionOffset = Number.isFinite(buildIndicator.buildSelectionOffsetFromTop)
      ? buildIndicator.buildSelectionOffsetFromTop
      : 0;

    if (buildIndicator.destroyMode) {
      return previewCenterY - group.position.y;
    }

    const isRaisedInAirSelection = manualBaseY > (supportTopY + 1e-4);
    const isStackSelection = supportTopY > 1e-4 || selectionOffset > 0;

    if (isRaisedInAirSelection || isStackSelection) {
      return previewCenterY - group.position.y;
    }

    return Number.isFinite(halo?.userData?.baseY) ? halo.userData.baseY : 0;
  }

  function getIndicatorLocalXZ() {
    if (!group) return { x: 0, z: 0 };
    return { x: 0, z: 0 };
  }

  function applyHaloBaseState() {
    if (!halo) return;
    const material = halo.material;
    if (!material || !material.color) return;

    const baseX = Number.isFinite(halo.userData.baseX) ? halo.userData.baseX : halo.position.x;
    const baseY = Number.isFinite(halo.userData.baseY) ? halo.userData.baseY : halo.position.y;
    const baseZ = Number.isFinite(halo.userData.baseZ) ? halo.userData.baseZ : halo.position.z;
    const baseOpacity = Number.isFinite(halo.userData.baseOpacity) ? halo.userData.baseOpacity : 0.5;
    const baseColor = Number.isFinite(halo.userData.baseColor) ? halo.userData.baseColor : material.color.getHex();

    const showBuildIndicator = !!buildIndicator.active && player?.mode === 'wall';
    const targetColor = showBuildIndicator
      ? (buildIndicator.destroyMode ? 0xff5f5f : 0x8df8ff)
      : baseColor;

    material.color.setHex(targetColor);
    if (showBuildIndicator) {
      const localPos = getIndicatorLocalXZ();
      halo.position.x = localPos.x;
      halo.position.y = getIndicatorLocalY();
      halo.position.z = localPos.z;
    } else {
      halo.position.x = baseX;
      halo.position.y = baseY;
      halo.position.z = baseZ;
    }
    halo.userData.runtimeOpacityBase = showBuildIndicator
      ? (buildIndicator.destroyMode ? 0.72 : 0.62)
      : baseOpacity;
    halo.userData.runtimeScaleBase = showBuildIndicator
      ? (buildIndicator.destroyMode ? 1.08 : 1.03)
      : 1;

    if (directionHint) {
      const showHint = showBuildIndicator && !buildIndicator.destroyMode && !!buildIndicator.showDirectionHint;
      directionHint.visible = showHint;
      if (showHint) {
        const radius = 1.02;
        const localPos = getIndicatorLocalXZ();
        const rot = Number.isFinite(buildIndicator.rotationY) ? buildIndicator.rotationY : 0;
        const worldX = group.position.x + localPos.x + (Math.sin(rot) * radius);
        const worldY = group.position.y + getIndicatorLocalY();
        const worldZ = group.position.z + localPos.z + (Math.cos(rot) * radius);
        directionHint.position.set(worldX, worldY, worldZ);
      }
    }
  }

  function rebuildVisualForMode(mode) {
    const def = getPlayerModeDef(mode);
    if (!group) return;

    if (core) {
      group.remove(core);
      disposeObject3D(core);
      core = null;
    }

    if (halo) {
      group.remove(halo);
      disposeObject3D(halo);
      halo = null;
    }

    clearEditPreview();
    editPreviewVisible = false;

    if (directionHint) {
      scene.remove(directionHint);
      disposeObject3D(directionHint);
      directionHint = null;
    }

    core = createCoreVisual(mode, def);
    halo = def.createHalo(THREE);

    if (core) group.add(core);
    if (halo) {
      halo.userData.baseX = halo.position.x;
      halo.userData.baseY = halo.position.y;
      halo.userData.baseZ = halo.position.z;
      halo.userData.baseOpacity = halo.material?.opacity ?? 0.5;
      halo.userData.baseColor = halo.material?.color?.getHex?.() ?? 0xffffff;
      halo.userData.runtimeOpacityBase = halo.userData.baseOpacity;
      halo.userData.runtimeScaleBase = 1;
      group.add(halo);
      applyHaloBaseState();
    }

    directionHint = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshBasicMaterial({
        color: 0x2aa8ff,
        transparent: true,
        opacity: 0.92,
      }),
    );
    directionHint.visible = false;
    scene.add(directionHint);
  }

  function setMode(mode) {
    if (!player) return;
    if (player.mode === mode) return;

    player.mode = mode;
    rebuildVisualForMode(mode);
  }

  function create() {
    group = new THREE.Group();
    group.position.set(0, 0.95, 0);
    scene.add(group);

    player = {
      x: 0,
      z: 0,
      radius: 0.72,
      speed: 12,
      yaw: 0,
      mode: 'wall',
      lastMove: { x: 0, z: -1 },
    };

    rebuildVisualForMode(player.mode);
    return player;
  }

  function reset() {
    if (!player) return;

    player.x = 0;
    player.z = 0;
    player.yaw = 0;
    player.lastMove.x = 0;
    player.lastMove.z = -1;

     if (group) {
      group.position.set(0, 0.95, 0);
      group.rotation.set(0, 0, 0);
    }

    clearEditPreview();
    editPreviewVisible = false;
    setCoreVisible(true);

    clearEditPreview();
    editPreviewVisible = false;
    setCoreVisible(true);

    clearEditPreview();
    editPreviewVisible = false;
    setCoreVisible(true);
  }

  function update(delta) {
    if (!player) return;

    const movementIntent = actions ? actions.getMovementIntent() : getLegacyMovementIntent();
    const cameraController = getCameraController ? getCameraController() : null;
    const projectedMovement = projectMovementToCamera(movementIntent, cameraController);
    const wallMovementConstraint = player.mode === 'wall' && typeof getWallMovementConstraint === 'function'
      ? getWallMovementConstraint()
      : null;
    const normalizedConstraint = getNormalizedWallMovementConstraint(wallMovementConstraint);

    let moveX = projectedMovement.x;
    let moveZ = projectedMovement.z;

    if (normalizedConstraint && (moveX !== 0 || moveZ !== 0)) {
      moveX = normalizedConstraint.directionX;
      moveZ = normalizedConstraint.directionZ;
    }

    if (moveX !== 0 || moveZ !== 0) {
      const norm = normalize2D({ x: moveX, z: moveZ });
      moveX = norm.x;
      moveZ = norm.z;

      player.lastMove.x = moveX;
      player.lastMove.z = moveZ;
      player.yaw = Math.atan2(moveX, moveZ);
    } else {
      moveX = 0;
      moveZ = 0;
    }

    const sprintHeld = actions ? actions.isSprintHeld() : !!(keys && keys.shift);
    const speed = player.speed * getSpeedMultiplier() * (sprintHeld ? 1.22 : 1.0);

    const stepX = moveX * speed * delta;
    const stepZ = moveZ * speed * delta;

    if (normalizedConstraint && (moveX !== 0 || moveZ !== 0)) {
      const projectedTarget = projectPointToConstraintLine(
        clamp(player.x + stepX, -INNER_LIMIT, INNER_LIMIT),
        clamp(player.z + stepZ, -INNER_LIMIT, INNER_LIMIT),
        normalizedConstraint,
      );
      const nextX = clamp(projectedTarget.x, -INNER_LIMIT, INNER_LIMIT);
      const nextZ = clamp(projectedTarget.z, -INNER_LIMIT, INNER_LIMIT);
      if (!collidesAtPlayer(nextX, nextZ, player.radius)) {
        player.x = nextX;
        player.z = nextZ;
      }
    } else {
      const nextX = clamp(player.x + stepX, -INNER_LIMIT, INNER_LIMIT);
      if (!collidesAtPlayer(nextX, player.z, player.radius)) {
        player.x = nextX;
      }

      const nextZ = clamp(player.z + stepZ, -INNER_LIMIT, INNER_LIMIT);
      if (!collidesAtPlayer(player.x, nextZ, player.radius)) {
        player.z = nextZ;
      }
    }

    const isWallMode = player.mode === 'wall';
    const hasMovementInput = moveX !== 0 || moveZ !== 0;
    if (isWallMode && !hasMovementInput) {
      const customSnapTarget = typeof getWallGridSnapTarget === 'function'
        ? getWallGridSnapTarget({ x: player.x, y: 0, z: player.z })
        : null;
      const snapTargetX = clamp(
        Number.isFinite(customSnapTarget?.x) ? customSnapTarget.x : Math.round(player.x),
        -INNER_LIMIT,
        INNER_LIMIT,
      );
      const snapTargetZ = clamp(
        Number.isFinite(customSnapTarget?.z) ? customSnapTarget.z : Math.round(player.z),
        -INNER_LIMIT,
        INNER_LIMIT,
      );

      const snappedX = smoothToward(player.x, snapTargetX, delta, WALL_GRID_SNAP_LERP_SPEED);
      if (!collidesAtPlayer(snappedX, player.z, player.radius)) {
        player.x = Math.abs(snappedX - snapTargetX) <= WALL_GRID_SNAP_EPSILON ? snapTargetX : snappedX;
      }

      const snappedZ = smoothToward(player.z, snapTargetZ, delta, WALL_GRID_SNAP_LERP_SPEED);
      if (!collidesAtPlayer(player.x, snappedZ, player.radius)) {
        player.z = Math.abs(snappedZ - snapTargetZ) <= WALL_GRID_SNAP_EPSILON ? snapTargetZ : snappedZ;
      }
    }

    const t = getTimeElapsed ? getTimeElapsed() : 0;
    const shouldShowEditPreview = player.mode === 'wall'
      && sprintHeld
      && !buildIndicator.destroyMode
      && typeof getBuildPreviewDescriptor === 'function';
    const previewDescriptor = shouldShowEditPreview ? getBuildPreviewDescriptor() : null;

    if (group) {
      group.position.x = player.x;
      group.position.z = player.z;
      group.position.y = 0.95 + Math.sin(t * 5.6) * 0.06;

      if (previewDescriptor) {
        group.rotation.set(0, 0, 0);
        setCoreVisible(false);
        syncEditPreview(previewDescriptor);
        editPreviewVisible = true;
      } else {
        if (editPreviewVisible) {
          clearEditPreview();
          editPreviewVisible = false;
        }

        setCoreVisible(true);

        if (player.mode === 'projectile' || player.mode === 'vehicle') {
          group.rotation.y = player.yaw;
        } else {
          group.rotation.y += delta * 1.25;
        }
      }
    }

    if (halo?.material) {
      applyHaloBaseState();
      const opacityBase = Number.isFinite(halo.userData.runtimeOpacityBase) ? halo.userData.runtimeOpacityBase : 0.38;
      const scaleBase = Number.isFinite(halo.userData.runtimeScaleBase) ? halo.userData.runtimeScaleBase : 1;
      halo.material.opacity = opacityBase + Math.sin(t * 4.2) * 0.05;
      halo.scale.setScalar(scaleBase + Math.sin(t * 5.2) * 0.03);
    }
  }

  function getPlayer() {
    return player;
  }

  function getMode() {
    return player ? player.mode : 'wall';
  }

  function setBuildIndicator(state = {}) {
    buildIndicator.active = !!state.active;
    buildIndicator.level = Number.isFinite(state.level) ? state.level : 0;
    buildIndicator.destroyMode = !!state.destroyMode;
    buildIndicator.previewBaseY = Number.isFinite(state.previewBaseY) ? state.previewBaseY : 0;
    buildIndicator.previewCenterY = Number.isFinite(state.previewCenterY) ? state.previewCenterY : (buildIndicator.previewBaseY + 0.5);
    buildIndicator.previewTopY = Number.isFinite(state.previewTopY) ? state.previewTopY : (buildIndicator.previewCenterY + ((Number.isFinite(state.stepHeight) ? state.stepHeight : 1) * 0.5));
    buildIndicator.previewCellX = Number.isFinite(state.previewCellX) ? state.previewCellX : 0;
    buildIndicator.previewCellZ = Number.isFinite(state.previewCellZ) ? state.previewCellZ : 0;
    buildIndicator.stepHeight = Number.isFinite(state.stepHeight) ? state.stepHeight : 1;
    buildIndicator.rotationY = Number.isFinite(state.rotationY) ? state.rotationY : 0;
    buildIndicator.supportTopY = Number.isFinite(state.supportTopY) ? state.supportTopY : 0;
    buildIndicator.manualBaseY = Number.isFinite(state.manualBaseY) ? state.manualBaseY : 0;
    buildIndicator.buildSelectionOffsetFromTop = Number.isFinite(state.buildSelectionOffsetFromTop) ? state.buildSelectionOffsetFromTop : 0;
    buildIndicator.showDirectionHint = !!state.showDirectionHint;
    applyHaloBaseState();
  }

  return {
    create,
    update,
    reset,
    getPlayer,
    getMode,
    setMode,
    setBuildIndicator,
  };
}
