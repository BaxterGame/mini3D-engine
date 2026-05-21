import { parseObjGeometry } from './library.js';

const STORAGE_KEY = 'mini3d-engine.custom-asset.wall.obj.v1';
const CUSTOM_IMPORT_ITEM_ID = 'wall-custom-import';
const CUSTOM_RANDOM_ITEM_ID = 'wall-custom-random';
const CUSTOM_VARIANT_PREFIX = 'wall-custom-asset:';
const CUSTOM_SHADER_VARIANT_PREFIX = 'wall-shader:';
const GRID_MODE_DEFAULT = 'square';
const GRID_MODE_HEX = 'hex';
const HEX_ROW_OFFSET = 0.5;
const HEX_IMPORT_SCALE_X = 1.25;
const HEX_IMPORT_SCALE_Y = 1.25;
const HEX_IMPORT_SCALE_Z = 1.25;
//const CUSTOM_IMPORT_SCALE_Y = 3.0;

function roundToHalfStep(value) {
  return Math.round((Number(value) || 0) * 2) / 2;
}

const DEFAULT_SWATCHES = [
  'linear-gradient(180deg, #7ef7ff 0%, #3187ff 100%)',
  'linear-gradient(180deg, #f6c46f 0%, #d96c2f 100%)',
  'linear-gradient(180deg, #db95ff 0%, #8632ff 100%)',
  'linear-gradient(180deg, #8cffb0 0%, #1ba36d 100%)',
  'linear-gradient(180deg, #ffe788 0%, #d9a32e 100%)',
  'linear-gradient(180deg, #ffa0c3 0%, #cf3a77 100%)',
];

const SHADER_PRESET_DEFINITIONS = Object.freeze([
  {
    id: 'box-stars',
    label: 'Box of Stars',
    meta: 'cube stellaire / glow interne',
    swatch: 'linear-gradient(180deg, #0e1338 0%, #4a1fb6 48%, #f347ff 100%)',
  },
  {
    id: 'voxel-bloom',
    label: 'Voxel Bloom',
    meta: 'scanlines bloom / cyan magenta',
    swatch: 'linear-gradient(180deg, #3be9ff 0%, #756bff 45%, #ff55c0 100%)',
  },
  {
    id: 'sphere-mist',
    label: 'Sphere Mist',
    meta: 'inverse fresnel / coeur diffus',
    swatch: 'linear-gradient(180deg, #dff6ff 0%, #8de4ff 42%, #9d8dff 100%)',
  },
  {
    id: 'sphere-inner-halo',
    label: 'Sphere Inner Halo',
    meta: 'inside-edge lighting / halo interne',
    swatch: 'linear-gradient(180deg, #f5ebff 0%, #c2a4ff 44%, #72fff2 100%)',
  },
  {
    id: 'cube-mist',
    label: 'Cube Mist',
    meta: 'volume doux / centre dense',
    swatch: 'linear-gradient(180deg, #eef7ff 0%, #8fe7ff 48%, #8ea0ff 100%)',
  },
  {
    id: 'cube-inner-edge',
    label: 'Cube Inner Edge',
    meta: 'inside-edge / faces lumineuses',
    swatch: 'linear-gradient(180deg, #edf0ff 0%, #9de7ff 40%, #d58cff 100%)',
  },
]);

const SHADER_PRESET_MAP = new Map(SHADER_PRESET_DEFINITIONS.map((entry) => [entry.id, entry]));

const COMMON_NOISE_GLSL = `
float hash31(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
}

float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 0.0)), hash31(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i += 1) {
    value += amplitude * noise3(p);
    p = p * 2.03 + vec3(11.7, 7.9, 3.4);
    amplitude *= 0.5;
  }
  return value;
}
`;

const COMMON_VERTEX_SHADER = `
varying vec3 vLocalPos;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

void main() {
  vLocalPos = position;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vViewDir = cameraPosition - worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const SPHERE_MIST_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uRadius, 1e-4);
  float radius = length(local);
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 1.8);
  float silhouette = pow(1.0 - ndv, 2.4);

  float core = 1.0 - smoothstep(0.16, 1.04, radius);
  float fadeShell = 1.0 - smoothstep(0.72, 1.10, radius);
  float mistNoise = fbm(local * 2.3 + vec3(0.0, uTime * 0.15, 0.0));
  float drift = fbm(local * 4.0 + vec3(uTime * 0.08, 0.0, -uTime * 0.05));

  float alpha = (core * (0.44 + 0.78 * inverseFresnel) + mistNoise * 0.18 + drift * 0.1) * uOpacity * fadeShell;
  alpha *= 1.0 - silhouette * 0.35;
  alpha = clamp(alpha * 1.9, 0.0, 0.72);

  float colorMix = clamp(0.2 + mistNoise * 0.48 + drift * 0.22 + inverseFresnel * 0.32, 0.0, 1.0);
  vec3 color = mix(uColorA, uColorB, colorMix);
  color = mix(color, uColorC, clamp(core * 0.58 + inverseFresnel * 0.28, 0.0, 1.0));
  color *= 1.08;

  gl_FragColor = vec4(color, alpha);
}
`;

