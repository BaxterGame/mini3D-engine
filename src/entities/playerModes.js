// mini-engine v0.2f — entities/playerModes
// Aqua visual pass v4c : surface plus lisse, gradient plus riche et
// highlight glossy léger, tout en gardant le gameplay et la perf.

export const PLAYER_MODE_ORDER = ['wall', 'projectile', 'aqua', 'vehicle'];

export const PLAYER_MODE_DEFS = {
  wall: {
    id: 'wall',
    label: 'WALL',
    speedMultiplier: 1.0,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.72, 0),
        new THREE.MeshStandardMaterial({
          color: 0xa5ffff,
          emissive: 0x57ecff,
          emissiveIntensity: 0.72,
          roughness: 0.24,
          metalness: 0.28,
          flatShading: true,
        }),
      );
      mesh.castShadow = true;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.05, 12, 40),
        new THREE.MeshBasicMaterial({
          color: 0x8df8ff,
          transparent: true,
          opacity: 0.52,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.15;
      return mesh;
    },
  },

  projectile: {
    id: 'projectile',
    label: 'PROJECTILE',
    speedMultiplier: 1.0,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.78, 1.45, 3),
        new THREE.MeshStandardMaterial({
          color: 0xff5a5a,
          emissive: 0xff2a2a,
          emissiveIntensity: 0.78,
          roughness: 0.34,
          metalness: 0.18,
          flatShading: true,
        }),
      );
      mesh.castShadow = true;
      mesh.rotation.x = Math.PI;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.05, 10, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff8c8c,
          transparent: true,
          opacity: 0.48,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.1;
      return mesh;
    },
  },

  aqua: {
    id: 'aqua',
    label: 'AQUA',
    speedMultiplier: 0.96,
    createCore(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.74, 18, 14),
        new THREE.MeshStandardMaterial({
          color: 0x61c8ff,
          emissive: 0x1e8cff,
          emissiveIntensity: 0.52,
          roughness: 0.08,
          metalness: 0.12,
          transparent: true,
          opacity: 0.75,
        }),
      );
      mesh.castShadow = true;
      return mesh;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.06, 0.04, 12, 36),
        new THREE.MeshBasicMaterial({
          color: 0x8fe6ff,
          transparent: true,
          opacity: 0.36,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.2;
      return mesh;
    },
  },

  vehicle: {
    id: 'vehicle',
    label: 'VEHICLE',
    speedMultiplier: 1.65,
    createCore(THREE) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.34, 0.55, 0.96),
        new THREE.MeshStandardMaterial({
          color: 0x59ff8d,
          emissive: 0x16c85b,
          emissiveIntensity: 0.42,
          roughness: 0.38,
          metalness: 0.2,
          flatShading: true,
        }),
      );
      body.castShadow = true;
      group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.36, 0.64),
        new THREE.MeshStandardMaterial({
          color: 0xbaf7d4,
          emissive: 0x39d98a,
          emissiveIntensity: 0.18,
          roughness: 0.24,
          metalness: 0.12,
          flatShading: true,
        }),
      );
      cabin.position.y = 0.34;
      cabin.castShadow = true;
      group.add(cabin);

      return group;
    },
    createHalo(THREE) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(1.08, 0.05, 10, 32),
        new THREE.MeshBasicMaterial({
          color: 0x93ffc5,
          transparent: true,
          opacity: 0.3,
        }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = -0.24;
      return mesh;
    },
  },
};

const CONTEXT_MODE_MAP = {
  default: ['wall', 'projectile', 'aqua', 'vehicle'],
  combat: ['wall', 'projectile', 'aqua'],
  travel: ['wall', 'aqua', 'vehicle'],
};

