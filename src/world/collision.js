// mini-engine v0.1d — world/collision
// Centralise la logique de collisions/occupation sans dépendre de la scène.

export function createCollisionSystem({ BORDER_HALF, WALL_HALF, keyForCell, userWallSet }) {
  function isBorderCell(x, z) {
    if (Math.abs(x) === BORDER_HALF && z >= -BORDER_HALF && z <= BORDER_HALF) return true;
    if (Math.abs(z) === BORDER_HALF && x >= -BORDER_HALF && x <= BORDER_HALF) return true;
    return false;
  }

  function isSolidCell(x, z) {
    return isBorderCell(x, z) || userWallSet.has(keyForCell(x, z));
  }

  function circleVsCell(x, z, radius, cellX, cellZ) {
    const nearestX = Math.max(cellX - WALL_HALF, Math.min(x, cellX + WALL_HALF));
    const nearestZ = Math.max(cellZ - WALL_HALF, Math.min(z, cellZ + WALL_HALF));
    const dx = x - nearestX;
    const dz = z - nearestZ;
    return dx * dx + dz * dz < radius * radius;
  }

  function collidesAt(x, z, radius) {
    const minX = Math.floor(x - radius - 1);
    const maxX = Math.ceil(x + radius + 1);
    const minZ = Math.floor(z - radius - 1);
    const maxZ = Math.ceil(z + radius + 1);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        if (!isSolidCell(cx, cz)) continue;
        if (circleVsCell(x, z, radius, cx, cz)) return true;
      }
    }
    return false;
  }

  // Le joueur ne collisionne qu’avec la bordure (UX : ne pas se bloquer sur ses murs)
  function collidesAtPlayer(x, z, radius) {
    const minX = Math.floor(x - radius - 1);
    const maxX = Math.ceil(x + radius + 1);
    const minZ = Math.floor(z - radius - 1);
    const maxZ = Math.ceil(z + radius + 1);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        if (!isBorderCell(cx, cz)) continue;
        if (circleVsCell(x, z, radius, cx, cz)) return true;
      }
    }
    return false;
  }

  function collidesAtUserWalls(x, z, radius) {
    const minX = Math.floor(x - radius - 1);
    const maxX = Math.ceil(x + radius + 1);
    const minZ = Math.floor(z - radius - 1);
    const maxZ = Math.ceil(z + radius + 1);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        if (!userWallSet.has(keyForCell(cx, cz))) continue;
        if (circleVsCell(x, z, radius, cx, cz)) return true;
      }
    }
    return false;
  }

  function probeBlockedDirections(x, z, radius, userOnly = false) {
    const probe = radius + 0.38;
    const testRadius = 0.22;
    const hit = userOnly ? collidesAtUserWalls : collidesAt;
    const left = hit(x - probe, z, testRadius);
    const right = hit(x + probe, z, testRadius);
    const up = hit(x, z - probe, testRadius);
    const down = hit(x, z + probe, testRadius);
    return {
      left,
      right,
      up,
      down,
      count: (left ? 1 : 0) + (right ? 1 : 0) + (up ? 1 : 0) + (down ? 1 : 0)
    };
  }

  return {
    isBorderCell,
    collidesAt,
    collidesAtPlayer,
    collidesAtUserWalls,
    probeBlockedDirections
  };
}
