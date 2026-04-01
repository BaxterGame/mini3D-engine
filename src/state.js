// mini-engine v0.1b — état partagé et ressources (géométries/matériaux)

export function createState(THREE) {
  const cameraState = {
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    key: '',
    ready: false
  };

  const enemies = [];
  const coins = [];
  const particles = [];
  const userWalls = [];

  const userWallSet = new Set();
  const gridChunks = new Map();

  const shared = {
    wallGeo: new THREE.BoxGeometry(0.98,0.4,0.98),
    userWallMat: new THREE.MeshStandardMaterial({
      color: 0x12FF89,
      emissive: 0x12FFF0,
      emissiveIntensity: 0.2,
      roughness: 0.7,
      metalness: 0.1
    }),
    borderWallMat: new THREE.MeshStandardMaterial({
      color: 0xfcfbf0,
      emissive: 0xfcfbf0,
      emissiveIntensity: 0.16,
      roughness: 0.84,
      metalness: 0.08
    }),
    coinCoreMat: new THREE.MeshStandardMaterial({
      color: 0xffe08a,
      emissive: 0xffc93a,
      emissiveIntensity: 1.05,
      roughness: 0.2,
      metalness: 0.35,
      flatShading: true
    }),
    particleGeo: new THREE.SphereGeometry(0.08, 5, 5),
    enemyGeo: new THREE.IcosahedronGeometry(0.7, 0)
  };

  return {
    cameraState,
    enemies,
    coins,
    particles,
    userWalls,
    userWallSet,
    gridChunks,
    shared
  };
}