const SPHERE_INNER_HALO_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform float uRadius;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uRadius, 1e-4);
  float radius = length(local);
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 1.55);
  float silhouette = pow(1.0 - ndv, 2.0);

  float core = 1.0 - smoothstep(0.0, 0.62, radius);
  float innerBand = smoothstep(0.32, 0.58, radius) * (1.0 - smoothstep(0.58, 0.84, radius));
  float outerFade = 1.0 - smoothstep(0.84, 1.08, radius);
  float mistNoise = fbm(local * 2.8 + vec3(-uTime * 0.12, uTime * 0.09, 0.0));

  float alpha = (core * (0.24 + inverseFresnel * 0.18) + innerBand * (0.56 + 0.34 * mistNoise)) * uOpacity * outerFade;
  alpha *= 1.0 - silhouette * 0.26;
  alpha = clamp(alpha * 1.8, 0.0, 0.64);

  vec3 color = mix(uColorA, uColorB, clamp(mistNoise * 0.82 + innerBand * 0.56, 0.0, 1.0));
  color = mix(color, uColorC, clamp(innerBand * 0.88 + core * 0.3, 0.0, 1.0));
  color *= 1.08;

  gl_FragColor = vec4(color, alpha);
}
`;

const CUBE_MIST_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uHalfExtents;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uHalfExtents, vec3(1e-4));
  float maxComp = max(abs(local.x), max(abs(local.y), abs(local.z)));
  float radial = length(local * vec3(0.92, 0.8, 0.92));
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 2.05);
  float silhouette = pow(1.0 - ndv, 2.6);

  float core = 1.0 - smoothstep(0.18, 1.0, radial);
  float boxFade = 1.0 - smoothstep(0.72, 1.04, maxComp);
  float mistNoise = fbm(local * 2.5 + vec3(0.0, uTime * 0.12, -uTime * 0.08));
  float swirl = fbm(local.yzx * 4.1 + vec3(uTime * 0.04, 0.0, uTime * 0.07));

  float alpha = (core * (0.46 + 0.76 * inverseFresnel) + mistNoise * 0.18 + swirl * 0.1) * uOpacity * boxFade;
  alpha *= 1.0 - silhouette * 0.38;
  alpha = clamp(alpha * 1.95, 0.0, 0.68);

  float colorMix = clamp(0.18 + mistNoise * 0.46 + swirl * 0.22 + inverseFresnel * 0.3, 0.0, 1.0);
  vec3 color = mix(uColorA, uColorB, colorMix);
  color = mix(color, uColorC, clamp(core * 0.5 + inverseFresnel * 0.26, 0.0, 1.0));
  color *= 1.08;

  gl_FragColor = vec4(color, alpha);
}
`;

const CUBE_INNER_EDGE_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uHalfExtents;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uHalfExtents, vec3(1e-4));
  float maxComp = max(abs(local.x), max(abs(local.y), abs(local.z)));
  float insideDepth = 1.0 - maxComp;
  float radial = length(local * vec3(0.88, 0.82, 0.88));
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 1.65);
  float silhouette = pow(1.0 - ndv, 2.1);

  float insideBand = smoothstep(0.05, 0.14, insideDepth) * (1.0 - smoothstep(0.14, 0.32, insideDepth));
  float core = 1.0 - smoothstep(0.22, 0.98, radial);
  float flow = 0.5 + 0.5 * sin(local.y * 26.0 + uTime * 1.8 + fbm(local * 5.4) * 3.2);
  float mistNoise = fbm(local * 3.3 + vec3(uTime * 0.06, -uTime * 0.04, 0.0));
  float outerFade = 1.0 - smoothstep(0.82, 1.05, maxComp);

  float alpha = (insideBand * (0.58 + 0.42 * flow) + core * (0.16 + 0.18 * inverseFresnel) + mistNoise * 0.08) * uOpacity * outerFade;
  alpha *= 1.0 - silhouette * 0.24;
  alpha = clamp(alpha * 2.0, 0.0, 0.66);

  vec3 color = mix(uColorA, uColorB, clamp(flow * 0.7 + mistNoise * 0.28, 0.0, 1.0));
  color = mix(color, uColorC, clamp(insideBand * 0.92 + core * 0.22, 0.0, 1.0));
  color *= 1.08;

  gl_FragColor = vec4(color, alpha);
}
`;

const BOX_OF_STARS_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uHalfExtents;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uHalfExtents, vec3(1e-4));
  float maxComp = max(abs(local.x), max(abs(local.y), abs(local.z)));
  float insideDepth = 1.0 - maxComp;
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 1.45);
  float nebula = fbm(local * 2.6 + vec3(uTime * 0.05, -uTime * 0.04, uTime * 0.03));
  float nebula2 = fbm(local.zxy * 4.8 + vec3(-uTime * 0.08, uTime * 0.03, 0.0));
  float stars = step(0.992, hash31(floor((local + 1.4) * 17.0 + vec3(uTime * 0.15))));
  float insideBand = smoothstep(0.04, 0.12, insideDepth) * (1.0 - smoothstep(0.12, 0.28, insideDepth));
  float alpha = (insideBand * 0.22 + nebula * 0.1 + nebula2 * 0.08 + inverseFresnel * 0.08 + stars * 0.36) * uOpacity;
  alpha *= 1.0 - smoothstep(0.88, 1.05, maxComp);
  alpha = clamp(alpha, 0.0, 0.28);

  vec3 color = mix(uColorA, uColorB, clamp(nebula * 0.8 + nebula2 * 0.25, 0.0, 1.0));
  color = mix(color, uColorC, clamp(insideBand * 0.7 + stars * 0.95, 0.0, 1.0));

  gl_FragColor = vec4(color, alpha);
}
`;

