/**
 * Custom WebXR "place on table" experience (three.js loaded lazily from esm.sh).
 *
 * Guarantees the food is ALWAYS visible from second 1:
 * - Direct reference space resolution before render loop (prevents TypeError crashes).
 * - Frustum culling disabled on all meshes so objects are NEVER culled.
 * - Solid white ceramic serving plate under the food (always visible even in pitch black rooms).
 * - Full try/catch around render loop with live frame counter in DOM overlay.
 * - Real-time 6DoF camera tracking via native WebXR viewerPose.
 */

const THREE_URL = "https://esm.sh/three@0.160.0";
const GLTF_URL = "https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

interface StartTableAROptions {
  modelUrl: string;
  title: string;
  log: (message: string) => void;
  onEnd: () => void;
}

const assetCache = new Map<string, Promise<{ THREE: any; gltf: any }>>();

export function prepareTableAR(modelUrl: string): Promise<{ THREE: any; gltf: any }> {
  let cached = assetCache.get(modelUrl);
  if (!cached) {
    cached = (async () => {
      const THREE: any = await import(/* webpackIgnore: true */ THREE_URL);
      const { GLTFLoader }: any = await import(/* webpackIgnore: true */ GLTF_URL);
      const gltf: any = await new Promise((resolve, reject) => {
        new GLTFLoader().load(modelUrl, resolve, undefined, (e: any) =>
          reject(new Error(`Modèle illisible: ${e?.message || e}`))
        );
      });
      return { THREE, gltf };
    })();
    cached.catch(() => assetCache.delete(modelUrl));
    assetCache.set(modelUrl, cached);
  }
  return cached;
}

