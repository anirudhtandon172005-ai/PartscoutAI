import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Sliders,
} from 'lucide-react';

export type PartCategoryType = 'nail' | 'bolt' | 'bearing' | 'motor' | 'valve' | 'cable' | 'sensor' | 'general';

interface ThreePartViewerProps {
  partNumber?: string;
  manufacturer?: string;
  partName?: string;
  category?: string;
  highlightSpecs?: boolean;
  compact?: boolean;
}

interface ExplodedPart {
  mesh: THREE.Object3D;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
}

export function detectViewerCategory(category?: string, name?: string, pn?: string, mfg?: string): PartCategoryType {
  const text = `${category || ''} ${name || ''} ${pn || ''} ${mfg || ''}`.toLowerCase();
  if (text.includes('nail') || text.includes('framing nail') || text.includes('wire nail') || text.includes('wire fastener')) return 'nail';
  if (text.includes('bolt') || text.includes('screw') || text.includes('hex') || text.includes('fastener') || text.includes('cap screw')) return 'bolt';
  if (text.includes('bearing') || text.includes('ball bearing') || text.includes('roller') || text.includes('skf') || text.includes('timken') || text.includes('nsk')) return 'bearing';
  if (text.includes('motor') || text.includes('vfd') || text.includes('induction') || text.includes('drive') || text.includes('ac motor')) return 'motor';
  if (text.includes('valve') || text.includes('solenoid') || text.includes('pneumatic') || text.includes('festo') || text.includes('smc')) return 'valve';
  if (text.includes('cable') || text.includes('m12') || text.includes('cordset') || text.includes('connector') || text.includes('phoenix')) return 'cable';
  if (text.includes('sensor') || text.includes('igt') || text.includes('bes') || text.includes('omron') || text.includes('balluff') || text.includes('ifm') || text.includes('proximity')) return 'sensor';
  return 'general';
}

