import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCw,
  Eye,
  Layers,
  Zap,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Radio,
  Sliders
} from 'lucide-react';

interface ThreePartViewerProps {
  partNumber?: string;
  manufacturer?: string;
  highlightSpecs?: boolean;
  compact?: boolean;
}

export const ThreePartViewer: React.FC<ThreePartViewerProps> = ({
  partNumber = 'BES 516-325-G-E5-C-S4 / IGT205',
  manufacturer = 'Standard M18x1 CAD Digital Twin',
  highlightSpecs = true,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [exploded, setExploded] = useState<boolean>(false);
  const [targetDetected, setTargetDetected] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [dimensionsVisible, setDimensionsVisible] = useState<boolean>(true);
  const [viewPreset, setViewPreset] = useState<'iso' | 'front' | 'face' | 'connector'>('iso');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  // Animation targets for smooth lerping
  const animStateRef = useRef({
    explodedProgress: 0,
    targetProgress: 0,
    isTargetActive: false,
    pulseTime: 0,
  });

  const partsRef = useRef<{
    nut1?: THREE.Mesh;
    nut2?: THREE.Mesh;
    sensingFace?: THREE.Mesh;
    connectorGroup?: THREE.Group;
    ledMesh?: THREE.Mesh;
    ledLight?: THREE.PointLight;
    targetMesh?: THREE.Mesh;
    radarPulseRing?: THREE.Mesh;
    dimensionLinesGroup?: THREE.Group;
    barrelMesh?: THREE.Mesh;
  }>({});

  useEffect(() => {
    animStateRef.current.isTargetActive = targetDetected;
  }, [targetDetected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera - centered framing with lookAt
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 15.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with high-end settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting System (Industrial Studio Lighting)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(8, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    rimLight.position.set(-10, -3, -8);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xe0e7ff, 1.2);
    fillLight.position.set(-8, 6, 8);
    scene.add(fillLight);

    const bottomBounce = new THREE.DirectionalLight(0xd97706, 0.6);
    bottomBounce.position.set(0, -10, 4);
    scene.add(bottomBounce);

    // 5. Studio Pedestal / Ground Shadow Disc
    const groundGroup = new THREE.Group();
    groundGroup.position.y = -3.8;

    const shadowPlateGeom = new THREE.CircleGeometry(4.5, 48);
    const shadowPlateMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.18,
    });
    const shadowPlate = new THREE.Mesh(shadowPlateGeom, shadowPlateMat);
    shadowPlate.rotation.x = -Math.PI / 2;
    groundGroup.add(shadowPlate);

    // Precision Industrial Measurement Grid
    const gridHelper = new THREE.GridHelper(16, 24, 0x0ea5e9, 0xcfd8dc);
    gridHelper.position.y = 0.01;
    groundGroup.add(gridHelper);

    scene.add(groundGroup);

    // 6. Model Root Group (centered vertically)
    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0.25, 0);
    modelGroup.rotation.z = Math.PI / 12;
    modelGroup.rotation.y = -Math.PI / 4;
    modelGroup.scale.set(0.9, 0.9, 0.9);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // 7. Photorealistic Industrial Materials
    const polishedSteelMaterial = new THREE.MeshStandardMaterial({
      color: 0xced4da,
      metalness: 0.94,
      roughness: 0.18,
    });

    const threadCutMaterial = new THREE.MeshStandardMaterial({
      color: 0xa0abb6,
      metalness: 0.9,
      roughness: 0.28,
    });

    const brushedBrassMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.88,
      roughness: 0.26,
    });

    const peekFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      roughness: 0.35,
      metalness: 0.08,
    });

    const amberLedMaterial = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.1,
      transparent: true,
      opacity: 0.92,
    });

    const connectorBodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.3,
    });

    const goldPinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.98,
      roughness: 0.08,
    });

    // 8. Geometry Construction
    const barrelRadius = 1.0;
    const barrelLength = 6.2;

    // A. Main Threaded Cylinder Body
    const barrelGeom = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 48);
    const barrelMesh = new THREE.Mesh(barrelGeom, polishedSteelMaterial);
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    modelGroup.add(barrelMesh);
    partsRef.current.barrelMesh = barrelMesh;

    // Helical Thread Ridges simulation
    const threadCount = 36;
    const threadSpacing = 0.14;
    const threadsGroup = new THREE.Group();
    for (let i = 0; i < threadCount; i++) {
      const threadTorus = new THREE.TorusGeometry(barrelRadius + 0.022, 0.025, 12, 48);
      const threadMesh = new THREE.Mesh(threadTorus, threadCutMaterial);
      threadMesh.rotation.x = Math.PI / 2;
      threadMesh.position.y = -2.1 + i * threadSpacing;
      threadsGroup.add(threadMesh);
    }
    barrelMesh.add(threadsGroup);

    // B. Sensing Face Front Cap (PEEK / Flush Shielded)
    const sensingFaceMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(barrelRadius - 0.04, barrelRadius - 0.04, 0.42, 48),
      peekFaceMaterial
    );
    sensingFaceMesh.position.y = barrelLength / 2 + 0.21;
    sensingFaceMesh.castShadow = true;
    modelGroup.add(sensingFaceMesh);
    partsRef.current.sensingFace = sensingFaceMesh;

    // Target crosshair & concentric coil ring
    const coilRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.75, 36),
      new THREE.MeshBasicMaterial({ color: 0x0d9488, side: THREE.DoubleSide })
    );
    coilRing.rotation.x = -Math.PI / 2;
    coilRing.position.y = 0.22;
    sensingFaceMesh.add(coilRing);

    const coilCenterDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.12, 24),
      new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide })
    );
    coilCenterDot.rotation.x = -Math.PI / 2;
    coilCenterDot.position.y = 0.221;
    sensingFaceMesh.add(coilCenterDot);

    // Dynamic Sensing Field Pulse Ring
    const radarPulseGeom = new THREE.RingGeometry(0.9, 1.25, 36);
    const radarPulseMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const radarPulseMesh = new THREE.Mesh(radarPulseGeom, radarPulseMat);
    radarPulseMesh.rotation.x = -Math.PI / 2;
    radarPulseMesh.position.y = 0.23;
    sensingFaceMesh.add(radarPulseMesh);
    partsRef.current.radarPulseRing = radarPulseMesh;

    // C. M18 Hex Locknuts with Chamfer
    const createHexNut = () => {
      const nutShape = new THREE.Shape();
      const hexR = 1.76;
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = hexR * Math.cos(angle);
        const y = hexR * Math.sin(angle);
        if (i === 0) nutShape.moveTo(x, y);
        else nutShape.lineTo(x, y);
      }
      nutShape.closePath();

      const nutHole = new THREE.Path();
      nutHole.absarc(0, 0, barrelRadius + 0.05, 0, Math.PI * 2, true);
      nutShape.holes.push(nutHole);

      const nutGeom = new THREE.ExtrudeGeometry(nutShape, {
        depth: 0.52,
        bevelEnabled: true,
        bevelSegments: 4,
        steps: 1,
        bevelSize: 0.06,
        bevelThickness: 0.06,
      });

      const nutMesh = new THREE.Mesh(nutGeom, brushedBrassMaterial);
      nutMesh.rotation.x = Math.PI / 2;
      nutMesh.castShadow = true;
      nutMesh.receiveShadow = true;
      return nutMesh;
    };

    const nut1 = createHexNut();
    nut1.position.y = 1.1;
    modelGroup.add(nut1);
    partsRef.current.nut1 = nut1;

    const nut2 = createHexNut();
    nut2.position.y = -0.7;
    nut2.rotation.z = Math.PI / 6;
    modelGroup.add(nut2);
    partsRef.current.nut2 = nut2;

    // D. Transparent 360° Amber Output LED Ring
    const ledMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(barrelRadius + 0.04, barrelRadius + 0.04, 0.32, 48),
      amberLedMaterial
    );
    ledMesh.position.y = -barrelLength / 2 - 0.16;
    modelGroup.add(ledMesh);
    partsRef.current.ledMesh = ledMesh;

    const ledLight = new THREE.PointLight(0xf59e0b, 0, 4);
    ledLight.position.set(0, -barrelLength / 2 - 0.16, 0);
    modelGroup.add(ledLight);
    partsRef.current.ledLight = ledLight;

    // E. Rear Connector Body & 4 Gold Pins
    const connectorGroup = new THREE.Group();
    connectorGroup.position.y = -barrelLength / 2 - 0.78;

    const collarGeom = new THREE.CylinderGeometry(0.74, 0.74, 0.98, 32);
    const collarMesh = new THREE.Mesh(collarGeom, connectorBodyMaterial);
    collarMesh.castShadow = true;
    connectorGroup.add(collarMesh);

    const keyRidge = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.6, 0.22),
      connectorBodyMaterial
    );
    keyRidge.position.set(0, 0, 0.7);
    connectorGroup.add(keyRidge);

    const pinOffsets = [
      { x: 0.26, z: 0.26 },
      { x: -0.26, z: 0.26 },
      { x: -0.26, z: -0.26 },
      { x: 0.26, z: -0.26 },
    ];
    pinOffsets.forEach((pos) => {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.44, 16),
        goldPinMaterial
      );
      pin.position.set(pos.x, -0.42, pos.z);
      connectorGroup.add(pin);
    });

    modelGroup.add(connectorGroup);
    partsRef.current.connectorGroup = connectorGroup;

    // F. Test Steel Target Flag
    const targetGeom = new THREE.BoxGeometry(2.6, 0.16, 2.6);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.92,
      roughness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const targetMesh = new THREE.Mesh(targetGeom, targetMat);
    targetMesh.position.set(0, 7.0, 0);
    targetMesh.visible = false;
    modelGroup.add(targetMesh);
    partsRef.current.targetMesh = targetMesh;

    // G. CAD Dimension Caliper Lines
    const dimGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 });

    const lengthPoints = [
      new THREE.Vector3(2.2, barrelLength / 2, 0),
      new THREE.Vector3(2.6, barrelLength / 2, 0),
      new THREE.Vector3(2.5, barrelLength / 2, 0),
      new THREE.Vector3(2.5, -barrelLength / 2, 0),
      new THREE.Vector3(2.2, -barrelLength / 2, 0),
      new THREE.Vector3(2.6, -barrelLength / 2, 0),
    ];
    const lengthGeom = new THREE.BufferGeometry().setFromPoints(lengthPoints);
    const lengthLine = new THREE.Line(lengthGeom, lineMat);
    dimGroup.add(lengthLine);

    const diaPoints = [
      new THREE.Vector3(-barrelRadius, barrelLength / 2 + 0.8, 0),
      new THREE.Vector3(barrelRadius, barrelLength / 2 + 0.8, 0),
    ];
    const diaGeom = new THREE.BufferGeometry().setFromPoints(diaPoints);
    const diaLine = new THREE.Line(diaGeom, lineMat);
    dimGroup.add(diaLine);

    modelGroup.add(dimGroup);
    partsRef.current.dimensionLinesGroup = dimGroup;

    // 9. Interactive Drag & Mouse Handling
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modelGroupRef.current) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      modelGroupRef.current.rotation.y += dx * 0.009;
      modelGroupRef.current.rotation.x += dy * 0.009;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + e.deltaY * 0.015,
        7,
        24
      );
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });

    // 10. Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 11. Render & Smooth Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const state = animStateRef.current;

      if (autoRotate && !isDragging && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += delta * 0.42;
      }

      // Smooth Exploded View Lerping
      const targetExploded = exploded ? 1 : 0;
      state.explodedProgress += (targetExploded - state.explodedProgress) * (delta * 6);

      if (partsRef.current.nut1 && partsRef.current.nut2 && partsRef.current.sensingFace && partsRef.current.connectorGroup) {
        const ep = state.explodedProgress;
        partsRef.current.nut1.position.y = THREE.MathUtils.lerp(1.1, 2.7, ep);
        partsRef.current.nut2.position.y = THREE.MathUtils.lerp(-0.7, -2.1, ep);
        partsRef.current.sensingFace.position.y = THREE.MathUtils.lerp(barrelLength / 2 + 0.21, barrelLength / 2 + 1.6, ep);
        partsRef.current.connectorGroup.position.y = THREE.MathUtils.lerp(-barrelLength / 2 - 0.78, -barrelLength / 2 - 2.2, ep);
      }

      // Smooth Target Flag Detection Lerping
      const targetActive = state.isTargetActive ? 1 : 0;
      state.targetProgress += (targetActive - state.targetProgress) * (delta * 7);

      if (partsRef.current.targetMesh && partsRef.current.ledMesh && partsRef.current.ledLight && partsRef.current.radarPulseRing) {
        const tp = state.targetProgress;
        const targetMesh = partsRef.current.targetMesh;
        const ledMesh = partsRef.current.ledMesh;
        const ledLight = partsRef.current.ledLight;
        const radar = partsRef.current.radarPulseRing;

        if (tp > 0.02) {
          targetMesh.visible = true;
          const restingY = barrelLength / 2 + 0.21 + 0.8;
          targetMesh.position.y = THREE.MathUtils.lerp(6.5, restingY, tp);
        } else {
          targetMesh.visible = false;
        }

        const ledMat = ledMesh.material as THREE.MeshStandardMaterial;
        const radarMat = radar.material as THREE.MeshBasicMaterial;

        if (tp > 0.8) {
          state.pulseTime += delta * 3;
          const pulse = (Math.sin(state.pulseTime) + 1) / 2;
          ledMat.color.setHex(0xf59e0b);
          ledMat.emissive.setHex(0xff7700);
          ledMat.emissiveIntensity = 2.2 + pulse * 0.8;
          ledLight.intensity = 2.8 + pulse * 1.0;

          radarMat.opacity = THREE.MathUtils.lerp(0.3, 0.85, pulse);
          radar.scale.set(1 + pulse * 0.45, 1 + pulse * 0.45, 1);
        } else {
          ledMat.color.setHex(0x451a03);
          ledMat.emissive.setHex(0x000000);
          ledMat.emissiveIntensity = 0;
          ledLight.intensity = 0;
          radarMat.opacity = 0;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [autoRotate, exploded]);

  useEffect(() => {
    if (!modelGroupRef.current) return;
    modelGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => (m.wireframe = wireframe));
        } else {
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [wireframe]);

  useEffect(() => {
    if (partsRef.current.dimensionLinesGroup) {
      partsRef.current.dimensionLinesGroup.visible = dimensionsVisible;
    }
  }, [dimensionsVisible]);

  const applyViewPreset = (preset: 'iso' | 'front' | 'face' | 'connector') => {
    setViewPreset(preset);
    if (!modelGroupRef.current || !cameraRef.current) return;
    setAutoRotate(false);

    switch (preset) {
      case 'iso':
        modelGroupRef.current.rotation.set(0.28, -Math.PI / 4, 0);
        cameraRef.current.position.set(0, 0.6, 15.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'front':
        modelGroupRef.current.rotation.set(0, 0, 0);
        cameraRef.current.position.set(0, 0.2, 14.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'face':
        modelGroupRef.current.rotation.set(Math.PI / 2, 0, 0);
        cameraRef.current.position.set(0, 0, 12.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'connector':
        modelGroupRef.current.rotation.set(-Math.PI / 2, 0, 0);
        cameraRef.current.position.set(0, 0, 12.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
    }
  };

  const resetCamera = () => {
    if (!modelGroupRef.current || !cameraRef.current) return;
    modelGroupRef.current.rotation.set(Math.PI / 12, -Math.PI / 4, 0);
    cameraRef.current.position.set(0, 0.6, 15.5);
    cameraRef.current.lookAt(0, 0, 0);
    setAutoRotate(true);
    setViewPreset('iso');
  };

  return (
    <div className={`three-viewer-wrapper ${compact ? 'compact' : ''}`}>
      <div className="three-viewer-header">
        <div className="three-viewer-meta">
          <div className="three-badge-row">
            <span className="badge-tag live-cad">
              <span className="dot pulse"></span> 3D Digital Twin
            </span>
            <span className="badge-tag verified-spec">
              <CheckCircle2 size={12} /> IEC 60947-5-2
            </span>
          </div>
          <h4 className="three-viewer-title">{partNumber}</h4>
          <span className="three-viewer-subtitle">{manufacturer}</span>
        </div>

        <div className="three-viewer-specs-preview">
          <span className="tech-pill">Ø18 × 65mm</span>
          <span className="tech-pill">Sn 8.0mm Flush</span>
          <span className="tech-pill">PNP NO • M12</span>
        </div>
      </div>

      <div className="three-canvas-container" ref={containerRef}>
        <div className="three-callout-overlay">
          <button
            className={`callout-node node-sensing ${activeCallout === 'sensing' ? 'active' : ''}`}
            onClick={() => setActiveCallout(activeCallout === 'sensing' ? null : 'sensing')}
            title="Sensing Face"
          >
            <span className="node-marker">1</span>
            <span className="node-tooltip">8mm Flush PEEK Sensing Face (Active Coil)</span>
          </button>

          <button
            className={`callout-node node-threads ${activeCallout === 'threads' ? 'active' : ''}`}
            onClick={() => setActiveCallout(activeCallout === 'threads' ? null : 'threads')}
            title="Locknuts & Barrel"
          >
            <span className="node-marker">2</span>
            <span className="node-tooltip">Dual M18 Brass Locknuts & Threaded Barrel</span>
          </button>

          <button
            className={`callout-node node-led ${activeCallout === 'led' ? 'active' : ''}`}
            onClick={() => setActiveCallout(activeCallout === 'led' ? null : 'led')}
            title="360° Status LED"
          >
            <span className="node-marker">3</span>
            <span className="node-tooltip">360° Amber Output Switching LED Window</span>
          </button>

          <button
            className={`callout-node node-connector ${activeCallout === 'connector' ? 'active' : ''}`}
            onClick={() => setActiveCallout(activeCallout === 'connector' ? null : 'connector')}
            title="M12 DC Micro Connector"
          >
            <span className="node-marker">4</span>
            <span className="node-tooltip">4-Pin M12 Gold Terminal Quick Disconnect</span>
          </button>
        </div>

        <div className="three-view-presets-bar">
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'iso' ? 'active' : ''}`}
            onClick={() => applyViewPreset('iso')}
          >
            Isometric
          </button>
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'front' ? 'active' : ''}`}
            onClick={() => applyViewPreset('front')}
          >
            Front Body
          </button>
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'face' ? 'active' : ''}`}
            onClick={() => applyViewPreset('face')}
          >
            Sensing Face
          </button>
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'connector' ? 'active' : ''}`}
            onClick={() => applyViewPreset('connector')}
          >
            M12 Pinout
          </button>
          <button
            type="button"
            className="preset-btn reset-btn"
            onClick={resetCamera}
            title="Reset Camera & Turntable"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {targetDetected && (
          <div className="three-detection-banner">
            <Radio size={14} className="pulse-icon text-amber" />
            <span>Target Present at 8.0mm • Switching PNP Output HIGH</span>
          </div>
        )}
      </div>

      <div className="three-controls-bar">
        <button
          type="button"
          className={`control-btn ${autoRotate ? 'active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Turntable Rotation"
        >
          <RotateCw size={14} className={autoRotate ? 'spin-slow' : ''} />
          <span>{autoRotate ? 'Turntable Active' : 'Turntable Paused'}</span>
        </button>

        <button
          type="button"
          className={`control-btn ${exploded ? 'active' : ''}`}
          onClick={() => setExploded(!exploded)}
          title="Toggle Exploded Mechanical Assembly"
        >
          <Layers size={14} />
          <span>{exploded ? 'Assembled' : 'Exploded Assembly'}</span>
        </button>

        <button
          type="button"
          className={`control-btn ${wireframe ? 'active' : ''}`}
          onClick={() => setWireframe(!wireframe)}
          title="Toggle CAD Wireframe Mesh"
        >
          <Eye size={14} />
          <span>Wireframe</span>
        </button>

        <button
          type="button"
          className={`control-btn ${dimensionsVisible ? 'active' : ''}`}
          onClick={() => setDimensionsVisible(!dimensionsVisible)}
          title="Toggle CAD Caliper Dimension Lines"
        >
          <Sliders size={14} />
          <span>Dimensions</span>
        </button>

        <button
          type="button"
          className={`control-btn target-btn ${targetDetected ? 'triggered' : ''}`}
          onClick={() => setTargetDetected(!targetDetected)}
          title="Simulate Steel Target Flag Detection"
        >
          <Zap size={14} />
          <span>{targetDetected ? 'Flag Detected' : 'Simulate Target Flag'}</span>
        </button>
      </div>

      {highlightSpecs && (
        <div className="three-viewer-footer-info">
          <div className="info-item">
            <ShieldCheck size={14} className="text-teal" />
            <span>Dimensions: Ø18mm × 65mm Length • 4-Pin M12 Micro DC Quick-Disconnect</span>
          </div>
          <span className="text-muted-sm">Drag to inspect • Scroll to zoom</span>
        </div>
      )}
    </div>
  );
};
