// mini-engine v0.1d — world/walls
// Construction / destruction des murs joueurs.

export function createWallMeshFactory({ THREE, shared }) {
  return function createWallMesh(x, z, isBorder = false) {
    const mesh = new THREE.Mesh(
      shared.wallGeo,
      isBorder ? shared.borderWallMat : shared.userWallMat
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(x, 1.1, z);
    return mesh;
  };
}

export function createWallsSystem({
  scene,
  userWalls,
  userWallSet,
  keyForCell,
  BORDER_HALF,
  isBorderCell,
  burstAt,
  refreshHud,
  getPlayer,
  createWallMesh
}) {
  let lastWallActionCellKey = '';

  function clearLastActionCell() {
    lastWallActionCellKey = '';
  }

  function removeUserWallAt(cellX, cellZ) {
    const key = keyForCell(cellX, cellZ);
    for (let i = userWalls.length - 1; i >= 0; i--) {
      const wall = userWalls[i];
      if (wall.x === cellX && wall.z === cellZ) {
        scene.remove(wall.mesh);
        userWalls.splice(i, 1);
        break;
      }
    }
    userWallSet.delete(key);
    burstAt(cellX, 0.9, cellZ, 0x9fe8ff, 3);
    refreshHud();
  }

  function toggleWallAtPlayer() {
    const player = getPlayer();
    if (!player) return;

    const placeX = Math.round(player.x);
    const placeZ = Math.round(player.z);
    const key = keyForCell(placeX, placeZ);

    // Interdiction de toucher la bordure (et de placer hors zone)
    if (Math.abs(placeX) >= BORDER_HALF || Math.abs(placeZ) >= BORDER_HALF) return;
    if (isBorderCell(placeX, placeZ)) return;

    // Anti-toggle sur la même case en maintien
    if (lastWallActionCellKey === key) return;
    lastWallActionCellKey = key;

    // Toggle : vide -> construit ; mur joueur -> détruit
    if (userWallSet.has(key)) {
      removeUserWallAt(placeX, placeZ);
      return;
    }

    const mesh = createWallMesh(placeX, placeZ, false);
    scene.add(mesh);
    userWalls.push({ x: placeX, z: placeZ, mesh });
    userWallSet.add(key);
    burstAt(placeX, 0.9, placeZ, 0x75f7ff, 4);
    refreshHud();
  }

  return {
    toggleWallAtPlayer,
    clearLastActionCell
  };
}
