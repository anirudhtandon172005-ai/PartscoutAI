import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Eye, Layers, Zap, Info, ShieldCheck } from 'lucide-react';

interface ThreePartViewerProps {
  partNumber?: string;
  manufacturer?: string;
  highlightSpecs?: boolean;
  compact?: boolean;
}

export const ThreePartViewer: React.FC<ThreePartViewerProps> = ({
  partNumber = 'BES 516-325-G-E5-C-S4 / IGT205',
  manufacturer = 'Standard M18x1 Architecture',
  highlightSpecs = true,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [exploded, setExploded] = useState<boolean>(false);
  const [targetDetected, setTargetDetected] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const ledMeshRef = useRef<THREE.Mesh | null>(null);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const nut1Ref = useRef<THREE.Mesh | null>(null);
  const nut2Ref = useRef<THREE.Mesh | null>(null);
  const sensingFaceRef = useRef<THREE.Mesh | null>(null);
  const connectorRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 5, 14);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lighting (Industrial Studio HDRI style)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(8, 12, 10);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x90c0df, 1.6);
    rimLight.position.set(-10, -5, -8);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xd9e2ec, 1.0);
    fillLight.position.set(0, -10, 8);
    scene.add(fillLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(16, 16, 0x0e6251, 0xd0c9b8);
    gridHelper.position.y = -3.2;
    scene.add(gridHelper);

    // Model Root Group
    const modelGroup = new THREE.Group();
    modelGroup.rotation.z = Math.PI / 10;
    modelGroup.rotation.y = -Math.PI / 4;
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Materials
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8dde3,
      metalness: 0.88,
      roughness: 0.22,
      wireframe: false,
    });

    const threadRidgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xb5bdc7,
      metalness: 0.82,
      roughness: 0.35,
    });

    const brassNutMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8b27a,
      metalness: 0.85,
      roughness: 0.32,
    });

    const sensingFaceMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.45,
      metalness: 0.1,
    });

    const ledMaterial = new THREE.MeshStandardMaterial({
      color: 0x553300,
      emissive: 0x000000,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    const connectorMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b323c,
      metalness: 0.7,
      roughness: 0.35,
    });

    const goldPinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf39c12,
      metalness: 0.95,
      roughness: 0.1,
    });

    // 1. Threaded Barrel Body (M18 Cylinder, length = 6.5)
    const barrelRadius = 1.0;
    const barrelLength = 6.0;
    const barrelGeom = new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 32);
    const barrelMesh = new THREE.Mesh(barrelGeom, metalMaterial);
    barrelMesh.castShadow = true;
    barrelMesh.receiveShadow = true;
    modelGroup.add(barrelMesh);

    // Thread rings simulation
    const ringCount = 28;
    const ringSpacing = 0.16;
    for (let i = 0; i < ringCount; i++) {
      const ringGeom = new THREE.TorusGeometry(barrelRadius + 0.02, 0.022, 8, 32);
      const ringMesh = new THREE.Mesh(ringGeom, threadRidgeMaterial);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = -1.8 + i * ringSpacing;
      modelGroup.add(ringMesh);
    }

    // 2. Sensing Head Front Face (Top of sensor, y = +3.0)
    const faceGeom = new THREE.CylinderGeometry(barrelRadius - 0.05, barrelRadius - 0.05, 0.4, 32);
    const faceMesh = new THREE.Mesh(faceGeom, sensingFaceMaterial);
    faceMesh.position.y = barrelLength / 2 + 0.18;
    faceMesh.castShadow = true;
    modelGroup.add(faceMesh);
    sensingFaceRef.current = faceMesh;

    // Sensing face core label ring
    const coreRingGeom = new THREE.RingGeometry(0.2, 0.65, 24);
    const coreRingMat = new THREE.MeshBasicMaterial({ color: 0x117a65, side: THREE.DoubleSide });
    const coreRingMesh = new THREE.Mesh(coreRingGeom, coreRingMat);
    coreRingMesh.rotation.x = -Math.PI / 2;
    coreRingMesh.position.y = barrelLength / 2 + 0.39;
    modelGroup.add(coreRingMesh);

    // 3. Hexagonal Lock Nuts (M18 Hexagon)
    const nutShape = new THREE.Shape();
    const hexR = 1.75;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = hexR * Math.cos(angle);
      const y = hexR * Math.sin(angle);
      if (i === 0) nutShape.moveTo(x, y);
      else nutShape.lineTo(x, y);
    }
    nutShape.closePath();

    const nutHole = new THREE.Path();
    nutHole.absarc(0, 0, barrelRadius + 0.04, 0, Math.PI * 2, true);
    nutShape.holes.push(nutHole);

    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
    const nutGeom = new THREE.ExtrudeGeometry(nutShape, extrudeSettings);

    const nut1 = new THREE.Mesh(nutGeom, brassNutMaterial);
    nut1.rotation.x = Math.PI / 2;
    nut1.position.y = 1.0;
    nut1.castShadow = true;
    modelGroup.add(nut1);
    nut1Ref.current = nut1;

    const nut2 = new THREE.Mesh(nutGeom, brassNutMaterial);
    nut2.rotation.x = Math.PI / 2;
    nut2.rotation.z = Math.PI / 6; // slightly offset rotation for realism
    nut2.position.y = -0.6;
    nut2.castShadow = true;
    modelGroup.add(nut2);
    nut2Ref.current = nut2;

    // 4. Rear Cap & 360° Amber Output LED Ring
    const ledGeom = new THREE.CylinderGeometry(barrelRadius + 0.03, barrelRadius + 0.03, 0.28, 32);
    const ledMesh = new THREE.Mesh(ledGeom, ledMaterial);
    ledMesh.position.y = -barrelLength / 2 - 0.14;
    modelGroup.add(ledMesh);
    ledMeshRef.current = ledMesh;

    // 5. M12 Connector Collar & 4 Gold Contact Pins
    const connectorGroup = new THREE.Group();
    connectorGroup.position.y = -barrelLength / 2 - 0.75;

    const collarGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.95, 24);
    const collarMesh = new THREE.Mesh(collarGeom, connectorMaterial);
    collarMesh.castShadow = true;
    connectorGroup.add(collarMesh);

    // M12 4-pin arrangement inside socket
    const pinGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 12);
    const pinOffsets = [
      { x: 0.25, z: 0.25 },
      { x: -0.25, z: 0.25 },
      { x: -0.25, z: -0.25 },
      { x: 0.25, z: -0.25 },
    ];
    pinOffsets.forEach((pos) => {
      const pin = new THREE.Mesh(pinGeom, goldPinMaterial);
      pin.position.set(pos.x, -0.4, pos.z);
      connectorGroup.add(pin);
    });

    modelGroup.add(connectorGroup);
    connectorRef.current = collarMesh;

    // 6. Test Metal Target Flag for Detection simulation
    const targetGeom = new THREE.BoxGeometry(2.4, 0.15, 2.4);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85,
    });
    const targetMesh = new THREE.Mesh(targetGeom, targetMat);
    targetMesh.position.set(0, barrelLength / 2 + 2.5, 0);
    targetMesh.visible = false;
    modelGroup.add(targetMesh);
    targetMeshRef.current = targetMesh;

    // Mouse Drag Rotation
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modelGroupRef.current) return;
      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;
      modelGroupRef.current.rotation.y += deltaX * 0.008;
      modelGroupRef.current.rotation.x += deltaY * 0.008;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Responsive Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (autoRotate && !isDragging && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += delta * 0.45;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [autoRotate]);

  // Handle Wireframe state toggle
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

  // Handle Exploded view state
  useEffect(() => {
    if (!nut1Ref.current || !nut2Ref.current || !sensingFaceRef.current || !connectorRef.current) return;
    if (exploded) {
      nut1Ref.current.position.y = 2.4;
      nut2Ref.current.position.y = -1.8;
      sensingFaceRef.current.position.y = 4.2;
      connectorRef.current.parent!.position.y = -4.9;
    } else {
      nut1Ref.current.position.y = 1.0;
      nut2Ref.current.position.y = -0.6;
      sensingFaceRef.current.position.y = 3.18;
      connectorRef.current.parent!.position.y = -3.75;
    }
  }, [exploded]);

  // Handle Target detection simulation
  useEffect(() => {
    if (!targetMeshRef.current || !ledMeshRef.current) return;
    const ledMat = ledMeshRef.current.material as THREE.MeshStandardMaterial;

    if (targetDetected) {
      targetMeshRef.current.visible = true;
      targetMeshRef.current.position.y = 3.18 + 0.8; // Exactly 8.0mm in scale!
      ledMat.color.setHex(0xffaa00);
      ledMat.emissive.setHex(0xff8800);
      ledMat.emissiveIntensity = 2.5;
    } else {
      targetMeshRef.current.visible = false;
      targetMeshRef.current.position.y = 6.0;
      ledMat.color.setHex(0x553300);
      ledMat.emissive.setHex(0x000000);
      ledMat.emissiveIntensity = 0;
    }
  }, [targetDetected]);

  return (
    <div className={`three-viewer-wrapper ${compact ? 'compact' : ''}`}>
      <div className="three-viewer-header">
        <div className="three-viewer-meta">
          <span className="badge-tag live-cad">
            <span className="dot pulse"></span> 3D Precision Digital Twin
          </span>
          <h4 className="three-viewer-title">{partNumber}</h4>
          <span className="three-viewer-subtitle">{manufacturer}</span>
        </div>
        <div className="three-viewer-specs-preview">
          <span className="tech-pill">M18 x 1.0</span>
          <span className="tech-pill">Sn = 8.0mm Flush</span>
          <span className="tech-pill">PNP NO • M12</span>
        </div>
      </div>

      <div className="three-canvas-container" ref={containerRef}>
        {/* Three.js canvas mounts here */}
      </div>

      {/* Floating 3D Callouts */}
      <div className="three-callout-overlay">
        <button
          className={`callout-node node-sensing ${activeCallout === 'sensing' ? 'active' : ''}`}
          onClick={() => setActiveCallout(activeCallout === 'sensing' ? null : 'sensing')}
          title="Sensing Face"
        >
          <span className="node-marker">1</span>
          <span className="node-tooltip">8mm Shielded PEEK Sensing Face (Flush)</span>
        </button>

        <button
          className={`callout-node node-threads ${activeCallout === 'threads' ? 'active' : ''}`}
          onClick={() => setActiveCallout(activeCallout === 'threads' ? null : 'threads')}
          title="Thread & Nuts"
        >
          <span className="node-marker">2</span>
          <span className="node-tooltip">M18x1.0 Metric Thread & Dual Hex Locknuts</span>
        </button>

        <button
          className={`callout-node node-led ${activeCallout === 'led' ? 'active' : ''}`}
          onClick={() => setActiveCallout(activeCallout === 'led' ? null : 'led')}
          title="LED Output Ring"
        >
          <span className="node-marker">3</span>
          <span className="node-tooltip">360° Amber Output Switching LED Indicator</span>
        </button>

        <button
          className={`callout-node node-connector ${activeCallout === 'connector' ? 'active' : ''}`}
          onClick={() => setActiveCallout(activeCallout === 'connector' ? null : 'connector')}
          title="M12 Connector"
        >
          <span className="node-marker">4</span>
          <span className="node-tooltip">4-Pin M12 Micro DC Quick-Disconnect</span>
        </button>
      </div>

      {/* Engineering Control Bar */}
      <div className="three-controls-bar">
        <button
          type="button"
          className={`control-btn ${autoRotate ? 'active' : ''}`}
          onClick={() => setAutoRotate(!autoRotate)}
          title="Toggle Auto Rotation"
        >
          <RotateCw size={14} />
          <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
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
          className={`control-btn ${exploded ? 'active' : ''}`}
          onClick={() => setExploded(!exploded)}
          title="Toggle Exploded Mechanical Assembly"
        >
          <Layers size={14} />
          <span>{exploded ? 'Exploded (Active)' : 'Exploded View'}</span>
        </button>

        <button
          type="button"
          className={`control-btn target-btn ${targetDetected ? 'triggered' : ''}`}
          onClick={() => setTargetDetected(!targetDetected)}
          title="Simulate Steel Target Flag Entry at 8mm"
        >
          <Zap size={14} />
          <span>{targetDetected ? 'Target Detected (8.0mm)' : 'Simulate Target Flag'}</span>
        </button>
      </div>

      {highlightSpecs && (
        <div className="three-viewer-footer-info">
          <div className="info-item">
            <ShieldCheck size={14} className="text-teal" />
            <span>Dimensions: Ø18mm × 65mm body • Standard DIN EN 60947-5-2 compliant geometry</span>
          </div>
          <span className="text-muted">Drag cursor to inspect angles</span>
        </div>
      )}
    </div>
  );
};