export const ThreePartViewer: React.FC<ThreePartViewerProps> = ({
  partNumber = 'BES 516-325-G-E5-C-S4 / IGT205',
  manufacturer = 'Standard Industrial Catalog CAD Twin',
  partName = 'Industrial Replacement Component',
  category = 'Industrial Hardware',
  highlightSpecs = true,
  compact = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [exploded, setExploded] = useState<boolean>(false);
  const [simActive, setSimActive] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [activeCallout, setActiveCallout] = useState<string | null>(null);
  const [dimensionsVisible, setDimensionsVisible] = useState<boolean>(true);
  const [viewPreset, setViewPreset] = useState<'iso' | 'front' | 'face' | 'detail'>('iso');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);

  const activeCategory = useMemo(() => {
    return detectViewerCategory(category, partName, partNumber, manufacturer);
  }, [category, partName, partNumber, manufacturer]);

  // Dynamic references for animated parts and exploded view
  const animStateRef = useRef({
    explodedProgress: 0,
    simProgress: 0,
    isSimActive: false,
    pulseTime: 0,
    orbitAngle: 0,
    motorAngle: 0,
  });

  const explodedPartsRef = useRef<ExplodedPart[]>([]);
  const simElementsRef = useRef<{
    pulseMesh?: THREE.Mesh;
    light?: THREE.PointLight;
    rotatingGroup?: THREE.Group;
    shiftingMesh?: THREE.Mesh;
    stressMesh?: THREE.Mesh;
    targetFlag?: THREE.Mesh;
    indicatorLed?: THREE.Mesh;
  }>({});
  const dimensionLinesGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    animStateRef.current.isSimActive = simActive;
  }, [simActive]);

  // Main Three.js Scene Setup & Model Generation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset exploded parts & sim elements
    explodedPartsRef.current = [];
    simElementsRef.current = {};

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 16.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

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

    // Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, 1.4);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(8, 12, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x0ea5e9, 1.6);
    fillLight.position.set(-10, 4, 8);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x14b8a6, 2.2);
    rimLight.position.set(0, -6, -10);
    scene.add(rimLight);

    const bottomBounce = new THREE.DirectionalLight(0xf8fafc, 0.8);
    bottomBounce.position.set(0, -10, 4);
    scene.add(bottomBounce);

    // Ground shadow & measuring grid
    const groundGroup = new THREE.Group();
    groundGroup.position.y = -4.0;

    const shadowPlate = new THREE.Mesh(
      new THREE.CircleGeometry(5.0, 48),
      new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.22 })
    );
    shadowPlate.rotation.x = -Math.PI / 2;
    groundGroup.add(shadowPlate);

    const gridHelper = new THREE.GridHelper(16, 24, 0x0ea5e9, 0xcfd8dc);
    gridHelper.position.y = 0.01;
    groundGroup.add(gridHelper);
    scene.add(groundGroup);

    // Model Root Group
    const modelGroup = new THREE.Group();
    modelGroup.position.set(0, 0.2, 0);
    modelGroup.rotation.z = Math.PI / 16;
    modelGroup.rotation.y = -Math.PI / 4;
    modelGroup.scale.set(0.92, 0.92, 0.92);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Materials Palette
    const polishedSteel = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.16 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.32 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.90, roughness: 0.24 });
    const zincPlated = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.28 });
    const peekFace = new THREE.MeshStandardMaterial({ color: 0x1e242b, metalness: 0.1, roughness: 0.35 });
    const motorBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.75, roughness: 0.35 });
    const aluminumManifold = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.88, roughness: 0.25 });
    const solenoidBlack = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.5, roughness: 0.45 });
    const rubberBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.15, roughness: 0.55 });
    const purCableMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.3, roughness: 0.6 });
    const goldPins = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.98, roughness: 0.1 });
    const glowingAmber = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x000000, emissiveIntensity: 0, roughness: 0.1 });
    const glowingTeal = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0 });

    // Dimension lines root
    const dimGroup = new THREE.Group();
    dimensionLinesGroupRef.current = dimGroup;
    modelGroup.add(dimGroup);

    // ==========================================
    // 3D GEOMETRY GENERATION BY CATEGORY
    // ==========================================
    if (activeCategory === 'nail') {
      // 1. NAIL: 10D Common Steel Wire Fastener Nail
      // A. Strike Head
      const headGeom = new THREE.CylinderGeometry(1.65, 1.55, 0.35, 36);
      const headMesh = new THREE.Mesh(headGeom, polishedSteel);
      headMesh.position.y = 3.65;
      headMesh.castShadow = true;
      modelGroup.add(headMesh);

      // Top strike face texture ring
      const headRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 1.3, 24),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide })
      );
      headRing.rotation.x = -Math.PI / 2;
      headRing.position.y = 0.18;
      headMesh.add(headRing);

      // B. Wire Shank
      const shankGeom = new THREE.CylinderGeometry(0.38, 0.38, 7.0, 32);
      const shankMesh = new THREE.Mesh(shankGeom, polishedSteel);
      shankMesh.castShadow = true;
      modelGroup.add(shankMesh);

      // Annular Grip Ribs
      const ribCount = 12;
      for (let i = 0; i < ribCount; i++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.02, 10, 32), darkSteel);
        rib.rotation.x = Math.PI / 2;
        rib.position.y = 0.5 + i * 0.22;
        shankMesh.add(rib);
      }

      // C. Diamond Penetration Point (4-Facet Inverted Pyramid Tip)
      const tipGeom = new THREE.CylinderGeometry(0.38, 0.02, 1.1, 4);
      const tipMesh = new THREE.Mesh(tipGeom, polishedSteel);
      tipMesh.position.y = -4.05;
      tipMesh.rotation.y = Math.PI / 4;
      tipMesh.castShadow = true;
      modelGroup.add(tipMesh);

      // Wood test block for driving simulation
      const blockGeom = new THREE.BoxGeometry(4.2, 2.2, 4.2);
      const blockMat = new THREE.MeshStandardMaterial({
        color: 0x78350f,
        roughness: 0.8,
        metalness: 0.05,
        transparent: true,
        opacity: 0.65,
      });
      const blockMesh = new THREE.Mesh(blockGeom, blockMat);
      blockMesh.position.y = -5.8;
      blockMesh.visible = false;
      modelGroup.add(blockMesh);
      simElementsRef.current.targetFlag = blockMesh;

      // Contact stress ring
      const stressRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.2, 24), glowingTeal);
      stressRing.rotation.x = -Math.PI / 2;
      stressRing.position.y = -4.6;
      modelGroup.add(stressRing);
      simElementsRef.current.pulseMesh = stressRing;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: headMesh,
        startPos: new THREE.Vector3(0, 3.65, 0),
        endPos: new THREE.Vector3(0, 5.8, 0),
      });
      explodedPartsRef.current.push({
        mesh: tipMesh,
        startPos: new THREE.Vector3(0, -4.05, 0),
        endPos: new THREE.Vector3(0, -5.6, 0),
      });

    } else if (activeCategory === 'bolt') {
      // 2. BOLT: Hex Head Cap Screw Grade 8.8 (M10 x 50mm)
      // A. Hexagonal Drive Head (6 radial segments)
      const hexGeom = new THREE.CylinderGeometry(2.1, 2.1, 1.35, 6);
      const hexHeadMesh = new THREE.Mesh(hexGeom, zincPlated);
      hexHeadMesh.position.y = 3.2;
      hexHeadMesh.castShadow = true;
      modelGroup.add(hexHeadMesh);

      // Chamfered top crown
      const topDome = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.95, 0.2, 6), zincPlated);
      topDome.position.y = 0.72;
      hexHeadMesh.add(topDome);

      // Grade 8.8 stamping mark on top
      const stampRing = new THREE.Mesh(
        new THREE.RingGeometry(0.6, 1.2, 16),
        new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide })
      );
      stampRing.rotation.x = -Math.PI / 2;
      stampRing.position.y = 0.83;
      hexHeadMesh.add(stampRing);

      // B. Integrated Washer Face
      const washerGeom = new THREE.CylinderGeometry(2.15, 2.15, 0.2, 36);
      const washerMesh = new THREE.Mesh(washerGeom, darkSteel);
      washerMesh.position.y = 2.45;
      modelGroup.add(washerMesh);

      // C. Unthreaded Grip Body Shank
      const gripGeom = new THREE.CylinderGeometry(1.2, 1.2, 1.8, 36);
      const gripMesh = new THREE.Mesh(gripGeom, polishedSteel);
      gripMesh.position.y = 1.45;
      modelGroup.add(gripMesh);

      // D. Threaded Shank with Helical Torus Ridges
      const threadCoreGeom = new THREE.CylinderGeometry(1.15, 1.15, 4.4, 36);
      const threadCore = new THREE.Mesh(threadCoreGeom, zincPlated);
      threadCore.position.y = -1.65;
      threadCore.castShadow = true;
      modelGroup.add(threadCore);

      const threadCount = 26;
      for (let i = 0; i < threadCount; i++) {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.038, 10, 36), darkSteel);
        torus.rotation.x = Math.PI / 2;
        torus.position.y = -1.8 + i * 0.16;
        threadCore.add(torus);
      }

      // E. Lead-in Chamfered Tip
      const leadTip = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.8, 0.4, 36), zincPlated);
      leadTip.position.y = -3.85;
      modelGroup.add(leadTip);

      // F. Matching Hex Nut
      const nutGeom = new THREE.CylinderGeometry(2.1, 2.1, 1.2, 6);
      const hexNut = new THREE.Mesh(nutGeom, zincPlated);
      hexNut.position.y = -1.2;
      hexNut.castShadow = true;
      modelGroup.add(hexNut);
      simElementsRef.current.shiftingMesh = hexNut;

      // Clamping stress glow
      const stressRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.4, 32), glowingTeal);
      stressRing.rotation.x = -Math.PI / 2;
      stressRing.position.y = -0.55;
      modelGroup.add(stressRing);
      simElementsRef.current.pulseMesh = stressRing;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: hexHeadMesh,
        startPos: new THREE.Vector3(0, 3.2, 0),
        endPos: new THREE.Vector3(0, 5.2, 0),
      });
      explodedPartsRef.current.push({
        mesh: washerMesh,
        startPos: new THREE.Vector3(0, 2.45, 0),
        endPos: new THREE.Vector3(0, 3.8, 0),
      });
      explodedPartsRef.current.push({
        mesh: hexNut,
        startPos: new THREE.Vector3(0, -1.2, 0),
        endPos: new THREE.Vector3(0, -5.2, 0),
      });

    } else if (activeCategory === 'bearing') {
      // 3. BEARING: Deep Groove Ball Bearing (6205-2RSH)
      // A. Outer Ring with Polished Raceway
      const outerRingGeom = new THREE.CylinderGeometry(4.2, 4.2, 1.8, 48, 1, true);
      const outerRing = new THREE.Mesh(outerRingGeom, polishedSteel);
      modelGroup.add(outerRing);

      // Outer Ring Shell Solid Bevels
      const outerRimTop = new THREE.Mesh(new THREE.RingGeometry(3.3, 4.2, 48), polishedSteel);
      outerRimTop.rotation.x = -Math.PI / 2;
      outerRimTop.position.y = 0.9;
      modelGroup.add(outerRimTop);

      const outerRimBottom = new THREE.Mesh(new THREE.RingGeometry(3.3, 4.2, 48), polishedSteel);
      outerRimBottom.rotation.x = Math.PI / 2;
      outerRimBottom.position.y = -0.9;
      modelGroup.add(outerRimBottom);

      // B. Inner Ring with 25mm Shaft Bore
      const innerRingGeom = new THREE.CylinderGeometry(2.5, 2.5, 1.8, 48, 1, true);
      const innerRing = new THREE.Mesh(innerRingGeom, polishedSteel);
      modelGroup.add(innerRing);

      const innerRimTop = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.5, 48), polishedSteel);
      innerRimTop.rotation.x = -Math.PI / 2;
      innerRimTop.position.y = 0.9;
      modelGroup.add(innerRimTop);

      const innerRimBottom = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.5, 48), polishedSteel);
      innerRimBottom.rotation.x = Math.PI / 2;
      innerRimBottom.position.y = -0.9;
      modelGroup.add(innerRimBottom);

      // C. Rotating Ball Complement (9 Spheres in Retainer Cage)
      const ballGroup = new THREE.Group();
      modelGroup.add(ballGroup);
      simElementsRef.current.rotatingGroup = ballGroup;

      const ballCount = 9;
      const orbitRadius = 2.9;
      for (let i = 0; i < ballCount; i++) {
        const angle = (i / ballCount) * Math.PI * 2;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), polishedSteel);
        ball.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius);
        ball.castShadow = true;
        ballGroup.add(ball);
      }

      // Brass retainer crown cage
      const cageGeom = new THREE.TorusGeometry(orbitRadius, 0.16, 12, 48);
      const cageMesh = new THREE.Mesh(cageGeom, brass);
      cageMesh.rotation.x = Math.PI / 2;
      ballGroup.add(cageMesh);

      // D. Dual Nitrile Rubber Seals (2RS Front & Rear)
      const sealFrontGeom = new THREE.RingGeometry(2.55, 3.25, 48);
      const sealFront = new THREE.Mesh(sealFrontGeom, rubberBlue);
      sealFront.rotation.x = -Math.PI / 2;
      sealFront.position.y = 0.88;
      modelGroup.add(sealFront);

      const sealRearGeom = new THREE.RingGeometry(2.55, 3.25, 48);
      const sealRear = new THREE.Mesh(sealRearGeom, rubberBlue);
      sealRear.rotation.x = Math.PI / 2;
      sealRear.position.y = -0.88;
      modelGroup.add(sealRear);

      // Orbit speed flux ring
      const fluxRing = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.4, 36), glowingTeal);
      fluxRing.rotation.x = -Math.PI / 2;
      fluxRing.position.y = 0.0;
      modelGroup.add(fluxRing);
      simElementsRef.current.pulseMesh = fluxRing;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: sealFront,
        startPos: new THREE.Vector3(0, 0.88, 0),
        endPos: new THREE.Vector3(0, 3.2, 0),
      });
      explodedPartsRef.current.push({
        mesh: sealRear,
        startPos: new THREE.Vector3(0, -0.88, 0),
        endPos: new THREE.Vector3(0, -3.2, 0),
      });
      explodedPartsRef.current.push({
        mesh: ballGroup,
        startPos: new THREE.Vector3(0, 0, 0),
        endPos: new THREE.Vector3(0, 1.4, 0),
      });

    } else if (activeCategory === 'motor') {
      // 4. MOTOR: 3-Phase AC Induction Motor (Siemens 3.0kW / Frame 100L)
      // A. Main Finned Stator Housing
      const statorGeom = new THREE.CylinderGeometry(2.6, 2.6, 4.8, 36);
      const statorMesh = new THREE.Mesh(statorGeom, motorBlue);
      statorMesh.castShadow = true;
      modelGroup.add(statorMesh);

      // 16 Radiating Heat Dissipation Fins
      const finCount = 16;
      for (let i = 0; i < finCount; i++) {
        const finAngle = (i / finCount) * Math.PI * 2;
        const finGeom = new THREE.BoxGeometry(0.12, 4.4, 0.55);
        const finMesh = new THREE.Mesh(finGeom, motorBlue);
        finMesh.position.set(Math.cos(finAngle) * 2.7, 0, Math.sin(finAngle) * 2.7);
        finMesh.rotation.y = -finAngle;
        statorMesh.add(finMesh);
      }

      // B. Front Drive Flange with 4 Bolt Holes
      const flangeGeom = new THREE.CylinderGeometry(3.3, 3.3, 0.45, 36);
      const flangeMesh = new THREE.Mesh(flangeGeom, darkSteel);
      flangeMesh.position.y = 2.6;
      modelGroup.add(flangeMesh);

      // C. Drive Shaft & Rotor Group
      const rotorGroup = new THREE.Group();
      rotorGroup.position.y = 2.8;
      modelGroup.add(rotorGroup);
      simElementsRef.current.rotatingGroup = rotorGroup;

      const shaftGeom = new THREE.CylinderGeometry(0.7, 0.7, 2.8, 32);
      const shaftMesh = new THREE.Mesh(shaftGeom, polishedSteel);
      shaftMesh.position.y = 1.4;
      shaftMesh.castShadow = true;
      rotorGroup.add(shaftMesh);

      // Milled Drive Key in Shaft
      const keyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.22), brass);
      keyMesh.position.set(0.65, 1.4, 0);
      rotorGroup.add(keyMesh);

      // D. Top Electrical Terminal Junction Box
      const termBox = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.6), darkSteel);
      termBox.position.set(0, 0.4, 2.9);
      modelGroup.add(termBox);

      const cableGland = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.6, 16), brass);
      cableGland.rotation.x = Math.PI / 2;
      cableGland.position.set(0, 0, 1.0);
      termBox.add(cableGland);

      // E. Rear Fan Cowl
      const cowlGeom = new THREE.CylinderGeometry(2.65, 2.55, 1.6, 36);
      const cowlMesh = new THREE.Mesh(cowlGeom, darkSteel);
      cowlMesh.position.y = -3.1;
      modelGroup.add(cowlMesh);

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: flangeMesh,
        startPos: new THREE.Vector3(0, 2.6, 0),
        endPos: new THREE.Vector3(0, 4.4, 0),
      });
      explodedPartsRef.current.push({
        mesh: rotorGroup,
        startPos: new THREE.Vector3(0, 2.8, 0),
        endPos: new THREE.Vector3(0, 5.8, 0),
      });
      explodedPartsRef.current.push({
        mesh: termBox,
        startPos: new THREE.Vector3(0, 0.4, 2.9),
        endPos: new THREE.Vector3(0, 0.4, 4.6),
      });
      explodedPartsRef.current.push({
        mesh: cowlMesh,
        startPos: new THREE.Vector3(0, -3.1, 0),
        endPos: new THREE.Vector3(0, -5.2, 0),
      });

    } else if (activeCategory === 'valve') {
      // 5. VALVE: 5/2-Way Directional Solenoid Valve (Festo G 1/4")
      // A. Anodized Aluminum Valve Manifold Block
      const valveBodyGeom = new THREE.BoxGeometry(5.2, 2.0, 2.2);
      const valveBody = new THREE.Mesh(valveBodyGeom, aluminumManifold);
      valveBody.castShadow = true;
      modelGroup.add(valveBody);

      // Pneumatic Working Ports (G 1/4" Counterbores)
      const portX = [-1.4, 0, 1.4];
      portX.forEach((px) => {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 24), brass);
        port.position.set(px, 1.05, 0);
        valveBody.add(port);
      });

      // Bottom Exhaust Ports
      [-0.8, 0.8].forEach((px) => {
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 24), brass);
        port.position.set(px, -1.05, 0);
        valveBody.add(port);
      });

      // B. Left Solenoid Coil Pilot Head with DIN 43650 Plug
      const leftSolenoid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.8), solenoidBlack);
      leftSolenoid.position.set(-3.4, 0, 0);
      modelGroup.add(leftSolenoid);

      // Manual Red Override Button
      const overrideBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
      overrideBtn.position.set(0, 1.0, 0);
      leftSolenoid.add(overrideBtn);

      // DIN plug connector
      const dinPlug = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.9), darkSteel);
      dinPlug.position.set(0, 0, 1.15);
      leftSolenoid.add(dinPlug);

      // C. Right Solenoid Coil
      const rightSolenoid = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.8), solenoidBlack);
      rightSolenoid.position.set(3.4, 0, 0);
      modelGroup.add(rightSolenoid);

      // Internal Spool Indicator (visible on shift)
      const spoolGeom = new THREE.CylinderGeometry(0.65, 0.65, 4.6, 24);
      const spoolMesh = new THREE.Mesh(spoolGeom, polishedSteel);
      spoolMesh.rotation.z = Math.PI / 2;
      modelGroup.add(spoolMesh);
      simElementsRef.current.shiftingMesh = spoolMesh;

      // Air blast pulse ring
      const airPulse = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.4, 24), glowingTeal);
      airPulse.rotation.x = -Math.PI / 2;
      airPulse.position.set(0, 1.25, 0);
      modelGroup.add(airPulse);
      simElementsRef.current.pulseMesh = airPulse;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: leftSolenoid,
        startPos: new THREE.Vector3(-3.4, 0, 0),
        endPos: new THREE.Vector3(-5.6, 0, 0),
      });
      explodedPartsRef.current.push({
        mesh: rightSolenoid,
        startPos: new THREE.Vector3(3.4, 0, 0),
        endPos: new THREE.Vector3(5.6, 0, 0),
      });

    } else if (activeCategory === 'cable') {
      // 6. CABLE: M12 4-Pin Sensor Cable (5.0m PUR)
      // A. Knurled M12 Coupling Nut
      const nutGeom = new THREE.CylinderGeometry(1.35, 1.35, 1.3, 24);
      const nutMesh = new THREE.Mesh(nutGeom, darkSteel);
      nutMesh.position.y = 2.4;
      nutMesh.castShadow = true;
      modelGroup.add(nutMesh);

      // B. Insulator Core with 4 Gold Contacts
      const coreGeom = new THREE.CylinderGeometry(1.0, 1.0, 1.1, 24);
      const coreMesh = new THREE.Mesh(coreGeom, peekFace);
      coreMesh.position.y = 2.9;
      modelGroup.add(coreMesh);

      // 4 Gold Terminal Pins
      const pinPositions = [
        [-0.45, 0.45],
        [0.45, 0.45],
        [-0.45, -0.45],
        [0.45, -0.45],
      ];
      pinPositions.forEach(([px, pz]) => {
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12), goldPins);
        pin.position.set(px, 0.55, pz);
        coreMesh.add(pin);
      });

      // C. Molded TPU Strain Relief Boot
      const bootGeom = new THREE.CylinderGeometry(1.25, 0.75, 3.2, 24);
      const bootMesh = new THREE.Mesh(bootGeom, purCableMat);
      bootMesh.position.y = 0.5;
      modelGroup.add(bootMesh);

      // Flex relief ridges
      for (let i = 0; i < 5; i++) {
        const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.85 - i * 0.05, 0.06, 10, 24), darkSteel);
        ridge.rotation.x = Math.PI / 2;
        ridge.position.y = 0.8 - i * 0.4;
        bootMesh.add(ridge);
      }

      // D. Flexible PUR Outer Cable (smooth curving tail)
      const cableCurve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, -1.1, 0),
        new THREE.Vector3(0, -2.5, 0),
        new THREE.Vector3(1.2, -3.8, 0.5),
        new THREE.Vector3(2.5, -4.8, 1.0)
      );
      const tubeGeom = new THREE.TubeGeometry(cableCurve, 32, 0.42, 16, false);
      const cableMesh = new THREE.Mesh(tubeGeom, purCableMat);
      modelGroup.add(cableMesh);

      // Continuity pulse wave
      const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.3, 1.1, 24), glowingTeal);
      pulseRing.rotation.x = -Math.PI / 2;
      pulseRing.position.y = 3.2;
      modelGroup.add(pulseRing);
      simElementsRef.current.pulseMesh = pulseRing;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: nutMesh,
        startPos: new THREE.Vector3(0, 2.4, 0),
        endPos: new THREE.Vector3(0, 0.6, 0),
      });
      explodedPartsRef.current.push({
        mesh: coreMesh,
        startPos: new THREE.Vector3(0, 2.9, 0),
        endPos: new THREE.Vector3(0, 4.8, 0),
      });

    } else if (activeCategory === 'sensor') {
      // 7. SENSOR: M18 Inductive Proximity Sensor
      const barrelRadius = 1.0;
      const barrelLength = 6.2;

      // A. Main Threaded Barrel
      const barrelMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(barrelRadius, barrelRadius, barrelLength, 48),
        polishedSteel
      );
      barrelMesh.castShadow = true;
      modelGroup.add(barrelMesh);

      // Helical Thread Ridges
      for (let i = 0; i < 34; i++) {
        const torus = new THREE.Mesh(new THREE.TorusGeometry(barrelRadius + 0.022, 0.025, 12, 48), darkSteel);
        torus.rotation.x = Math.PI / 2;
        torus.position.y = -2.1 + i * 0.14;
        barrelMesh.add(torus);
      }

      // B. PEEK Sensing Face
      const sensingFace = new THREE.Mesh(
        new THREE.CylinderGeometry(barrelRadius - 0.04, barrelRadius - 0.04, 0.42, 48),
        peekFace
      );
      sensingFace.position.y = barrelLength / 2 + 0.21;
      sensingFace.castShadow = true;
      modelGroup.add(sensingFace);

      // Coil Ring & Crosshair
      const coilRing = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.75, 36),
        new THREE.MeshBasicMaterial({ color: 0x0d9488, side: THREE.DoubleSide })
      );
      coilRing.rotation.x = -Math.PI / 2;
      coilRing.position.y = 0.22;
      sensingFace.add(coilRing);

      // C. Brass Locknuts
      const nut1 = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.75, 6), brass);
      nut1.position.y = 1.1;
      modelGroup.add(nut1);

      const nut2 = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.75, 6), brass);
      nut2.position.y = -0.7;
      modelGroup.add(nut2);

      // D. 360° Amber Output LED Ring
      const ledMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.03, 1.03, 0.35, 48), glowingAmber);
      ledMesh.position.y = -barrelLength / 2 + 0.55;
      modelGroup.add(ledMesh);
      simElementsRef.current.indicatorLed = ledMesh;

      const ledLight = new THREE.PointLight(0xf59e0b, 0, 4);
      ledLight.position.set(0, -barrelLength / 2 + 0.55, 0);
      modelGroup.add(ledLight);
      simElementsRef.current.light = ledLight;

      // E. M12 4-Pin Tail Disconnect
      const m12Tail = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 32), darkSteel);
      m12Tail.position.y = -barrelLength / 2 - 0.6;
      modelGroup.add(m12Tail);

      // F. Simulated Metal Target Flag
      const targetFlag = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.6), polishedSteel);
      targetFlag.position.set(0, barrelLength / 2 + 1.2, 0);
      targetFlag.visible = false;
      modelGroup.add(targetFlag);
      simElementsRef.current.targetFlag = targetFlag;

      // Radar Pulse Ring
      const pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 1.5, 36), glowingTeal);
      pulseRing.rotation.x = -Math.PI / 2;
      pulseRing.position.y = barrelLength / 2 + 0.35;
      modelGroup.add(pulseRing);
      simElementsRef.current.pulseMesh = pulseRing;

      // Exploded Parts Setup
      explodedPartsRef.current.push({
        mesh: nut1,
        startPos: new THREE.Vector3(0, 1.1, 0),
        endPos: new THREE.Vector3(0, 2.7, 0),
      });
      explodedPartsRef.current.push({
        mesh: nut2,
        startPos: new THREE.Vector3(0, -0.7, 0),
        endPos: new THREE.Vector3(0, -2.2, 0),
      });
      explodedPartsRef.current.push({
        mesh: sensingFace,
        startPos: new THREE.Vector3(0, barrelLength / 2 + 0.21, 0),
        endPos: new THREE.Vector3(0, barrelLength / 2 + 1.8, 0),
      });
      explodedPartsRef.current.push({
        mesh: m12Tail,
        startPos: new THREE.Vector3(0, -barrelLength / 2 - 0.6, 0),
        endPos: new THREE.Vector3(0, -barrelLength / 2 - 2.4, 0),
      });

    } else {
      // 8. GENERAL: Precision Modular Industrial Component
      const modBox = new THREE.Mesh(new THREE.BoxGeometry(4.0, 4.0, 3.0), darkSteel);
      modBox.castShadow = true;
      modelGroup.add(modBox);

      const modLid = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.4, 3.2), aluminumManifold);
      modLid.position.y = 2.1;
      modelGroup.add(modLid);

      const inspectionGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.2, 24), brass);
      inspectionGlass.rotation.x = Math.PI / 2;
      inspectionGlass.position.set(0, 0, 1.52);
      modBox.add(inspectionGlass);

      explodedPartsRef.current.push({
        mesh: modLid,
        startPos: new THREE.Vector3(0, 2.1, 0),
        endPos: new THREE.Vector3(0, 4.0, 0),
      });
    }

    // ==========================================
    // DIMENSION LINES CALIPER OVERLAY
    // ==========================================
    const lineMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.85 });
    const createDimLine = (p1: [number, number, number], p2: [number, number, number]) => {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...p1),
        new THREE.Vector3(...p2),
      ]);
      return new THREE.Line(geom, lineMat);
    };

    if (activeCategory === 'nail') {
      dimGroup.add(createDimLine([-1.8, 3.65, 0], [1.8, 3.65, 0])); // Head Ø
      dimGroup.add(createDimLine([2.2, 3.65, 0], [2.2, -4.05, 0])); // Length 3.0"
      dimGroup.add(createDimLine([-0.9, 0, 0], [0.9, 0, 0])); // Shank 9 Ga
    } else if (activeCategory === 'bolt') {
      dimGroup.add(createDimLine([-2.3, 3.2, 0], [2.3, 3.2, 0])); // Hex AF
      dimGroup.add(createDimLine([2.8, 2.45, 0], [2.8, -3.85, 0])); // Length 50mm
      dimGroup.add(createDimLine([-1.5, 0, 0], [1.5, 0, 0])); // M10 Thread
    } else if (activeCategory === 'bearing') {
      dimGroup.add(createDimLine([-4.4, 0, 0], [4.4, 0, 0])); // OD Ø52
      dimGroup.add(createDimLine([-2.5, 0, 0], [2.5, 0, 0])); // ID Ø25
      dimGroup.add(createDimLine([4.6, 0.9, 0], [4.6, -0.9, 0])); // Width 15mm
    } else if (activeCategory === 'motor') {
      dimGroup.add(createDimLine([-3.4, 2.6, 0], [3.4, 2.6, 0])); // Flange Ø250
      dimGroup.add(createDimLine([3.8, 4.2, 0], [3.8, -3.1, 0])); // Overall 340mm
      dimGroup.add(createDimLine([-0.7, 4.2, 0], [0.7, 4.2, 0])); // Shaft Ø28
    } else if (activeCategory === 'valve') {
      dimGroup.add(createDimLine([-2.6, 1.4, 0], [2.6, 1.4, 0])); // Length 135mm
      dimGroup.add(createDimLine([2.9, 1.0, 0], [2.9, -1.0, 0])); // Height 62mm
    } else if (activeCategory === 'cable') {
      dimGroup.add(createDimLine([-1.4, 2.4, 0], [1.4, 2.4, 0])); // M12 Nut
      dimGroup.add(createDimLine([1.8, 2.9, 0], [1.8, -1.1, 0])); // Boot 42mm
    } else {
      dimGroup.add(createDimLine([-1.8, 3.3, 0], [1.8, 3.3, 0]));
      dimGroup.add(createDimLine([2.0, 3.3, 0], [2.0, -3.1, 0]));
    }

    // Interactive Drag Orbit & Zoom
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    const domEl = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !modelGroupRef.current) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      modelGroupRef.current.rotation.y += dx * 0.008;
      modelGroupRef.current.rotation.x += dy * 0.008;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      cameraRef.current.position.z = THREE.MathUtils.clamp(
        cameraRef.current.position.z + e.deltaY * 0.012,
        8.0,
        28.0
      );
    };

    const handleResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const state = animStateRef.current;

      // Turntable
      if (autoRotate && !isDragging && modelGroupRef.current) {
        modelGroupRef.current.rotation.y += delta * 0.38;
      }

      // Exploded View Lerping
      const targetExploded = exploded ? 1 : 0;
      state.explodedProgress += (targetExploded - state.explodedProgress) * (delta * 6);
      const ep = state.explodedProgress;

      explodedPartsRef.current.forEach((part) => {
        part.mesh.position.lerpVectors(part.startPos, part.endPos, ep);
      });

      // Simulation Activity Lerping
      const targetSim = state.isSimActive ? 1 : 0;
      state.simProgress += (targetSim - state.simProgress) * (delta * 7);
      const sp = state.simProgress;

      // Category-Specific Simulation Effects
      if (activeCategory === 'bearing' && simElementsRef.current.rotatingGroup) {
        if (sp > 0.05) {
          state.orbitAngle += delta * 5.5 * sp;
          simElementsRef.current.rotatingGroup.rotation.y = state.orbitAngle;
        }
      } else if (activeCategory === 'motor' && simElementsRef.current.rotatingGroup) {
        if (sp > 0.05) {
          state.motorAngle += delta * 12.0 * sp;
          simElementsRef.current.rotatingGroup.rotation.y = state.motorAngle;
        }
      } else if (activeCategory === 'valve' && simElementsRef.current.shiftingMesh) {
        simElementsRef.current.shiftingMesh.position.x = THREE.MathUtils.lerp(0, 0.8, sp);
      } else if (activeCategory === 'bolt' && simElementsRef.current.shiftingMesh) {
        if (sp > 0.05) {
          simElementsRef.current.shiftingMesh.rotation.y += delta * 4 * sp;
        }
      }

      // Pulse waves & LED indicator glow
      if (simElementsRef.current.pulseMesh) {
        const pulseMesh = simElementsRef.current.pulseMesh;
        const pulseMat = pulseMesh.material as THREE.MeshBasicMaterial;
        if (sp > 0.1) {
          state.pulseTime += delta * 3.5;
          const wave = (Math.sin(state.pulseTime) + 1) / 2;
          pulseMat.opacity = THREE.MathUtils.lerp(0.2, 0.9, wave) * sp;
          pulseMesh.scale.set(1 + wave * 0.45, 1 + wave * 0.45, 1);
        } else {
          pulseMat.opacity = 0;
        }
      }

      if (simElementsRef.current.indicatorLed && simElementsRef.current.light) {
        const ledMat = simElementsRef.current.indicatorLed.material as THREE.MeshStandardMaterial;
        if (sp > 0.5) {
          ledMat.color.setHex(0xf59e0b);
          ledMat.emissive.setHex(0xff7700);
          ledMat.emissiveIntensity = 2.4;
          simElementsRef.current.light.intensity = 2.8;
        } else {
          ledMat.color.setHex(0x451a03);
          ledMat.emissive.setHex(0x000000);
          ledMat.emissiveIntensity = 0;
          simElementsRef.current.light.intensity = 0;
        }
      }

      if (simElementsRef.current.targetFlag) {
        simElementsRef.current.targetFlag.visible = sp > 0.05;
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
  }, [activeCategory, autoRotate, exploded]);

  // Wireframe Mode
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

  // Dimension Lines Toggle
  useEffect(() => {
    if (dimensionLinesGroupRef.current) {
      dimensionLinesGroupRef.current.visible = dimensionsVisible;
    }
  }, [dimensionsVisible]);

  // View Preset Camera Angles
  const applyViewPreset = (preset: 'iso' | 'front' | 'face' | 'detail') => {
    setViewPreset(preset);
    if (!modelGroupRef.current || !cameraRef.current) return;
    setAutoRotate(false);

    switch (preset) {
      case 'iso':
        modelGroupRef.current.rotation.set(0.28, -Math.PI / 4, 0);
        cameraRef.current.position.set(0, 0.6, 16.0);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'front':
        modelGroupRef.current.rotation.set(0, 0, 0);
        cameraRef.current.position.set(0, 0.2, 14.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'face':
        modelGroupRef.current.rotation.set(Math.PI / 2, 0, 0);
        cameraRef.current.position.set(0, 0, 13.0);
        cameraRef.current.lookAt(0, 0, 0);
        break;
      case 'detail':
        modelGroupRef.current.rotation.set(-Math.PI / 3, Math.PI / 6, 0);
        cameraRef.current.position.set(0, 0.5, 11.5);
        cameraRef.current.lookAt(0, 0, 0);
        break;
    }
  };

  const resetCamera = () => {
    if (!modelGroupRef.current || !cameraRef.current) return;
    modelGroupRef.current.rotation.set(Math.PI / 16, -Math.PI / 4, 0);
    cameraRef.current.position.set(0, 0.6, 16.0);
    cameraRef.current.lookAt(0, 0, 0);
    setAutoRotate(true);
    setViewPreset('iso');
  };

  // Category-specific Metadata & UI Configurations
  const categoryConfig = useMemo(() => {
    switch (activeCategory) {
      case 'nail':
        return {
          standardBadge: 'ASTM F1667 / ISO 12777',
          specPills: ['3.0" Length (10D)', 'Ø0.148" (9 Gauge)', '316 Stainless Steel'],
          simLabel: 'Simulate Drive Penetration',
          simActiveLabel: 'Driving Load Active',
          simActiveBanner: 'Penetration Force Verified • 130,000 psi Tensile Strength Confirmed',
          callouts: [
            { id: 'c1', label: '1', title: 'Strike Head', desc: 'Flat 5/16" Beveled Strike Head with Grip Texture' },
            { id: 'c2', label: '2', title: 'Wire Shank', desc: '9-Gauge Drawn Stainless Wire Shank (0.148" Ø)' },
            { id: 'c3', label: '3', title: 'Grip Ribs', desc: 'Annular Ribs for Enhanced Withdrawal Resistance' },
            { id: 'c4', label: '4', title: 'Diamond Point', desc: '4-Facet Diamond Penetration Point for Wood/Crate' },
          ],
          footerInfo: 'ASTM F1667 10D Wire Fastener • 3.0" Length × 0.148" Shank Dia • 316 Stainless',
        };
      case 'bolt':
        return {
          standardBadge: 'ISO 4014 / DIN 931',
          specPills: ['M10 × 50mm', 'Pitch 1.50mm', 'Grade 8.8 Steel'],
          simLabel: 'Simulate Torque Clamping',
          simActiveLabel: 'Torque Applied',
          simActiveBanner: '49.0 Nm Clamping Torque Applied • Proof Load Tension Nominal',
          callouts: [
            { id: 'c1', label: '1', title: 'Hex Head', desc: '17mm Across-Flats Grade 8.8 Hexagonal Drive Head' },
            { id: 'c2', label: '2', title: 'Washer Face', desc: 'Integrated Flanged Washer Face for Flush Seating' },
            { id: 'c3', label: '3', title: 'Helical Threads', desc: 'ISO Metric M10x1.50 Coarse Machine Screw Threads' },
            { id: 'c4', label: '4', title: 'Hex Nut', desc: 'Matching Class 8 Hex Nut with Zinc-Plated Passivation' },
          ],
          footerInfo: 'ISO 4014 Grade 8.8 Hex Cap Screw • M10x1.5 Thread × 50mm Length • Zinc Plated',
        };
      case 'bearing':
        return {
          standardBadge: 'ISO 492 / DIN 625',
          specPills: ['Ø52 × Ø25 × 15mm', '14.8 kN Dynamic', 'ABEC-5 / 2RS'],
          simLabel: 'Simulate 3000 RPM Orbit',
          simActiveLabel: '3000 RPM Orbiting',
          simActiveBanner: 'Dynamic Orbital Rotation Active • ABEC-5 Precision Raceway Nominal',
          callouts: [
            { id: 'c1', label: '1', title: 'Outer Ring', desc: 'Hardened 52100 Chrome Steel Ground Outer Raceway' },
            { id: 'c2', label: '2', title: 'Rolling Balls', desc: '9× Grade 10 High-Carbon Chrome Steel Spheres' },
            { id: 'c3', label: '3', title: 'Brass Cage', desc: 'Machined Brass Crown Retainer Cage for Ball Spacing' },
            { id: 'c4', label: '4', title: 'Dual 2RS Seals', desc: 'Nitrile Rubber Contact Seals for Washdown Protection' },
          ],
          footerInfo: 'DIN 625 Deep Groove Ball Bearing • 25mm Bore × 52mm OD × 15mm Width • 2RS Sealed',
        };
      case 'motor':
        return {
          standardBadge: 'IEC 60034-1 / NEMA MG-1',
          specPills: ['3.0 kW (4.0 HP)', '1450 RPM • 400V', 'Frame 100L • IP55'],
          simLabel: 'Simulate Rotor Drive',
          simActiveLabel: 'Rotor Spinning',
          simActiveBanner: '3-Phase AC Field Energized • 1450 RPM Nominal Shaft Output Active',
          callouts: [
            { id: 'c1', label: '1', title: 'Stator Fins', desc: 'Extruded Longitudinal Aluminum Heat Dissipation Fins' },
            { id: 'c2', label: '2', title: 'Drive Shaft', desc: 'Ø28mm Keyed Output Shaft (EN 10083 High-Tensile Steel)' },
            { id: 'c3', label: '3', title: 'Terminal Box', desc: 'IP55 Top Terminal Box with M25 Compression Gland' },
            { id: 'c4', label: '4', title: 'Fan Cowl', desc: 'Rear Forced-Air Cooling Fan Cowl & Louvered Shroud' },
          ],
          footerInfo: 'IEC 60034-1 3-Phase Induction Motor • Frame 100L B35 • 3.0 kW @ 400V 50Hz • IP55',
        };
      case 'valve':
        return {
          standardBadge: 'ISO 5599 / VDMA 24563',
          specPills: ['5/2-Way Monostable', 'G 1/4" • 1000 L/min', '24V DC • IP65'],
          simLabel: 'Simulate Solenoid Shift',
          simActiveLabel: 'Pilot Energized',
          simActiveBanner: '24V DC Pilot Solenoid Energized • Port 1-2 Flow 1000 L/min Active',
          callouts: [
            { id: 'c1', label: '1', title: 'Valve Body', desc: 'Anodized Extruded Aluminum 5/2 Spool Manifold Body' },
            { id: 'c2', label: '2', title: 'Solenoids', desc: 'Dual 24V DC Low-Wattage Solenoid Pilot Coils' },
            { id: 'c3', label: '3', title: 'Pneumatic Ports', desc: 'G 1/4" BSPP Female Working Ports (P, A, B, R, S)' },
            { id: 'c4', label: '4', title: 'Manual Override', desc: 'Red Detented Pushbutton for Manual Cycle Testing' },
          ],
          footerInfo: 'ISO 5599 Pneumatic Directional Solenoid Valve • G 1/4" Ports • 24V DC Pilot • IP65',
        };
      case 'cable':
        return {
          standardBadge: 'IEC 61076-2-101',
          specPills: ['M12 4-Pin Straight', '5.0m PUR Shielded', 'IP68 / IP69K'],
          simLabel: 'Simulate Continuity Pulse',
          simActiveLabel: 'Pulse Transmitting',
          simActiveBanner: '4-Pin DC Continuity Verified • 4.0A / 250V Signal Path Active',
          callouts: [
            { id: 'c1', label: '1', title: 'Coupling Nut', desc: 'Knurled Nickel-Plated Brass M12x1 Locking Coupling Nut' },
            { id: 'c2', label: '2', title: 'Gold Contacts', desc: '4-Pin A-Coded Gold-Plated Terminal Contact Sockets' },
            { id: 'c3', label: '3', title: 'Strain Relief', desc: 'Overmolded Flexible TPU Bend-Relief Boot' },
            { id: 'c4', label: '4', title: 'PUR Cable', desc: 'Halogen-Free Oil-Resistant PUR Multi-Conductor Jacket' },
          ],
          footerInfo: 'IEC 61076-2 M12 4-Pin Sensor Cable • 5.0m Oil-Resistant PUR • IP68/IP69K Waterproof',
        };
      default:
        return {
          standardBadge: 'IEC 60947-5-2',
          specPills: ['Ø18 × 65mm', 'Sn 8.0mm Flush', 'PNP NO • M12'],
          simLabel: 'Simulate Target Flag',
          simActiveLabel: 'Target Flag Detected',
          simActiveBanner: 'Target Present at 8.0mm • Switching PNP Output HIGH (24V DC Active)',
          callouts: [
            { id: 'c1', label: '1', title: 'Sensing Face', desc: '8mm Flush PEEK Sensing Face (Active Inductive Coil)' },
            { id: 'c2', label: '2', title: 'Barrel & Nuts', desc: 'M18x1.0 Nickel-Plated Threaded Barrel with Brass Locknuts' },
            { id: 'c3', label: '3', title: 'Status LED', desc: '360° Amber Output Switching Status LED Window' },
            { id: 'c4', label: '4', title: 'M12 Connector', desc: '4-Pin M12 Gold-Plated Quick-Disconnect Receptacle' },
          ],
          footerInfo: 'IEC 60947-5-2 Proximity Sensor • M18x1 × 65mm Length • 4-Pin M12 Micro Quick-Disconnect',
        };
    }
  }, [activeCategory]);

  return (
    <div className={`three-viewer-wrapper ${compact ? 'compact' : ''}`}>
      {/* Header Info */}
      <div className="three-viewer-header">
        <div className="three-viewer-meta">
          <div className="three-badge-row">
            <span className="badge-tag live-cad">
              <span className="dot pulse"></span> 3D Digital Twin
            </span>
            <span className="badge-tag verified-spec">
              <CheckCircle2 size={12} /> {categoryConfig.standardBadge}
            </span>
          </div>
          <h4 className="three-viewer-title">{partNumber}</h4>
          <span className="three-viewer-subtitle">{manufacturer}</span>
        </div>

        <div className="three-viewer-specs-preview">
          {categoryConfig.specPills.map((pill, idx) => (
            <span key={idx} className="tech-pill">{pill}</span>
          ))}
        </div>
      </div>

      {/* 3D Canvas Viewport Container */}
      <div className="three-canvas-container" ref={containerRef}>
        {/* Interactive Numbered Callouts */}
        <div className="three-callout-overlay">
          {categoryConfig.callouts.map((c) => (
            <button
              key={c.id}
              className={`callout-node node-${c.id} ${activeCallout === c.id ? 'active' : ''}`}
              onClick={() => setActiveCallout(activeCallout === c.id ? null : c.id)}
              title={c.title}
            >
              <span className="node-marker">{c.label}</span>
              <span className="node-tooltip">{c.desc}</span>
            </button>
          ))}
        </div>

        {/* View Preset Buttons */}
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
            Front View
          </button>
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'face' ? 'active' : ''}`}
            onClick={() => applyViewPreset('face')}
          >
            Axial View
          </button>
          <button
            type="button"
            className={`preset-btn ${viewPreset === 'detail' ? 'active' : ''}`}
            onClick={() => applyViewPreset('detail')}
          >
            Feature Detail
          </button>
          <button
            type="button"
            className="preset-btn reset-btn"
            onClick={resetCamera}
            title="Reset Turntable & Camera"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {/* Live Simulation Banner */}
        {simActive && (
          <div className="three-detection-banner">
            <Radio size={14} className="pulse-icon text-amber" />
            <span>{categoryConfig.simActiveBanner}</span>
          </div>
        )}
      </div>

      {/* Control Toolbar */}
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
          className={`control-btn target-btn ${simActive ? 'triggered' : ''}`}
          onClick={() => setSimActive(!simActive)}
          title={categoryConfig.simLabel}
        >
          <Zap size={14} />
          <span>{simActive ? categoryConfig.simActiveLabel : categoryConfig.simLabel}</span>
        </button>
      </div>

      {/* Footer Info */}
      {highlightSpecs && (
        <div className="three-viewer-footer-info">
          <div className="info-item">
            <ShieldCheck size={14} className="text-teal" />
            <span>{categoryConfig.footerInfo}</span>
          </div>
          <span className="text-muted-sm">Drag to inspect • Scroll to zoom</span>
        </div>
      )}
    </div>
  );
};