const VOXEL_BLOOM_FRAGMENT_SHADER = `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uHalfExtents;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

varying vec3 vLocalPos;
varying vec3 vWorldNormal;
varying vec3 vViewDir;

${COMMON_NOISE_GLSL}

void main() {
  vec3 local = vLocalPos / max(uHalfExtents, vec3(1e-4));
  float maxComp = max(abs(local.x), max(abs(local.y), abs(local.z)));
  float insideDepth = 1.0 - maxComp;
  float ndv = max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0);
  float inverseFresnel = pow(ndv, 1.35);
  float terraces = 0.5 + 0.5 * sin(local.y * 24.0 + uTime * 1.9);
  float cross = 0.5 + 0.5 * sin(local.x * 11.0 - uTime * 0.8) * sin(local.z * 11.0 + uTime * 0.7);
  float noiseField = fbm(local * 4.6 + vec3(uTime * 0.07, 0.0, -uTime * 0.05));
  float bloomBand = smoothstep(0.08, 0.26, insideDepth) * (1.0 - smoothstep(0.26, 0.58, insideDepth));
  float center = 1.0 - smoothstep(0.24, 1.0, length(local * vec3(0.84, 0.78, 0.84)));
  float alpha = (bloomBand * (0.22 + 0.22 * terraces) + center * 0.08 + noiseField * 0.06 + inverseFresnel * 0.05) * uOpacity;
  alpha *= 1.0 - smoothstep(0.88, 1.05, maxComp);
  alpha = clamp(alpha, 0.0, 0.26);

  vec3 color = mix(uColorA, uColorB, clamp(cross * 0.65 + terraces * 0.25, 0.0, 1.0));
  color = mix(color, uColorC, clamp(bloomBand * 0.72 + noiseField * 0.24, 0.0, 1.0));

  gl_FragColor = vec4(color, alpha);
}
`;

function sanitizeName(value) {
  const trimmed = String(value || '').trim();
  return trimmed || 'custom_asset';
}

function createUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeGridMode(value) {
  return value === GRID_MODE_HEX ? GRID_MODE_HEX : GRID_MODE_DEFAULT;
}

function isOddRow(z) {
  return Math.abs(Math.trunc(Number(z) || 0)) % 2 === 1;
}

function getGridPlacementForMode(gridMode, cell = {}) {
  const x = Number(cell?.x) || 0;
  const y = Number(cell?.y) || 0;
  const z = Number(cell?.z) || 0;

  if (normalizeGridMode(gridMode) !== GRID_MODE_HEX) {
    return { x, y, z };
  }

  return {
    x: x + (isOddRow(z) ? HEX_ROW_OFFSET : 0),
    y,
    z,
  };
}

function getGridPlacementForRecord(record, cell = {}) {
  return getGridPlacementForMode(record?.gridMode, cell);
}

function getPlacementCellForMode(gridMode, world = {}) {
  const worldX = Number(world?.x) || 0;
  const worldY = Number(world?.y) || 0;
  const worldZ = Number(world?.z) || 0;

  if (normalizeGridMode(gridMode) !== GRID_MODE_HEX) {
    return {
      x: Math.round(worldX),
      y: worldY,
      z: Math.round(worldZ),
    };
  }

  const rowZ = Math.round(worldZ);
  const localX = worldX - (isOddRow(rowZ) ? HEX_ROW_OFFSET : 0);
  return {
    x: Math.round(localX),
    y: worldY,
    z: rowZ,
  };
}

function getSnapWorldForMode(gridMode, world = {}) {
  const snappedCell = getPlacementCellForMode(gridMode, world);
  const snappedWorld = getGridPlacementForMode(gridMode, snappedCell);
  return {
    x: normalizeGridMode(gridMode) === GRID_MODE_HEX ? roundToHalfStep(snappedWorld.x) : snappedWorld.x,
    y: Number(world?.y) || 0,
    z: snappedWorld.z,
  };
}

function createMaterialForIndex(THREE, index) {
  const palette = [0x6be7ff, 0xf7a453, 0xb07bff, 0x7effa9, 0xffe37a, 0xff88b0];
  const color = palette[index % palette.length];

  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.1,
    roughness: 0.55,
    metalness: 0.05,
    flatShading: false,
  });
}