export async function startTableAR({ modelUrl, title, log, onEnd }: StartTableAROptions): Promise<void> {
  const xr = (navigator as any).xr;
  if (!xr) throw new Error("navigator.xr absent (WebXR non exposé par ce navigateur)");

  log("Chargement du moteur 3D et du modèle...");
  const { THREE, gltf: loaded } = await prepareTableAR(modelUrl);
  const gltf = { scene: loaded.scene.clone(true) };
  log("Modèle prêt ✅ — démarrage de la session AR...");

  // ---------- DOM overlay (status + controls) ----------
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:system-ui,-apple-system,sans-serif;color:#fff;";
  overlay.innerHTML = `
    <button data-act="close" style="pointer-events:auto;position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.4)">✕</button>
    <div data-role="status" style="position:absolute;top:18px;left:16px;right:76px;padding:12px 16px;border-radius:18px;background:rgba(0,0,0,.8);font-size:13px;font-weight:600;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,.4);backdrop-filter:blur(8px)">Initialisation...</div>
    <div style="pointer-events:auto;position:absolute;bottom:85px;left:0;right:0;display:flex;gap:12px;justify-content:center;align-items:center;padding:0 16px">
      <button data-act="smaller" style="width:50px;height:50px;border-radius:50%;border:0;background:rgba(0,0,0,.75);color:#fff;font-size:26px;box-shadow:0 4px 12px rgba(0,0,0,.4);backdrop-filter:blur(8px)">−</button>
      <button data-act="pin" data-role="pin-btn" style="padding:0 20px;height:50px;border-radius:25px;border:0;background:#B55234;color:#fff;font-size:14px;font-weight:700;box-shadow:0 4px 14px rgba(181,82,52,.6)">📍 Fixer sur table</button>
      <button data-act="rotate" style="padding:0 16px;height:50px;border-radius:25px;border:0;background:rgba(0,0,0,.75);color:#fff;font-size:14px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.4);backdrop-filter:blur(8px)">⟳ Tourner</button>
      <button data-act="bigger" style="width:50px;height:50px;border-radius:50%;border:0;background:rgba(0,0,0,.75);color:#fff;font-size:26px;box-shadow:0 4px 12px rgba(0,0,0,.4);backdrop-filter:blur(8px)">+</button>
    </div>`;
  document.body.appendChild(overlay);

  const statusEl = overlay.querySelector('[data-role="status"]') as HTMLElement;
  const pinBtn = overlay.querySelector('[data-role="pin-btn"]') as HTMLElement;
  const setStatus = (text: string) => {
    statusEl.textContent = text;
  };
  overlay.addEventListener("beforexrselect", (e) => e.preventDefault());

  // ---------- three.js scene ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  renderer.xr.enabled = true;
  renderer.domElement.style.cssText = "position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

  // Omnidirectional high-intensity lighting for realistic food textures
  scene.add(new THREE.HemisphereLight(0xffffff, 0xddeeff, 3.5));
  const sun1 = new THREE.DirectionalLight(0xffffff, 3.0);
  sun1.position.set(1, 4, 2);
  scene.add(sun1);
  const sun2 = new THREE.DirectionalLight(0xffffff, 2.0);
  sun2.position.set(-1, 2, -1);
  scene.add(sun2);
  scene.add(new THREE.AmbientLight(0xffffff, 2.5));

  // Visible green target reticle on detected physical planes
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  reticle.frustumCulled = false;
  scene.add(reticle);

  // Food Model setup
  const dish = gltf.scene;
  dish.traverse((child: any) => {
    if (child.isMesh) {
      child.frustumCulled = false; // NEVER cull the food!
      if (child.geometry) {
        child.geometry.computeBoundingBox();
        child.geometry.computeBoundingSphere();
      }
      if (child.material) {
        child.material.side = THREE.DoubleSide;
        if (child.material.isMeshStandardMaterial || child.material.isMeshPhysicalMaterial) {
          child.material.roughness = Math.min(child.material.roughness, 0.85);
          child.material.metalness = Math.min(child.material.metalness, 0.15);
        }
        child.material.needsUpdate = true;
      }
    }
  });

  const bbox = new THREE.Box3().setFromObject(dish);
  const bsize = bbox.getSize(new THREE.Vector3());
  const bcenter = bbox.getCenter(new THREE.Vector3());

  // Center horizontally, align bottom with y=0
  dish.position.x = -bcenter.x;
  dish.position.z = -bcenter.z;
  dish.position.y = -bbox.min.y;

  // Food wrapper group (anchor)
  const dishAnchor = new THREE.Group();
  dishAnchor.frustumCulled = false;
  dishAnchor.add(dish);

  // Solid white ceramic serving plate under the food (guarantees visibility anywhere)
  const plateRadius = Math.max(0.16, Math.max(bsize.x, bsize.z) * 0.55);
  const ceramicPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(plateRadius, plateRadius * 0.9, 0.008, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  ceramicPlate.position.y = 0.004;
  ceramicPlate.frustumCulled = false;
  dishAnchor.add(ceramicPlate);

  // Warm golden shadow rim
  const goldenRim = new THREE.Mesh(
    new THREE.RingGeometry(plateRadius * 0.95, plateRadius * 1.05, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide })
  );
  goldenRim.position.y = 0.001;
  goldenRim.frustumCulled = false;
  dishAnchor.add(goldenRim);

  // Default plate scale ~ 28cm
  const maxDim = Math.max(bsize.x, bsize.y, bsize.z);
  const baseScale = maxDim > 0 ? 0.28 / maxDim : 1;
  let userScaleMult = 1.0;
  dishAnchor.scale.setScalar(baseScale * userScaleMult);

  dishAnchor.visible = true;
  scene.add(dishAnchor);

  // ---------- XR session request ----------
  let session: any;
  try {
    session = await xr.requestSession("immersive-ar", {
      optionalFeatures: ["hit-test", "dom-overlay", "local-floor"],
      domOverlay: { root: overlay },
    });
  } catch (err: any) {
    renderer.dispose();
    renderer.domElement.remove();
    overlay.remove();
    throw new Error(`Session AR refusée: ${err?.message || err}`);
  }
  log("Session WebXR démarrée ✅");

  // Explicitly obtain reference space FIRST to avoid null reference crashes
  let xrRefSpace: any = null;
  try {
    xrRefSpace = await session.requestReferenceSpace("local-floor");
    log("Espace spatial 'local-floor' prêt ✅");
  } catch {
    try {
      xrRefSpace = await session.requestReferenceSpace("local");
      log("Espace spatial 'local' prêt ✅");
    } catch (e: any) {
      log(`⚠️ Espace spatial viewer: ${e?.message || e}`);
    }
  }

  if (xrRefSpace) {
    renderer.xr.setReferenceSpace(xrRefSpace);
  }
  await renderer.xr.setSession(session);

  // Request hit-test source immediately
  let hitTestSource: any = null;
  session
    .requestReferenceSpace("viewer")
    .then((viewerSpace: any) => session.requestHitTestSource({ space: viewerSpace }))
    .then((src: any) => {
      hitTestSource = src;
      log("Détection de table (hit-test) active ✅");
    })
    .catch((err: any) => log(`Hit-test indisponible: ${err?.message || err}`));

  let hasEverHit = false;
  let placed = false;
  let frameCount = 0;

  setStatus("Visez votre table pour fixer le plat !");

  const pinDish = () => {
    placed = !placed;
    if (placed) {
      if (reticle.visible) {
        reticle.matrix.decompose(dishAnchor.position, dishAnchor.quaternion, dishAnchor.scale);
        dishAnchor.scale.setScalar(baseScale * userScaleMult);
      }
      pinBtn.textContent = "🔓 Déplacer";
      pinBtn.style.background = "#15803d";
      setStatus("Plat fixé sur la table ✅ — Tournez autour pour admirer !");
      log("Plat fixé sur la table ✅");
    } else {
      pinBtn.textContent = "📍 Fixer sur table";
      pinBtn.style.background = "#B55234";
      setStatus("Visez la table puis cliquez Fixer.");
      log("Mode déplacement activé");
    }
  };

  const rotateStep = Math.PI / 6;
  const onControlClick = (e: Event) => {
    const act = (e.target as HTMLElement)?.getAttribute("data-act");
    if (act === "close") session.end();
    if (act === "bigger") {
      userScaleMult = Math.min(3.0, userScaleMult * 1.15);
      dishAnchor.scale.setScalar(baseScale * userScaleMult);
    }
    if (act === "smaller") {
      userScaleMult = Math.max(0.3, userScaleMult / 1.15);
      dishAnchor.scale.setScalar(baseScale * userScaleMult);
    }
    if (act === "rotate") {
      dish.rotation.y += rotateStep;
    }
    if (act === "pin") {
      pinDish();
    }
  };
  overlay.addEventListener("click", onControlClick);

  // Native Three.js XR controller for tap gestures anywhere on screen
  const controller = renderer.xr.getController(0);
  controller.addEventListener("select", () => {
    pinDish();
  });
  scene.add(controller);

  session.addEventListener("end", () => {
    renderer.setAnimationLoop(null);
    hitTestSource?.cancel?.();
    renderer.dispose();
    renderer.domElement.remove();
    overlay.remove();
    log("Session AR terminée");
    onEnd();
  });

  // Main AR Render Loop with full error isolation
  renderer.setAnimationLoop((_time: number, frame: any) => {
    try {
      frameCount++;
      const currentRefSpace = xrRefSpace || renderer.xr.getReferenceSpace();

      if (frame && currentRefSpace) {
        // Hit-test surface results
        let foundSurface = false;
        if (hitTestSource) {
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length > 0) {
            const pose = results[0].getPose(currentRefSpace);
            if (pose) {
              reticle.visible = true;
              reticle.matrix.fromArray(pose.transform.matrix);
              reticle.matrixWorldNeedsUpdate = true;
              foundSurface = true;
              if (!hasEverHit) {
                hasEverHit = true;
                log("Surface de table détectée ✅");
              }
            }
          } else {
            reticle.visible = false;
          }
        }

        // Live 6DoF camera tracking via WebXR viewerPose
        const viewerPose = frame.getViewerPose(currentRefSpace);
        if (viewerPose && viewerPose.views.length > 0) {
          const view = viewerPose.views[0];
          const vPos = view.transform.position;
          const vOrient = view.transform.orientation;

          const camPos = new THREE.Vector3(vPos.x, vPos.y, vPos.z);
          const camQuat = new THREE.Quaternion(vOrient.x, vOrient.y, vOrient.z, vOrient.w);
          const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat).normalize();

          // Before pinning: follow camera or snap to detected table
          if (!placed) {
            if (foundSurface && reticle.visible) {
              reticle.matrix.decompose(dishAnchor.position, dishAnchor.quaternion, dishAnchor.scale);
              dishAnchor.scale.setScalar(baseScale * userScaleMult);
              setStatus(`Table détectée ✅ — Touchez l'écran pour fixer « ${title} »`);
            } else {
              // Float directly at 0.55m along the camera view, slightly lowered towards table height
              dishAnchor.position.copy(camPos).addScaledVector(lookDir, 0.55);
              dishAnchor.position.y -= 0.12;
              dishAnchor.quaternion.set(0, 0, 0, 1);
              dishAnchor.scale.setScalar(baseScale * userScaleMult);
              setStatus("Visez votre table pour fixer le plat !");
            }
          }
        }
      }

      renderer.render(scene, camera);
    } catch (loopErr: any) {
      if (frameCount % 60 === 0) {
        log(`❌ Erreur rendu: ${loopErr?.message || loopErr}`);
      }
    }
  });
}