const AQUA_DIRS = [
  { bit: 1, dx: 0, dz: -1 },
  { bit: 2, dx: 1, dz: 0 },
  { bit: 4, dx: 0, dz: 1 },
  { bit: 8, dx: -1, dz: 0 },
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function keyForCell(cellX, cellZ) {
  return `${cellX}|${cellZ}`;
}

function getDirectionFromPlayer(player) {
  const x = player?.lastMove?.x ?? 0;
  const z = player?.lastMove?.z ?? -1;
  const length = Math.hypot(x, z) || 1;

  return { x: x / length, z: z / length };
}

function createFallbackProjectileMesh(THREE) {
  const mesh = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.24, 0),
    new THREE.MeshStandardMaterial({
      color: 0xff7474,
      emissive: 0xff3434,
      emissiveIntensity: 0.72,
      roughness: 0.3,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  mesh.castShadow = true;
  return mesh;
}


const AQUA_STYLE = Object.freeze({
  cellHalf: 0.5,
  surfaceY: 0.14,
  baseLift: 0.036,
  waveAmpA: 0.013,
  waveAmpB: 0.009,
  waveAmpC: 0.006,
  waveFreqAX: 1.18,
  waveFreqAZ: 0.88,
  waveFreqBX: -0.96,
  waveFreqBZ: 1.64,
  waveSpeedA: 0.96,
  waveSpeedB: 1.46,
  waveSpeedC: 0.76,
  chaikinIterations: 3,
  chaikinRatio: 0.18,
  shapeCurveSegments: 14,
  minLoopArea: 0.01,
  colorDeep: 0x2c85fb,
  colorMid: 0x4ea7ff,
  colorLight: 0x96d7ff,
  colorHighlight: 0xd9f1ff,
  emissive: 0x1c63d3,
  emissiveIntensity: 0.16,
  roughness: 0.1,
  metalness: 0.04,
  glossStrength: 0.22,
  glossTightness: 22.0,
  fresnelStrength: 0.1,
});

function parseCellKey(key) {
  const [x, z] = key.split('|');
  return { x: Number(x), z: Number(z) };
}

function pointKey2D(x, y) {
  return `${x},${y}`;
}

function edgeKey2D(edge) {
  return `${edge.start.x},${edge.start.y}->${edge.end.x},${edge.end.y}`;
}

function signedArea2D(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += (a.x * b.y) - (b.x * a.y);
  }
  return area * 0.5;
}

function simplifyCollinearLoop(points) {
  if (points.length <= 3) return points.slice();
  const simplified = [];

  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const ax = curr.x - prev.x;
    const ay = curr.y - prev.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const cross = (ax * by) - (ay * bx);
    if (Math.abs(cross) > 1e-6) simplified.push(curr);
  }

  return simplified.length >= 3 ? simplified : points.slice();
}

function chaikinClosed(points, iterations = AQUA_STYLE.chaikinIterations, ratio = AQUA_STYLE.chaikinRatio) {
  let result = points.map((point) => ({ x: point.x, y: point.y }));
  if (result.length < 3) return result;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [];
    for (let i = 0; i < result.length; i += 1) {
      const a = result[i];
      const b = result[(i + 1) % result.length];
      next.push({
        x: mix(a.x, b.x, ratio),
        y: mix(a.y, b.y, ratio),
      });
      next.push({
        x: mix(a.x, b.x, 1 - ratio),
        y: mix(a.y, b.y, 1 - ratio),
      });
    }
    result = next;
  }

  return result;
}

function pointInPolygon2D(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && (point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-6) + a.x);
    if (intersects) inside = !inside;
  }

  return inside;
}

function createBoundaryEdges(occupied) {
  const edges = [];

  for (const key of occupied) {
    const { x, z } = parseCellKey(key);
    const left = (x * 2) - 1;
    const right = (x * 2) + 1;
    const top = (z * 2) - 1;
    const bottom = (z * 2) + 1;

    if (!occupied.has(keyForCell(x, z - 1))) {
      edges.push({ start: { x: left, y: top }, end: { x: right, y: top } });
    }
    if (!occupied.has(keyForCell(x + 1, z))) {
      edges.push({ start: { x: right, y: top }, end: { x: right, y: bottom } });
    }
    if (!occupied.has(keyForCell(x, z + 1))) {
      edges.push({ start: { x: right, y: bottom }, end: { x: left, y: bottom } });
    }
    if (!occupied.has(keyForCell(x - 1, z))) {
      edges.push({ start: { x: left, y: bottom }, end: { x: left, y: top } });
    }
  }

  return edges;
}