function createNormalizedTemplate(THREE, geometry, material, options = {}) {
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const box = geometry.boundingBox;
  if (!box) {
    throw new Error('Bounding box absente sur la géométrie custom.');
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const horizontalSpan = Math.max(size.x || 0, size.z || 0);
  if (!Number.isFinite(horizontalSpan) || horizontalSpan <= 0) {
    throw new Error('Dimensions invalides pour l’asset custom.');
  }

  const scaleXMultiplier = Number.isFinite(options?.scaleX) && options.scaleX > 0
    ? options.scaleX
    : 1;
  const scaleYMultiplier = Number.isFinite(options?.scaleY) && options.scaleY > 0
    ? options.scaleY
    : 1;
  const scaleZMultiplier = Number.isFinite(options?.scaleZ) && options.scaleZ > 0
    ? options.scaleZ
    : 1;
  const baseScale = 1 / horizontalSpan;
  const scaleX = baseScale * scaleXMultiplier;
  const scaleY = baseScale * scaleYMultiplier;
  const scaleZ = baseScale * scaleZMultiplier;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.set(scaleX, scaleY, scaleZ);
  mesh.position.set(
    -center.x * scaleX,
    -(box.min.y || 0) * scaleY,
    -center.z * scaleZ,
  );

  const root = new THREE.Group();
  root.add(mesh);
  root.userData.wallMetrics = {
    height: size.y * scaleY,
    spanX: size.x * scaleX,
    spanZ: size.z * scaleZ,
    minY: 0,
  };
  return root;
}

function cloneTemplate(template) {
  return template.clone(true);
}

function toStoragePayload(records) {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    sourceName: record.sourceName,
    objText: record.objText,
    createdAt: record.createdAt,
    gridMode: normalizeGridMode(record.gridMode),
  }));
}

function setGroundedMetrics(root, metrics = {}) {
  root.userData.wallMetrics = {
    height: Number.isFinite(metrics.height) ? metrics.height : 1,
    spanX: Number.isFinite(metrics.spanX) ? metrics.spanX : 1,
    spanZ: Number.isFinite(metrics.spanZ) ? metrics.spanZ : 1,
    minY: 0,
  };
  return root;
}

function createShaderMaterial(THREE, options = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: options.uniforms,
    vertexShader: options.vertexShader || COMMON_VERTEX_SHADER,
    fragmentShader: options.fragmentShader,
    transparent: options.transparent !== false,
    depthWrite: options.depthWrite === true,
    depthTest: options.depthTest !== false,
    blending: options.blending || THREE.NormalBlending,
    side: options.side || THREE.DoubleSide,
  });

  material.toneMapped = false;
  return material;
}

function createAnimatedSphereMaterial(THREE, animatedUniforms, config = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: config.opacity ?? 1 },
    uRadius: { value: config.radius ?? 0.5 },
    uColorA: { value: new THREE.Color(config.colorA ?? 0xeaf8ff) },
    uColorB: { value: new THREE.Color(config.colorB ?? 0x9fe8ff) },
    uColorC: { value: new THREE.Color(config.colorC ?? 0x9a8cff) },
  };

  animatedUniforms.add(uniforms);
  return createShaderMaterial(THREE, {
    uniforms,
    fragmentShader: config.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

function createAnimatedCubeMaterial(THREE, animatedUniforms, config = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uOpacity: { value: config.opacity ?? 1 },
    uHalfExtents: { value: (config.halfExtents || new THREE.Vector3(0.46, 0.46, 0.46)).clone() },
    uColorA: { value: new THREE.Color(config.colorA ?? 0xeaf8ff) },
    uColorB: { value: new THREE.Color(config.colorB ?? 0x9fe8ff) },
    uColorC: { value: new THREE.Color(config.colorC ?? 0x9a8cff) },
  };

  animatedUniforms.add(uniforms);
  return createShaderMaterial(THREE, {
    uniforms,
    fragmentShader: config.fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
}

function createSphereMistTemplate(THREE, animatedUniforms) {
  const root = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 5),
    createAnimatedSphereMaterial(THREE, animatedUniforms, {
      fragmentShader: SPHERE_MIST_FRAGMENT_SHADER,
      radius: 0.42,
      opacity: 0.98,
      colorA: 0xecf7ff,
      colorB: 0x9fe5ff,
      colorC: 0x8c84ff,
    }),
  );
  core.position.y = 0.5;
  core.castShadow = false;
  core.receiveShadow = false;

  const haze = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.56, 4),
    createAnimatedSphereMaterial(THREE, animatedUniforms, {
      fragmentShader: SPHERE_MIST_FRAGMENT_SHADER,
      radius: 0.56,
      opacity: 0.76,
      colorA: 0xf7fbff,
      colorB: 0xbfeeff,
      colorC: 0xa89dff,
    }),
  );
  haze.position.y = 0.5;
  haze.castShadow = false;
  haze.receiveShadow = false;

  root.add(haze, core);
  return setGroundedMetrics(root, { height: 1.16, spanX: 1.16, spanZ: 1.16 });
}

