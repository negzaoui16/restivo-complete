import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MaterialPalette } from "./materials";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  objectsRoot: THREE.Group;
  groundRaycastPlane: THREE.Mesh;
  gridHelper?: THREE.GridHelper;
  floorMesh: THREE.Mesh;
  dispose: () => void;
}

export function setup3DScene(
  container: HTMLElement,
  dimensions: { width: number; height: number },
  palette: MaterialPalette,
  showGrid = true,
): SceneContext {
  const { width, height } = dimensions;
  const maxDim = Math.max(width, height, 8);

  // 1. Scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f2eb);

  // 2. Camera
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
  camera.position.set(maxDim * 0.75, maxDim * 1.1, maxDim * 1.2);
  camera.lookAt(0, 0.3, 0);

  // 3. Renderer
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  container.appendChild(renderer.domElement);

  // 4. Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.3, 0);
  controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't go below ground
  controls.minDistance = 3;
  controls.maxDistance = maxDim * 4;

  // 5. Lighting
  const ambientLight = new THREE.AmbientLight(0xfff8ee, 0.75);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd9cebe, 0.4);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.15);
  sunLight.position.set(maxDim * 0.8, maxDim * 1.4, maxDim * 0.9);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = maxDim * 4;
  const shadowRange = maxDim * 0.85;
  sunLight.shadow.camera.left = -shadowRange;
  sunLight.shadow.camera.right = shadowRange;
  sunLight.shadow.camera.top = shadowRange;
  sunLight.shadow.camera.bottom = -shadowRange;
  sunLight.shadow.bias = -0.0003;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xdde3ea, 0.35);
  fillLight.position.set(-maxDim * 0.8, maxDim * 0.8, -maxDim * 0.8);
  scene.add(fillLight);

  // 6. Floor Slab (Centred at 0, 0, 0)
  const slabHeight = 0.08;
  const floorGeo = new THREE.BoxGeometry(width, slabHeight, height);
  const floorMesh = new THREE.Mesh(floorGeo, palette.floor);
  floorMesh.position.y = -slabHeight / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Floor Edge Trim
  const trimGeo = new THREE.BoxGeometry(width + 0.08, slabHeight * 0.9, height + 0.08);
  const trimMesh = new THREE.Mesh(trimGeo, palette.floorBorder);
  trimMesh.position.y = -slabHeight / 2;
  scene.add(trimMesh);

  // 7. Grid
  let gridHelper: THREE.GridHelper | undefined;
  if (showGrid) {
    gridHelper = new THREE.GridHelper(Math.max(width, height), Math.round(Math.max(width, height)), 0xb8aba0, 0xd4c8be);
    gridHelper.position.y = 0.002;
    scene.add(gridHelper);
  }

  // 8. Ground raycast plane (invisible, spans beyond floor for smooth dragging)
  const planeGeo = new THREE.PlaneGeometry(maxDim * 4, maxDim * 4);
  planeGeo.rotateX(-Math.PI / 2);
  const groundRaycastPlane = new THREE.Mesh(
    planeGeo,
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  groundRaycastPlane.name = "raycast-ground-plane";
  scene.add(groundRaycastPlane);

  // 9. Root group for floor objects
  const objectsRoot = new THREE.Group();
  objectsRoot.name = "floor-objects-root";
  scene.add(objectsRoot);

  const onResize = () => {
    if (!container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  const observer = new ResizeObserver(onResize);
  observer.observe(container);

  const dispose = () => {
    observer.disconnect();
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    objectsRoot,
    groundRaycastPlane,
    gridHelper,
    floorMesh,
    dispose,
  };
}
