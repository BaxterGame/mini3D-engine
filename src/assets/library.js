// mini-engine v0.2b — assets/library
// Charge une première sélection d'assets depuis /assets et fournit
// des clones prêts à l'emploi avec fallback silencieux si un fichier manque.

const PLAYER_MODE_BINDINGS = {
  wall: {
    assetId: 'wall-block',
    scale: [1.05, 1.05, 1.05],
  },
  projectile: {
    assetId: 'projectile-shard',
    scale: [1.12, 1.12, 1.12],
    rotation: [Math.PI, 0, 0],
  },
  aqua: {
    assetId: 'aqua-orb',
    scale: [1.42, 1.42, 1.42],
  },
  vehicle: {
    assetId: 'vehicle-kart',
    scale: [1.1, 1.1, 1.1],
  },
};

const PROJECTILE_BINDING = {
  assetId: 'projectile-shard',
  scale: [0.38, 0.38, 0.38],
  rotation: [Math.PI, 0, 0],
};

const AQUA_NODE_BINDING = {
  assetId: 'aqua-orb',
  scale: [1.0, 1.0, 1.0],
};

function applyTransform(object, binding = {}) {
  if (!object) return object;

  const { scale, rotation, position } = binding;

  if (Array.isArray(scale)) {
    object.scale.set(scale[0] ?? 1, scale[1] ?? scale[0] ?? 1, scale[2] ?? scale[0] ?? 1);
  }

  if (Array.isArray(rotation)) {
    object.rotation.set(rotation[0] ?? 0, rotation[1] ?? 0, rotation[2] ?? 0);
  }

  if (Array.isArray(position)) {
    object.position.set(position[0] ?? 0, position[1] ?? 0, position[2] ?? 0);
  }

  return object;
}

function cloneRenderable(source) {
  if (!source) return null;

  const clone = source.clone(true);
  clone.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;

    const { material } = child;
    if (!material) return;

    if (Array.isArray(material)) {
      child.material = material.map((mat) => (mat && typeof mat.clone === 'function' ? mat.clone() : mat));
    } else if (typeof material.clone === 'function') {
      child.material = material.clone();
    }
  });

  return clone;
}

function resolveIndex(index, listLength) {
  if (!index) return 0;
  const value = Number.parseInt(index, 10);
  if (Number.isNaN(value)) return 0;
  return value >= 0 ? value : listLength + value;
}

function parseObjGeometry(text, THREE) {
  const positions = [[0, 0, 0]];
  const uvs = [[0, 0]];

  const outPositions = [];
  const outUvs = [];

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('v ')) {
      const [, x, y, z] = line.split(/\s+/);
      positions.push([Number(x) || 0, Number(y) || 0, Number(z) || 0]);
      continue;
    }

    if (line.startsWith('vt ')) {
      const [, u, v] = line.split(/\s+/);
      uvs.push([Number(u) || 0, Number(v) || 0]);
      continue;
    }

    if (!line.startsWith('f ')) continue;

    const refs = line
      .slice(2)
      .trim()
      .split(/\s+/)
      .map((token) => {
        const [vIndex, vtIndex] = token.split('/');
        return {
          vIndex: resolveIndex(vIndex, positions.length),
          vtIndex: resolveIndex(vtIndex, uvs.length),
        };
      });

    if (refs.length < 3) continue;

    for (let i = 1; i < refs.length - 1; i += 1) {
      const tri = [refs[0], refs[i], refs[i + 1]];
      for (const ref of tri) {
        const position = positions[ref.vIndex] || positions[0];
        const uv = uvs[ref.vtIndex] || uvs[0];

        outPositions.push(position[0], position[1], position[2]);
        outUvs.push(uv[0], uv[1]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));

  if (outUvs.length > 0) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(outUvs, 2));
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function inferMaterialOptions(entry, texture) {
  const isAqua = entry.id === 'aqua-orb';
  const isProjectile = entry.id === 'projectile-shard';
  const isVehicle = entry.id === 'vehicle-kart';

  return {
    map: texture || null,
    color: 0xffffff,
    transparent: isAqua,
    opacity: isAqua ? 0.82 : 1,
    roughness: isAqua ? 0.1 : 0.65,
    metalness: isVehicle ? 0.12 : 0.04,
    emissive: isProjectile ? 0x220000 : isAqua ? 0x0b2344 : 0x000000,
    emissiveIntensity: isProjectile ? 0.45 : isAqua ? 0.18 : 0,
  };
}