function createSphereInnerHaloTemplate(THREE, animatedUniforms) {
  const root = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.46, 5),
    createAnimatedSphereMaterial(THREE, animatedUniforms, {
      fragmentShader: SPHERE_INNER_HALO_FRAGMENT_SHADER,
      radius: 0.46,
      opacity: 0.94,
      colorA: 0xf6ebff,
      colorB: 0xba9bff,
      colorC: 0x7ff6ff,
    }),
  );
  base.position.y = 0.5;
  base.castShadow = false;
  base.receiveShadow = false;

  const veil = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.58, 4),
    createAnimatedSphereMaterial(THREE, animatedUniforms, {
      fragmentShader: SPHERE_MIST_FRAGMENT_SHADER,
      radius: 0.58,
      opacity: 0.68,
      colorA: 0xfbf6ff,
      colorB: 0xcdb6ff,
      colorC: 0x9ef8ff,
    }),
  );
  veil.position.y = 0.5;
  veil.castShadow = false;
  veil.receiveShadow = false;

  root.add(veil, base);
  return setGroundedMetrics(root, { height: 1.18, spanX: 1.18, spanZ: 1.18 });
}

function createCubeMistTemplate(THREE, animatedUniforms) {
  const root = new THREE.Group();

  const coreHalfExtents = new THREE.Vector3(0.42, 0.42, 0.42);
  const hazeHalfExtents = new THREE.Vector3(0.54, 0.54, 0.54);

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(coreHalfExtents.x * 2, coreHalfExtents.y * 2, coreHalfExtents.z * 2, 3, 3, 3),
    createAnimatedCubeMaterial(THREE, animatedUniforms, {
      fragmentShader: CUBE_MIST_FRAGMENT_SHADER,
      halfExtents: coreHalfExtents,
      opacity: 0.96,
      colorA: 0xebf7ff,
      colorB: 0xa4e8ff,
      colorC: 0x8598ff,
    }),
  );
  core.position.y = 0.5;
  core.castShadow = false;
  core.receiveShadow = false;

  const haze = new THREE.Mesh(
    new THREE.BoxGeometry(hazeHalfExtents.x * 2, hazeHalfExtents.y * 2, hazeHalfExtents.z * 2, 2, 2, 2),
    createAnimatedCubeMaterial(THREE, animatedUniforms, {
      fragmentShader: CUBE_MIST_FRAGMENT_SHADER,
      halfExtents: hazeHalfExtents,
      opacity: 0.74,
      colorA: 0xf6fbff,
      colorB: 0xc0f2ff,
      colorC: 0xa6afff,
    }),
  );
  haze.position.y = 0.5;
  haze.castShadow = false;
  haze.receiveShadow = false;

  root.add(haze, core);
  return setGroundedMetrics(root, { height: 1.16, spanX: 1.16, spanZ: 1.16 });
}

function createCubeInnerEdgeTemplate(THREE, animatedUniforms) {
  const root = new THREE.Group();

  const innerHalfExtents = new THREE.Vector3(0.44, 0.44, 0.44);
  const veilHalfExtents = new THREE.Vector3(0.54, 0.54, 0.54);

  const inner = new THREE.Mesh(
    new THREE.BoxGeometry(innerHalfExtents.x * 2, innerHalfExtents.y * 2, innerHalfExtents.z * 2, 4, 4, 4),
    createAnimatedCubeMaterial(THREE, animatedUniforms, {
      fragmentShader: CUBE_INNER_EDGE_FRAGMENT_SHADER,
      halfExtents: innerHalfExtents,
      opacity: 0.96,
      colorA: 0xeef4ff,
      colorB: 0x93ecff,
      colorC: 0xcf8dff,
    }),
  );
  inner.position.y = 0.5;
  inner.castShadow = false;
  inner.receiveShadow = false;

  const veil = new THREE.Mesh(
    new THREE.BoxGeometry(veilHalfExtents.x * 2, veilHalfExtents.y * 2, veilHalfExtents.z * 2, 2, 2, 2),
    createAnimatedCubeMaterial(THREE, animatedUniforms, {
      fragmentShader: CUBE_MIST_FRAGMENT_SHADER,
      halfExtents: veilHalfExtents,
      opacity: 0.62,
      colorA: 0xf8fbff,
      colorB: 0xbff2ff,
      colorC: 0xd4b8ff,
    }),
  );
  veil.position.y = 0.5;
  veil.castShadow = false;
  veil.receiveShadow = false;

  root.add(veil, inner);
  return setGroundedMetrics(root, { height: 1.16, spanX: 1.16, spanZ: 1.16 });
}

