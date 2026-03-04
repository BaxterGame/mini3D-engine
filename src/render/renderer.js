// mini-engine v0.1c — rendu (renderer) + resize

export function createRenderer(THREE, mountEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  mountEl.appendChild(renderer.domElement);
  return renderer;
}

export function setOrthoSize(orthoCamera, size) {
  const aspect = window.innerWidth / window.innerHeight;
  orthoCamera.left = -size * aspect;
  orthoCamera.right = size * aspect;
  orthoCamera.top = size;
  orthoCamera.bottom = -size;
  orthoCamera.near = 0.1;
  orthoCamera.far = 400;
  orthoCamera.updateProjectionMatrix();
}

export function handleResize({ renderer, perspectiveCamera, orthoCamera, orthoSize }) {
  if (!renderer) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  if (perspectiveCamera) {
    perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
    perspectiveCamera.updateProjectionMatrix();
  }

  if (orthoCamera && typeof orthoSize === 'number') {
    setOrthoSize(orthoCamera, orthoSize);
  }
}
