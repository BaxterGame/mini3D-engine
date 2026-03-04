// mini-engine v0.1d — world/chunks
// Grille visuelle infinie en chunks.

export function createChunkSystem({ THREE, scene, gridChunks, CHUNK_SIZE, CHUNK_RADIUS }) {
  function createChunkTemplate() {
    const group = new THREE.Group();

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
      new THREE.MeshStandardMaterial({
        color: 0x0c1118,
        roughness: 0.96,
        metalness: 0.03
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    group.add(plane);

    const vertices = [];
    const half = CHUNK_SIZE * 0.5;
    for (let i = 0; i <= CHUNK_SIZE; i++) {
      const p = -half + i;
      vertices.push(-half, 0.01, p, half, 0.01, p);
      vertices.push(p, 0.01, -half, p, 0.01, half);
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: 0x163049, transparent: true, opacity: 0.35 })
    );
    group.add(lines);

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE)),
      new THREE.LineBasicMaterial({ color: 0x1f4667, transparent: true, opacity: 0.18 })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.position.y = 0.02;
    group.add(edge);

    return group;
  }

  function ensureChunksAround(x, z) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    const needed = new Set();

    for (let cz = chunkZ - CHUNK_RADIUS; cz <= chunkZ + CHUNK_RADIUS; cz++) {
      for (let cx = chunkX - CHUNK_RADIUS; cx <= chunkX + CHUNK_RADIUS; cx++) {
        const key = `${cx},${cz}`;
        needed.add(key);
        if (!gridChunks.has(key)) {
          const chunk = createChunkTemplate();
          chunk.position.set(cx * CHUNK_SIZE + CHUNK_SIZE * 0.5, 0, cz * CHUNK_SIZE + CHUNK_SIZE * 0.5);
          scene.add(chunk);
          gridChunks.set(key, chunk);
        }
      }
    }

    for (const [key, chunk] of gridChunks) {
      if (!needed.has(key)) {
        scene.remove(chunk);
        gridChunks.delete(key);
      }
    }
  }

  return { ensureChunksAround };
}
