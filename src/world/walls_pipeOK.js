// mini-engine v0.3b — world/walls
// Wall library pass:
// - brick-wide  (BZR Dense) : contour/extrude rigid
// - brick-light (BX H1)     : contour/extrude rounded
// - brick-mini  (Node Grid) : posts + links
// - brick-standard (Rebar Frame) : scaffold frame / open structure
// - brick-tall (Energy Wall) : translucent panel + emissive spine
// - brick-capsule (Capsule Wall) : straight capsules by X/Y runs

function mix(a, b, t) {
  return a + ((b - a) * t);
}

function keyForVariantCell(x, z) {
  return `${x}|${z}`;
}

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

function chaikinClosed(points, iterations = 0, ratio = 0.18) {
  let result = points.map((point) => ({ x: point.x, y: point.y }));
  if (result.length < 3 || iterations <= 0) return result;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [];
    for (let i = 0; i < result.length; i += 1) {
      const a = result[i];
      const b = result[(i + 1) % result.length];
      next.push({ x: mix(a.x, b.x, ratio), y: mix(a.y, b.y, ratio) });
      next.push({ x: mix(a.x, b.x, 1 - ratio), y: mix(a.y, b.y, 1 - ratio) });
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

    if (!occupied.has(keyForVariantCell(x, z - 1))) {
      edges.push({ start: { x: left, y: top }, end: { x: right, y: top } });
    }
    if (!occupied.has(keyForVariantCell(x + 1, z))) {
      edges.push({ start: { x: right, y: top }, end: { x: right, y: bottom } });
    }
    if (!occupied.has(keyForVariantCell(x, z + 1))) {
      edges.push({ start: { x: right, y: bottom }, end: { x: left, y: bottom } });
    }
    if (!occupied.has(keyForVariantCell(x - 1, z))) {
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
    if (used.has(edgeKey2D(startEdge))) continue;
    const loop = [];
    let edge = startEdge;

    while (edge && !used.has(edgeKey2D(edge))) {
      used.add(edgeKey2D(edge));
      loop.push({ x: edge.start.x * 0.5, y: -edge.start.y * 0.5 });
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
  for (let i = 1; i < ordered.length; i += 1) path.lineTo(ordered[i].x, ordered[i].y);
  path.closePath();
  return path;
}

function buildVariantShapes(THREE, occupied, style) {
  const rawLoops = buildBoundaryLoops(occupied);
  const processedLoops = rawLoops
    .map((loop) => simplifyCollinearLoop(chaikinClosed(loop, style.smoothIterations, style.smoothRatio)))
    .filter((loop) => Math.abs(signedArea2D(loop)) > 0.01);

  if (!processedLoops.length) return [];

  const outers = [];
  const holes = [];
  for (const loop of processedLoops) {
    if (signedArea2D(loop) <= 0) outers.push(loop);
    else holes.push(loop);
  }

  const shapes = outers.map((outer) => ({ outer, holes: [] }));
  for (const hole of holes) {
    const owner = shapes.find((shape) => pointInPolygon2D(hole[0], shape.outer));
    if (owner) owner.holes.push(hole);
  }

  return shapes.map(({ outer, holes }) => {
    const shape = createShapePath(THREE, outer, false);
    for (const hole of holes) shape.holes.push(createShapePath(THREE, hole, true));
    return shape;
  });
}

function collectConnectedComponents(cells) {
  const occupied = new Set(cells.map((cell) => keyForVariantCell(cell.x, cell.z)));
  const components = [];

  while (occupied.size) {
    const seed = occupied.values().next().value;
    occupied.delete(seed);
    const queue = [seed];
    const component = new Set([seed]);

    while (queue.length) {
      const current = queue.pop();
      const { x, z } = parseCellKey(current);
      const neighbours = [
        keyForVariantCell(x + 1, z),
        keyForVariantCell(x - 1, z),
        keyForVariantCell(x, z + 1),
        keyForVariantCell(x, z - 1),
      ];
      for (const nextKey of neighbours) {
        if (!occupied.has(nextKey)) continue;
        occupied.delete(nextKey);
        component.add(nextKey);
        queue.push(nextKey);
      }
    }

    components.push(component);
  }

  return components;
}

const VARIANT_STYLES = Object.freeze({
  'brick-wide': {
    type: 'shape',
    cacheKey: 'wall-bzr-dense-v3',
    colorDark: 0x8fc200,
    colorMid: 0xc9f22c,
    colorLight: 0xf3ff96,
    emissive: 0x5c8f00,
    emissiveIntensity: 0.12,
    roughness: 0.42,
    metalness: 0.06,
    surfaceY: 0.9,
    depth: 0.42,
    smoothIterations: 0,
    smoothRatio: 0.18,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.16,
    bevelOffset: 0,
    bevelSegments: 3,
  },
  'brick-light': {
    type: 'shape',
    cacheKey: 'wall-bx-h1-v3',
    colorDark: 0xa92534,
    colorMid: 0xe24357,
    colorLight: 0xff9aa3,
    emissive: 0x751723,
    emissiveIntensity: 0.12,
    roughness: 0.36,
    metalness: 0.05,
    surfaceY: 0.9,
    depth: 0.4,
    smoothIterations: 2,
    smoothRatio: 0.18,
    curveSegments: 18,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.18,
    bevelOffset: 0,
    bevelSegments: 4,
  },
  'brick-mini': {
    type: 'node-grid',
    cacheKey: 'wall-node-grid-v1',
    colorDark: 0x9d2f73,
    colorMid: 0xdf5ea8,
    colorLight: 0xffb8d7,
    emissive: 0x5d153d,
    emissiveIntensity: 0.14,
    roughness: 0.38,
    metalness: 0.12,
    surfaceY: 0.88,
  },
  'brick-standard': {
    type: 'rebar-frame',
    cacheKey: 'wall-rebar-frame-v1',
    colorDark: 0x6d14b6,
    colorMid: 0xae42ff,
    colorLight: 0xe8bdff,
    emissive: 0x2c074c,
    emissiveIntensity: 0.16,
    roughness: 0.28,
    metalness: 0.34,
    surfaceY: 0.86,
  },
  'brick-tall': {
    type: 'energy-wall',
    cacheKey: 'wall-energy-wall-v1',
    colorDark: 0x0d4f9a,
    colorMid: 0x1ab5ff,
    colorLight: 0xb8f5ff,
    emissive: 0x0aa7ff,
    emissiveIntensity: 0.28,
    roughness: 0.16,
    metalness: 0.12,
    surfaceY: 0.88,
    depth: 0.16,
    smoothIterations: 1,
    smoothRatio: 0.18,
    curveSegments: 14,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.08,
    bevelOffset: 0,
    bevelSegments: 2,
  },
  'brick-capsule': {
    type: 'capsule-wall',
    cacheKey: 'wall-capsule-v2',
    colorDark: 0x6e00b8,
    colorMid: 0xad03fc,
    colorLight: 0xd58cff,
    emissive: 0x3d0070,
    emissiveIntensity: 0.1,
    roughness: 0.28,
    metalness: 0.12,
    surfaceY: 0.9,
    radius: 0.5,
    standaloneLength: 0.12,
    radialSegments: 8,
    capSegments: 10,
  },
});

function getVariantStyle(variantId) {
  return VARIANT_STYLES[variantId] || null;
}

function createGradientMaterial(THREE, style, options = {}) {
  const uniforms = {
    uColorDark: { value: new THREE.Color(style.colorDark) },
    uColorMid: { value: new THREE.Color(style.colorMid) },
    uColorLight: { value: new THREE.Color(style.colorLight) },
    uGlowStrength: { value: options.glowStrength ?? 0.0 },
    uPulseScale: { value: options.pulseScale ?? 0.0 },
    uStripeStrength: { value: options.stripeStrength ?? 0.0 },
  };

  const material = new THREE.MeshStandardMaterial({
    color: style.colorMid,
    emissive: style.emissive,
    emissiveIntensity: style.emissiveIntensity,
    roughness: style.roughness,
    metalness: style.metalness,
    transparent: Boolean(options.transparent),
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
  });

  material.customProgramCacheKey = () => `${style.cacheKey}:${options.keySuffix || 'base'}`;
  material.userData.variantUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uColorDark = uniforms.uColorDark;
    shader.uniforms.uColorMid = uniforms.uColorMid;
    shader.uniforms.uColorLight = uniforms.uColorLight;
    shader.uniforms.uGlowStrength = uniforms.uGlowStrength;
    shader.uniforms.uPulseScale = uniforms.uPulseScale;
    shader.uniforms.uStripeStrength = uniforms.uStripeStrength;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWorldPos = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uColorDark;
        uniform vec3 uColorMid;
        uniform vec3 uColorLight;
        uniform float uGlowStrength;
        uniform float uPulseScale;
        uniform float uStripeStrength;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;`,
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `float heightGrad = clamp((vWorldPos.y - 0.82) / 0.72, 0.0, 1.0);
        float normalGrad = clamp(vWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
        float sweep = 0.5 + 0.5 * sin((vWorldPos.x * 1.4) - (vWorldPos.z * 1.1));
        float stripe = 1.0 - abs(fract(vWorldPos.y * 1.3 + 0.25) * 2.0 - 1.0);
        vec3 wallTint = mix(uColorDark, uColorMid, clamp(heightGrad * 0.75 + sweep * 0.12, 0.0, 1.0));
        wallTint = mix(wallTint, uColorLight, clamp(normalGrad * 0.35 + heightGrad * 0.22 + stripe * uStripeStrength, 0.0, 1.0));
        float pulse = 0.5 + 0.5 * sin((vWorldPos.x + vWorldPos.z) * 2.4);
        wallTint += uColorLight * (uGlowStrength * (0.3 + pulse * uPulseScale));
        vec4 diffuseColor = vec4(wallTint, opacity);`,
      );
  };

  return material;
}

function createVariantMaterial(THREE, style) {
  return createGradientMaterial(THREE, style, { keySuffix: 'shape' });
}

function addCylinderBetween(THREE, group, geometry, material, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 1e-6) return;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  const up = new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(up, direction.clone().normalize());
  mesh.scale.set(1, length, 1);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildNodeGridMeshes({ THREE, scene, cells, style, material }) {
  const group = new THREE.Group();
  const occupied = new Set(cells.map((cell) => keyForVariantCell(cell.x, cell.z)));
  const nodeGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.42, 10);
  const linkGeo = new THREE.CylinderGeometry(0.038, 0.038, 1, 8);
  const capGeo = new THREE.SphereGeometry(0.12, 10, 10);

  for (const cell of cells) {
    const { x, z } = cell;
    const node = new THREE.Mesh(nodeGeo, material);
    node.position.set(x, style.surfaceY + 0.23, z);
    node.castShadow = true;
    node.receiveShadow = true;
    group.add(node);

    const cap = new THREE.Mesh(capGeo, material);
    cap.position.set(x, style.surfaceY + 0.43, z);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);

    if (occupied.has(keyForVariantCell(x + 1, z))) {
      addCylinderBetween(
        THREE,
        group,
        linkGeo,
        material,
        new THREE.Vector3(x, style.surfaceY + 0.34, z),
        new THREE.Vector3(x + 1, style.surfaceY + 0.34, z),
      );
    }
    if (occupied.has(keyForVariantCell(x, z + 1))) {
      addCylinderBetween(
        THREE,
        group,
        linkGeo,
        material,
        new THREE.Vector3(x, style.surfaceY + 0.34, z),
        new THREE.Vector3(x, style.surfaceY + 0.34, z + 1),
      );
    }
  }

  scene.add(group);
  return [{ mesh: group, disposeGeometry: true, disposeMaterial: false, cells: cells.map(({ x, z }) => ({ x, z })) }];
}

function buildRebarFrameMeshes({ THREE, scene, cells, style, material }) {
  const group = new THREE.Group();
  const occupied = new Set(cells.map((cell) => keyForVariantCell(cell.x, cell.z)));
  const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
  const beamGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);
  const braceGeo = new THREE.CylinderGeometry(0.025, 0.025, 1, 6);
  const postCapGeo = new THREE.SphereGeometry(0.06, 8, 8);
  const cornerOffset = 0.34;
  const yBottom = style.surfaceY + 0.02;
  const yTop = style.surfaceY + 0.98;
  const topRingY = style.surfaceY + 0.82;
  const cornerPosts = new Set();

  function addCornerPost(cx, cz) {
    const key = `${cx},${cz}`;
    if (cornerPosts.has(key)) return;
    cornerPosts.add(key);
    const post = new THREE.Mesh(postGeo, material);
    post.position.set(cx, style.surfaceY + 0.5, cz);
    post.castShadow = true;
    post.receiveShadow = true;
    group.add(post);

    const cap = new THREE.Mesh(postCapGeo, material);
    cap.position.set(cx, yTop, cz);
    cap.castShadow = true;
    cap.receiveShadow = true;
    group.add(cap);
  }

  for (const cell of cells) {
    const { x, z } = cell;
    const corners = [
      [x - cornerOffset, z - cornerOffset],
      [x + cornerOffset, z - cornerOffset],
      [x - cornerOffset, z + cornerOffset],
      [x + cornerOffset, z + cornerOffset],
    ];
    corners.forEach(([cx, cz]) => addCornerPost(cx, cz));

    const topLeft = new THREE.Vector3(x - cornerOffset, topRingY, z - cornerOffset);
    const topRight = new THREE.Vector3(x + cornerOffset, topRingY, z - cornerOffset);
    const bottomLeft = new THREE.Vector3(x - cornerOffset, topRingY, z + cornerOffset);
    const bottomRight = new THREE.Vector3(x + cornerOffset, topRingY, z + cornerOffset);

    if (!occupied.has(keyForVariantCell(x, z - 1))) addCylinderBetween(THREE, group, beamGeo, material, topLeft, topRight);
    if (!occupied.has(keyForVariantCell(x + 1, z))) addCylinderBetween(THREE, group, beamGeo, material, topRight, bottomRight);
    if (!occupied.has(keyForVariantCell(x, z + 1))) addCylinderBetween(THREE, group, beamGeo, material, bottomRight, bottomLeft);
    if (!occupied.has(keyForVariantCell(x - 1, z))) addCylinderBetween(THREE, group, beamGeo, material, bottomLeft, topLeft);

    addCylinderBetween(
      THREE,
      group,
      braceGeo,
      material,
      new THREE.Vector3(x - 0.2, style.surfaceY + 0.24, z),
      new THREE.Vector3(x + 0.2, style.surfaceY + 0.64, z),
    );
    addCylinderBetween(
      THREE,
      group,
      braceGeo,
      material,
      new THREE.Vector3(x + 0.2, style.surfaceY + 0.24, z),
      new THREE.Vector3(x - 0.2, style.surfaceY + 0.64, z),
    );

    if (occupied.has(keyForVariantCell(x + 1, z))) {
      addCylinderBetween(
        THREE,
        group,
        beamGeo,
        material,
        new THREE.Vector3(x + cornerOffset, topRingY, z),
        new THREE.Vector3(x + 1 - cornerOffset, topRingY, z),
      );
    }
    if (occupied.has(keyForVariantCell(x, z + 1))) {
      addCylinderBetween(
        THREE,
        group,
        beamGeo,
        material,
        new THREE.Vector3(x, topRingY, z + cornerOffset),
        new THREE.Vector3(x, topRingY, z + 1 - cornerOffset),
      );
    }
  }

  scene.add(group);
  return [{ mesh: group, disposeGeometry: true, disposeMaterial: false, cells: cells.map(({ x, z }) => ({ x, z })) }];
}

function buildEnergyWallMeshes({ THREE, scene, cells, style, material }) {
  const components = collectConnectedComponents(cells);
  const built = [];
  const spineMaterial = createGradientMaterial(THREE, style, {
    keySuffix: 'energy-spine',
    glowStrength: 0.32,
    pulseScale: 0.45,
    stripeStrength: 0.25,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });

  for (const component of components) {
    const shapes = buildVariantShapes(THREE, component, style);
    if (!shapes.length) continue;

    const shellGeometry = new THREE.ExtrudeGeometry(shapes, {
      depth: style.depth,
      steps: 1,
      curveSegments: style.curveSegments,
      bevelEnabled: style.bevelEnabled,
      bevelThickness: style.bevelThickness,
      bevelSize: style.bevelSize,
      bevelOffset: style.bevelOffset,
      bevelSegments: style.bevelSegments,
    });
    shellGeometry.rotateX(-Math.PI / 2);
    shellGeometry.computeVertexNormals();

    const shellMesh = new THREE.Mesh(shellGeometry, material);
    shellMesh.position.y = style.surfaceY;
    shellMesh.castShadow = true;
    shellMesh.receiveShadow = true;
    shellMesh.renderOrder = 3;

    const spineGeometry = shellGeometry.clone();
    const spineMesh = new THREE.Mesh(spineGeometry, spineMaterial.clone());
    spineMesh.position.y = style.surfaceY + 0.06;
    spineMesh.scale.set(0.74, 1.0, 0.74);
    spineMesh.castShadow = false;
    spineMesh.receiveShadow = false;
    spineMesh.renderOrder = 4;

    const group = new THREE.Group();
    group.add(shellMesh);
    group.add(spineMesh);
    scene.add(group);

    built.push({
      mesh: group,
      disposeGeometry: true,
      disposeMaterial: true,
      extraMaterials: [spineMesh.material],
      extraGeometries: [spineGeometry],
      cells: Array.from(component, (key) => parseCellKey(key)),
    });
  }

  return built;
}

function buildShapeVariantMesh({ THREE, scene, cells, style, material }) {
  const components = collectConnectedComponents(cells);
  const built = [];

  for (const component of components) {
    const shapes = buildVariantShapes(THREE, component, style);
    if (!shapes.length) continue;

    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: style.depth,
      steps: 1,
      curveSegments: style.curveSegments,
      bevelEnabled: style.bevelEnabled,
      bevelThickness: style.bevelThickness,
      bevelSize: style.bevelSize,
      bevelOffset: style.bevelOffset,
      bevelSegments: style.bevelSegments,
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = style.surfaceY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.renderOrder = 3;
    scene.add(mesh);

    built.push({ mesh, disposeGeometry: true, disposeMaterial: false, cells: Array.from(component, (key) => parseCellKey(key)) });
  }

  return built;
}


function collectAxisRuns(cells) {
  const occupied = new Set(cells.map((cell) => keyForVariantCell(cell.x, cell.z)));
  const horizontal = [];
  const vertical = [];
  const runCells = new Set();

  const byRow = new Map();
  const byCol = new Map();
  for (const cell of cells) {
    if (!byRow.has(cell.z)) byRow.set(cell.z, []);
    if (!byCol.has(cell.x)) byCol.set(cell.x, []);
    byRow.get(cell.z).push(cell.x);
    byCol.get(cell.x).push(cell.z);
  }

  for (const [z, xs] of byRow) {
    const sorted = Array.from(new Set(xs)).sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i += 1) {
      const value = sorted[i];
      if (value === prev + 1) {
        prev = value;
        continue;
      }
      if (prev > start) {
        horizontal.push({ z, startX: start, endX: prev });
        for (let x = start; x <= prev; x += 1) runCells.add(keyForVariantCell(x, z));
      }
      start = value;
      prev = value;
    }
  }

  for (const [x, zs] of byCol) {
    const sorted = Array.from(new Set(zs)).sort((a, b) => a - b);
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i <= sorted.length; i += 1) {
      const value = sorted[i];
      if (value === prev + 1) {
        prev = value;
        continue;
      }
      if (prev > start) {
        vertical.push({ x, startZ: start, endZ: prev });
        for (let z = start; z <= prev; z += 1) runCells.add(keyForVariantCell(x, z));
      }
      start = value;
      prev = value;
    }
  }

  const singles = [];
  for (const cell of cells) {
    const key = keyForVariantCell(cell.x, cell.z);
    if (!runCells.has(key) && occupied.has(key)) singles.push(cell);
  }

  return { horizontal, vertical, singles };
}

function addCapsuleBetween(THREE, group, style, material, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const distance = direction.length();
  const radius = style.radius || 0.22;
  const bodyLength = Math.max(0.0001, distance - (radius * 2));
  const geometry = new THREE.CapsuleGeometry(radius, bodyLength, style.capSegments || 10, style.radialSegments || 18);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  const up = new THREE.Vector3(0, 1, 0);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function buildCapsuleWallMeshes({ THREE, scene, cells, style, material }) {
  const group = new THREE.Group();
  const { horizontal, vertical, singles } = collectAxisRuns(cells);
  const y = style.surfaceY + style.radius;

  for (const run of horizontal) {
    addCapsuleBetween(
      THREE,
      group,
      style,
      material,
      new THREE.Vector3(run.startX - 0.5, y, run.z),
      new THREE.Vector3(run.endX + 0.5, y, run.z),
    );
  }

  for (const run of vertical) {
    addCapsuleBetween(
      THREE,
      group,
      style,
      material,
      new THREE.Vector3(run.x, y, run.startZ - 0.5),
      new THREE.Vector3(run.x, y, run.endZ + 0.5),
    );
  }

  for (const cell of singles) {
    const half = style.standaloneLength || 0.12;
    addCapsuleBetween(
      THREE,
      group,
      style,
      material,
      new THREE.Vector3(cell.x - half, y, cell.z),
      new THREE.Vector3(cell.x + half, y, cell.z),
    );
  }

  scene.add(group);
  return [{ mesh: group, disposeGeometry: true, disposeMaterial: false, cells: cells.map(({ x, z }) => ({ x, z })) }];
}

function buildVariantMesh({ THREE, scene, cells, style, material }) {
  switch (style.type) {
    case 'node-grid':
      return buildNodeGridMeshes({ THREE, scene, cells, style, material });
    case 'rebar-frame':
      return buildRebarFrameMeshes({ THREE, scene, cells, style, material });
    case 'energy-wall':
      return buildEnergyWallMeshes({ THREE, scene, cells, style, material });
    case 'capsule-wall':
      return buildCapsuleWallMeshes({ THREE, scene, cells, style, material });
    case 'shape':
    default:
      return buildShapeVariantMesh({ THREE, scene, cells, style, material });
  }
}

export function createWallMeshFactory({ THREE, shared }) {
  return function createWallMesh(x, z, isBorder = false) {
    const mesh = new THREE.Mesh(shared.wallGeo, isBorder ? shared.borderWallMat : shared.userWallMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, 1.1, z);
    return mesh;
  };
}

export function createWallsSystem({
  THREE,
  scene,
  userWalls,
  userWallSet,
  keyForCell,
  BORDER_HALF,
  isBorderCell,
  burstAt,
  refreshHud,
  getPlayer,
  getSelectedWallVariant,
  createWallMesh,
}) {
  let lastWallActionCellKey = '';
  const renderedEntries = [];
  const materialCache = new Map();

  function getCurrentVariant() {
    const variant = typeof getSelectedWallVariant === 'function' ? getSelectedWallVariant() : 'brick-dense';
    return variant || 'brick-dense';
  }

  function getMaterialForVariant(variantId) {
    if (!materialCache.has(variantId)) {
      const style = getVariantStyle(variantId);
      if (!style) return null;
      materialCache.set(variantId, createVariantMaterial(THREE, style));
    }
    return materialCache.get(variantId);
  }

  function clearRenderedEntries() {
    while (renderedEntries.length) {
      const entry = renderedEntries.pop();
      scene.remove(entry.mesh);
      if (entry.disposeGeometry && entry.mesh.geometry) entry.mesh.geometry.dispose();
      if (entry.extraGeometries) entry.extraGeometries.forEach((geo) => geo.dispose());
      if (entry.disposeMaterial && entry.mesh.material) {
        if (Array.isArray(entry.mesh.material)) entry.mesh.material.forEach((mat) => mat.dispose());
        else entry.mesh.material.dispose();
      }
      if (entry.extraMaterials) entry.extraMaterials.forEach((mat) => mat.dispose());
    }
  }

  function assignMeshesToCells(cells, mesh) {
    for (const cell of cells) {
      const wall = userWalls.find((entry) => entry.x === cell.x && entry.z === cell.z);
      if (wall) wall.mesh = mesh;
    }
  }

  function rebuildVisuals() {
    clearRenderedEntries();
    for (const wall of userWalls) wall.mesh = null;

    const byVariant = new Map();
    for (const wall of userWalls) {
      const variant = wall.variant || 'brick-dense';
      if (!byVariant.has(variant)) byVariant.set(variant, []);
      byVariant.get(variant).push(wall);
    }

    for (const [variantId, cells] of byVariant) {
      const style = getVariantStyle(variantId);
      if (!style) {
        for (const cell of cells) {
          const mesh = createWallMesh(cell.x, cell.z, false);
          scene.add(mesh);
          renderedEntries.push({ mesh, disposeGeometry: false, disposeMaterial: false });
          cell.mesh = mesh;
        }
        continue;
      }

      const material = getMaterialForVariant(variantId);
      const builtMeshes = buildVariantMesh({ THREE, scene, cells, style, material });
      for (const built of builtMeshes) {
        renderedEntries.push({
          mesh: built.mesh,
          disposeGeometry: built.disposeGeometry,
          disposeMaterial: built.disposeMaterial,
          extraMaterials: built.extraMaterials,
          extraGeometries: built.extraGeometries,
        });
        assignMeshesToCells(built.cells, built.mesh);
      }
    }
  }

  function clearLastActionCell() {
    lastWallActionCellKey = '';
  }

  function removeUserWallAt(cellX, cellZ) {
    const key = keyForCell(cellX, cellZ);
    for (let i = userWalls.length - 1; i >= 0; i -= 1) {
      const wall = userWalls[i];
      if (wall.x === cellX && wall.z === cellZ) {
        userWalls.splice(i, 1);
        break;
      }
    }
    userWallSet.delete(key);
    rebuildVisuals();
    burstAt(cellX, 0.9, cellZ, 0x9fe8ff, 3);
    refreshHud();
  }

  function toggleWallAtPlayer() {
    const player = getPlayer();
    if (!player) return;

    const placeX = Math.round(player.x);
    const placeZ = Math.round(player.z);
    const key = keyForCell(placeX, placeZ);

    if (Math.abs(placeX) >= BORDER_HALF || Math.abs(placeZ) >= BORDER_HALF) return;
    if (isBorderCell(placeX, placeZ)) return;
    if (lastWallActionCellKey === key) return;
    lastWallActionCellKey = key;

    if (userWallSet.has(key)) {
      removeUserWallAt(placeX, placeZ);
      return;
    }

    userWalls.push({ x: placeX, z: placeZ, variant: getCurrentVariant(), mesh: null });
    userWallSet.add(key);
    rebuildVisuals();
    burstAt(placeX, 0.9, placeZ, 0x75f7ff, 4);
    refreshHud();
  }

  function dispose() {
    clearRenderedEntries();
    materialCache.forEach((material) => material.dispose());
    materialCache.clear();
  }

  return { toggleWallAtPlayer, clearLastActionCell, rebuildVisuals, dispose };
}
