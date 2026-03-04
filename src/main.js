// mini-engine v0.1d — refactor: renderer + cameraController extraits
// Note: ouvre via un petit serveur local (file:// bloque souvent les modules).

import { BORDER_HALF, INNER_LIMIT, WIN_SCORE, BASE_ENEMIES, CHUNK_SIZE, CHUNK_RADIUS, WALL_HALF } from './config.js';
import { createState } from './state.js';
import { clamp, rand, normalize2D, rotateVector } from './utils/math.js';
import { keyForCell } from './utils/grid.js';
import { bindKeyboard } from './input/keyboard.js';
import { createHud } from './ui/hud.js';
import { createRenderer, handleResize, setOrthoSize } from './render/renderer.js';
import { createCameraController } from './render/cameraController.js';
import { createCollisionSystem } from './world/collision.js';
import { createChunkSystem } from './world/chunks.js';
import { createWallMeshFactory, createWallsSystem } from './world/walls.js';

if (location.protocol === 'file:') {
  const box = document.getElementById('error');
  if (box) {
    box.style.display = 'block';
    box.innerHTML = 'Ce projet utilise <b>ES modules</b>. Ouvre-le via un petit serveur local : <code>python -m http.server</code> puis va sur <code>http://localhost:8000</code>.';
  }
}

const THREE = window.THREE;