function createBoxOfStarsTemplate(THREE, animatedUniforms) {
  const uniforms = {
    uTime: { value: 0 },
    uTintA: { value: new THREE.Color(0x1e3cff) },
    uTintB: { value: new THREE.Color(0xf13fff) },
    uTintC: { value: new THREE.Color(0x0b0818) },
    uOpacity: { value: 0.88 },
  };
  animatedUniforms.add(uniforms);

  const cubeMat = createShaderMaterial(THREE, {
    uniforms,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uTintA;
      uniform vec3 uTintB;
      uniform vec3 uTintC;
      uniform float uOpacity;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      ${COMMON_NOISE_GLSL}
      void main() {
        vec3 p = vLocalPos;
        float band = sin((p.y + fbm(p * 3.4 + vec3(0.0, uTime * 0.18, 0.0)) * 0.55) * 10.0 + uTime * 0.8);
        float wave = fbm(p * 5.0 + vec3(uTime * 0.16, 0.0, uTime * 0.12));
        float stars = step(0.992, noise3(vWorldPos * 9.5 + vec3(0.0, uTime * 0.02, 0.0))) * (0.5 + wave * 0.9);
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos))), 3.0);
        vec3 aurora = mix(uTintA, uTintB, smoothstep(-0.5, 0.7, band + wave * 0.9));
        vec3 col = mix(uTintC, aurora, 0.78 + fresnel * 0.35);
        col += stars * vec3(0.95, 0.9, 1.0);
        col += fresnel * aurora * 0.42;
        float alpha = (0.42 + fresnel * 0.42 + wave * 0.14) * uOpacity;
        gl_FragColor = vec4(col, min(alpha, 0.92));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const edgeMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true,
  });

  const shellGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9, 1, 1, 1);
  const innerGeo = new THREE.BoxGeometry(0.72, 0.72, 0.72, 1, 1, 1);
  const root = new THREE.Group();
  const shell = new THREE.Mesh(shellGeo, cubeMat);
  shell.position.y = 0.46;
  shell.castShadow = false;
  shell.receiveShadow = false;
  root.add(shell);

  const inner = new THREE.Mesh(innerGeo, cubeMat);
  inner.position.copy(shell.position);
  inner.scale.setScalar(0.96);
  inner.castShadow = false;
  inner.receiveShadow = false;
  root.add(inner);

  const edges = new THREE.Mesh(shellGeo, edgeMat);
  edges.position.copy(shell.position);
  edges.scale.setScalar(1.01);
  edges.castShadow = false;
  edges.receiveShadow = false;
  root.add(edges);

  return setGroundedMetrics(root, { height: 0.92, spanX: 0.92, spanZ: 0.92 });
}

