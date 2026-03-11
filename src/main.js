// mini-engine v0.2c — feature: adaptive territory background plane
// Note: ouvre via un petit serveur local (file:// bloque souvent les modules).

import {
  BORDER_HALF,
  INNER_LIMIT,
  WIN_SCORE,
  BASE_ENEMIES,
  CHUNK_SIZE,
  CHUNK_RADIUS,
  WALL_HALF,
} from './config.js';
import { createState } from './state.js';
import { rand } from './utils/math.js';
import { keyForCell } from './utils/grid.js';
import { bindKeyboard, createInputController, createInputState } from './input/keyboard.js';
import { createActionController } from './input/actions.js';
import { createHud } from './ui/hud.js';
import { createRenderer, handleResize, setOrthoSize } from './render/renderer.js';
import { createCameraController } from './render/cameraController.js';
import { createCollisionSystem } from './world/collision.js';
import { createChunkSystem } from './world/chunks.js';
import { createWallMeshFactory, createWallsSystem } from './world/walls.js';
import { createPlayerSystem } from './entities/player.js';
import { createEnemiesSystem } from './entities/enemies.js';
import { createCoinsSystem } from './entities/coins.js';
import { createParticleSystem } from './fx/particles.js';
import { createPlayerModesSystem } from './entities/playerModes.js';
import { createAssetLibrary } from './assets/library.js';
import { createGameLoop } from './game/gameLoop.js';
import { createResetSystem } from './game/reset.js';

if (location.protocol === 'file:') {
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'block';
    box.innerHTML =
      'Ce projet utilise ES modules. Ouvre-le via un petit serveur local : ' +
      '`python -m http.server` puis va sur `http://localhost:8000`.';
  }
}

const THREE = window.THREE;

