/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - Interactive 3D DJ Booth & Lowrider Stage (Three.js)
 * Enhanced with 1964 Chevy Impala Lowrider matching the studio icon pic.
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DJEngine } from '../audio/DJEngine';
import { Play, Pause, ChevronDown, ChevronUp, Camera, Sparkles, Maximize2, Minimize2, Gauge } from 'lucide-react';

interface ThreeDJStageProps {
  engine: DJEngine;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isDark?: boolean;
  onOpenDiagnostics?: () => void;
}

type CameraPresetId = 'booth' | 'lowrider' | 'tiktok916' | 'orbit';
type FinishPresetId = 'candy_red' | 'pastel_mint' | 'pastel_lavender' | 'chrome_gold' | 'cobalt';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  pos: [number, number, number];
  look: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'booth', label: 'DJ Booth', pos: [0, 2.9, 4.2], look: [0, 1.1, 0.2] },
  { id: 'lowrider', label: 'Lowrider Front', pos: [0, 1.3, -0.6], look: [0, 0.8, -2.8] },
  { id: 'tiktok916', label: 'TikTok 9:16', pos: [0, 2.4, 4.8], look: [0, 1.2, -1.0] },
  { id: 'orbit', label: 'Stage Wide', pos: [4.6, 3.8, 5.2], look: [0, 1.0, -1.2] },
];

const FINISH_PRESETS: Array<{ id: FinishPresetId; label: string; color: number; metalness: number; roughness: number }> = [
  { id: 'candy_red', label: 'Candy Apple Red (Photo)', color: 0xc8102e, metalness: 0.92, roughness: 0.12 },
  { id: 'pastel_mint', label: 'Pastel Mint Lowrider', color: 0x86efac, metalness: 0.86, roughness: 0.16 },
  { id: 'pastel_lavender', label: 'Pastel Lavender', color: 0xd8b4fe, metalness: 0.88, roughness: 0.16 },
  { id: 'chrome_gold', label: '24K Gold Lowrider', color: 0xf59e0b, metalness: 0.96, roughness: 0.10 },
  { id: 'cobalt', label: 'West Coast Blue', color: 0x2563eb, metalness: 0.88, roughness: 0.16 },
];

// Pre-allocated scratch math objects outside the render loop (Zero GC)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _posVec = new THREE.Vector3();
const _scaleVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function createProceduralVinylTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

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
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WHITE CHOCOLATE', cx, cy - 24);
  ctx.font = 'bold 16px monospace';
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