function createVoxelBloomTemplate(THREE, animatedUniforms) {
  const uniforms = {
    uTime: { value: 0 },
    uTintA: { value: new THREE.Color(0xff67cf) },
    uTintB: { value: new THREE.Color(0x69dbff) },
    uTintC: { value: new THREE.Color(0x4c0d60) },
    uOpacity: { value: 0.88 },
  };
  animatedUniforms.add(uniforms);

  const voxelMat = createShaderMaterial(THREE, {
    uniforms,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uTintA;
      uniform vec3 uTintB;
      uniform vec3 uTintC;
      uniform float uOpacity;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      ${COMMON_NOISE_GLSL}
      void main() {
        vec3 p = vLocalPos;
        float stripes = 0.5 + 0.5 * sin((p.y * 12.0) + uTime * 1.8 + p.x * 3.4);
        float haze = fbm(vWorldPos * 3.5 + vec3(0.0, uTime * 0.14, 0.0));
        float fresnel = pow(1.0 - abs(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPos))), 2.6);
        vec3 col = mix(uTintC, uTintA, smoothstep(0.15, 0.92, stripes));
        col = mix(col, uTintB, smoothstep(0.3, 0.9, haze + p.z * 0.25 + 0.28));
        col += fresnel * vec3(0.18, 0.1, 0.22);
        float alpha = (0.36 + stripes * 0.18 + haze * 0.18 + fresnel * 0.34) * uOpacity;
        gl_FragColor = vec4(col, min(alpha, 0.86));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff9ae5,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const root = new THREE.Group();
  const baseHeights = [
    [0.48, 0.7, 0.56],
    [0.82, 1.08, 0.76],
    [0.58, 0.92, 0.62],
  ];
  const footprint = 0.22;
  for (let z = 0; z < 3; z++) {
    for (let x = 0; x < 3; x++) {
      const height = baseHeights[z][x];
      const geo = new THREE.BoxGeometry(footprint, height, footprint);
      const mesh = new THREE.Mesh(geo, voxelMat);
      mesh.position.set((x - 1) * 0.28, height * 0.5, (z - 1) * 0.28);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      root.add(mesh);

      const glow = new THREE.Mesh(new THREE.BoxGeometry(footprint * 1.22, height * 1.06, footprint * 1.22), glowMat);
      glow.position.copy(mesh.position);
      glow.castShadow = false;
      glow.receiveShadow = false;
      root.add(glow);
    }
  }

  root.position.y = 0.02;
  return setGroundedMetrics(root, { height: 1.12, spanX: 0.96, spanZ: 0.96 });
}

function buildShaderPresetTemplate(THREE, animatedUniforms, presetId) {
  switch (presetId) {
    case 'box-stars':
      return createBoxOfStarsTemplate(THREE, animatedUniforms);
    case 'voxel-bloom':
      return createVoxelBloomTemplate(THREE, animatedUniforms);
    case 'sphere-mist':
      return createSphereMistTemplate(THREE, animatedUniforms);
    case 'sphere-inner-halo':
      return createSphereInnerHaloTemplate(THREE, animatedUniforms);
    case 'cube-mist':
      return createCubeMistTemplate(THREE, animatedUniforms);
    case 'cube-inner-edge':
      return createCubeInnerEdgeTemplate(THREE, animatedUniforms);
    default:
      return null;
  }
}

export function createCustomAssetRegistry({ THREE, storageKey = STORAGE_KEY } = {}) {
  const records = [];
  const recordTemplates = new Map();
  const shaderTemplates = new Map();
  const animatedUniforms = new Set();

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(toStoragePayload(records)));
    } catch (error) {
      console.warn('[custom-assets] impossible de sauvegarder les assets custom.', error);
    }
  }

  function buildTemplate(record, index) {
    if (recordTemplates.has(record.id)) return recordTemplates.get(record.id);

    const geometry = parseObjGeometry(record.objText, THREE);
    const material = createMaterialForIndex(THREE, index);
    const isHex = normalizeGridMode(record.gridMode) === GRID_MODE_HEX;
    const template = createNormalizedTemplate(THREE, geometry, material, {
      scaleX: isHex ? HEX_IMPORT_SCALE_X : 1,
      scaleY: isHex ? HEX_IMPORT_SCALE_Y : 1, //CUSTOM_IMPORT_SCALE_Y,
      scaleZ: isHex ? HEX_IMPORT_SCALE_Z : 1,
    });
    recordTemplates.set(record.id, template);
    return template;
  }

  function getShaderPresetForVariant(variantId) {
    if (typeof variantId !== 'string' || !variantId.startsWith(CUSTOM_SHADER_VARIANT_PREFIX)) return null;
    const presetId = variantId.slice(CUSTOM_SHADER_VARIANT_PREFIX.length);
    return SHADER_PRESET_MAP.get(presetId) || null;
  }

  function buildShaderTemplate(presetId) {
    if (shaderTemplates.has(presetId)) return shaderTemplates.get(presetId);

    const template = buildShaderPresetTemplate(THREE, animatedUniforms, presetId);
    if (!template) return null;

    shaderTemplates.set(presetId, template);
    return template;
  }

  function addRecord(record) {
    const safeRecord = {
      id: record.id || createUid(),
      name: sanitizeName(record.name),
      sourceName: sanitizeName(record.sourceName || record.name),
      objText: String(record.objText || ''),
      createdAt: Number(record.createdAt) || Date.now(),
      gridMode: normalizeGridMode(record.gridMode),
    };

    buildTemplate(safeRecord, records.length);
    records.push(safeRecord);
    persist();
    return safeRecord;
  }

  function loadPersisted() {
    records.length = 0;
    recordTemplates.clear();

    let raw = '[]';
    try {
      raw = localStorage.getItem(storageKey) || '[]';
    } catch (error) {
      console.warn('[custom-assets] impossible de lire le stockage local.', error);
    }

    let parsed = [];
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn('[custom-assets] stockage custom invalide, reset.', error);
      parsed = [];
    }

    if (!Array.isArray(parsed)) return [];

    for (const entry of parsed) {
      try {
        addRecord(entry);
      } catch (error) {
        console.warn('[custom-assets] asset custom ignoré au chargement.', entry?.name, error);
      }
    }

    return listRecords();
  }

  async function importFiles(files, options = {}) {
    const imported = [];
    const rejected = [];
    const gridMode = normalizeGridMode(options.gridMode);

    for (const file of Array.from(files || [])) {
      const lowerName = String(file?.name || '').toLowerCase();
      if (!lowerName.endsWith('.obj')) {
        rejected.push({ name: file?.name || 'unknown', reason: 'format' });
        continue;
      }

      try {
        const text = await file.text();
        const record = addRecord({
          name: file.name.replace(/\.obj$/i, ''),
          sourceName: file.name,
          objText: text,
          gridMode,
        });
        imported.push(record);
      } catch (error) {
        console.warn('[custom-assets] import OBJ rejeté.', file?.name, error);
        rejected.push({ name: file?.name || 'unknown', reason: 'parse' });
      }
    }

    return { imported, rejected };
  }

  function listRecords() {
    return records.map((record) => ({ ...record }));
  }

  function getCount() {
    return records.length;
  }

  function getMenuItems() {
    const items = SHADER_PRESET_DEFINITIONS.map((preset) => ({
      id: `${CUSTOM_SHADER_VARIANT_PREFIX}${preset.id}`,
      label: preset.label,
      meta: preset.meta,
      swatch: preset.swatch,
    }));

    items.push({
      id: CUSTOM_IMPORT_ITEM_ID,
      label: 'Custom Import',
      meta: 'Enter / → / D to open import',
      swatch: 'linear-gradient(180deg, #f7f8fb 0%, #8ca0bb 100%)',
    });

    records.forEach((record, index) => {
      items.push({
        id: `${CUSTOM_VARIANT_PREFIX}${record.id}`,
        label: `Custom Asset_${index + 1}`,
        meta: record.gridMode === GRID_MODE_HEX
          ? `${record.sourceName} • Hex grid`
          : record.sourceName,
        swatch: DEFAULT_SWATCHES[index % DEFAULT_SWATCHES.length],
      });
    });

    if (records.length >= 3) {
      items.push({
        id: CUSTOM_RANDOM_ITEM_ID,
        label: 'Custom Random',
        meta: `${records.length} assets disponibles`,
        swatch: 'linear-gradient(180deg, #ffffff 0%, #7f8dff 34%, #2ab8a6 68%, #ff8d5a 100%)',
      });
    }

    return items;
  }

  function isImportItem(itemId) {
    return itemId === CUSTOM_IMPORT_ITEM_ID;
  }

  function isRandomItem(itemId) {
    return itemId === CUSTOM_RANDOM_ITEM_ID;
  }

  function isShaderVariant(itemId) {
    return typeof itemId === 'string' && itemId.startsWith(CUSTOM_SHADER_VARIANT_PREFIX);
  }

  function isCustomVariant(itemId) {
    return (typeof itemId === 'string' && itemId.startsWith(CUSTOM_VARIANT_PREFIX)) || isShaderVariant(itemId);
  }

  function getDefaultWallSelection() {
    if (records.length) return `${CUSTOM_VARIANT_PREFIX}${records[records.length - 1].id}`;
    if (SHADER_PRESET_DEFINITIONS.length) return `${CUSTOM_SHADER_VARIANT_PREFIX}${SHADER_PRESET_DEFINITIONS[0].id}`;
    return null;
  }

  function resolveWallSelection(selectedItemId) {
    if (isRandomItem(selectedItemId)) {
      if (!records.length) return null;
      const index = Math.floor(Math.random() * records.length);
      return `${CUSTOM_VARIANT_PREFIX}${records[index].id}`;
    }

    if (isCustomVariant(selectedItemId)) {
      return selectedItemId;
    }

    return selectedItemId || null;
  }

  function getRecordForVariant(variantId) {
    if (isShaderVariant(variantId)) {
      const preset = getShaderPresetForVariant(variantId);
      if (!preset) return null;
      return { preset, record: null, recordIndex: -1 };
    }

    if (!(typeof variantId === 'string' && variantId.startsWith(CUSTOM_VARIANT_PREFIX))) return null;

    const assetId = variantId.slice(CUSTOM_VARIANT_PREFIX.length);
    const recordIndex = records.findIndex((record) => record.id === assetId);
    if (recordIndex < 0) return null;

    return {
      record: records[recordIndex],
      recordIndex,
      preset: null,
    };
  }

  function getGridModeForVariant(variantId) {
    const resolvedVariantId = resolveWallSelection(variantId);
    const entry = getRecordForVariant(resolvedVariantId);
    if (!entry) return GRID_MODE_DEFAULT;
    if (entry.preset) return GRID_MODE_DEFAULT;
    return normalizeGridMode(entry.record.gridMode);
  }

  function getPlacementCellForVariant(variantId, world = {}) {
    const gridMode = getGridModeForVariant(variantId);
    return getPlacementCellForMode(gridMode, world);
  }

  function getSnapWorldForVariant(variantId, world = {}) {
    const gridMode = getGridModeForVariant(variantId);
    return getSnapWorldForMode(gridMode, world);
  }

  function getWallHeight(variantId) {
    const entry = getRecordForVariant(variantId);
    if (!entry) return 1;

    const template = entry.preset
      ? buildShaderTemplate(entry.preset.id)
      : buildTemplate(entry.record, entry.recordIndex);

    const height = template?.userData?.wallMetrics?.height;
    return Number.isFinite(height) && height > 0 ? height : 1;
  }

  function createWallInstance(variantId, cell = {}) {
    const entry = getRecordForVariant(variantId);
    if (!entry) return null;

    const template = entry.preset
      ? buildShaderTemplate(entry.preset.id)
      : buildTemplate(entry.record, entry.recordIndex);

    if (!template) return null;

    const instance = cloneTemplate(template);
    const placement = entry.preset
      ? getGridPlacementForMode(GRID_MODE_DEFAULT, cell)
      : getGridPlacementForRecord(entry.record, cell);

    instance.position.set(placement.x, placement.y, placement.z);
    instance.rotation.y = Number.isFinite(cell?.rotationY) ? cell.rotationY : 0;
    instance.rotation.x = Number.isFinite(cell?.tiltX) ? cell.tiltX : 0;
    instance.rotation.z = Number.isFinite(cell?.rollZ) ? cell.rollZ : 0;
    instance.userData.gridMode = entry.preset ? GRID_MODE_DEFAULT : entry.record.gridMode;
    return instance;
  }

  function update(time = 0) {
    for (const uniforms of animatedUniforms) {
      if (!uniforms || !uniforms.uTime) continue;
      uniforms.uTime.value = time;
    }
  }

  return {
    loadPersisted,
    importFiles,
    listRecords,
    getCount,
    getMenuItems,
    isImportItem,
    isRandomItem,
    isCustomVariant,
    getDefaultWallSelection,
    resolveWallSelection,
    getGridModeForVariant,
    getPlacementCellForVariant,
    getSnapWorldForVariant,
    getWallHeight,
    createWallInstance,
    update,
  };
}