(function bootstrap() {
const errorBox = document.getElementById('error');
    if (!window.THREE) {
      errorBox.style.display = 'block';
      errorBox.innerHTML = 'Impossible de charger <b>Three.js</b>. Cette version dépend du CDN externe. Ouvre le fichier avec une connexion Internet, ou demande-moi une version offline.';
      return;
    }

    const viewValue = document.getElementById('viewValue');
    const projectionValue = document.getElementById('projectionValue');
    const scoreValue = document.getElementById('scoreValue');
    const enemyValue = document.getElementById('enemyValue');
    const wallValue = document.getElementById('wallValue');
    const missionValue = document.getElementById('missionValue');
    const statusText = document.getElementById('status');
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const toggleProjectionBtn = document.getElementById('toggleProjectionBtn');
    const toggleSandboxBtn = document.getElementById('toggleSandboxBtn');
    const orbitLeftBtn = document.getElementById('orbitLeftBtn');
    const orbitRightBtn = document.getElementById('orbitRightBtn');

    const hud = createHud({
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
      orbitRightBtn
    }, { WIN_SCORE });

    let renderer;
    let scene;
    let perspectiveCamera;
    let orthoCamera;
    let activeCamera;
    let clock;
    let animationId = null;
    let unbindKeyboard = null;

    let player;
    let playerGroup;
    let playerHalo;
    let playerPulseLight;

    let keys = Object.create(null);
    let prevKeys = Object.create(null);
    let timeElapsed = 0;
    let actionCooldown = 0;
    let spawnCooldown = 0;
    let score = 0;
    let missionComplete = false;
    let worldMode = 'mission';
    let cameraController = null;
    const { cameraState, enemies, coins, particles, userWalls, userWallSet, gridChunks, shared } = createState(THREE);


    const collision = createCollisionSystem({ BORDER_HALF, WALL_HALF, keyForCell, userWallSet });
    const { isBorderCell, collidesAt, collidesAtPlayer, collidesAtUserWalls, probeBlockedDirections } = collision;


    let chunkSystem = null;
    let wallsSystem = null;
    const createWallMesh = createWallMeshFactory({ THREE, shared });

    function makeScene() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070a10);
      scene.fog = new THREE.Fog(0x070a10, 26, 130);

      perspectiveCamera = new THREE.PerspectiveCamera(56, window.innerWidth / window.innerHeight, 0.1, 400);
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

      const stars = new THREE.Group();
      const starGeo = new THREE.SphereGeometry(0.05, 5, 5);
      const starMat = new THREE.MeshBasicMaterial({ color: 0xb9d7ff });
      for (let i = 0; i < 150; i++) {
        const star = new THREE.Mesh(starGeo, starMat);
        star.position.set(rand(-120, 120), rand(18, 52), rand(-120, 120));
        star.scale.setScalar(rand(0.5, 1.6));
        stars.add(star);
      }
      scene.add(stars);

      const borderGroup = new THREE.Group();
      for (let x = -BORDER_HALF; x <= BORDER_HALF; x++) {
        borderGroup.add(createWallMesh(x, BORDER_HALF, true));
        borderGroup.add(createWallMesh(x, -BORDER_HALF, true));
      }
      for (let z = -BORDER_HALF + 1; z <= BORDER_HALF - 1; z++) {
        borderGroup.add(createWallMesh(BORDER_HALF, z, true));
        borderGroup.add(createWallMesh(-BORDER_HALF, z, true));
      }
      scene.add(borderGroup);

      // chunks initialisés par chunkSystem.ensureChunksAround() dans la boucle
    }

    function createPlayer() {
      const group = new THREE.Group();

      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.72, 0),
        new THREE.MeshStandardMaterial({
          color: 0xa5ffff,
          emissive: 0x57ecff,
          emissiveIntensity: 0.72,
          roughness: 0.24,
          metalness: 0.28,
          flatShading: true
        })
      );
      core.castShadow = true;
      group.add(core);

      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.05, 12, 40),
        new THREE.MeshBasicMaterial({ color: 0x8df8ff, transparent: true, opacity: 0.52 })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = -0.15;
      group.add(halo);

      group.position.set(0, 0.95, 0);
      scene.add(group);

      player = {
        x: 0,
        z: 0,
        radius: 0.72,
        speed: 12,
        yaw: 0,
        lastMove: { x: 0, z: -1 }
      };

      playerGroup = group;
      playerHalo = halo;
    }

    function clearDynamicEntities() {
      while (enemies.length) {
        const enemy = enemies.pop();
        scene.remove(enemy.mesh);
      }
      while (coins.length) {
        const coin = coins.pop();
        scene.remove(coin.group);
      }
      while (particles.length) {
        const burst = particles.pop();
        for (const p of burst.parts) scene.remove(p.mesh);
      }
      while (userWalls.length) {
        const wall = userWalls.pop();
        userWallSet.delete(keyForCell(wall.x, wall.z));
        scene.remove(wall.mesh);
      }
    }

    function resetGame() {
      clearDynamicEntities();
      score = 0;
      missionComplete = false;
      timeElapsed = 0;
      actionCooldown = 0;
      if (wallsSystem) wallsSystem.clearLastActionCell();
      spawnCooldown = 0.4;
      player.x = 0;
      player.z = 0;
      player.lastMove.x = 0;
      player.lastMove.z = -1;
      playerGroup.position.set(0, 0.95, 0);
      cameraState.ready = false;
      for (let i = 0; i < BASE_ENEMIES; i++) {
        spawnEnemy();
      }
      refreshHud();
    }

    function spawnEnemy() {
      let x = 0;
      let z = 0;
      let tries = 0;
      do {
        x = rand(-INNER_LIMIT + 2, INNER_LIMIT - 2);
        z = rand(-INNER_LIMIT + 2, INNER_LIMIT - 2);
        tries += 1;
      } while ((Math.hypot(x - player.x, z - player.z) < 10 || collidesAt(x, z, 0.8)) && tries < 30);

      const mat = new THREE.MeshStandardMaterial({
        color: 0xffba73,
        emissive: 0xff5d84,
        emissiveIntensity: 0.62,
        roughness: 0.35,
        metalness: 0.12,
        flatShading: true
      });
      const mesh = new THREE.Mesh(shared.enemyGeo, mat);
      mesh.castShadow = true;
      mesh.position.set(x, 0.85, z);
      scene.add(mesh);

      const angle = rand(0, Math.PI * 2);
      enemies.push({
        x,
        z,
        radius: 0.66,
        speed: rand(3.2, 4.6),
        dirX: Math.cos(angle),
        dirZ: Math.sin(angle),
        turnTimer: rand(0.6, 1.6),
        stress: 0,
        bounceChain: 0,
        bob: rand(0, Math.PI * 2),
        mesh
      });
    }

    function createCoinAt(x, z) {
      const group = new THREE.Group();
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), shared.coinCoreMat);
      core.castShadow = true;
      group.add(core);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.05, 8, 36),
        new THREE.MeshBasicMaterial({ color: 0xffe9aa, transparent: true, opacity: 0.72 })
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      group.position.set(x, 1.1, z);
      scene.add(group);
      coins.push({ x, z, group, ring, spin: rand(0.7, 1.5) });
    }

    function burstAt(x, y, z, color, count) {
      const parts = [];
      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 });
        const mesh = new THREE.Mesh(shared.particleGeo, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        parts.push({
          mesh,
          vx: rand(-4, 4),
          vy: rand(1.4, 4.8),
          vz: rand(-4, 4)
        });
      }
      particles.push({ life: 0.55, parts });
    }

    function updatePlayer(delta) {
      const left = !!(keys['arrowleft'] || keys['q'] || keys['a']);
      const right = !!(keys['arrowright'] || keys['d']);
      const up = !!(keys['arrowup'] || keys['z'] || keys['w']);
      const down = !!(keys['arrowdown'] || keys['s']);

      let moveX = (right ? 1 : 0) - (left ? 1 : 0);
      let moveZ = (down ? 1 : 0) - (up ? 1 : 0);

      if (moveX !== 0 || moveZ !== 0) {
        const norm = normalize2D({ x: moveX, z: moveZ });
        moveX = norm.x;
        moveZ = norm.z;
        player.lastMove.x = moveX;
        player.lastMove.z = moveZ;
        player.yaw = Math.atan2(moveX, moveZ);
        if (cameraController && cameraController.getFollowMode() === 'camera' && cameraController.getOrbitSteps() !== 0) {
          cameraController.resetOrbit();
        }
      } else {
        moveX = 0;
        moveZ = 0;
      }

      const speed = player.speed * (keys['shift'] ? 1.22 : 1.0);
      const stepX = moveX * speed * delta;
      const stepZ = moveZ * speed * delta;

      const nextX = clamp(player.x + stepX, -INNER_LIMIT, INNER_LIMIT);
      if (!collidesAtPlayer(nextX, player.z, player.radius)) player.x = nextX;

      const nextZ = clamp(player.z + stepZ, -INNER_LIMIT, INNER_LIMIT);
      if (!collidesAtPlayer(player.x, nextZ, player.radius)) player.z = nextZ;

      playerGroup.position.x = player.x;
      playerGroup.position.z = player.z;
      playerGroup.position.y = 0.95 + Math.sin(timeElapsed * 5.6) * 0.06;
      playerGroup.rotation.y += delta * 1.25;
      playerHalo.material.opacity = 0.46 + Math.sin(timeElapsed * 4.2) * 0.05;
      playerHalo.scale.setScalar(1 + Math.sin(timeElapsed * 5.2) * 0.03);
    }

    function updateEnemies(delta) {
      if (worldMode === 'exploration') {
        for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          enemy.mesh.position.set(enemy.x, 0.84 + Math.sin(timeElapsed * 2.5 + enemy.bob) * 0.14, enemy.z);
          enemy.mesh.rotation.y += delta * 0.7;
          enemy.mesh.material.emissiveIntensity = 0.55;
          enemy.mesh.scale.setScalar(1);
        }
        return;
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        enemy.turnTimer -= delta;
        if (enemy.turnTimer <= 0) {
          const rotated = rotateVector(enemy.dirX, enemy.dirZ, rand(-1.2, 1.2));
          enemy.dirX = rotated.x;
          enemy.dirZ = rotated.z;
          normalize2D({ x: enemy.dirX, z: enemy.dirZ });
          const norm = normalize2D({ x: enemy.dirX, z: enemy.dirZ });
          enemy.dirX = norm.x;
          enemy.dirZ = norm.z;
          enemy.turnTimer = rand(0.5, 1.5);
        }

        const drift = rotateVector(enemy.dirX, enemy.dirZ, rand(-0.8, 0.8) * delta * 0.7);
        enemy.dirX = drift.x;
        enemy.dirZ = drift.z;
        const norm = normalize2D({ x: enemy.dirX, z: enemy.dirZ });
        enemy.dirX = norm.x;
        enemy.dirZ = norm.z;

        let bounces = 0;
        let nextX = enemy.x + enemy.dirX * enemy.speed * delta;
        if (!collidesAt(nextX, enemy.z, enemy.radius)) {
          enemy.x = nextX;
        } else {
          enemy.dirX *= -1;
          enemy.x = clamp(enemy.x + enemy.dirX * enemy.speed * delta * 0.65, -INNER_LIMIT, INNER_LIMIT);
          bounces += 1;
        }

        let nextZ = enemy.z + enemy.dirZ * enemy.speed * delta;
        if (!collidesAt(enemy.x, nextZ, enemy.radius)) {
          enemy.z = nextZ;
        } else {
          enemy.dirZ *= -1;
          enemy.z = clamp(enemy.z + enemy.dirZ * enemy.speed * delta * 0.65, -INNER_LIMIT, INNER_LIMIT);
          bounces += 1;
        }

        const sepX = enemy.x - player.x;
        const sepZ = enemy.z - player.z;
        const distToPlayer = Math.hypot(sepX, sepZ) || 1;
        const overlap = player.radius + enemy.radius + 0.15 - distToPlayer;
        if (overlap > 0) {
          enemy.x += (sepX / distToPlayer) * overlap * 0.9;
          enemy.z += (sepZ / distToPlayer) * overlap * 0.9;
          enemy.dirX = sepX / distToPlayer;
          enemy.dirZ = sepZ / distToPlayer;
          bounces += 1;
        }

        enemy.x = clamp(enemy.x, -INNER_LIMIT, INNER_LIMIT);
        enemy.z = clamp(enemy.z, -INNER_LIMIT, INNER_LIMIT);

        const blocked = probeBlockedDirections(enemy.x, enemy.z, enemy.radius);
        const userBlocked = probeBlockedDirections(enemy.x, enemy.z, enemy.radius, true);
        if (userBlocked.count >= 1 && ((bounces > 0 && blocked.count >= 2) || blocked.count >= 3)) {
          enemy.bounceChain = Math.min(6, enemy.bounceChain + delta * 4 + bounces * 0.7);
          enemy.stress += delta * (0.9 + blocked.count * 0.65 + enemy.bounceChain * 0.22);
        } else {
          enemy.bounceChain = Math.max(0, enemy.bounceChain - delta * 2.2);
          enemy.stress = Math.max(0, enemy.stress - delta * (blocked.count <= 1 ? 1.7 : 0.8));
        }

        enemy.mesh.position.set(enemy.x, 0.84 + Math.sin(timeElapsed * 2.5 + enemy.bob) * 0.14, enemy.z);
        enemy.mesh.rotation.y += delta * 1.2;
        enemy.mesh.material.emissiveIntensity = 0.55 + Math.min(0.85, enemy.stress * 0.08);
        const heat = clamp(enemy.stress / 8.5, 0, 1);
        enemy.mesh.scale.setScalar(1 + heat * 0.16);

        if (enemy.stress >= 8.5) {
          burstAt(enemy.x, 0.9, enemy.z, 0xffd76b, 10);
          createCoinAt(enemy.x, enemy.z);
          scene.remove(enemy.mesh);
          enemies.splice(i, 1);
          spawnCooldown = Math.min(spawnCooldown, 0.7);
        }
      }
    }

    function updateCoins(delta) {
      for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.group.rotation.y += delta * (1.6 + coin.spin);
        coin.group.position.y = 1.08 + Math.sin(timeElapsed * 3 + coin.spin) * 0.18;
        coin.ring.scale.setScalar(1 + Math.sin(timeElapsed * 4.2 + coin.spin) * 0.05);

        if (worldMode === 'exploration') continue;

        if (Math.hypot(player.x - coin.x, player.z - coin.z) < 1.25) {
          score += 1;
          burstAt(coin.x, 1.05, coin.z, 0xffd76b, 10);
          scene.remove(coin.group);
          coins.splice(i, 1);
          if (score >= WIN_SCORE) missionComplete = true;
          refreshHud();
        }
      }
    }

    function updateParticles(delta) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const burst = particles[i];
        burst.life -= delta;
        for (const p of burst.parts) {
          p.mesh.position.x += p.vx * delta;
          p.mesh.position.y += p.vy * delta;
          p.mesh.position.z += p.vz * delta;
          p.vy -= 8 * delta;
          p.mesh.material.opacity = Math.max(0, burst.life * 2);
          p.mesh.scale.setScalar(Math.max(0.25, burst.life * 2.4));
        }
        if (burst.life <= 0) {
          for (const p of burst.parts) scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }
    }

    function tryMaintainEnemies(delta) {
      spawnCooldown -= delta;
      if (worldMode === 'exploration') return;
      if (missionComplete) return;
      if (enemies.length >= BASE_ENEMIES) return;
      if (spawnCooldown <= 0) {
        spawnEnemy();
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
        cameraProjectionMode: cameraController ? cameraController.getProjectionMode() : 'iso'
      });
    }


    function toggleWorldMode() {
      worldMode = worldMode === 'mission' ? 'exploration' : 'mission';
      refreshHud();
    }

    function handleEdgeKeys() {
      const restartPressed = !!keys['r'] && !prevKeys['r'];
      const viewPressed = !!keys['v'] && !prevKeys['v'];
      const projectionPressed = !!keys['c'] && !prevKeys['c'];
      const sandboxPressed = !!keys['m'] && !prevKeys['m'];
      const orbitLeftPressed = !!keys['j'] && !prevKeys['j'];
      const orbitRightPressed = (!!keys['l'] && !prevKeys['l']) || (!!keys['x'] && !prevKeys['x']);
      if (restartPressed) resetGame();
      if (viewPressed && cameraController) { cameraController.toggleView(); refreshHud(); }
      if (projectionPressed && cameraController) { cameraController.toggleProjection(); refreshHud(); }
      if (sandboxPressed) toggleWorldMode();
      if (orbitLeftPressed && cameraController) { cameraController.rotateOrbit(-1); }
      if (orbitRightPressed && cameraController) { cameraController.rotateOrbit(1); }
    }

    function copyKeyState() {
      prevKeys = Object.assign(Object.create(null), keys);
    }

    function update(delta) {
      timeElapsed += delta;
      actionCooldown = Math.max(0, actionCooldown - delta);

      handleEdgeKeys();

      updatePlayer(delta);
      if (keys[' '] && wallsSystem) {
        wallsSystem.toggleWallAtPlayer();
      } else if (wallsSystem) {
        wallsSystem.clearLastActionCell();
      }
      if (chunkSystem) chunkSystem.ensureChunksAround(player.x, player.z);
      updateEnemies(delta);
      updateCoins(delta);
      updateParticles(delta);
      tryMaintainEnemies(delta);
      if (cameraController) { activeCamera = cameraController.update(delta, timeElapsed, player); }
      refreshHud();

      renderer.render(scene, activeCamera);
      copyKeyState();
    }

    function animate() {
      const delta = Math.min(0.033, clock.getDelta());
      animationId = requestAnimationFrame(animate);
      update(delta);
    }

    function init() {
      renderer = createRenderer(THREE, document.getElementById('app'));
      makeScene();
      createPlayer();

      chunkSystem = createChunkSystem({ THREE, scene, gridChunks, CHUNK_SIZE, CHUNK_RADIUS });
      wallsSystem = createWallsSystem({
        scene,
        userWalls,
        userWallSet,
        keyForCell,
        BORDER_HALF,
        isBorderCell,
        burstAt,
        refreshHud,
        getPlayer: () => player,
        createWallMesh
      });
      cameraController = createCameraController({ THREE, orthoCamera, perspectiveCamera, cameraState, playerPulseLight });
      activeCamera = orthoCamera;
      clock = new THREE.Clock();
      toggleViewBtn.addEventListener('click', () => { if (!cameraController) return; cameraController.toggleView(); refreshHud(); });
      toggleProjectionBtn.addEventListener('click', () => { if (!cameraController) return; cameraController.toggleProjection(); refreshHud(); });
      toggleSandboxBtn.addEventListener('click', toggleWorldMode);
      orbitLeftBtn.addEventListener('click', () => { if (!cameraController) return; cameraController.rotateOrbit(-1); });
      orbitRightBtn.addEventListener('click', () => { if (!cameraController) return; cameraController.rotateOrbit(1); });
      window.addEventListener('resize', () => {
        handleResize({
          renderer,
          perspectiveCamera,
          orthoCamera,
          orthoSize: cameraController ? cameraController.getOrthoSize() : 22
        });
      });
      unbindKeyboard = bindKeyboard(keys, { onSpaceRelease: () => { if (wallsSystem) wallsSystem.clearLastActionCell(); } });
      resetGame();
      animate();
    }

    window.addEventListener('beforeunload', () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (unbindKeyboard) unbindKeyboard();
    });

    init();
})();