(function bootstrap() {
  const errorBox = document.getElementById('error');

  if (!window.THREE) {
    errorBox.style.display = 'block';
    errorBox.innerHTML =
      "Impossible de charger Three.js. Cette version dépend du CDN externe. " +
      'Ouvre le fichier avec une connexion Internet, ou demande-moi une version offline.';
    return;
  }

  const viewValue = document.getElementById('viewValue');
  const projectionValue = document.getElementById('projectionValue');
  const scoreValue = document.getElementById('scoreValue');
  const enemyValue = document.getElementById('enemyValue');
  const wallValue = document.getElementById('wallValue');
  const missionValue = document.getElementById('missionValue');
  const statusText = document.getElementById('status');
  const hintText = document.getElementById('hint');
  const inventoryPanel = document.getElementById('inventoryPanel');
  const inventoryModeValue = document.getElementById('inventoryModeValue');
  const inventoryCloseBtn = document.getElementById('inventoryCloseBtn');
  const inventoryChips = Array.from(document.querySelectorAll('[data-inventory-mode]'));
  const toggleViewBtn = document.getElementById('toggleViewBtn');
  const toggleProjectionBtn = document.getElementById('toggleProjectionBtn');
  const toggleSandboxBtn = document.getElementById('toggleSandboxBtn');
  const orbitLeftBtn = document.getElementById('orbitLeftBtn');
  const orbitRightBtn = document.getElementById('orbitRightBtn');

  const hud = createHud(
    {
      viewValue,
      projectionValue,
      scoreValue,
      enemyValue,
      wallValue,
      missionValue,
      statusText,
      toggleViewBtn,
      toggleProjectionBtn,
      toggleSandboxBtn,
      orbitLeftBtn,
      orbitRightBtn,
    },
    { WIN_SCORE },
  );

  let renderer;
  let scene;
  let perspectiveCamera;
  let orthoCamera;
  let activeCamera;
  let clock;
  let unbindKeyboard = null;

  let player;
  let playerPulseLight;
  let playerSystem = null;
  let enemiesSystem = null;
  let coinsSystem = null;
  let particleSystem = null;
  let modeSystem = null;
  let resetSystem = null;
  let gameLoop = null;
  let cameraController = null;
  let chunkSystem = null;
  let wallsSystem = null;
  let assetLibrary = null;

  const rawInput = createInputState();
  const input = createInputController(rawInput);
  const actions = createActionController(input);

  let timeElapsed = 0;
  let actionCooldown = 0;
  let spawnCooldown = 0;
  let score = 0;
  let missionComplete = false;
  let worldMode = 'mission';
  let inventoryOpen = false;
  let pendingWheelZoomSteps = 0;

  const runtime = {
    get score() {
      return score;
    },
    set score(value) {
      score = value;
    },
    get missionComplete() {
      return missionComplete;
    },
    set missionComplete(value) {
      missionComplete = value;
    },
    get timeElapsed() {
      return timeElapsed;
    },
    set timeElapsed(value) {
      timeElapsed = value;
    },
    get actionCooldown() {
      return actionCooldown;
    },
    set actionCooldown(value) {
      actionCooldown = value;
    },
    get spawnCooldown() {
      return spawnCooldown;
    },
    set spawnCooldown(value) {
      spawnCooldown = value;
    },
    get worldMode() {
      return worldMode;
    },
    set worldMode(value) {
      worldMode = value;
    },
  };

  const { cameraState, enemies, coins, particles, userWalls, userWallSet, gridChunks, shared } =
    createState(THREE);

  const collision = createCollisionSystem({
    BORDER_HALF,
    WALL_HALF,
    keyForCell,
    userWallSet,
  });

  const { isBorderCell, collidesAt, collidesAtPlayer, probeBlockedDirections } = collision;
  const createWallMesh = createWallMeshFactory({ THREE, shared });

  function getModeContextProfile() {
    return worldMode === 'exploration' ? 'travel' : 'combat';
  }

  function makeScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070a10);
    scene.fog = new THREE.Fog(0x070a10, 26, 130);

    perspectiveCamera = new THREE.PerspectiveCamera(
      56,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );

    orthoCamera = new THREE.OrthographicCamera();
    orthoCamera.up.set(0, 0, -1);
    setOrthoSize(orthoCamera, 22);
    activeCamera = orthoCamera;

    const hemi = new THREE.HemisphereLight(0xb7dcff, 0x06090f, 0.92);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(24, 28, 14);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    dir.shadow.camera.left = -70;
    dir.shadow.camera.right = 70;
    dir.shadow.camera.top = 70;
    dir.shadow.camera.bottom = -70;
    scene.add(dir);

    playerPulseLight = new THREE.PointLight(0x65f6ff, 1.15, 34, 2);
    playerPulseLight.position.set(0, 8, 0);
    scene.add(playerPulseLight);

    const territorySize = Math.max(1, BORDER_HALF * 2);
    const territoryPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(territorySize, territorySize),
      new THREE.MeshStandardMaterial({
        color: 0x85817b,
        roughness: 0.98,
        metalness: 0.02,
      }),
    );
    territoryPlane.rotation.x = -Math.PI / 2;
    territoryPlane.position.set(0, 0.002, 0);
    territoryPlane.receiveShadow = true;
    scene.add(territoryPlane);

    const stars = new THREE.Group();
    const starGeo = new THREE.SphereGeometry(0.05, 5, 5);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xb9d7ff });

    for (let i = 0; i < 150; i += 1) {
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(rand(-120, 120), rand(18, 52), rand(-120, 120));
      star.scale.setScalar(rand(0.5, 1.6));
      stars.add(star);
    }

    scene.add(stars);

    const borderGroup = new THREE.Group();
    for (let x = -BORDER_HALF; x <= BORDER_HALF; x += 1) {
      borderGroup.add(createWallMesh(x, BORDER_HALF, true));
      borderGroup.add(createWallMesh(x, -BORDER_HALF, true));
    }

    for (let z = -BORDER_HALF + 1; z <= BORDER_HALF - 1; z += 1) {
      borderGroup.add(createWallMesh(BORDER_HALF, z, true));
      borderGroup.add(createWallMesh(-BORDER_HALF, z, true));
    }

    scene.add(borderGroup);
  }

  function tryMaintainEnemies(delta) {
    spawnCooldown -= delta;

    if (worldMode === 'exploration') return;
    if (missionComplete) return;
    if (enemies.length >= BASE_ENEMIES) return;

    if (spawnCooldown <= 0) {
      if (enemiesSystem) enemiesSystem.spawnEnemy();
      spawnCooldown = 1.2;
    }
  }

  function refreshHud() {
    hud.refresh({
      score,
      enemiesCount: enemies.length,
      wallsCount: userWalls.length,
      worldMode,
      missionComplete,
      followMode: cameraController ? cameraController.getFollowMode() : 'top',
      cameraProjectionMode: cameraController ? cameraController.getProjectionMode() : 'top',
      cameraMode: cameraController ? cameraController.getCameraMode() : 'top',
      playerModeLabel: modeSystem ? modeSystem.getCurrentModeLabel() : 'WALL',
      inventoryOpen,
    });
  }

  function updateInventoryUi() {
    if (!inventoryPanel) return;

    inventoryPanel.classList.toggle('is-open', inventoryOpen);
    inventoryPanel.setAttribute('aria-hidden', inventoryOpen ? 'false' : 'true');

    const currentMode = modeSystem ? modeSystem.getCurrentMode() : 'wall';
    if (inventoryModeValue) {
      inventoryModeValue.textContent = modeSystem ? modeSystem.getCurrentModeLabel() : 'WALL';
    }

    for (const chip of inventoryChips) {
      const isActive = chip.dataset.inventoryMode === currentMode;
      chip.classList.toggle('is-active', isActive);
    }
  }

  function setInventoryOpen(nextOpen) {
    inventoryOpen = !!nextOpen;
    updateInventoryUi();
    refreshHud();
  }

  function toggleInventory() {
    setInventoryOpen(!inventoryOpen);
  }

  function toggleWorldMode() {
    worldMode = worldMode === 'mission' ? 'exploration' : 'mission';

    if (modeSystem) {
      modeSystem.ensureCurrentModeAvailable();
    }

    refreshHud();
  }

  function handleDiscreteActions() {
    if (actions.consumeInventoryToggle()) {
      toggleInventory();
    }

    if (actions.consumeRestart() && resetSystem) {
      resetSystem.resetGame();
      updateInventoryUi();
    }

    if (inventoryOpen) {
      pendingWheelZoomSteps = 0;
      return;
    }

    if (actions.consumeCycleCamera() && cameraController) {
      cameraController.cycleMode();
      refreshHud();
    }

    if (actions.consumeToggleWorldMode()) {
      toggleWorldMode();
    }

    if (actions.consumeZoomIn() && cameraController) {
      cameraController.zoomBy(1);
    }

    if (actions.consumeZoomOut() && cameraController) {
      cameraController.zoomBy(-1);
    }

    if (actions.consumeRotateLeft() && cameraController) {
      cameraController.rotateOrbit(-1);
    }

    if (actions.consumeRotateRight() && cameraController) {
      cameraController.rotateOrbit(1);
    }

    if (cameraController && pendingWheelZoomSteps !== 0) {
      const direction = Math.sign(pendingWheelZoomSteps);
      cameraController.zoomBy(direction);
      pendingWheelZoomSteps -= direction;
    }

    if (actions.consumeNextPlayerMode() && modeSystem) {
      modeSystem.cycleMode();
      updateInventoryUi();
    }
  }

  function handleContextualActions() {
    if (!modeSystem || inventoryOpen) return;

    if (actions.isPrimaryActionHeld()) {
      modeSystem.handlePrimaryActionHeld();
      return;
    }

    if (actions.consumePrimaryActionRelease()) {
      modeSystem.handlePrimaryActionReleased();
    }
  }

  function update(delta) {
    handleDiscreteActions();

    if (!inventoryOpen) {
      timeElapsed += delta;
      actionCooldown = Math.max(0, actionCooldown - delta);

      handleContextualActions();

      if (playerSystem) playerSystem.update(delta);
      if (modeSystem) modeSystem.update(delta);
      if (chunkSystem) chunkSystem.ensureChunksAround(player.x, player.z);
      if (enemiesSystem) enemiesSystem.update(delta);
      if (coinsSystem) coinsSystem.update(delta);
      if (particleSystem) particleSystem.update(delta);

      tryMaintainEnemies(delta);
    }

    if (cameraController) {
      activeCamera = cameraController.update(delta, timeElapsed, player);
    }

    updateInventoryUi();
    refreshHud();
    renderer.render(scene, activeCamera);
    input.endFrame();
  }

  async function init() {
    renderer = createRenderer(THREE, document.getElementById('app'));
    makeScene();

    assetLibrary = createAssetLibrary({
      THREE,
      manifestUrl: './assets/manifest.json',
      basePath: './assets/',
    });

    try {
      await assetLibrary.load();
      console.info('[assets] intégrés:', assetLibrary.getLoadedAssetIds().join(', '));
    } catch (error) {
      console.warn('[assets] fallback géométrique conservé.', error);
    }

    playerSystem = createPlayerSystem({
      THREE,
      scene,
      actions,
      collidesAtPlayer,
      getTimeElapsed: () => timeElapsed,
      getCameraController: () => cameraController,
      assetLibrary,
      INNER_LIMIT,
    });

    player = playerSystem.create();

    particleSystem = createParticleSystem({
      THREE,
      scene,
      particles,
      shared,
    });

    coinsSystem = createCoinsSystem({
      THREE,
      scene,
      coins,
      shared,
      getPlayer: () => player,
      getWorldMode: () => worldMode,
      getTimeElapsed: () => timeElapsed,
      burstAt: particleSystem.burstAt,
      onCollect: () => {
        score += 1;
        if (score >= WIN_SCORE) missionComplete = true;
        refreshHud();
      },
    });

    enemiesSystem = createEnemiesSystem({
      THREE,
      scene,
      enemies,
      shared,
      getPlayer: () => player,
      getWorldMode: () => worldMode,
      getTimeElapsed: () => timeElapsed,
      collidesAt,
      probeBlockedDirections,
      burstAt: particleSystem.burstAt,
      createCoinAt: (x, z) => coinsSystem.createCoinAt(x, z),
      onEnemyTransformed: () => {
        spawnCooldown = Math.min(spawnCooldown, 0.7);
      },
    });

    chunkSystem = createChunkSystem({
      THREE,
      scene,
      gridChunks,
      CHUNK_SIZE,
      CHUNK_RADIUS,
    });

    wallsSystem = createWallsSystem({
      scene,
      userWalls,
      userWallSet,
      keyForCell,
      BORDER_HALF,
      isBorderCell,
      burstAt: particleSystem.burstAt,
      refreshHud,
      getPlayer: () => player,
      createWallMesh,
    });

    modeSystem = createPlayerModesSystem({
      THREE,
      scene,
      enemies,
      collidesAt,
      burstAt: particleSystem.burstAt,
      refreshHud,
      getPlayer: () => player,
      getPlayerSystem: () => playerSystem,
      getWallsSystem: () => wallsSystem,
      getContextProfile: getModeContextProfile,
      assetLibrary,
    });

    cameraController = createCameraController({
      THREE,
      orthoCamera,
      perspectiveCamera,
      cameraState,
      playerPulseLight,
    });

    activeCamera = orthoCamera;
    clock = new THREE.Clock();

    toggleViewBtn.addEventListener('click', () => {
      if (!cameraController || inventoryOpen) return;
      cameraController.cycleMode();
      refreshHud();
    });

    toggleProjectionBtn.style.display = 'none';
    if (hintText) {
      hintText.textContent =
        'WASD = déplacement • Q = cycle murs / projectile / aqua / véhicule • E = inventaire (prototype) • ↑ / ↓ = zoom • ← / → = rotation 45° • molette = zoom • Espace = action contextuelle • M = mission / exploration • C = cycle caméra • R = relancer';
    }

    toggleSandboxBtn.addEventListener('click', () => {
      if (inventoryOpen) return;
      toggleWorldMode();
    });

    orbitLeftBtn.textContent = '↺ 45°';
    orbitRightBtn.textContent = '↻ 45°';

    orbitLeftBtn.addEventListener('click', () => {
      if (!cameraController || inventoryOpen) return;
      cameraController.rotateOrbit(-1);
    });

    orbitRightBtn.addEventListener('click', () => {
      if (!cameraController || inventoryOpen) return;
      cameraController.rotateOrbit(1);
    });

    inventoryCloseBtn?.addEventListener('click', () => {
      setInventoryOpen(false);
    });

    const onWheelZoom = (event) => {
      if (!cameraController || inventoryOpen) return;
      event.preventDefault();
      pendingWheelZoomSteps += event.deltaY < 0 ? 1 : -1;
      pendingWheelZoomSteps = Math.max(-8, Math.min(8, pendingWheelZoomSteps));
    };

    renderer.domElement.addEventListener('wheel', onWheelZoom, { passive: false });

    window.addEventListener('resize', () => {
      handleResize({
        renderer,
        perspectiveCamera,
        orthoCamera,
        orthoSize: cameraController ? cameraController.getOrthoSize() : 22,
      });
    });

    unbindKeyboard = bindKeyboard(rawInput);

    resetSystem = createResetSystem({
      scene,
      enemies,
      coins,
      particles,
      userWalls,
      userWallSet,
      keyForCell,
      cameraState,
      baseEnemies: BASE_ENEMIES,
      runtime,
      getParticleSystem: () => particleSystem,
      getWallsSystem: () => wallsSystem,
      getPlayerSystem: () => playerSystem,
      getPlayer: () => player,
      setPlayer: (nextPlayer) => {
        player = nextPlayer;
      },
      getEnemiesSystem: () => enemiesSystem,
      getModeSystem: () => modeSystem,
      refreshHud,
    });

    resetSystem.resetGame();
    updateInventoryUi();

    gameLoop = createGameLoop({
      clock,
      tick: update,
    });

    gameLoop.start();
  }

  window.addEventListener('beforeunload', () => {
    if (gameLoop) gameLoop.stop();
    if (unbindKeyboard) unbindKeyboard();
  });

  init().catch((error) => {
    console.error(error);
    errorBox.style.display = 'block';
    errorBox.innerHTML = 'Erreur au démarrage du moteur. Voir la console pour le détail.';
  });
})();
