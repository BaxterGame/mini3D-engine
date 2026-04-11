import { parseObjGeometry } from './library.js';

const STORAGE_KEY = 'mini3d-engine.custom-asset.wall.obj.v1';
const CUSTOM_IMPORT_ITEM_ID = 'wall-custom-import';
const CUSTOM_RANDOM_ITEM_ID = 'wall-custom-random';
const CUSTOM_VARIANT_PREFIX = 'wall-custom-asset:';
const GRID_MODE_DEFAULT = 'square';
const GRID_MODE_HEX = 'hex';
const HEX_ROW_OFFSET = 0.5;
const HEX_IMPORT_SCALE_X = 1.1;
const HEX_IMPORT_SCALE_Y = 1.1;
const HEX_IMPORT_SCALE_Z = 1.25;

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
    gridMode: normalizeGridMode(record.gridMode),
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
    const isHex = normalizeGridMode(record.gridMode) === GRID_MODE_HEX;
    const template = createNormalizedTemplate(THREE, geometry, material, {
      scaleX: isHex ? HEX_IMPORT_SCALE_X : 1,
      scaleY: isHex ? HEX_IMPORT_SCALE_Y : 1,
      scaleZ: isHex ? HEX_IMPORT_SCALE_Z : 1,
    });
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
      gridMode: normalizeGridMode(record.gridMode),
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

  function getRecordForVariant(variantId) {
    if (!isCustomVariant(variantId)) return null;

    const assetId = variantId.slice(CUSTOM_VARIANT_PREFIX.length);
    const recordIndex = records.findIndex((record) => record.id === assetId);
    if (recordIndex < 0) return null;

    return {
      record: records[recordIndex],
      recordIndex,
    };
  }

  function getGridModeForVariant(variantId) {
    const resolvedVariantId = resolveWallSelection(variantId);
    const entry = getRecordForVariant(resolvedVariantId);
    return entry ? normalizeGridMode(entry.record.gridMode) : GRID_MODE_DEFAULT;
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

    const template = buildTemplate(entry.record, entry.recordIndex);
    const height = template?.userData?.wallMetrics?.height;
    return Number.isFinite(height) && height > 0 ? height : 1;
  }

  function createWallInstance(variantId, cell = {}) {
    const entry = getRecordForVariant(variantId);
    if (!entry) return null;

    const template = buildTemplate(entry.record, entry.recordIndex);
    const instance = cloneTemplate(template);
    const placement = getGridPlacementForRecord(entry.record, cell);
    instance.position.set(placement.x, placement.y, placement.z);
    instance.rotation.y = Number.isFinite(cell?.rotationY) ? cell.rotationY : 0;
    instance.rotation.x = Number.isFinite(cell?.tiltX) ? cell.tiltX : 0;
    instance.rotation.z = Number.isFinite(cell?.rollZ) ? cell.rollZ : 0;
    instance.userData.gridMode = entry.record.gridMode;
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
    getGridModeForVariant,
    getPlacementCellForVariant,
    getSnapWorldForVariant,
    getWallHeight,
    createWallInstance,
  };
}
