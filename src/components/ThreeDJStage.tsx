/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Interactive 3D DJ Booth & Lowrider Stage (Three.js)
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DJEngine } from '../audio/DJEngine';
import { Play, Pause, ChevronDown, ChevronUp, Camera, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

interface ThreeDJStageProps {
  engine: DJEngine;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

type CameraPresetId = 'booth' | 'lowrider' | 'tiktok916' | 'orbit';
type FinishPresetId = 'candy_red' | 'chrome_gold' | 'obsidian' | 'cobalt';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'booth', label: 'DJ Booth', pos: [0, 3.2, 4.4], look: [0, 1.15, 0.2] },
  { id: 'lowrider', label: 'Lowrider Cam', pos: [-3.8, 2.1, 2.2], look: [0, 0.9, -2.6] },
  { id: 'tiktok916', label: 'TikTok 9:16', pos: [0, 2.6, 5.6], look: [0, 1.3, -1.0] },
  { id: 'orbit', label: 'Stage Wide', pos: [5.2, 4.2, 6.2], look: [0, 1.1, -1.2] },
];

const FINISH_PRESETS: Array<{ id: FinishPresetId; label: string; color: number; metalness: number; roughness: number }> = [
  { id: 'candy_red', label: 'Candy Red', color: 0xd91424, metalness: 0.88, roughness: 0.16 },
  { id: 'chrome_gold', label: '24K Gold', color: 0xf59e0b, metalness: 0.96, roughness: 0.12 },
  { id: 'obsidian', label: 'Obsidian Chrome', color: 0x1e293b, metalness: 0.92, roughness: 0.18 },
  { id: 'cobalt', label: 'West Coast Blue', color: 0x2563eb, metalness: 0.88, roughness: 0.16 },
];

// Pre-allocated scratch math objects outside the render loop (Zero GC)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _posVec = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _color = new THREE.Color();

function createProceduralVinylTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base dark vinyl
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Concentric micro-grooves
  for (let r = 82; r < 248; r += 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 6 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Center Label (Crimson + Gold Chrome style)
  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 80);
  grad.addColorStop(0, '#f59e0b');
  grad.addColorStop(0.55, '#ef4444');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.fill();

  // White Chocolate text ring on label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WHITE CHOCOLATE', cx, cy - 24);
  ctx.font = 'bold 16px JetBrains Mono, monospace';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('STUDIO $$ LIVE', cx, cy + 38);

  // Cue scratch stripe
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx - 4, 8, 8, 44);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createProceduralAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090c15';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wet road grain & lane markings
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.floor(15 + Math.random() * 25);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle neon grid lines
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.14)';
  ctx.lineWidth = 2;
  for (let g = 0; g <= 512; g += 64) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(512, g);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.35)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const ThreeDJStage: React.FC<ThreeDJStageProps> = ({
  engine,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeCam, setActiveCam] = useState<CameraPresetId>('booth');
  const [activeFinish, setActiveFinish] = useState<FinishPresetId>('candy_red');
  const [explodedRatio, setExplodedRatio] = useState(0);
  const [, setHudTick] = useState(0);

  // Mutable refs read inside the 60fps loop without re-mounting WebGL
  const stateRef = useRef({
    exploded: 0,
    hydraulicImpulse: 0,
    cameraTransitionActive: false,
    targetCamPos: new THREE.Vector3(...CAMERA_PRESETS[0].pos),
    targetCamLook: new THREE.Vector3(...CAMERA_PRESETS[0].look),
    finish: FINISH_PRESETS[0],
  });

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x070913);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x070913, 0.032);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS[0].pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 1.8;
    controls.maxDistance = 18;
    controls.target.set(...CAMERA_PRESETS[0].look);
    controls.update();

    controls.addEventListener('start', () => {
      stateRef.current.cameraTransitionActive = false;
    });

    // 3. Balanced 3-Point Studio & Street Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x60a5fa, 0x1e1b4b, 0.75);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    const d = 8;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.SpotLight(0xef4444, 4.5, 22, Math.PI / 3, 0.6, 1.5);
    rimLight.position.set(-4, 5, -5);
    scene.add(rimLight);

    const fillSpot = new THREE.SpotLight(0x3b82f6, 3.5, 22, Math.PI / 3, 0.6, 1.5);
    fillSpot.position.set(4, 4.5, -4);
    scene.add(fillSpot);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const vinylTexture = createProceduralVinylTexture(maxAniso);
    const asphaltTexture = createProceduralAsphaltTexture(maxAniso);
    const shadowTexture = createContactShadowTexture();

    // Load custom White Chocolate Studio cover art onto the 3D vinyl center label
    const imgLoader = new THREE.ImageLoader();
    imgLoader.load(engine.customCoverUrl, (img) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(vinylTexture.image as HTMLCanvasElement, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(256, 256, 76, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 180, 180, 152, 152);
      ctx.restore();
      // Center spindle hole
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(256, 256, 10, 0, Math.PI * 2);
      ctx.fill();
      vinylTexture.image = c;
      vinylTexture.needsUpdate = true;
    });

    // Ground Plane
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.32,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Contact Shadow Grounding Planes (offset by +0.02 on Y to prevent Z-fighting)
    const contactShadowGeo = new THREE.PlaneGeometry(4.5, 2.6);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const boothShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    boothShadow.rotation.x = -Math.PI / 2;
    boothShadow.position.set(0, 0.02, 0.2);
    scene.add(boothShadow);

    const carShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.0), contactShadowMat);
    carShadow.rotation.x = -Math.PI / 2;
    carShadow.position.set(0, 0.02, -2.8);
    scene.add(carShadow);

    // =========================================================================
    // COMPOSITE MODEL 1: 10-Part DJ Booth & Dual Turntables (THREE.Group)
    // =========================================================================
    const djBoothGroup = new THREE.Group();
    djBoothGroup.position.set(0, 0, 0.2);
    scene.add(djBoothGroup);

    // Shared PBR Materials for DJ Booth
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.finish.color,
      metalness: stateRef.current.finish.metalness,
      roughness: stateRef.current.finish.roughness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const brushedChromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.96,
      roughness: 0.14,
      anisotropy: 0.7,
    });

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.75,
      roughness: 0.42,
    });

    const vinylDiscMat = new THREE.MeshStandardMaterial({
      map: vinylTexture,
      roughness: 0.38,
      metalness: 0.15,
    });

    // Part 1: Beveled DJ Table Support Stand
    const standShape = new THREE.Shape();
    standShape.moveTo(-1.45, -0.55);
    standShape.lineTo(1.45, -0.55);
    standShape.lineTo(1.45, 0.55);
    standShape.lineTo(-1.45, 0.55);
    standShape.closePath();

    const standGeo = new THREE.ExtrudeGeometry(standShape, {
      depth: 0.92,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    standGeo.rotateX(-Math.PI / 2);
    const standMesh = new THREE.Mesh(standGeo, darkChassisMat);
    standMesh.position.y = 0;
    standMesh.castShadow = true;
    standMesh.receiveShadow = true;
    djBoothGroup.add(standMesh);

    // Part 2: Custom Metallic Trim Fascia with Chrome Molding
    const fasciaGeo = new THREE.ExtrudeGeometry(standShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.05,
      bevelSegments: 4,
    });
    fasciaGeo.rotateX(-Math.PI / 2);
    const fasciaMesh = new THREE.Mesh(fasciaGeo, bodyPaintMat);
    fasciaMesh.position.y = 0.94;
    fasciaMesh.castShadow = true;
    djBoothGroup.add(fasciaMesh);

    // Part 3 & 4: Left & Right Lathe-Turned Aluminum Platters
    const platterPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.54, 0),
      new THREE.Vector2(0.52, 0.06),
      new THREE.Vector2(0.49, 0.08),
      new THREE.Vector2(0, 0.08),
    ];
    const platterGeo = new THREE.LatheGeometry(platterPoints, 48);

    const platterLeft = new THREE.Mesh(platterGeo, brushedChromeMat);
    platterLeft.position.set(-0.82, 1.1, 0);
    platterLeft.castShadow = true;
    djBoothGroup.add(platterLeft);

    const platterRight = new THREE.Mesh(platterGeo, brushedChromeMat);
    platterRight.position.set(0.82, 1.1, 0);
    platterRight.castShadow = true;
    djBoothGroup.add(platterRight);

    // Part 5 & 6: Left & Right Spinning Vinyl Records + Chrome Spindles
    const vinylGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.02, 48);
    const vinylLeft = new THREE.Mesh(vinylGeo, vinylDiscMat);
    vinylLeft.position.set(-0.82, 1.19, 0);
    djBoothGroup.add(vinylLeft);

    const vinylRight = new THREE.Mesh(vinylGeo, vinylDiscMat);
    vinylRight.position.set(0.82, 1.19, 0);
    djBoothGroup.add(vinylRight);

    // Part 7 & 8: Left & Right S-Shaped Tubular Tonearms (TubeGeometry)
    const createTonearmGroup = (xOffset: number) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(xOffset, 1.18, -0.36);

      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.08, 24), brushedChromeMat);
      armGroup.add(baseMesh);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.05, 0),
        new THREE.Vector3(-0.04, 0.06, 0.18),
        new THREE.Vector3(0.03, 0.06, 0.36),
        new THREE.Vector3(-0.08, 0.04, 0.52),
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.012, 12, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, brushedChromeMat);
      armGroup.add(tubeMesh);

      // Cartridge headshell
      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.07), bodyPaintMat);
      headMesh.position.set(-0.08, 0.035, 0.54);
      armGroup.add(headMesh);

      return armGroup;
    };

    const tonearmLeft = createTonearmGroup(-0.34);
    tonearmLeft.rotation.y = 0.22;
    djBoothGroup.add(tonearmLeft);

    const tonearmRight = createTonearmGroup(1.3);
    tonearmRight.rotation.y = 0.22;
    djBoothGroup.add(tonearmRight);

    // Part 9 & 10: Central Mixer Console & Animated Crossfader Cap
    const mixerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.85), darkChassisMat);
    mixerPlate.position.set(0, 1.12, 0);
    djBoothGroup.add(mixerPlate);

    const crossfaderCap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), brushedChromeMat);
    crossfaderCap.position.set(0, 1.16, 0.32);
    djBoothGroup.add(crossfaderCap);

    // =========================================================================
    // COMPOSITE MODEL 2: 8-Part West Coast Lowrider Cruiser (THREE.Group)
    // =========================================================================
    const lowriderGroup = new THREE.Group();
    lowriderGroup.position.set(0, 0, -2.8);
    scene.add(lowriderGroup);

    const chassisGroup = new THREE.Group();
    lowriderGroup.add(chassisGroup);

    // Part 1: Sculpted Classic Lowrider Body Hull
    const carBodyShape = new THREE.Shape();
    carBodyShape.moveTo(-2.1, 0.28);
    carBodyShape.lineTo(2.1, 0.28);
    carBodyShape.lineTo(2.05, 0.78);
    carBodyShape.lineTo(0.95, 0.84);
    carBodyShape.lineTo(-0.95, 0.84);
    carBodyShape.lineTo(-2.05, 0.76);
    carBodyShape.closePath();

    const carBodyGeo = new THREE.ExtrudeGeometry(carBodyShape, {
      depth: 1.56,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 4,
    });
    carBodyGeo.translate(0, 0, -0.78);
    const carBodyMesh = new THREE.Mesh(carBodyGeo, bodyPaintMat);
    carBodyMesh.castShadow = true;
    carBodyMesh.receiveShadow = true;
    chassisGroup.add(carBodyMesh);

    // Part 2: Greenhouse Cabin & Optical Glass Windows
    const cabinShape = new THREE.Shape();
    cabinShape.moveTo(-0.95, 0.82);
    cabinShape.lineTo(0.85, 0.82);
    cabinShape.lineTo(0.48, 1.28);
    cabinShape.lineTo(-0.65, 1.28);
    cabinShape.closePath();

    const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, {
      depth: 1.32,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    cabinGeo.translate(0, 0, -0.66);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      metalness: 0.1,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.42 : 1.0,
      ior: 1.52,
      thickness: 0.5,
      depthWrite: false,
    });
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.renderOrder = 5;
    chassisGroup.add(cabinMesh);

    // Part 3 & 4: Chrome Front & Rear Bumpers + Grille
    const bumperGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.76, 20);
    bumperGeo.rotateX(Math.PI / 2);

    const frontBumper = new THREE.Mesh(bumperGeo, brushedChromeMat);
    frontBumper.position.set(2.14, 0.36, 0);
    chassisGroup.add(frontBumper);

    const rearBumper = new THREE.Mesh(bumperGeo, brushedChromeMat);
    rearBumper.position.set(-2.14, 0.36, 0);
    chassisGroup.add(rearBumper);

    // Part 5: Quad Headlights (Emissive Warm Gold)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const hlGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16);
    hlGeo.rotateZ(Math.PI / 2);
    [-0.55, -0.32, 0.32, 0.55].forEach((zPos) => {
      const hl = new THREE.Mesh(hlGeo, headlightMat);
      hl.position.set(2.12, 0.58, zPos);
      chassisGroup.add(hl);
    });

    // Part 6–9: 4 100-Spoke Chrome Wire Lowrider Wheels with Whitewalls & Bullet Centercaps
    const wheelPositions: Array<[number, number, number]> = [
      [1.32, 0.34, 0.84],
      [1.32, 0.34, -0.84],
      [-1.32, 0.34, 0.84],
      [-1.32, 0.34, -0.84],
    ];
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75, metalness: 0.1 });
    const whitewallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
    const tireGeo = new THREE.TorusGeometry(0.26, 0.09, 16, 32);
    const whitewallGeo = new THREE.TorusGeometry(0.23, 0.022, 12, 32);
    const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 32);
    rimGeo.rotateX(Math.PI / 2);

    // 3D Chrome Bullet Centercap Cone
    const bulletCapGeo = new THREE.ConeGeometry(0.065, 0.14, 24);

    const wheels: THREE.Group[] = [];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const whitewall = new THREE.Mesh(whitewallGeo, whitewallMat);
      whitewall.position.z = wz > 0 ? 0.072 : -0.072;
      const rim = new THREE.Mesh(rimGeo, brushedChromeMat);

      const bulletCap = new THREE.Mesh(bulletCapGeo, brushedChromeMat);
      bulletCap.rotation.x = wz > 0 ? Math.PI / 2 : -Math.PI / 2;
      bulletCap.position.z = wz > 0 ? 0.11 : -0.11;

      wGroup.add(tire);
      wGroup.add(whitewall);
      wGroup.add(rim);
      wGroup.add(bulletCap);
      lowriderGroup.add(wGroup);
      wheels.push(wGroup);
    });

    // =========================================================================
    // INSTANCED MESH (>20 items): 36 Audio-Reactive 3D Spectrum Columns
    // =========================================================================
    const BAR_COUNT = 36;
    const barGeo = new THREE.BoxGeometry(0.22, 1.0, 0.22);
    barGeo.translate(0, 0.5, 0); // Pivot at bottom-center flush with ground
    const barMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.8,
    });
    const instancedBars = new THREE.InstancedMesh(barGeo, barMat, BAR_COUNT);
    instancedBars.frustumCulled = false;

    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = Math.PI + (i / (BAR_COUNT - 1)) * Math.PI; // Semicircle arc behind stage
      const radius = 6.4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 1.2;

      _posVec.set(x, 0, z);
      _scaleVec.set(1, 0.4, 1);
      _quat.identity();
      _mat4.compose(_posVec, _quat, _scaleVec);
      instancedBars.setMatrixAt(i, _mat4);

      // Gradient color per bar (Crimson -> Amber -> Blue)
      const t = i / (BAR_COUNT - 1);
      if (t < 0.5) {
        _color.setHex(0xef4444).lerp(new THREE.Color(0xf59e0b), t * 2);
      } else {
        _color.setHex(0xf59e0b).lerp(new THREE.Color(0x3b82f6), (t - 0.5) * 2);
      }
      instancedBars.setColorAt(i, _color);
    }
    instancedBars.instanceMatrix.needsUpdate = true;
    if (instancedBars.instanceColor) instancedBars.instanceColor.needsUpdate = true;
    instancedBars.computeBoundingSphere();
    scene.add(instancedBars);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================================
    // Animation Loop with Software-WebGL Pacing & Exponential Damping
    // =========================================================================
    const clock = new THREE.Clock();
    const freqBuffer = new Uint8Array(64);
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Update paint finish dynamically
      bodyPaintMat.color.setHex(stateRef.current.finish.color);
      bodyPaintMat.metalness = stateRef.current.finish.metalness;
      bodyPaintMat.roughness = stateRef.current.finish.roughness;

      // 1. Spin 3D Vinyl Platters synced to DJEngine Deck A & Deck B
      vinylLeft.rotation.y = -THREE.MathUtils.degToRad(engine.deckAState.rotationAngle);
      vinylRight.rotation.y = -THREE.MathUtils.degToRad(engine.deckBState.rotationAngle);

      // 2. Move 3D Crossfader Cap with DJEngine crossfader
      const targetCrossX = engine.crossfader * 0.22;
      crossfaderCap.position.x = THREE.MathUtils.damp(crossfaderCap.position.x, targetCrossX, 12, delta);

      // 3. Exploded View Separation (Damped)
      const exp = stateRef.current.exploded;
      vinylLeft.position.y = THREE.MathUtils.damp(vinylLeft.position.y, 1.19 + exp * 0.55, 6, delta);
      vinylRight.position.y = THREE.MathUtils.damp(vinylRight.position.y, 1.19 + exp * 0.55, 6, delta);
      platterLeft.position.y = THREE.MathUtils.damp(platterLeft.position.y, 1.1 + exp * 0.25, 6, delta);
      platterRight.position.y = THREE.MathUtils.damp(platterRight.position.y, 1.1 + exp * 0.25, 6, delta);
      cabinMesh.position.y = THREE.MathUtils.damp(cabinMesh.position.y, exp * 0.65, 6, delta);

      // 4. Audio-Reactive Spectrum Bars & Lowrider Hydraulic Suspension
      let bassEnergy = 0;
      if (engine.masterAnalyser) {
        engine.masterAnalyser.getByteFrequencyData(freqBuffer);
        for (let b = 0; b < 8; b++) {
          bassEnergy += freqBuffer[b];
        }
        bassEnergy = bassEnergy / (8 * 255);
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = Math.PI + (i / (BAR_COUNT - 1)) * Math.PI;
        const radius = 6.4;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius - 1.2;

        const rawBin = freqBuffer[i % 32] || 0;
        const idleWave = 0.35 + Math.sin(elapsed * 2.5 + i * 0.3) * 0.15;
        const targetHeight = Math.max(0.3, (rawBin / 255) * 3.8 + idleWave);

        _posVec.set(x, 0, z);
        _scaleVec.set(1, targetHeight, 1);
        _quat.identity();
        _mat4.compose(_posVec, _quat, _scaleVec);
        instancedBars.setMatrixAt(i, _mat4);
      }
      instancedBars.instanceMatrix.needsUpdate = true;

      // Decay manual hydraulic impulse
      stateRef.current.hydraulicImpulse = THREE.MathUtils.damp(
        stateRef.current.hydraulicImpulse,
        0,
        4,
        delta
      );

      const bounceLift = bassEnergy * 0.36 + stateRef.current.hydraulicImpulse;
      chassisGroup.position.y = THREE.MathUtils.damp(chassisGroup.position.y, bounceLift, 10, delta);
      chassisGroup.rotation.z = THREE.MathUtils.damp(
        chassisGroup.rotation.z,
        Math.sin(elapsed * 4) * (bassEnergy * 0.08 + stateRef.current.hydraulicImpulse * 0.12),
        8,
        delta
      );

      // Rotate lowrider rims subtly when playing
      const wheelSpeed = (engine.deckAState.isPlaying || engine.deckBState.isPlaying) ? delta * 2.5 : 0;
      wheels.forEach((w) => {
        w.rotation.z -= wheelSpeed;
      });

      // 5. Damped Camera Preset Transitions
      if (stateRef.current.cameraTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, stateRef.current.targetCamPos.x, 4.5, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, stateRef.current.targetCamPos.y, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, stateRef.current.targetCamPos.z, 4.5, delta);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, stateRef.current.targetCamLook.x, 4.5, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, stateRef.current.targetCamLook.y, 4.5, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, stateRef.current.targetCamLook.z, 4.5, delta);

        if (camera.position.distanceTo(stateRef.current.targetCamPos) < 0.05) {
          stateRef.current.cameraTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.dispose();
      renderer.dispose();
    };
  }, [engine]);

  const selectCameraPreset = (preset: CameraPreset) => {
    setActiveCam(preset.id);
    _camTargetPos.set(...preset.pos);
    _camTargetLook.set(...preset.look);
    stateRef.current.targetCamPos.copy(_camTargetPos);
    stateRef.current.targetCamLook.copy(_camTargetLook);
    stateRef.current.cameraTransitionActive = true;
  };

  const selectFinishPreset = (finish: (typeof FINISH_PRESETS)[0]) => {
    setActiveFinish(finish.id);
    stateRef.current.finish = finish;
  };

  const triggerHydraulicBounce = () => {
    stateRef.current.hydraulicImpulse = 0.55;
    engine.triggerSoundboard('lowrider_horn');
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen' : 'h-[540px] sm:h-[620px]'
      }`}
    >
      {/* Dedicated WebGL Mount Container (100% Unobstructed Center) */}
      <div ref={canvasMountRef} className="w-full h-full block" />

      {/* Top-Center Minimal Read-Only HUD Badge */}
      <div className="absolute top-3 inset-x-0 z-10 flex justify-center pointer-events-none px-4">
        <div className="flex items-center gap-3 px-4 py-1.5 rounded-full border border-amber-500/30 bg-slate-950/90 text-xs shadow-lg">
          <img
            src={engine.customCoverUrl}
            alt="White Chocolate Studio"
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-full object-cover border border-amber-400"
          />
          <span className="font-black text-white tracking-wider uppercase text-[11px]">
            WHITE CHOCOLATE 3D STAGE
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-[11px] text-amber-400 font-mono tabular-nums">
            DECK A: {engine.deckAState.effectiveBpm.toFixed(1)} BPM · DECK B:{' '}
            {engine.deckBState.effectiveBpm.toFixed(1)} BPM
          </span>
        </div>
      </div>

      {/* Centered Bottom 3D Control Dock */}
      <div className="absolute inset-x-0 bottom-4 z-10 flex flex-col items-center justify-end px-3 sm:px-6 pointer-events-none">
        <div
          className={`w-full max-w-4xl flex flex-col items-center transition-all duration-200 pointer-events-auto ${
            dockCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
          }`}
        >
          {/* Centered Collapse / Expand Handle */}
          <div className="flex justify-center mb-1.5">
            <button
              onClick={() => setDockCollapsed(!dockCollapsed)}
              className="px-4 py-1.5 rounded-full border border-amber-500/40 bg-slate-950/95 text-[11px] font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 shadow-lg"
            >
              {dockCollapsed ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>Show 3D Stage Controls</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Hide 3D Controls</span>
                </>
              )}
            </button>
          </div>

          {/* Centered Main Control Panel */}
          <div className="w-full rounded-2xl border border-amber-500/30 bg-slate-950/95 p-3 sm:p-4 shadow-2xl space-y-3 text-center">
            {/* Row 1 (Centered): Deck A · Crossfader · Deck B · Hydraulic Bounce · Fullscreen */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pb-2.5 border-b border-slate-800/90">
              <button
                onClick={() => {
                  engine.playPauseDeck('A');
                  setHudTick((t) => t + 1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  engine.deckAState.isPlaying
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {engine.deckAState.isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Deck A</span>
              </button>

              {/* Centered Crossfader */}
              <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 w-52 sm:w-64">
                <span className="text-[10px] font-black text-rose-400">A</span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={engine.crossfader}
                  onChange={(e) => {
                    engine.updateCrossfader(parseFloat(e.target.value));
                    setHudTick((t) => t + 1);
                  }}
                  className="dj-slider w-full h-4"
                />
                <span className="text-[10px] font-black text-blue-400">B</span>
              </div>

              <button
                onClick={() => {
                  engine.playPauseDeck('B');
                  setHudTick((t) => t + 1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  engine.deckBState.isPlaying
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {engine.deckBState.isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Deck B</span>
              </button>

              <button
                onClick={triggerHydraulicBounce}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors whitespace-nowrap shrink-0 shadow-md"
              >
                🛞 Hydraulic Bounce
              </button>

              {onToggleFullscreen && (
                <button
                  onClick={onToggleFullscreen}
                  className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}</span>
                </button>
              )}
            </div>

            {/* Row 2 (Centered): Camera Angles · Lowrider Finishes · Exploded View */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              {/* Centered Camera Presets */}
              <div className="flex items-center justify-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0 mx-1.5" />
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => selectCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                      activeCam === preset.id
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Centered Finish Swatches */}
              <div className="flex items-center justify-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mx-1.5" />
                {FINISH_PRESETS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => selectFinishPreset(f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                      activeFinish === f.id
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Centered Exploded View Slider */}
              <div className="flex items-center justify-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap shrink-0">
                  Explode View
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={explodedRatio}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setExplodedRatio(val);
                    stateRef.current.exploded = val;
                  }}
                  className="dj-slider w-24 h-4"
                />
                <span className="text-[11px] font-mono text-amber-400 font-bold tabular-nums w-8 text-right">
                  {Math.round(explodedRatio * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
