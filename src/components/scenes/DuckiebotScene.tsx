"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Detailed, stylized differential-drive robot (not the exact DB21J geometry), shown "on a showroom stage":
 * parts fly in and snap together on a hovering holo-platform, power on, the platform opens and the robot is
 * dropped onto the field, then the camera switches to the robot's view for a simulated lane-following run.
 * The controller is a simple pure-pursuit steering law over a procedurally generated course.
 * Everything here is a SIMULATION; it does not reproduce the project's real perception/control stack.
 */

export type Telemetry = { phase: string; v: number; steerDeg: number; offset: number; fov: number };

type Props = {
  cameraMode: "fp" | "tp";
  overlay: boolean;
  paused: boolean;
  slowmo: boolean;
  telemetry: React.MutableRefObject<Telemetry>;
  /** Post-processing + shadows (high quality tier only). */
  fx?: boolean;
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

/* ------------------------------ course ------------------------------ */

type Sample = { x: number; z: number; dx: number; dz: number };
const ROAD_HALF = 1.2;
const LANE_OFFSET = 0.6; // right-lane centre, to the right of the road centre line

function buildCenterline(): Sample[] {
  const out: Sample[] = [];
  const step = 0.2;
  const line = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      out.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, dx: (x1 - x0) / len, dz: (z1 - z0) / len });
    }
  };
  const arc = (cx: number, cz: number, r: number, a0: number, a1: number) => {
    const n = Math.max(2, Math.round((Math.abs(a1 - a0) * r) / step));
    const sgn = Math.sign(a1 - a0);
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), dx: -Math.sin(a) * sgn, dz: Math.cos(a) * sgn });
    }
  };
  line(-3, 0, 9, 0);
  arc(9, 6, 6, -Math.PI / 2, 0); // right bend: heading +x → +z
  line(15, 6, 15, 12);
  arc(21, 12, 6, Math.PI, Math.PI / 2); // left bend: heading +z → +x
  line(21, 18, 30, 18);
  out.push({ x: 30, z: 18, dx: 1, dz: 0 });
  return out;
}

function ribbon(cl: Sample[], offset: number, half: number, y: number, on = Infinity, off = 0) {
  const pos: number[] = [];
  const idx: number[] = [];
  let acc = 0;
  let run = 0;
  let inDash = true;
  let v = 0;
  const push = (s: Sample) => {
    const nx = -s.dz, nz = s.dx; // right normal
    const cx = s.x + nx * offset, cz = s.z + nz * offset;
    pos.push(cx - nx * half, y, cz - nz * half, cx + nx * half, y, cz + nz * half);
    v += 2;
  };
  let open = false;
  for (let i = 0; i < cl.length; i++) {
    if (i > 0) acc += Math.hypot(cl[i].x - cl[i - 1].x, cl[i].z - cl[i - 1].z);
    if (on !== Infinity) {
      run = acc % (on + off);
      inDash = run < on;
    }
    if (inDash) {
      push(cl[i]);
      if (open) {
        const b = v - 2;
        idx.push(b - 2, b - 1, b, b - 1, b + 1, b);
      }
      open = true;
    } else open = false;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const uv: number[] = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] * 0.7, pos[i + 2] * 0.7);
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ------------------------------ assets ------------------------------ */