// Procedural Chicano Pinstriping & Filigree Texture matching the .JPG Lowrider Hood
function createLowriderPinstripeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Deep Candy Red Base
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;

  // Draw intricate symmetrical Chicano pinstripe flourishes
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
  ctx.shadowBlur = 6;

  // Center Hood Spear Line
  ctx.beginPath();
  ctx.moveTo(cx, 80);
  ctx.lineTo(cx, 950);
  ctx.stroke();

  // Symmetrical Filigree Scrolls & Flourishes
  const drawSymmetricCurve = (
    x1: number, y1: number,
    cp1x: number, cp1y: number,
    cp2x: number, cp2y: number,
    x2: number, y2: number
  ) => {
    // Right side
    ctx.beginPath();
    ctx.moveTo(cx + x1, y1);
    ctx.bezierCurveTo(cx + cp1x, cp1y, cx + cp2x, cp2y, cx + x2, y2);
    ctx.stroke();

    // Left side (mirrored)
    ctx.beginPath();
    ctx.moveTo(cx - x1, y1);
    ctx.bezierCurveTo(cx - cp1x, cp1y, cx - cp2x, cp2y, cx - x2, y2);
    ctx.stroke();
  };

  // Top Nose Flourishes
  for (let s = 0; s < 4; s++) {
    const yOff = s * 70;
    drawSymmetricCurve(0, 140 + yOff, 60, 100 + yOff, 140, 170 + yOff, 0, 220 + yOff);
    drawSymmetricCurve(0, 160 + yOff, 110, 120 + yOff, 200, 210 + yOff, 40, 260 + yOff);
  }

  // Fender Edge Pinstripe Bands
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  drawSymmetricCurve(380, 180, 420, 400, 410, 700, 360, 920);
  drawSymmetricCurve(395, 200, 435, 420, 425, 680, 375, 900);

  // Chrome Silver Teardrop Accents
  ctx.fillStyle = '#f8fafc';
  for (let d = 0; d < 6; d++) {
    const dy = 200 + d * 110;
    ctx.beginPath();
    ctx.arc(cx, dy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 80 - d * 20, dy + 20, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + 80 + d * 20, dy + 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createProceduralAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wet asphalt grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = Math.floor(30 + Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v + 5},${v + 15})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle pastel neon grid
  ctx.strokeStyle = 'rgba(244, 114, 182, 0.2)';
  ctx.lineWidth = 1.5;
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

export const ThreeDJStage: React.FC<ThreeDJStageProps> = ({
  engine,
  isFullscreen = false,
  onToggleFullscreen,
  isDark = true,
  onOpenDiagnostics,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [activeCam, setActiveCam] = useState<CameraPresetId>('booth');
  const [activeFinish, setActiveFinish] = useState<FinishPresetId>('candy_red');
  const [explodedVal, setExplodedVal] = useState(0);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [, setHudTick] = useState(0);

  const stateRef = useRef({
    exploded: 0,
    finish: FINISH_PRESETS[0],
    activeCamPreset: CAMERA_PRESETS[0],
    cameraTransitionActive: false,
    hydraulicImpulse: 0,
  });

  useEffect(() => {
    stateRef.current.exploded = explodedVal;
  }, [explodedVal]);

  useEffect(() => {
    const f = FINISH_PRESETS.find((p) => p.id === activeFinish) || FINISH_PRESETS[0];
    stateRef.current.finish = f;
  }, [activeFinish]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

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
    renderer.toneMappingExposure = 1.25;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Bright Pastel Sunset Sky & Fog (Warm Peach / Pastel Lavender)
    const skyColor = new THREE.Color(0xfde2e4);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xfde2e4, 0.022);

    // Studio Environment via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 120);
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

    // Balanced Bright Pastel Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xfef08a, 0xa7f3d0, 1.1);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    sunLight.position.set(6, 10, 6);
    sunLight.castShadow = !isSoftwareGl;
    const d = 8;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.mapSize.set(1024, 1024);
    scene.add(sunLight);

    // Ground Plane
    const asphaltTexture = createProceduralAsphaltTexture(renderer.capabilities.getMaxAnisotropy());
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.28,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // =========================================================================
    // DJ BOOTH MODEL
    // =========================================================================
    const djBoothGroup = new THREE.Group();
    djBoothGroup.position.set(0, 0, 0.2);
    scene.add(djBoothGroup);

    const vinylTexture = createProceduralVinylTexture(renderer.capabilities.getMaxAnisotropy());
    const pinstripeTexture = createLowriderPinstripeTexture();

    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: stateRef.current.finish.color,
      metalness: stateRef.current.finish.metalness,
      roughness: stateRef.current.finish.roughness,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });

    const brushedChromeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf1f5f9,
      metalness: 0.98,
      roughness: 0.10,
      clearcoat: 0.8,
    });

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35,
    });

    const vinylDiscMat = new THREE.MeshStandardMaterial({
      map: vinylTexture,
      roughness: 0.38,
      metalness: 0.15,
    });

    // DJ Stand & Table
    const standMesh = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.94, 1.1), darkChassisMat);
    standMesh.position.set(0, 0.47, 0);
    standMesh.castShadow = true;
    djBoothGroup.add(standMesh);

    const fasciaMesh = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 1.18), bodyPaintMat);
    fasciaMesh.position.set(0, 0.98, 0);
    djBoothGroup.add(fasciaMesh);

    // Vinyl Platters
    const platterGeo = new THREE.CylinderGeometry(0.52, 0.54, 0.06, 40);
    const platterLeft = new THREE.Mesh(platterGeo, brushedChromeMat);
    platterLeft.position.set(-0.82, 1.07, 0);
    djBoothGroup.add(platterLeft);

    const platterRight = new THREE.Mesh(platterGeo, brushedChromeMat);
    platterRight.position.set(0.82, 1.07, 0);
    djBoothGroup.add(platterRight);

    // Vinyl Records
    const vinylGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.02, 40);
    const vinylLeft = new THREE.Mesh(vinylGeo, vinylDiscMat);
    vinylLeft.position.set(-0.82, 1.13, 0);
    djBoothGroup.add(vinylLeft);

    const vinylRight = new THREE.Mesh(vinylGeo, vinylDiscMat);
    vinylRight.position.set(0.82, 1.13, 0);
    djBoothGroup.add(vinylRight);

    // Mixer Console & Crossfader
    const mixerPlate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.85), darkChassisMat);
    mixerPlate.position.set(0, 1.06, 0);
    djBoothGroup.add(mixerPlate);

    const crossfaderCap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), brushedChromeMat);
    crossfaderCap.position.set(0, 1.10, 0.3);
    djBoothGroup.add(crossfaderCap);

    // =========================================================================
    // 1964 CHEVY IMPALA LOWRIDER MODEL (MATCHING .JPG PHOTO)
    // Oriented facing directly forward towards the DJ Booth & Viewer!
    // =========================================================================
    const lowriderGroup = new THREE.Group();
    lowriderGroup.position.set(0, 0, -2.8);
    scene.add(lowriderGroup);

    const chassisGroup = new THREE.Group();
    lowriderGroup.add(chassisGroup);

    // Main Lowrider Body Hull (Facing +Z)
    // Impala Long Stance: Width 2.3m (X), Length 4.6m (Z), Height 0.7m (Y)
    const hoodPinstripeMat = new THREE.MeshPhysicalMaterial({
      map: pinstripeTexture,
      metalness: 0.90,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
    });

    // Lower Main Hull
    const mainHullMesh = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.52, 4.4), bodyPaintMat);
    mainHullMesh.position.set(0, 0.52, 0);
    mainHullMesh.castShadow = true;
    chassisGroup.add(mainHullMesh);

    // Hood Top Deck with Pinstriping Scrollwork
    const hoodDeck = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 1.8), hoodPinstripeMat);
    hoodDeck.position.set(0, 0.79, 1.05);
    hoodDeck.castShadow = true;
    chassisGroup.add(hoodDeck);

    // Chrome Hood Spear (Center Lowrider Ornament)
    const hoodSpear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.76), brushedChromeMat);
    hoodSpear.position.set(0, 0.83, 1.05);
    chassisGroup.add(hoodSpear);

    // Hood Front Bullet Emblem
    const spearBullet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 16), brushedChromeMat);
    spearBullet.rotation.x = Math.PI / 2;
    spearBullet.position.set(0, 0.84, 1.95);
    chassisGroup.add(spearBullet);

    // Classic Impala Curved Windshield & Chrome Pillars
    const windshieldMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.55, 0.9),
      new THREE.MeshPhysicalMaterial({
        color: 0x93c5fd,
        metalness: 0.1,
        roughness: 0.05,
        transmission: isSoftwareGl ? 0 : 0.88,
        transparent: true,
        opacity: isSoftwareGl ? 0.45 : 0.92,
      })
    );
    windshieldMesh.position.set(0, 1.05, -0.2);
    chassisGroup.add(windshieldMesh);

    // Chrome Windshield Sunvisor & Header
    const visorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.04, 0.22), brushedChromeMat);
    visorMesh.position.set(0, 1.34, 0.24);
    visorMesh.rotation.x = 0.15;
    chassisGroup.add(visorMesh);

    // Classic 1964 Impala Horizontal Chrome Front Grille
    const grilleBack = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.34, 0.08), darkChassisMat);
    grilleBack.position.set(0, 0.58, 2.21);
    chassisGroup.add(grilleBack);

    // Horizontal Chrome Slats on Grille
    for (let s = -3; s <= 3; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.02, 0.06), brushedChromeMat);
      slat.position.set(0, 0.58 + s * 0.04, 2.24);
      chassisGroup.add(slat);
    }

    // Quad Headlights (Emissive Warm Golden with Chrome Bezels)
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 3.2,
      roughness: 0.08,
    });
    const hlBezelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 24);
    hlBezelGeo.rotateX(Math.PI / 2);
    const hlLensGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 24);
    hlLensGeo.rotateX(Math.PI / 2);

    [-0.92, -0.66, 0.66, 0.92].forEach((xPos) => {
      const bezel = new THREE.Mesh(hlBezelGeo, brushedChromeMat);
      bezel.position.set(xPos, 0.58, 2.23);
      chassisGroup.add(bezel);

      const lens = new THREE.Mesh(hlLensGeo, headlightMat);
      lens.position.set(xPos, 0.58, 2.25);
      chassisGroup.add(lens);
    });

    // Wrap-Around Chrome Front Bumper with Dual Upright Bumperettes
    const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.14, 0.18), brushedChromeMat);
    frontBumper.position.set(0, 0.36, 2.26);
    frontBumper.castShadow = true;
    chassisGroup.add(frontBumper);

    // Dual Bumperettes (Upright Bumper Guards)
    [-0.42, 0.42].forEach((bx) => {
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.16), brushedChromeMat);
      guard.position.set(bx, 0.44, 2.32);
      chassisGroup.add(guard);
    });

    // Dual Chrome Bullet Side Mirrors
    [-1.16, 1.16].forEach((mx) => {
      const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), brushedChromeMat);
      mirrorArm.rotation.z = mx > 0 ? -0.4 : 0.4;
      mirrorArm.position.set(mx, 0.88, 0.35);
      chassisGroup.add(mirrorArm);

      const mirrorHead = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 16), brushedChromeMat);
      mirrorHead.position.set(mx > 0 ? mx + 0.04 : mx - 0.04, 0.93, 0.35);
      chassisGroup.add(mirrorHead);
    });

    // 4 Dayton Wire Spoke Wheels with Whitewall Radial Tires
    const wheelPositions: Array<[number, number, number]> = [
      [1.16, 0.34, 1.35],   // Front Right
      [-1.16, 0.34, 1.35],  // Front Left
      [1.16, 0.34, -1.35],  // Rear Right
      [-1.16, 0.34, -1.35], // Rear Left
    ];

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.1 });
    const whitewallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 });
    const tireGeo = new THREE.TorusGeometry(0.28, 0.09, 16, 32);
    const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.16, 24);
    rimGeo.rotateZ(Math.PI / 2);
    const whitewallGeo = new THREE.RingGeometry(0.19, 0.24, 32);
    whitewallGeo.rotateY(Math.PI / 2);

    const wheels: THREE.Group[] = [];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(wx, wy, wz);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.y = Math.PI / 2;
      wGroup.add(tire);

      const whitewall = new THREE.Mesh(whitewallGeo, whitewallMat);
      whitewall.position.x = wx > 0 ? 0.09 : -0.09;
      wGroup.add(whitewall);

      const rim = new THREE.Mesh(rimGeo, brushedChromeMat);
      wGroup.add(rim);

      // Gold 3-Prong Knockoff Spinner in Center
      const knockoff = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), brushedChromeMat);
      knockoff.rotation.z = wx > 0 ? -Math.PI / 2 : Math.PI / 2;
      knockoff.position.x = wx > 0 ? 0.12 : -0.12;
      wGroup.add(knockoff);

      lowriderGroup.add(wGroup);
      wheels.push(wGroup);
    });

    // =========================================================================
    // INSTANCED MESH: 36 Audio-Reactive Spectrum Columns
    // =========================================================================
    const BAR_COUNT = 36;
    const barGeo = new THREE.BoxGeometry(0.22, 1.0, 0.22);
    barGeo.translate(0, 0.5, 0);

    const barMat = new THREE.MeshPhysicalMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.85,
      metalness: 0.8,
      roughness: 0.2,
    });
    const instancedBars = new THREE.InstancedMesh(barGeo, barMat, BAR_COUNT);
    instancedBars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedBars);

    // =========================================================================
    // Animation Loop
    // =========================================================================
    const clock = new THREE.Clock();
    const freqBuffer = new Uint8Array(64);
    let animId = 0;

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Dynamic paint finish updates
      bodyPaintMat.color.setHex(stateRef.current.finish.color);
      bodyPaintMat.metalness = stateRef.current.finish.metalness;
      bodyPaintMat.roughness = stateRef.current.finish.roughness;

      // Spin platters synced to engine
      vinylLeft.rotation.y = -THREE.MathUtils.degToRad(engine.deckAState.rotationAngle);
      vinylRight.rotation.y = -THREE.MathUtils.degToRad(engine.deckBState.rotationAngle);

      // Move crossfader
      const targetCrossX = engine.crossfader * 0.22;
      crossfaderCap.position.x = THREE.MathUtils.damp(crossfaderCap.position.x, targetCrossX, 12, delta);

      // Audio analysis for hydraulic bounce
      let bassEnergy = 0;
      if (engine.masterAnalyser) {
        engine.masterAnalyser.getByteFrequencyData(freqBuffer);
        for (let b = 0; b < 8; b++) {
          bassEnergy += freqBuffer[b];
        }
        bassEnergy = bassEnergy / (8 * 255);
      }

      // Spectrum Bars
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

      // Realistic Lowrider Hydraulic Hop Animation on Chassis
      stateRef.current.hydraulicImpulse = THREE.MathUtils.damp(
        stateRef.current.hydraulicImpulse,
        0,
        3.5,
        delta
      );

      const totalBounce = bassEnergy * 0.32 + stateRef.current.hydraulicImpulse;
      chassisGroup.position.y = THREE.MathUtils.damp(chassisGroup.position.y, totalBounce, 12, delta);
      chassisGroup.rotation.x = THREE.MathUtils.damp(
        chassisGroup.rotation.x,
        -totalBounce * 0.28,
        10,
        delta
      );

      // Camera preset interpolation
      if (stateRef.current.cameraTransitionActive) {
        const targetP = stateRef.current.activeCamPreset.pos;
        const targetL = stateRef.current.activeCamPreset.look;
        _camTargetPos.set(...targetP);
        _camTargetLook.set(...targetL);

        camera.position.lerp(_camTargetPos, 0.08);
        controls.target.lerp(_camTargetLook, 0.08);

        if (camera.position.distanceTo(_camTargetPos) < 0.05) {
          stateRef.current.cameraTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [engine]);

  const selectCameraPreset = (preset: CameraPreset) => {
    setActiveCam(preset.id);
    stateRef.current.activeCamPreset = preset;
    stateRef.current.cameraTransitionActive = true;
  };

  const triggerHydraulicBounce = () => {
    stateRef.current.hydraulicImpulse = 0.65;
    engine.triggerSoundboard('lowrider_horn');
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-3xl border-2 border-white shadow-2xl bg-gradient-to-b from-rose-50/50 via-sky-50/50 to-white ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none h-screen w-screen' : 'h-[540px] sm:h-[620px]'
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div ref={canvasMountRef} className="w-full h-full block" />

      {/* Top Spec Card */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 px-3.5 py-2 rounded-2xl border-2 border-white bg-white/90 backdrop-blur-md shadow-lg text-slate-800">
        <img
          src={engine.customCoverUrl}
          alt="White Chocolate Studio"
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-xl object-cover border border-rose-300 shadow-sm"
        />
        <div>
          <div className="text-xs font-black text-slate-900 tracking-wide">
            1964 IMPALA LOWRIDER & DJ RIG
          </div>
          <div className="text-[10px] text-rose-600 font-mono font-bold tabular-nums">
            DECK A: {engine.deckAState.effectiveBpm} BPM · DECK B: {engine.deckBState.effectiveBpm} BPM
          </div>
        </div>
      </div>

      {/* Fullscreen Toggle */}
      {onToggleFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className={`absolute top-4 right-4 z-10 px-3.5 py-2 rounded-2xl border-2 ${
            isDark ? 'border-slate-800 bg-slate-900/90 text-slate-200 hover:text-white' : 'border-white bg-white/90 text-slate-700 hover:text-slate-900'
          } backdrop-blur-md text-xs font-bold shadow-lg flex items-center gap-1.5 transition-colors`}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen 3D'}</span>
        </button>
      )}

      {/* Collapsible Bottom Control Dock */}
      <div
        className="absolute left-1/2 -translate-x-1/2 z-10 transition-transform duration-200"
        style={{
          bottom: '16px',
          width: 'min(920px, 94vw)',
          transform: `translateX(-50%) translateY(${dockCollapsed ? 'calc(100% - 36px)' : '0px'})`,
        }}
      >
        <div className="flex justify-center mb-1.5">
          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className={`px-4 py-1.5 rounded-t-2xl border-2 border-b-0 ${
              isDark ? 'border-slate-800 bg-slate-900/95 text-slate-200 hover:text-white' : 'border-white bg-white/95 text-slate-700 hover:text-slate-900'
            } text-[11px] font-black flex items-center gap-1.5 shadow-md`}
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-rose-500" />
                <span>Show Stage Controls</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-rose-500" />
                <span>Hide Controls</span>
              </>
            )}
          </button>
        </div>

        <div className={`rounded-3xl border-2 ${
          isDark ? 'border-slate-800 bg-slate-900/95 text-slate-100 shadow-slate-950/50' : 'border-white bg-white/95 text-slate-800 shadow-2xl'
        } p-3.5 sm:p-4 space-y-3 backdrop-blur-md`}>
          {/* Row 1: Quick DJ Transport + Hop Hydraulics + Cruiser Diagnostics */}
          <div className={`flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  engine.playPauseDeck('A');
                  setHudTick((t) => t + 1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  engine.deckAState.isPlaying
                    ? 'bg-rose-500 text-white animate-pulse'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                }`}
              >
                {engine.deckAState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>Deck A</span>
              </button>

              <button
                onClick={() => {
                  engine.playPauseDeck('B');
                  setHudTick((t) => t + 1);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs ${
                  engine.deckBState.isPlaying
                    ? 'bg-sky-500 text-white animate-pulse'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                }`}
              >
                {engine.deckBState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>Deck B</span>
              </button>

              <button
                onClick={triggerHydraulicBounce}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-rose-400 text-white shadow-md active:scale-95 transition-all"
              >
                🚘 Hop Hydraulics!
              </button>

              {onOpenDiagnostics && (
                <button
                  onClick={onOpenDiagnostics}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  title="Open 1964 Impala OBD-II sensor diagnostics & route optimization AI"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Cruiser Telemetry & AI</span>
                </button>
              )}
            </div>

            {/* Crossfader */}
            <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-xs">
              <span className="text-[10px] font-black text-rose-500">A</span>
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
                className="crossfader-slider w-full h-4"
              />
              <span className="text-[10px] font-black text-sky-400">B</span>
            </div>
          </div>

          {/* Row 2: Camera Angles & Lowrider Finishes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center text-xs">
            {/* Camera Presets */}
            <div className="flex items-center gap-1 overflow-x-auto">
              <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectCameraPreset(preset)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 ${
                    activeCam === preset.id
                      ? 'bg-rose-500 text-white shadow-xs'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Paint Finishes */}
            <div className="flex items-center gap-1.5 justify-start md:justify-end overflow-x-auto">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mr-1" />
              {FINISH_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveFinish(p.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-colors whitespace-nowrap shrink-0 ${
                    activeFinish === p.id
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