export function createAssetLibrary({
  THREE,
  manifestUrl = './assets/manifest.json',
  basePath = './assets/',
} = {}) {
  const manifestEntries = new Map();
  const loadedAssets = new Map();
  let isReady = false;

  async function loadTexture(url) {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(url);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestMipmapNearestFilter;

    if ('colorSpace' in texture && 'SRGBColorSpace' in THREE) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    return texture;
  }

  async function loadEntry(entry) {
    if (!entry?.mesh) return null;
    if (loadedAssets.has(entry.id)) return loadedAssets.get(entry.id);

    const objUrl = `${basePath}${entry.mesh}`;
    const objText = await fetch(objUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`OBJ introuvable: ${objUrl}`);
      }
      return response.text();
    });

    const geometry = parseObjGeometry(objText, THREE);

    let texture = null;
    if (entry.texture) {
      try {
        texture = await loadTexture(`${basePath}${entry.texture}`);
      } catch (error) {
        console.warn(`[assets] texture non chargée pour ${entry.id}:`, error);
      }
    }

    const material = new THREE.MeshStandardMaterial(inferMaterialOptions(entry, texture));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    loadedAssets.set(entry.id, {
      id: entry.id,
      entry,
      object: mesh,
    });

    return loadedAssets.get(entry.id);
  }

  async function load() {
    let manifest;

    try {
      manifest = await fetch(manifestUrl).then((response) => {
        if (!response.ok) {
          throw new Error(`Manifest introuvable: ${manifestUrl}`);
        }
        return response.json();
      });
    } catch (error) {
      console.warn('[assets] impossible de charger le manifest, fallback géométrique conservé.', error);
      isReady = false;
      return false;
    }

    const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
    for (const entry of assets) {
      if (entry?.id) {
        manifestEntries.set(entry.id, entry);
      }
    }

    const idsToLoad = new Set([
      PLAYER_MODE_BINDINGS.wall.assetId,
      PLAYER_MODE_BINDINGS.projectile.assetId,
      PLAYER_MODE_BINDINGS.aqua.assetId,
      PLAYER_MODE_BINDINGS.vehicle.assetId,
      PROJECTILE_BINDING.assetId,
      AQUA_NODE_BINDING.assetId,
    ]);

    const jobs = [];
    for (const assetId of idsToLoad) {
      const entry = manifestEntries.get(assetId);
      if (!entry) {
        console.warn(`[assets] entrée absente du manifest: ${assetId}`);
        continue;
      }
      jobs.push(loadEntry(entry));
    }

    try {
      await Promise.all(jobs);
      isReady = loadedAssets.size > 0;
    } catch (error) {
      console.warn('[assets] chargement partiel, fallback géométrique conservé.', error);
      isReady = loadedAssets.size > 0;
    }

    return isReady;
  }

  function hasAsset(id) {
    return loadedAssets.has(id);
  }

  function createAssetInstance(id, binding = {}) {
    const asset = loadedAssets.get(id);
    if (!asset?.object) return null;

    const clone = cloneRenderable(asset.object);
    return applyTransform(clone, binding);
  }

  function createPlayerModeVisual(mode) {
    const binding = PLAYER_MODE_BINDINGS[mode];
    if (!binding) return null;
    return createAssetInstance(binding.assetId, binding);
  }

  function createProjectileVisual() {
    return createAssetInstance(PROJECTILE_BINDING.assetId, PROJECTILE_BINDING);
  }

  function createAquaNodeVisual() {
    return createAssetInstance(AQUA_NODE_BINDING.assetId, AQUA_NODE_BINDING);
  }

  function getLoadedAssetIds() {
    return Array.from(loadedAssets.keys());
  }

  return {
    load,
    hasAsset,
    isReady: () => isReady,
    getLoadedAssetIds,
    createAssetInstance,
    createPlayerModeVisual,
    createProjectileVisual,
    createAquaNodeVisual,
  };
}