function buildBoundaryLoops(occupied) {
  const edges = createBoundaryEdges(occupied);
  if (!edges.length) return [];

  const outgoing = new Map();
  for (const edge of edges) {
    const key = pointKey2D(edge.start.x, edge.start.y);
    if (!outgoing.has(key)) outgoing.set(key, []);
    outgoing.get(key).push(edge);
  }

  const used = new Set();
  const loops = [];

  for (const startEdge of edges) {
    const startKey = edgeKey2D(startEdge);
    if (used.has(startKey)) continue;

    const loop = [];
    let edge = startEdge;

    while (edge && !used.has(edgeKey2D(edge))) {
      used.add(edgeKey2D(edge));
      loop.push({
       x: edge.start.x * AQUA_STYLE.cellHalf,
       y: -edge.start.y * AQUA_STYLE.cellHalf,
     });
      const nextEdges = outgoing.get(pointKey2D(edge.end.x, edge.end.y)) || [];
      edge = nextEdges.find((candidate) => !used.has(edgeKey2D(candidate))) || null;
    }

    const simplified = simplifyCollinearLoop(loop);
    if (simplified.length >= 4) loops.push(simplified);
  }

  return loops;
}

function createShapePath(THREE, points, isHole = false) {
  const ordered = points.slice();
  const area = signedArea2D(ordered);

  if (!isHole && area < 0) ordered.reverse();
  if (isHole && area > 0) ordered.reverse();

  const path = isHole ? new THREE.Path() : new THREE.Shape();
  path.moveTo(ordered[0].x, ordered[0].y);
  for (let i = 1; i < ordered.length; i += 1) {
    path.lineTo(ordered[i].x, ordered[i].y);
  }
  path.closePath();
  return path;
}

function buildAquaShapes(THREE, occupied) {
  const rawLoops = buildBoundaryLoops(occupied);
  const smoothedLoops = rawLoops
    .map((loop) => chaikinClosed(loop))
    .filter((loop) => Math.abs(signedArea2D(loop)) > AQUA_STYLE.minLoopArea);

  if (!smoothedLoops.length) return [];

  const outers = [];
  const holes = [];

  for (const loop of smoothedLoops) {
  if (signedArea2D(loop) <= 0) {
    outers.push(loop);
  } else {
    holes.push(loop);
  }
}

  const shapes = outers.map((outer) => ({ outer, holes: [] }));

  for (const hole of holes) {
    const owner = shapes.find((shape) => pointInPolygon2D(hole[0], shape.outer));
    if (owner) owner.holes.push(hole);
  }

  return shapes.map(({ outer, holes }) => {
    const shape = createShapePath(THREE, outer, false);
    for (const hole of holes) {
      shape.holes.push(createShapePath(THREE, hole, true));
    }
    return shape;
  });
}