const rbCache = new Map<string, THREE.BufferGeometry>();
/** Cached rounded box (width, height, depth, corner radius). */
function rb(w: number, h: number, d: number, r = 0.008) {
  const k = `${w}|${h}|${d}|${r}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, Math.min(w, h, d) / 2 - 0.0005));
    rbCache.set(k, g);
  }
  return g;
}

function noiseTexture(size: number, strength: number, repeat: number, seed = 3) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  let a = seed;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (rnd() - 0.5) * strength;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  return t;
}

function treadTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 8;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, 512, 8);
  g.fillStyle = "#202020";
  for (let i = 0; i < 40; i++) g.fillRect((i / 40) * 512, 0, 512 / 40 * 0.42, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function holoStripes() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = "rgba(255,255,255,0.9)";
  for (let y = 0; y < 128; y += 8) g.fillRect(0, y, 128, 1.5);
  for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 1.5, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 3);
  return t;
}

let _assets: ReturnType<typeof makeAssets> | null = null;
const assets = () => (_assets ??= makeAssets());

function makeAssets() {
  const P = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const asphalt = noiseTexture(256, 70, 1);
  const tread = treadTexture();
  const mats = {
    chassis: P({ color: "#101114", roughness: 0.42, metalness: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.35 }),
    blue: P({ color: "#1536d6", roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.25 }),
    yellow: P({ color: "#f2cf1a", roughness: 0.35, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    tire: P({ color: "#0b0b0c", roughness: 0.92, metalness: 0, bumpMap: tread, bumpScale: 2.2 }),
    alu: P({ color: "#c3c8d0", roughness: 0.28, metalness: 1 }),
    steel: P({ color: "#8c9199", roughness: 0.38, metalness: 1 }),
    copper: P({ color: "#b8733a", roughness: 0.35, metalness: 1 }),
    pcb: P({ color: "#0a4a35", roughness: 0.45, metalness: 0.05, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
    black: P({ color: "#08090b", roughness: 0.6, metalness: 0.1 }),
    battery: P({ color: "#1b1f25", roughness: 0.48, metalness: 0.3, clearcoat: 0.3 }),
    glass: P({ color: "#04070d", roughness: 0.04, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.03 }),
    gold: P({ color: "#d4a640", roughness: 0.3, metalness: 1 }),
    duck: P({ color: "#ffd21f", roughness: 0.3, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.15 }),
    beak: P({ color: "#ff8a1e", roughness: 0.35, clearcoat: 0.6 }),
    eye: P({ color: "#050505", roughness: 0.1, clearcoat: 1 }),
    ledWhite: new THREE.MeshStandardMaterial({ color: "#e8f6ff", emissive: "#bfe8ff", emissiveIntensity: 0 }),
    ledRed: new THREE.MeshStandardMaterial({ color: "#ff4d4d", emissive: "#ff2a2a", emissiveIntensity: 0 }),
    underglow: new THREE.MeshStandardMaterial({ color: "#062a2a", emissive: "#19e6d8", emissiveIntensity: 0 }),
    road: P({ color: "#262a31", roughness: 0.92, metalness: 0, bumpMap: asphalt, bumpScale: 0.8 }),
    floor: P({ color: "#0f1217", roughness: 0.85, metalness: 0.1 }),
    tapeW: P({ color: "#e9edf2", roughness: 0.55, clearcoat: 0.3 }),
    tapeY: P({ color: "#f5c400", roughness: 0.55, clearcoat: 0.3 }),
    stage: P({ color: "#0d1219", roughness: 0.25, metalness: 0.85, clearcoat: 0.6 }),
    holoRing: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.8, 1.7), toneMapped: false, transparent: true }),
    holoWall: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.15, 1.2, 1.2), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, map: holoStripes() }),
    scan: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 2.2, 2.0), toneMapped: false, transparent: true, opacity: 0, depthWrite: false }),
    shock: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.8, 1.7), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    zone: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.5, 1.4), toneMapped: false, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  };

  // Wheel: tyre cross-section as a superellipse lathe, axis along +z.
  const tp: THREE.Vector2[] = [];
  for (let i = 0; i <= 36; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 36;
    tp.push(new THREE.Vector2(0.092 + 0.048 * Math.pow(Math.max(0, Math.cos(a)), 0.42), 0.036 * Math.sin(a)));
  }
  const tire = new THREE.LatheGeometry(tp, 160);
  tire.rotateX(Math.PI / 2);
  const rim = new THREE.LatheGeometry(
    [[0.03, 0.03], [0.05, 0.034], [0.082, 0.03], [0.092, 0.022], [0.092, -0.022], [0.082, -0.03], [0.05, -0.034], [0.03, -0.03]].map(([x, y]) => new THREE.Vector2(x, y)),
    96,
  );
  rim.rotateX(Math.PI / 2);
  const cap = new THREE.LatheGeometry(
    [[0, 0.05], [0.012, 0.05], [0.026, 0.046], [0.03, 0.035], [0.03, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)),
    48,
  );
  cap.rotateX(Math.PI / 2);

  // Chassis plate: rounded outline with mounting holes and wheel-well notches.
  const sh = new THREE.Shape();
  const W = 0.46, D = 0.29, R = 0.07;
  sh.moveTo(-W + R, -D);
  sh.lineTo(W - R, -D); sh.quadraticCurveTo(W, -D, W, -D + R);
  sh.lineTo(W, D - R); sh.quadraticCurveTo(W, D, W - R, D);
  sh.lineTo(-W + R, D); sh.quadraticCurveTo(-W, D, -W, D - R);
  sh.lineTo(-W, -D + R); sh.quadraticCurveTo(-W, -D, -W + R, -D);
  const hole = (x: number, z: number, r: number) => { const h = new THREE.Path(); h.absarc(x, z, r, 0, Math.PI * 2, true); sh.holes.push(h); };
  for (const x of [-0.36, -0.12, 0.12, 0.34]) for (const z of [-0.2, 0.2]) hole(x, z, 0.018);
  for (const x of [-0.2, 0, 0.2]) hole(x, 0, 0.03);
  hole(0.38, 0, 0.022);
  const plate = new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 18 });
  plate.rotateX(-Math.PI / 2);
  plate.translate(0, 0.0, 0);
  plate.computeVertexNormals();

  // Black power/USB cables looping out of the right side
  const cable = (pts: number[][], r = 0.011) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, "catmullrom", 0.5), 64, r, 10, false);
  const cables = [
    cable([[-0.2, 0.44, 0.22], [-0.38, 0.5, 0.3], [-0.5, 0.42, 0.34], [-0.46, 0.3, 0.33], [-0.3, 0.22, 0.31]]),
    cable([[-0.1, 0.46, 0.25], [-0.3, 0.55, 0.34], [-0.44, 0.5, 0.4], [-0.4, 0.36, 0.38]], 0.009),
  ];

  const fin = rb(0.24, 0.07, 0.011, 0.002);

  return { mats, tire, rim, cap, plate, cables, fin, tread, asphalt };
}

/* ------------------------------ robot parts ------------------------------ */

const PARTS = [
  { id: "chassis", from: [0, 2.2, 0], rot: [0.9, 2.4, 0.3] },
  { id: "wheelL", from: [-0.2, 0.6, -2.6], rot: [0, 3.2, 0.4] },
  { id: "wheelR", from: [-0.2, 0.9, 2.6], rot: [0, -3.2, -0.4] },
  { id: "motors", from: [1.4, 1.0, -0.2], rot: [0.6, 1.8, 0.4] },
  { id: "battery", from: [-2.2, 1.4, 0.4], rot: [0.5, -2.2, 0.2] },
  { id: "board", from: [0.2, 2.8, 0.3], rot: [-0.7, 2.0, 0.2] },
  { id: "camera", from: [2.6, 0.9, 0.2], rot: [0.2, 2.4, 0.7] },
  { id: "shell", from: [-1.0, 1.6, 1.8], rot: [0.3, -1.6, 0.5] },
  { id: "leds", from: [1.0, 2.2, 1.4], rot: [0.6, 0, 0.8] },
  { id: "duck", from: [0, 3.4, 0], rot: [1.2, 6.0, -0.5] },
] as const;

type PartProps = { id: string; ledMat: React.MutableRefObject<THREE.MeshStandardMaterial[]>; yawRef: React.RefObject<THREE.Group | null> };

function Wheel({ side }: { side: -1 | 1 }) {
  const A = assets();
  const spokes = [0, 1, 2, 3, 4];
  return (
    <group position={[-0.05, 0.161, side * 0.345]} name={side < 0 ? "wheelL" : "wheelR"} scale={[1.15, 1.15, side]}>
      <mesh geometry={A.tire} material={A.mats.tire} castShadow receiveShadow />
      <mesh geometry={A.rim} material={A.mats.yellow} castShadow />
      {spokes.map((i) => (
        <group key={`s${i}`} rotation={[0, 0, (i / 5) * Math.PI * 2]}>
          <mesh position={[0.055, 0, 0.012]} castShadow>
            <primitive object={rb(0.075, 0.03, 0.014, 0.005)} attach="geometry" />
            <primitive object={A.mats.yellow} attach="material" />
          </mesh>
        </group>
      ))}
      <mesh geometry={A.cap} material={A.mats.yellow} castShadow />
      {spokes.map((i) => (
        <mesh key={`b${i}`} position={[Math.cos((i / 5) * Math.PI * 2 + 0.3) * 0.045, Math.sin((i / 5) * Math.PI * 2 + 0.3) * 0.045, 0.036]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.008, 6]} />
          <primitive object={A.mats.steel} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function Duck() {
  const A = assets().mats;
  return (
    <group position={[0.02, 0.485, 0]} scale={1.25}>
      <mesh position={[0, 0.055, 0]} scale={[1.2, 0.84, 0.95]} material={A.duck} castShadow><sphereGeometry args={[0.07, 48, 32]} /></mesh>
      <mesh position={[0.055, 0.135, 0]} material={A.duck} castShadow><sphereGeometry args={[0.046, 40, 28]} /></mesh>
      <mesh position={[0.1, 0.125, 0]} scale={[1.5, 0.55, 1.05]} material={A.beak} castShadow><sphereGeometry args={[0.02, 24, 16]} /></mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0.088, 0.147, s * 0.026]} material={A.eye}><sphereGeometry args={[0.0085, 16, 12]} /></mesh>
          <mesh position={[-0.01, 0.06, s * 0.066]} scale={[1.5, 0.8, 0.35]} rotation={[0, 0, 0.3]} material={A.duck} castShadow><sphereGeometry args={[0.038, 24, 16]} /></mesh>
        </group>
      ))}
      <mesh position={[-0.088, 0.085, 0]} rotation={[0, 0, 0.9]} material={A.duck} castShadow><coneGeometry args={[0.024, 0.06, 20]} /></mesh>
    </group>
  );
}

function PartMesh({ id, ledMat, yawRef }: PartProps) {
  const A = assets();
  const M = A.mats;
  const reg = (i: number) => (m: THREE.MeshStandardMaterial | null) => { if (m) ledMat.current[i] = m; };
  switch (id) {
    case "chassis":
      return (
        <>
          <mesh geometry={A.plate} material={M.blue} position={[0, 0.105, 0]} castShadow receiveShadow />
          {/* blue front plate, side plates and top deck */}
          <mesh position={[0.36, 0.29, 0]} castShadow><primitive object={rb(0.02, 0.38, 0.6, 0.006)} attach="geometry" /><primitive object={M.blue} attach="material" /></mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[-0.02, 0.28, s * 0.295]} castShadow><primitive object={rb(0.64, 0.34, 0.012, 0.005)} attach="geometry" /><primitive object={M.blue} attach="material" /></mesh>
          ))}
          <mesh position={[0.04, 0.48, 0]} castShadow receiveShadow><primitive object={rb(0.7, 0.02, 0.6, 0.01)} attach="geometry" /><primitive object={M.blue} attach="material" /></mesh>
          {A.cables.map((g, i) => <mesh key={i} geometry={g} material={M.black} castShadow />)}
          {/* caster */}
          <group position={[-0.37, 0, 0]}>
            <mesh position={[0, 0.085, 0]} castShadow><cylinderGeometry args={[0.034, 0.034, 0.03, 28]} /><primitive object={M.steel} attach="material" /></mesh>
            <mesh position={[0, 0.055, 0]} castShadow><sphereGeometry args={[0.04, 40, 28]} /><primitive object={M.alu} attach="material" /></mesh>
          </group>
        </>
      );
    case "wheelL":
      return <Wheel side={-1} />;
    case "wheelR":
      return <Wheel side={1} />;
    case "motors":
      return (
        <>
          {[-1, 1].map((s) => (
            <group key={s} position={[-0.05, 0.161, s * 0.22]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.046, 0.046, 0.13, 36]} /><primitive object={M.steel} attach="material" /></mesh>
              <mesh position={[0, 0, -s * 0.07]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.014, 32]} /><primitive object={M.copper} attach="material" /></mesh>
              <mesh position={[0, 0, s * 0.085]} castShadow><primitive object={rb(0.1, 0.09, 0.05, 0.01)} attach="geometry" /><primitive object={M.alu} attach="material" /></mesh>
              <mesh position={[0, 0, s * 0.12]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.009, 0.009, 0.05, 12]} /><primitive object={M.steel} attach="material" /></mesh>
            </group>
          ))}
        </>
      );
    case "battery":
      return (
        <group position={[-0.12, 0.2, 0]}>
          <mesh castShadow receiveShadow><primitive object={rb(0.44, 0.1, 0.3, 0.02)} attach="geometry" /><primitive object={M.battery} attach="material" /></mesh>
          <mesh position={[0, 0.0515, 0]}><primitive object={rb(0.3, 0.004, 0.18, 0.003)} attach="geometry" /><primitive object={M.black} attach="material" /></mesh>
          <mesh position={[0.2, 0.0, 0.153]}><primitive object={rb(0.05, 0.026, 0.008, 0.003)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
        </group>
      );
    case "board":
      return (
        <group position={[0.02, 0.31, 0]}>
          <mesh castShadow receiveShadow><primitive object={rb(0.46, 0.016, 0.34, 0.006)} attach="geometry" /><primitive object={M.pcb} attach="material" /></mesh>
          {/* heatsink */}
          <mesh position={[0, 0.019, 0]} castShadow><primitive object={rb(0.25, 0.02, 0.21, 0.004)} attach="geometry" /><primitive object={M.alu} attach="material" /></mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i} position={[0, 0.064, -0.095 + i * 0.0173]} castShadow geometry={A.fin} material={M.alu} />
          ))}
          {/* connectors */}
          {[-0.09, -0.02, 0.05].map((x, i) => (
            <mesh key={i} position={[x, 0.016, 0.158]} castShadow><primitive object={rb(0.06, 0.022, 0.034, 0.003)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
          ))}
          <mesh position={[-0.19, 0.016, -0.06]} castShadow><primitive object={rb(0.05, 0.034, 0.06, 0.004)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
          {Array.from({ length: 20 }, (_, i) => (
            <mesh key={i} position={[-0.19 + i * 0.0105, 0.017, -0.158]}><boxGeometry args={[0.004, 0.02, 0.004]} /><primitive object={M.gold} attach="material" /></mesh>
          ))}
          {[[-0.2, -0.12], [0.2, -0.12], [-0.2, 0.12], [0.2, 0.12]].map(([x, z], i) => (
            <mesh key={`h${i}`} position={[x, 0.01, z]}><cylinderGeometry args={[0.009, 0.009, 0.006, 6]} /><primitive object={M.steel} attach="material" /></mesh>
          ))}
        </group>
      );
    case "camera":
      return (
        <group position={[0.42, 0.34, 0]} ref={yawRef} rotation={[0, 0, -0.08]}>
          <mesh castShadow><primitive object={rb(0.075, 0.085, 0.12, 0.012)} attach="geometry" /><primitive object={M.black} attach="material" /></mesh>
          <mesh position={[-0.042, 0, 0]}><primitive object={rb(0.012, 0.08, 0.11, 0.003)} attach="geometry" /><primitive object={M.pcb} attach="material" /></mesh>
          <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.03, 0.034, 0.03, 40]} /><primitive object={M.steel} attach="material" /></mesh>
          <mesh position={[0.068, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.026, 0.012, 40]} /><primitive object={M.black} attach="material" /></mesh>
          <mesh position={[0.075, 0, 0]} scale={[0.5, 1, 1]}><sphereGeometry args={[0.019, 32, 24]} /><primitive object={M.glass} attach="material" /></mesh>
          {/* ribbon cable */}
          <mesh position={[-0.12, -0.02, 0]} castShadow><primitive object={rb(0.16, 0.004, 0.05, 0.001)} attach="geometry" /><primitive object={M.chassis} attach="material" /></mesh>
        </group>
      );
    case "shell":
      return (
        <group position={[0.4, 0.17, 0]}>
          {/* black front sensor board with header pins */}
          <mesh castShadow><primitive object={rb(0.018, 0.21, 0.16, 0.006)} attach="geometry" /><primitive object={M.black} attach="material" /></mesh>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[0.011, -0.085 + i * 0.024, -0.05]}><boxGeometry args={[0.004, 0.008, 0.008]} /><primitive object={M.gold} attach="material" /></mesh>
          ))}
          <mesh position={[0.016, 0.09, 0.04]} castShadow><primitive object={rb(0.016, 0.03, 0.04, 0.003)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
        </group>
      );
    case "leds":
      return (
        <>
          {[-0.19, 0.19].map((z, i) => (
            <mesh key={`f${z}`} position={[0.385, 0.16, z]}>
              <sphereGeometry args={[0.026, 24, 16]} />
              <meshStandardMaterial ref={reg(i)} color="#cfe0ff" emissive="#5a9bff" emissiveIntensity={0} />
            </mesh>
          ))}
          {[-0.19, 0.19].map((z, i) => (
            <mesh key={`r${z}`} position={[-0.455, 0.13, z]}>
              <primitive object={rb(0.012, 0.022, 0.05, 0.004)} attach="geometry" />
              <meshStandardMaterial ref={reg(2 + i)} color="#ff4d4d" emissive="#ff2a2a" emissiveIntensity={0} />
            </mesh>
          ))}
          <mesh position={[0, 0.078, 0]}>
            <primitive object={rb(0.78, 0.006, 0.46, 0.002)} attach="geometry" />
            <meshStandardMaterial ref={reg(4)} color="#06104a" emissive="#2a5cff" emissiveIntensity={0} />
          </mesh>
        </>
      );
    case "duck":
      return <Duck />;
    default:
      return null;
  }
}

/* ------------------------------ stage ------------------------------ */

function DashRing({ r, n, w, h, y, material }: { r: number; n: number; w: number; h: number; y: number; material: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      o.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      o.rotation.set(0, -a, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [r, n, y]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} material={material} frustumCulled={false}>
      <boxGeometry args={[w, 0.012, h]} />
    </instancedMesh>
  );
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.5;
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

/* ------------------------------ scene ------------------------------ */

const START = { x: 0.05, z: 0.3, th: -0.22 };
const HOVER = 1.3; // stage height above the field
const T_ASSEMBLE_END = 3.9;
const T_POWER_END = 4.9;
const T_DROP = 5.1;
const T_CAM = 6.4; // switch to driving camera
const T_DRIVE_START = 7.0;
const N_LINE = 26;

export default function DuckiebotScene({ cameraMode, overlay, paused, slowmo, telemetry, fx = false }: Props) {
  const A = assets();
  const cl = useMemo(buildCenterline, []);
  const roadGeo = useMemo(() => ribbon(cl, 0, ROAD_HALF, 0.004), [cl]);
  const edgeL = useMemo(() => ribbon(cl, -ROAD_HALF + 0.08, 0.035, 0.01), [cl]);
  const edgeR = useMemo(() => ribbon(cl, ROAD_HALF - 0.08, 0.035, 0.01), [cl]);
  const center = useMemo(() => ribbon(cl, 0, 0.035, 0.012, 0.45, 0.35), [cl]);
  const laneCenter = useMemo(() => cl.map((s) => ({ x: s.x - s.dz * LANE_OFFSET, z: s.z + s.dx * LANE_OFFSET })), [cl]);

  const robot = useRef<THREE.Group>(null);
  const partRefs = useRef<(THREE.Group | null)[]>([]);
  const yawRef = useRef<THREE.Group>(null);
  const camPart = useRef<THREE.Group | null>(null);
  const wheelL = useRef<THREE.Object3D | null>(null);
  const wheelR = useRef<THREE.Object3D | null>(null);
  const ledMat = useRef<THREE.MeshStandardMaterial[]>([]);
  const overlayGroup = useRef<THREE.Group>(null);

  const stage = useRef<THREE.Group>(null);
  const halfA = useRef<THREE.Mesh>(null);
  const halfB = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Group>(null);
  const ringB = useRef<THREE.Group>(null);
  const holo = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  const zone = useRef<THREE.Mesh>(null);
  const flash = useRef<THREE.PointLight>(null);
  const spot = useRef<THREE.SpotLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const keyTarget = useMemo(() => new THREE.Object3D(), []);
  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  const ov = useMemo(() => {
    const mkLine = (color: string, n = N_LINE) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    };
    return {
      leftB: mkLine("#39c4d8"),
      rightB: mkLine("#39c4d8"),
      mid: mkLine("#5dff9a"),
      fov: mkLine("#8b9bff", 3),
      arrow: new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.9, 0xff7a1a, 0.22, 0.14),
    };
  }, []);

  const sim = useRef({
    t: 0,
    x: START.x, z: START.z, th: START.th,
    y: HOVER, vy: 0, landed: false, landT: -1, bounced: false,
    v: 0, idx: 0, wheelAngle: 0, steer: 0, lastTele: 0, resetHold: 0,
  });
  const tmp = useMemo(
    () => ({
      camPos: new THREE.Vector3(), camLook: new THREE.Vector3(), look: new THREE.Vector3(),
      p: new THREE.Vector3(), q: new THREE.Vector3(), init: false,
    }),
    [],
  );

  useEffect(() => {
    return () => { roadGeo.dispose(); edgeL.dispose(); edgeR.dispose(); center.dispose(); };
  }, [roadGeo, edgeL, edgeR, center]);

  useLayoutEffect(() => {
    if (key.current) key.current.target = keyTarget;
    if (spot.current) spot.current.target = spotTarget;
  }, [keyTarget, spotTarget]);

  useFrame((state, dtRaw) => {
    const dtReal = Math.min(dtRaw, 0.05);
    const dt = paused ? 0 : dtReal * (slowmo ? 0.35 : 1);
    const S = sim.current;
    const cam = state.camera as THREE.PerspectiveCamera;
    const r = robot.current;
    if (!r) return;

    S.t += dt;
    const t = S.t;

    /* assembly: parts spiral in from the stage edge and snap into place */
    PARTS.forEach((p, i) => {
      const g = partRefs.current[i];
      if (!g) return;
      const k = easeOutCubic(clamp01((t - 0.2 - i * 0.3) / 1.0));
      g.position.set(p.from[0] * (1 - k), p.from[1] * (1 - k), p.from[2] * (1 - k));
      g.rotation.set(p.rot[0] * (1 - k), p.rot[1] * (1 - k), p.rot[2] * (1 - k));
      g.visible = t > 0.2 + i * 0.3 - 0.02;
    });

    /* power-on */
    const power = easeInOut(clamp01((t - T_ASSEMBLE_END) / 0.9));
    ledMat.current.forEach((m, i) => { if (m) m.emissiveIntensity = power * (i < 2 ? 2.8 : i < 4 ? 2.4 : 1.5); });
    if (yawRef.current) yawRef.current.rotation.y = Math.PI * (1 - power);
    const calib = t > T_ASSEMBLE_END && t < T_POWER_END ? Math.sin(((t - T_ASSEMBLE_END) / 1.0) * Math.PI) * 0.9 : 0;

    /* drop physics: platform opens, robot falls, bounces once, shockwave */
    const opening = easeInOut(clamp01((t - T_DROP + 0.25) / 0.45));
    if (t >= T_DROP && !S.landed) {
      S.vy -= 9.5 * dt;
      S.y += S.vy * dt;
      if (S.y <= 0) {
        S.y = 0;
        if (!S.bounced) { S.vy = -S.vy * 0.26; S.bounced = true; S.landT = t; }
        else { S.vy = 0; S.landed = true; }
      }
    }
    const hoverBob = t < T_DROP ? Math.sin(t * 2.2) * 0.012 : 0;
    const squash = S.landT > 0 ? Math.exp(-(t - S.landT) * 9) * Math.sin((t - S.landT) * 26) * 0.012 : 0;
    const ry = S.landed || t >= T_DROP ? S.y : HOVER + hoverBob;

    /* driving: pure pursuit toward a lookahead point on the lane centre */
    let steerDeg = S.steer;
    let offset = 0;
    if (t > T_DRIVE_START) {
      const vTarget = Math.min(1.1, (t - T_DRIVE_START) * 0.8);
      S.v += (vTarget - S.v) * damp(3, dt);

      let best = S.idx, bd = Infinity;
      for (let i = Math.max(0, S.idx - 4); i < Math.min(laneCenter.length, S.idx + 30); i++) {
        const d = (laneCenter[i].x - S.x) ** 2 + (laneCenter[i].z - S.z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      S.idx = best;
      const la = laneCenter[Math.min(laneCenter.length - 1, best + 5)];
      const ang = Math.atan2(la.z - S.z, la.x - S.x);
      let alpha = ang - S.th;
      alpha = Math.atan2(Math.sin(alpha), Math.cos(alpha));
      const ld = Math.max(0.4, Math.hypot(la.x - S.x, la.z - S.z));
      const delta = Math.max(-0.6, Math.min(0.6, Math.atan((2 * 0.5 * Math.sin(alpha)) / ld)));
      S.steer = delta;
      S.th += (S.v / 0.5) * Math.tan(delta) * dt;
      S.x += Math.cos(S.th) * S.v * dt;
      S.z += Math.sin(S.th) * S.v * dt;
      S.wheelAngle += (S.v / 0.14) * dt;

      const c = laneCenter[best];
      const nx = -cl[best].dz, nz = cl[best].dx;
      offset = (S.x - c.x) * nx + (S.z - c.z) * nz;
      steerDeg = (delta * 180) / Math.PI;

      if (best >= laneCenter.length - 3) {
        S.resetHold += dt;
        S.v *= 0.9;
        if (S.resetHold > 1.2) { S.x = START.x; S.z = START.z; S.th = START.th; S.idx = 0; S.resetHold = 0; S.v = 0; }
      }
    }

    r.position.set(S.x, ry, S.z);
    // slow turntable on the stage while assembling, easing back to the start heading before the drop
    const turn = t < T_DROP ? Math.sin(Math.min(t, T_DROP) / T_DROP * Math.PI * 0.5) * 0 + (1 - easeInOut(clamp01((t - 3.4) / 1.4))) * (t * 0.6) : 0;
    r.rotation.y = -S.th + turn;
    r.scale.set(1 + squash * 2, 1 - squash * 4, 1 + squash * 2);
    if (!wheelL.current) wheelL.current = r.getObjectByName("wheelL") ?? null;
    if (!wheelR.current) wheelR.current = r.getObjectByName("wheelR") ?? null;
    if (!camPart.current) camPart.current = yawRef.current?.parent as THREE.Group | null;
    const spin = S.wheelAngle + calib;
    if (wheelL.current) wheelL.current.rotation.z = -spin;
    if (wheelR.current) wheelR.current.rotation.z = spin;

    /* stage: platform, rotating rings, hologram wall, scan sweep, ground marker, shockwave */
    if (stage.current) {
      stage.current.position.set(START.x, HOVER - 0.05, START.z);
      stage.current.visible = t < T_DROP + 1.6;
      const fade = 1 - easeInOut(clamp01((t - T_DROP - 0.5) / 1.0));
      stage.current.scale.setScalar(Math.max(0.001, fade));
    }
    if (halfA.current && halfB.current) {
      halfA.current.position.z = -opening * 1.25;
      halfB.current.position.z = opening * 1.25;
    }
    if (ringA.current) ringA.current.rotation.y = t * 0.9;
    if (ringB.current) ringB.current.rotation.y = -t * 0.5;
    const assembleK = clamp01(t / T_ASSEMBLE_END);
    A.mats.holoWall.opacity = 0.16 * Math.sin(Math.min(1, assembleK * 1.2) * Math.PI) * (t < T_DROP ? 1 : 0);
    A.mats.holoWall.map!.offset.y = -t * 0.25;
    A.mats.holoRing.opacity = 0.9;
    if (holo.current) holo.current.rotation.y = t * 0.3;
    if (scan.current) {
      const k = clamp01((t - T_ASSEMBLE_END + 0.2) / 0.9);
      scan.current.position.y = HOVER + 0.02 + k * 0.62;
      A.mats.scan.opacity = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.95 : 0;
      scan.current.position.x = START.x; scan.current.position.z = START.z;
      scan.current.visible = t < T_DROP;
    }
    if (zone.current) {
      A.mats.zone.opacity = t < T_DROP + 1.2 ? (0.25 + 0.15 * Math.sin(t * 5)) * (1 - clamp01((t - T_DROP - 0.6) / 0.6)) * clamp01(t / 1.2) : 0;
    }
    if (shock.current) {
      const k = S.landT > 0 ? clamp01((t - S.landT) / 1.0) : 0;
      shock.current.scale.setScalar(0.3 + k * 3.2);
      A.mats.shock.opacity = S.landT > 0 ? (1 - k) * 0.85 : 0;
    }
    if (flash.current) flash.current.intensity = S.landT > 0 ? 40 * Math.exp(-(t - S.landT) * 9) : 0;

    /* lights follow the robot so the shadow map stays tight */
    if (key.current) {
      key.current.position.set(S.x + 4.5, 8, S.z + 3.5);
      keyTarget.position.set(S.x, 0, S.z);
      keyTarget.updateMatrixWorld();
    }
    if (spot.current) {
      spot.current.position.set(START.x, HOVER + 3.4, START.z);
      spotTarget.position.set(START.x, HOVER, START.z);
      spotTarget.updateMatrixWorld();
      spot.current.intensity = t < T_DROP + 0.3 ? 90 : Math.max(0, 90 * (1 - (t - T_DROP - 0.3) / 0.5));
    }

    /* camera */
    const drivingCam = t > T_CAM;
    const fov = drivingCam && cameraMode === "fp" ? 70 : 40;
    if (t < T_DROP - 0.4) {
      const a = 0.7 + t * 0.32;
      tmp.camPos.set(START.x + Math.cos(a) * 2.5, HOVER + 0.55 + Math.sin(t * 0.5) * 0.1, START.z + Math.sin(a) * 2.5);
      tmp.camLook.set(START.x, HOVER + 0.12, START.z);
    } else if (!drivingCam) {
      tmp.camPos.set(START.x + 2.3, 0.85, START.z + 2.6);
      tmp.camLook.set(START.x, 0.25 + Math.max(0, S.y) * 0.5, START.z);
    } else if (cameraMode === "fp") {
      tmp.camPos.copy(r.localToWorld(tmp.p.set(0.52, 0.34, 0)));
      tmp.camLook.copy(r.localToWorld(tmp.q.set(3, 0.12, 0)));
    } else {
      tmp.camPos.copy(r.localToWorld(tmp.p.set(-2.6, 1.5, 0.5)));
      tmp.camLook.copy(r.localToWorld(tmp.q.set(1.2, 0.1, 0)));
    }
    if (!tmp.init) { cam.position.copy(tmp.camPos); tmp.look.copy(tmp.camLook); tmp.init = true; }
    const f = damp(drivingCam && cameraMode === "fp" && t > T_DRIVE_START ? 14 : 3.2, dtReal);
    cam.position.lerp(tmp.camPos, f);
    tmp.look.lerp(tmp.camLook, f);
    cam.lookAt(tmp.look);
    if (Math.abs(cam.fov - fov) > 0.05) {
      cam.fov += (fov - cam.fov) * damp(4, dtReal);
      cam.updateProjectionMatrix();
    }
    if (camPart.current) camPart.current.visible = !(drivingCam && cameraMode === "fp");

    /* overlay geometry: what a lane detector would "see" (simulated) */
    if (overlayGroup.current?.visible) {
      const set = (line: THREE.Line, pts: (i: number) => [number, number], n: number) => {
        const a = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let k = 0; k < n; k++) {
          const [x, z] = pts(k);
          a.setXYZ(k, x, 0.03, z);
        }
        a.needsUpdate = true;
      };
      const base = Math.min(S.idx, cl.length - 1);
      const at = (k: number) => cl[Math.min(cl.length - 1, base + k)];
      set(ov.leftB, (k) => [at(k).x, at(k).z], N_LINE);
      set(ov.rightB, (k) => { const s = at(k); return [s.x - s.dz * (ROAD_HALF - 0.08), s.z + s.dx * (ROAD_HALF - 0.08)]; }, N_LINE);
      set(ov.mid, (k) => { const s = at(k); return [s.x - s.dz * LANE_OFFSET, s.z + s.dx * LANE_OFFSET]; }, N_LINE);
      const cp = r.localToWorld(tmp.p.set(0.46, 0, 0));
      const half = (70 / 2) * (Math.PI / 180);
      set(ov.fov, (k) => {
        if (k === 1) return [cp.x, cp.z];
        const a = S.th + (k === 0 ? -half : half);
        return [cp.x + Math.cos(a) * 3, cp.z + Math.sin(a) * 3];
      }, 3);
      const sd = S.th + S.steer;
      ov.arrow.position.set(cp.x, 0.05, cp.z);
      ov.arrow.setDirection(tmp.q.set(Math.cos(sd), 0, Math.sin(sd)));
    }

    /* telemetry for the HUD (throttled) */
    const now = state.clock.elapsedTime;
    if (now - S.lastTele > 0.1) {
      S.lastTele = now;
      telemetry.current = {
        phase: t < T_ASSEMBLE_END ? "Assembling on stage" : t < T_DROP ? "Power-on" : t < T_CAM ? "Deploying to the field" : t < T_DRIVE_START ? "Switching to camera view" : "Lane following (simulated)",
        v: S.v,
        steerDeg,
        offset,
        fov: Math.round(cam.fov),
      };
    }
  });

  useEffect(() => {
    if (overlayGroup.current) overlayGroup.current.visible = overlay;
  }, [overlay]);

  const M = A.mats;

  return (
    <>
      <color attach="background" args={["#07080b"]} />
      <fog attach="fog" args={["#07080b", 10, 38]} />
      <Env />
      <ambientLight intensity={0.22} color="#b8c6d8" />
      <directionalLight
        ref={key}
        intensity={2.1}
        color="#fff1e0"
        castShadow={fx}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-bias={-0.0003}
        shadow-normalBias={0.015}
      />
      <primitive object={keyTarget} />
      <directionalLight position={[-6, 3, -8]} intensity={0.9} color="#4fd8d0" />
      <spotLight ref={spot} angle={0.5} penumbra={0.8} color="#bfe9ff" intensity={90} distance={14} decay={2} castShadow={fx} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      <primitive object={spotTarget} />
      <pointLight ref={flash} position={[START.x, 0.25, START.z]} color="#4fe8dc" intensity={0} distance={5} decay={2} />

      {/* field */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[15, -0.01, 9]} receiveShadow material={M.floor}><planeGeometry args={[160, 160]} /></mesh>
      <gridHelper args={[120, 120, "#1b2027", "#141920"]} position={[15, -0.005, 9]} />
      <mesh geometry={roadGeo} receiveShadow material={M.road} />
      <mesh geometry={edgeL} receiveShadow material={M.tapeW} />
      <mesh geometry={edgeR} receiveShadow material={M.tapeW} />
      <mesh geometry={center} receiveShadow material={M.tapeY} />

      {/* ground marker + shockwave at the drop point */}
      <mesh ref={zone} rotation={[-Math.PI / 2, 0, 0]} position={[START.x, 0.02, START.z]} material={M.zone}>
        <ringGeometry args={[1.0, 1.08, 96]} />
      </mesh>
      <mesh ref={shock} rotation={[-Math.PI / 2, 0, 0]} position={[START.x, 0.025, START.z]} material={M.shock}>
        <ringGeometry args={[0.9, 1.0, 96]} />
      </mesh>

      {/* hover stage */}
      <group ref={stage}>
        <mesh ref={halfA} castShadow receiveShadow material={M.stage} rotation={[0, Math.PI / 2, 0]}>
          <cylinderGeometry args={[1.1, 1.18, 0.07, 96, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh ref={halfB} castShadow receiveShadow material={M.stage} rotation={[0, -Math.PI / 2, 0]}>
          <cylinderGeometry args={[1.1, 1.18, 0.07, 96, 1, false, 0, Math.PI]} />
        </mesh>
        <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.holoRing}>
          <ringGeometry args={[1.02, 1.07, 128]} />
        </mesh>
        <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.holoRing}>
          <ringGeometry args={[0.62, 0.635, 128]} />
        </mesh>
        <group ref={ringA}><DashRing r={0.9} n={48} w={0.1} h={0.02} y={0.04} material={M.holoRing} /></group>
        <group ref={ringB}><DashRing r={0.78} n={32} w={0.14} h={0.012} y={0.04} material={M.holoRing} /></group>
        <mesh ref={holo} position={[0, 0.85, 0]} material={M.holoWall}>
          <cylinderGeometry args={[1.05, 1.05, 1.7, 96, 1, true]} />
        </mesh>
      </group>
      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]} material={M.scan} visible={false}>
        <ringGeometry args={[0.6, 0.625, 128]} />
      </mesh>

      <group ref={robot} position={[START.x, HOVER, START.z]}>
        {PARTS.map((p, i) => (
          <group key={p.id} ref={(g) => { partRefs.current[i] = g; }} visible={false}>
            <PartMesh id={p.id} ledMat={ledMat} yawRef={yawRef} />
          </group>
        ))}
      </group>

      <group ref={overlayGroup} visible={overlay}>
        <primitive object={ov.leftB} />
        <primitive object={ov.rightB} />
        <primitive object={ov.mid} />
        <primitive object={ov.fov} />
        <primitive object={ov.arrow} />
      </group>

      {fx && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={0.4} distanceFalloff={1} intensity={2.6} quality="medium" halfRes />
          <Bloom mipmapBlur luminanceThreshold={1.05} luminanceSmoothing={0.2} intensity={0.8} radius={0.65} />
          <Vignette eskil={false} offset={0.25} darkness={0.65} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}
