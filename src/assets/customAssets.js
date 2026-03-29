import { parseObjGeometry } from './library.js';

const STORAGE_KEY = 'mini3d-engine.custom-asset.wall.obj.v1';
const CUSTOM_IMPORT_ITEM_ID = 'wall-custom-import';
const CUSTOM_RANDOM_ITEM_ID = 'wall-custom-random';
const CUSTOM_VARIANT_PREFIX = 'wall-custom-asset:';
const DEFAULT_SWATCHES = [
  'linear-gradient(180deg, #7ef7ff 0%, #3187ff 100%)',
  'linear-gradient(180deg, #f6c46f 0%, #d96c2f 100%)',
  'linear-gradient(180deg, #db95ff 0%, #8632ff 100%)',
  'linear-gradient(180deg, #8cffb0 0%, #1ba36d 100%)',
  'linear-gradient(180deg, #ffe788 0%, #d9a32e 100%)',
  'linear-gradient(180deg, #ffa0c3 0%, #cf3a77 100%)',
];

function sanitizeName(value) {
  const trimmed = String(value || '').trim();
  return trimmed || 'custom_asset';
}

function createUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

function createNormalizedTemplate(THREE, geometry, material) {
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

  const scale = 1 / horizontalSpan;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.scale.setScalar(scale);
  mesh.position.set(
    -center.x * scale,
    -(box.min.y || 0) * scale,
    -center.z * scale,
  );

  const root = new THREE.Group();
  root.add(mesh);
  root.userData.wallMetrics = {
    height: size.y * scale,
    spanX: size.x * scale,
    spanZ: size.z * scale,
    minY: 0,
  };
  return root;
}

function cloneTemplate(template) {
  const clone = template.clone(true);
  clone.traverse((child) => {
    child.castShadow = true;
    child.receiveShadow = true;
  });
  return clone;
}

function toStoragePayload(records) {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    sourceName: record.sourceName,
    objText: record.objText,
    createdAt: record.createdAt,
  }));
}

export function createCustomAssetRegistry({ THREE, storageKey = STORAGE_KEY } = {}) {
  const records = [];
  const templates = new Map();

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(toStoragePayload(records)));
    } catch (error) {
      console.warn('[custom-assets] impossible de sauvegarder les assets custom.', error);
    }
  }

  function buildTemplate(record, index) {
    if (templates.has(record.id)) return templates.get(record.id);

    const geometry = parseObjGeometry(record.objText, THREE);
    const material = createMaterialForIndex(THREE, index);
    const template = createNormalizedTemplate(THREE, geometry, material);
    templates.set(record.id, template);
    return template;
  }

  function addRecord(record) {
    const safeRecord = {
      id: record.id || createUid(),
      name: sanitizeName(record.name),
      sourceName: sanitizeName(record.sourceName || record.name),
      objText: String(record.objText || ''),
      createdAt: Number(record.createdAt) || Date.now(),
    };

    buildTemplate(safeRecord, records.length);
    records.push(safeRecord);
    persist();
    return safeRecord;
  }

  function loadPersisted() {
    records.length = 0;
    templates.clear();

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

  async function importFiles(files) {
    const imported = [];
    const rejected = [];

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
    const items = [
      {
        id: CUSTOM_IMPORT_ITEM_ID,
        label: 'Custom Import',
        meta: 'Enter / → / D to open import',
        swatch: 'linear-gradient(180deg, #f7f8fb 0%, #8ca0bb 100%)',
      },
    ];

    records.forEach((record, index) => {
      items.push({
        id: `${CUSTOM_VARIANT_PREFIX}${record.id}`,
        label: `Custom Asset_${index + 1}`,
        meta: record.sourceName,
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

  function isCustomVariant(itemId) {
    return typeof itemId === 'string' && itemId.startsWith(CUSTOM_VARIANT_PREFIX);
  }

  function getDefaultWallSelection() {
    if (!records.length) return null;
    return `${CUSTOM_VARIANT_PREFIX}${records[records.length - 1].id}`;
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

  function getWallHeight(variantId) {
    if (!isCustomVariant(variantId)) return 1;

    const assetId = variantId.slice(CUSTOM_VARIANT_PREFIX.length);
    const recordIndex = records.findIndex((record) => record.id === assetId);
    if (recordIndex < 0) return 1;

    const record = records[recordIndex];
    const template = buildTemplate(record, recordIndex);
    const height = template?.userData?.wallMetrics?.height;
    return Number.isFinite(height) && height > 0 ? height : 1;
  }

  function createWallInstance(variantId, { x = 0, y = 0, z = 0 } = {}) {
    if (!isCustomVariant(variantId)) return null;

    const assetId = variantId.slice(CUSTOM_VARIANT_PREFIX.length);
    const recordIndex = records.findIndex((record) => record.id === assetId);
    if (recordIndex < 0) return null;

    const record = records[recordIndex];
    const template = buildTemplate(record, recordIndex);
    const instance = cloneTemplate(template);
    instance.position.set(x, y, z);
    return instance;
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
    getWallHeight,
    createWallInstance,
  };
}