function createAquaSurfaceMaterial(THREE) {
  const uniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(AQUA_STYLE.colorDeep) },
    uColorMid: { value: new THREE.Color(AQUA_STYLE.colorMid) },
    uColorLight: { value: new THREE.Color(AQUA_STYLE.colorLight) },
    uColorHighlight: { value: new THREE.Color(AQUA_STYLE.colorHighlight) },
  };

  const material = new THREE.MeshStandardMaterial({
    color: AQUA_STYLE.colorDeep,
    emissive: AQUA_STYLE.emissive,
    emissiveIntensity: AQUA_STYLE.emissiveIntensity,
    roughness: AQUA_STYLE.roughness,
    metalness: AQUA_STYLE.metalness,
  });

  material.userData.aquaUniforms = uniforms;
  material.customProgramCacheKey = () => 'aqua-surface-union-v4c';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uColorDeep = uniforms.uColorDeep;
    shader.uniforms.uColorMid = uniforms.uColorMid;
    shader.uniforms.uColorLight = uniforms.uColorLight;
    shader.uniforms.uColorHighlight = uniforms.uColorHighlight;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        varying vec3 vAquaWorld;
        varying vec3 vAquaNormal;
        varying float vAquaLift;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float waveA = sin((position.x * ${AQUA_STYLE.waveFreqAX}) + (position.z * ${AQUA_STYLE.waveFreqAZ}) + (uTime * ${AQUA_STYLE.waveSpeedA}));
        float waveB = sin((position.x * ${AQUA_STYLE.waveFreqBX}) + (position.z * ${AQUA_STYLE.waveFreqBZ}) - (uTime * ${AQUA_STYLE.waveSpeedB}));
        float waveC = sin(((position.x + position.z) * 1.24) + (uTime * ${AQUA_STYLE.waveSpeedC}));
        float lift = ${AQUA_STYLE.baseLift} + (waveA * ${AQUA_STYLE.waveAmpA}) + (waveB * ${AQUA_STYLE.waveAmpB}) + (waveC * ${AQUA_STYLE.waveAmpC});
        transformed.y += lift;
        float liftDx = ${AQUA_STYLE.waveAmpA} * ${AQUA_STYLE.waveFreqAX} * cos((position.x * ${AQUA_STYLE.waveFreqAX}) + (position.z * ${AQUA_STYLE.waveFreqAZ}) + (uTime * ${AQUA_STYLE.waveSpeedA}))
                     + ${AQUA_STYLE.waveAmpB} * ${AQUA_STYLE.waveFreqBX} * cos((position.x * ${AQUA_STYLE.waveFreqBX}) + (position.z * ${AQUA_STYLE.waveFreqBZ}) - (uTime * ${AQUA_STYLE.waveSpeedB}))
                     + ${AQUA_STYLE.waveAmpC} * 1.24 * cos(((position.x + position.z) * 1.24) + (uTime * ${AQUA_STYLE.waveSpeedC}));
        float liftDz = ${AQUA_STYLE.waveAmpA} * ${AQUA_STYLE.waveFreqAZ} * cos((position.x * ${AQUA_STYLE.waveFreqAX}) + (position.z * ${AQUA_STYLE.waveFreqAZ}) + (uTime * ${AQUA_STYLE.waveSpeedA}))
                     + ${AQUA_STYLE.waveAmpB} * ${AQUA_STYLE.waveFreqBZ} * cos((position.x * ${AQUA_STYLE.waveFreqBX}) + (position.z * ${AQUA_STYLE.waveFreqBZ}) - (uTime * ${AQUA_STYLE.waveSpeedB}))
                     + ${AQUA_STYLE.waveAmpC} * 1.24 * cos(((position.x + position.z) * 1.24) + (uTime * ${AQUA_STYLE.waveSpeedC}));
        vAquaNormal = normalize(vec3(-liftDx, 1.0, -liftDz));
        vAquaLift = lift;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vAquaWorld = worldPosition.xyz;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform vec3 uColorDeep;
        uniform vec3 uColorMid;
        uniform vec3 uColorLight;
        varying vec3 vAquaWorld;
        varying vec3 vAquaNormal;
        varying float vAquaLift;`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float sweep = 0.5 + 0.5 * sin((vAquaWorld.x * 1.08) - (vAquaWorld.z * 1.22) + (uTime * 0.84));
        float ripple = 0.5 + 0.5 * sin(((vAquaWorld.x + vAquaWorld.z) * 1.72) - (uTime * 1.18));
        float crest = clamp((vAquaLift - ${AQUA_STYLE.baseLift}) * 18.0 + 0.35, 0.0, 1.0);
        vec3 aquaColor = mix(uColorDeep, uColorMid, 0.24 + (sweep * 0.34));
        aquaColor = mix(aquaColor, uColorLight, (ripple * 0.16) + (crest * 0.28));
        vec4 diffuseColor = vec4( aquaColor, opacity );`,
      );

    material.userData.aquaShader = shader;
  };

  return material;
}

function createAquaSurfaceSystem({ THREE, scene }) {
  const occupied = new Set();
  const meshes = [];
  const material = createAquaSurfaceMaterial(THREE);

  function clearMeshes() {
    while (meshes.length) {
      const mesh = meshes.pop();
      scene.remove(mesh);
      mesh.geometry.dispose();
    }
  }

  function rebuildSurface() {
    clearMeshes();
    if (!occupied.size) return;

    const shapes = buildAquaShapes(THREE, occupied);
    for (const shape of shapes) {
      const geometry = new THREE.ShapeGeometry(shape, AQUA_STYLE.shapeCurveSegments);
      geometry.rotateX(-Math.PI / 2);
      geometry.scale(1, 1.001, 1);
      geometry.computeVertexNormals();

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = AQUA_STYLE.surfaceY;
      mesh.renderOrder = 4;
      mesh.frustumCulled = true;
      mesh.receiveShadow = false;
      mesh.castShadow = false;
      scene.add(mesh);
      meshes.push(mesh);
    }
  }

  function addCell(x, z) {
    const key = keyForCell(x, z);
    if (occupied.has(key)) return false;
    occupied.add(key);
    rebuildSurface();
    return true;
  }

  function clear() {
    clearMeshes();
    occupied.clear();
  }

  function update(time) {
    const uniforms = material.userData.aquaUniforms;
    if (uniforms?.uTime) {
      uniforms.uTime.value = time;
    }
  }

  function dispose() {
    clear();
    material.dispose();
  }

  return {
    addCell,
    clear,
    update,
    dispose,
  };
}

export function getPlayerModeDef(mode) {
  return PLAYER_MODE_DEFS[mode] || PLAYER_MODE_DEFS.wall;
}

export function getAvailableModesForContext(contextProfile = 'default') {
  return CONTEXT_MODE_MAP[contextProfile] || CONTEXT_MODE_MAP.default;
}

export function createPlayerModesSystem({
  THREE,
  scene,
  enemies,
  collidesAt,
  burstAt,
  refreshHud,
  getPlayer,
  getPlayerSystem,
  getWallsSystem,
  getContextProfile,
  assetLibrary = null,
}) {
  let currentMode = 'wall';
  let projectileCooldown = 0;
  let lastAquaActionCellKey = '';
  let aquaVisualTime = 0;
  const projectiles = [];
  const aquaSurfaceSystem = createAquaSurfaceSystem({ THREE, scene });

  function createProjectileVisual() {
    if (assetLibrary && typeof assetLibrary.createProjectileVisual === 'function') {
      const visual = assetLibrary.createProjectileVisual();
      if (visual) return visual;
    }
    return createFallbackProjectileMesh(THREE);
  }

  function getCurrentMode() {
    return currentMode;
  }

  function getCurrentModeLabel() {
    return getPlayerModeDef(currentMode).label;
  }

  function getAvailableModes() {
    const contextProfile = getContextProfile ? getContextProfile() : 'default';
    return getAvailableModesForContext(contextProfile);
  }

  function syncPlayerVisual() {
    const playerSystem = getPlayerSystem ? getPlayerSystem() : null;
    if (playerSystem && typeof playerSystem.setMode === 'function') {
      playerSystem.setMode(currentMode);
    }
  }

  function notifyHud() {
    if (typeof refreshHud === 'function') refreshHud();
  }

  function clearActionState() {
    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (wallsSystem && typeof wallsSystem.clearLastActionCell === 'function') {
      wallsSystem.clearLastActionCell();
    }
    lastAquaActionCellKey = '';
  }

  function setMode(nextMode) {
    const availableModes = getAvailableModes();
    if (!availableModes.length) {
      currentMode = 'wall';
      syncPlayerVisual();
      clearActionState();
      notifyHud();
      return currentMode;
    }

    if (!PLAYER_MODE_DEFS[nextMode]) {
      nextMode = availableModes[0];
    }
    if (!availableModes.includes(nextMode)) {
      nextMode = availableModes[0];
    }

    if (currentMode === nextMode) {
      syncPlayerVisual();
      notifyHud();
      return currentMode;
    }

    currentMode = nextMode;
    syncPlayerVisual();
    clearActionState();
    notifyHud();
    return currentMode;
  }

  function ensureCurrentModeAvailable() {
    const availableModes = getAvailableModes();
    if (!availableModes.length) return false;
    if (availableModes.includes(currentMode)) return false;
    setMode(availableModes[0]);
    return true;
  }

  function cycleMode() {
    const availableModes = getAvailableModes();
    if (!availableModes.length) return currentMode;
    const currentIndex = availableModes.indexOf(currentMode);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % availableModes.length : 0;
    return setMode(availableModes[nextIndex]);
  }

  function removeProjectileAt(index) {
    const projectile = projectiles[index];
    if (!projectile) return;
    scene.remove(projectile.mesh);
    projectiles.splice(index, 1);
  }

  function clearProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      removeProjectileAt(i);
    }
  }

  function clearAquaNodes() {
    aquaSurfaceSystem.clear();
  }

  function spawnProjectile() {
    const player = getPlayer ? getPlayer() : null;
    if (!player) return false;
    if (projectileCooldown > 0) return false;

    projectileCooldown = 0.16;

    const direction = getDirectionFromPlayer(player);
    const mesh = createProjectileVisual();
    mesh.rotation.y = Math.atan2(direction.x, direction.z);

    const startX = player.x + direction.x * 0.92;
    const startZ = player.z + direction.z * 0.92;
    mesh.position.set(startX, 0.95, startZ);
    scene.add(mesh);

    projectiles.push({
      x: startX,
      z: startZ,
      dirX: direction.x,
      dirZ: direction.z,
      speed: 21,
      radius: 0.22,
      life: 1.2,
      mesh,
    });

    if (burstAt) {
      burstAt(startX, 0.95, startZ, 0xff7f7f, 2);
    }

    return true;
  }

  function placeAquaNodeAtPlayer() {
    const player = getPlayer ? getPlayer() : null;
    if (!player) return false;

    const cellX = Math.round(player.x);
    const cellZ = Math.round(player.z);
    const key = keyForCell(cellX, cellZ);

    if (lastAquaActionCellKey === key) return false;
    lastAquaActionCellKey = key;

    const added = aquaSurfaceSystem.addCell(cellX, cellZ);
    if (!added) return false;

    if (burstAt) {
      burstAt(cellX, 0.38, cellZ, 0x53a9ff, 3);
    }

    return true;
  }

  function hitEnemyWithProjectile(enemy, projectile) {
    enemy.stress = Math.min(8.4, (enemy.stress || 0) + 3.1);
    enemy.bounceChain = Math.min(6, (enemy.bounceChain || 0) + 1.0);
    enemy.dirX = projectile.dirX;
    enemy.dirZ = projectile.dirZ;

    if (enemy.mesh?.material) {
      enemy.mesh.material.emissiveIntensity = Math.max(
        enemy.mesh.material.emissiveIntensity || 0,
        0.82,
      );
    }

    if (burstAt) {
      burstAt(enemy.x, 0.9, enemy.z, 0xff5b5b, 4);
    }
  }

  function updateProjectiles(delta) {
    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.life -= delta;

      if (projectile.life <= 0) {
        removeProjectileAt(i);
        continue;
      }

      const nextX = projectile.x + projectile.dirX * projectile.speed * delta;
      const nextZ = projectile.z + projectile.dirZ * projectile.speed * delta;

      if (collidesAt && collidesAt(nextX, nextZ, projectile.radius)) {
        if (burstAt) burstAt(nextX, 0.95, nextZ, 0xff8d8d, 2);
        removeProjectileAt(i);
        continue;
      }

      projectile.x = nextX;
      projectile.z = nextZ;
      projectile.mesh.position.set(projectile.x, 0.95, projectile.z);
      projectile.mesh.rotation.y = Math.atan2(projectile.dirX, projectile.dirZ);
      projectile.mesh.rotation.z += delta * 8.5;

      let consumed = false;
      for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
        const enemy = enemies[enemyIndex];
        const dist = Math.hypot(enemy.x - projectile.x, enemy.z - projectile.z);
        if (dist > enemy.radius + projectile.radius + 0.18) continue;
        hitEnemyWithProjectile(enemy, projectile);
        removeProjectileAt(i);
        consumed = true;
        break;
      }
      if (consumed) continue;
    }
  }

  function handlePrimaryActionHeld() {
    ensureCurrentModeAvailable();
    const wallsSystem = getWallsSystem ? getWallsSystem() : null;

    switch (currentMode) {
      case 'wall':
        if (wallsSystem && typeof wallsSystem.toggleWallAtPlayer === 'function') {
          wallsSystem.toggleWallAtPlayer();
        }
        break;
      case 'projectile':
        spawnProjectile();
        break;
      case 'aqua':
        placeAquaNodeAtPlayer();
        break;
      case 'vehicle':
      default:
        break;
    }
  }

  function handlePrimaryActionReleased() {
    const wallsSystem = getWallsSystem ? getWallsSystem() : null;
    if (currentMode === 'wall' && wallsSystem && typeof wallsSystem.clearLastActionCell === 'function') {
      wallsSystem.clearLastActionCell();
    }
    if (currentMode === 'aqua') {
      lastAquaActionCellKey = '';
    }
  }

  function update(delta) {
    projectileCooldown = Math.max(0, projectileCooldown - delta);
    aquaVisualTime += delta;
    ensureCurrentModeAvailable();
    updateProjectiles(delta);
    aquaSurfaceSystem.update(aquaVisualTime);
  }

  function reset() {
    clearProjectiles();
    clearAquaNodes();
    projectileCooldown = 0;
    lastAquaActionCellKey = '';
    aquaVisualTime = 0;
    setMode('wall');
  }

  return {
    getCurrentMode,
    getCurrentModeLabel,
    getAvailableModes,
    setMode,
    cycleMode,
    ensureCurrentModeAvailable,
    handlePrimaryActionHeld,
    handlePrimaryActionReleased,
    update,
    reset,
  };
}
