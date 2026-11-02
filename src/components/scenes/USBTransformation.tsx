"use client";

import * as THREE from "three";
import { asset } from "@/lib/asset";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * ID card → USB drive → inserted into a computer → screen boots.
 * Procedural, physically-based geometry (no model files): extruded PVC card with chip + foil, anodised USB
 * drive with a real plug (shroud, tongue, gold contacts), aluminium mini PC with a hollow USB-A port, a thin-bezel
 * monitor, keyboard, mouse and mug on a desk mat. Decorative text on the card/screen is canvas-drawn;
 * the actual profile content is HTML, shown after this scene finishes.
 */

type Props = { skip: boolean; onDone: () => void; fx?: boolean };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const eio = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (t: number, a: number, b: number) => eio(clamp01((t - a) / (b - a)));

// Timeline (seconds)
const T_FLOAT = 0.8, T_MORPH = 2.2, T_APPROACH = 3.1, T_INSERT = 4.0, T_SIGNAL = 4.8, T_SCREEN = 6.0;

const CAM_KEYS: { t: number; p: [number, number, number]; l: [number, number, number] }[] = [
  { t: 0, p: [0, 1.4, 7.4], l: [0, 1.3, 2.6] },
  { t: T_FLOAT, p: [0, 1.4, 7.0], l: [0, 1.3, 2.6] },
  { t: T_MORPH, p: [1.6, 1.3, 6.0], l: [-0.1, 1.0, 2.8] },
  { t: T_APPROACH, p: [0.6, 0.9, 4.6], l: [-0.8, 0.3, 3.0] },
  { t: T_INSERT, p: [0.2, 0.8, 3.4], l: [-0.8, 0.3, 1.2] },
  { t: T_SIGNAL, p: [0.0, 1.6, 5.4], l: [0, 1.2, 0] },
  { t: T_SCREEN, p: [0, 2.2, 3.0], l: [0, 2.2, -0.2] },
];

function cardTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 720;
  const g = c.getContext("2d")!;
  const bg = g.createLinearGradient(0, 0, 512, 720);
  bg.addColorStop(0, "#1b2733"); bg.addColorStop(1, "#0e141b");
  g.fillStyle = bg; g.fillRect(0, 0, 512, 720);
  g.strokeStyle = "rgba(66,217,209,.35)"; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    g.beginPath(); g.moveTo(0, 60 + i * 26); g.lineTo(120 + i * 18, 60 + i * 26); g.lineTo(150 + i * 18, 90 + i * 26); g.lineTo(250, 90 + i * 26); g.stroke();
  }
  g.fillStyle = "#42d9d1"; g.font = "600 22px monospace"; g.fillText("ACCESS · IDENTITY MODULE", 36, 48);
  g.fillStyle = "#0e141b"; g.fillRect(166, 170, 180, 220);
  g.strokeStyle = "#3a4654"; g.lineWidth = 2; g.strokeRect(166, 170, 180, 220);
  g.fillStyle = "#f3f5f7"; g.font = "700 44px sans-serif"; g.fillText("Siddharth Nori", 36, 530);
  g.fillStyle = "#a5afbd"; g.font = "28px sans-serif"; g.fillText("UC San Diego", 36, 575); g.fillText("B.S. Artificial Intelligence", 36, 612);
  g.fillStyle = "#6b7788"; g.font = "20px monospace"; g.fillText("UCSD · B.S. 2029 · M.S. 2030", 36, 680);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // Portrait: crop the face region of the photo into the frame once it loads.
  const img = new Image();
  img.onload = () => {
    const sw = img.width * 0.72, sh = sw * (220 / 180);
    g.drawImage(img, (img.width - sw) / 2, img.height * 0.08, sw, sh, 166, 170, 180, 220);
    g.strokeRect(166, 170, 180, 220);
    tex.needsUpdate = true;
  };
  img.src = asset("/img/siddharth.jpg");
  return tex;
}

function screenTexture(on: boolean) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 576;
  const g = c.getContext("2d")!;
  g.fillStyle = on ? "#0a1118" : "#040608"; g.fillRect(0, 0, 1024, 576);
  if (on) {
    g.fillStyle = "rgba(66,217,209,.08)";
    for (let y = 0; y < 576; y += 4) g.fillRect(0, y, 1024, 1);
    g.fillStyle = "#42d9d1"; g.font = "600 44px monospace"; g.textAlign = "center";
    g.fillText("IDENTITY LOADED: SIDDHARTH NORI", 512, 270);
    g.fillStyle = "#a5afbd"; g.font = "26px monospace";
    g.fillText("UC SAN DIEGO · COMPUTER SCIENCE / AI", 512, 322);
    g.strokeStyle = "#26313d"; g.strokeRect(312, 360, 400, 14);
    g.fillStyle = "#42d9d1"; g.fillRect(314, 362, 396, 10);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


/* ------------------------------ geometry & materials ------------------------------ */

const rbc = new Map<string, THREE.BufferGeometry>();
function rb(w: number, h: number, d: number, r = 0.02) {
  const k = `${w}|${h}|${d}|${r}`;
  let g = rbc.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, Math.min(w, h, d) / 2 - 0.0005)); rbc.set(k, g); }
  return g;
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function grain(size: number, strength: number, rx: number, ry: number, seed = 5) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  let a = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    a = (a * 1664525 + 1013904223) >>> 0;
    const v = 128 + ((a / 4294967296) - 0.5) * strength;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}

function logoTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 256, 256);
  g.fillStyle = "#42d9d1";
  g.font = "800 120px sans-serif";
  g.textAlign = "center";
  g.fillText("SN", 128, 150);
  g.fillStyle = "#a5afbd";
  g.font = "500 22px monospace";
  g.fillText("ID-KEY 3.2", 128, 200);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeKit() {
  const bump = grain(256, 40, 6, 6);
  const brushed = grain(512, 90, 1, 8, 11);
  const P = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
  const mats = {
    pvcSide: P({ color: "#10161d", roughness: 0.4, metalness: 0.2 }),
    anodised: P({ color: "#2b323d", roughness: 0.3, metalness: 1, clearcoat: 0.25, clearcoatRoughness: 0.3, bumpMap: brushed, bumpScale: 0.12 }),
    steel: P({ color: "#cfd4db", roughness: 0.22, metalness: 1, bumpMap: brushed, bumpScale: 0.05 }),
    gold: P({ color: "#d8aa44", roughness: 0.25, metalness: 1 }),
    black: P({ color: "#050608", roughness: 0.55, metalness: 0.1 }),
    tongue: P({ color: "#1f5be0", roughness: 0.5, metalness: 0.05 }),
    foil: P({ color: "#d9dde6", roughness: 0.18, metalness: 1, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600] }),
    pc: P({ color: "#2f3641", roughness: 0.4, metalness: 0.95, bumpMap: brushed, bumpScale: 0.1, clearcoat: 0.15 }),
    pcTop: P({ color: "#262c35", roughness: 0.45, metalness: 0.9, bumpMap: brushed, bumpScale: 0.1 }),
    rubber: P({ color: "#0a0b0d", roughness: 0.95 }),
    bezel: P({ color: "#0b0e13", roughness: 0.35, metalness: 0.6, clearcoat: 0.4 }),
    stand: P({ color: "#aab1bb", roughness: 0.3, metalness: 1, bumpMap: brushed, bumpScale: 0.06 }),
    glass: new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }),
    desk: P({ color: "#10141b", roughness: 0.5, metalness: 0.15, bumpMap: bump, bumpScale: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    mat: P({ color: "#171b22", roughness: 0.95, bumpMap: bump, bumpScale: 0.5 }),
    keyboard: P({ color: "#14181f", roughness: 0.5, metalness: 0.5 }),
    key: P({ color: "#ffffff", roughness: 0.55, metalness: 0.05, clearcoat: 0.2 }),
    mouse: P({ color: "#0e1117", roughness: 0.28, metalness: 0.4, clearcoat: 0.8 }),
    mug: P({ color: "#e9e4d8", roughness: 0.25, clearcoat: 0.9 }),
    coffee: P({ color: "#2a1a10", roughness: 0.15, clearcoat: 1 }),
    glow: new THREE.MeshStandardMaterial({ color: "#062a2a", emissive: "#19e6d8", emissiveIntensity: 1.6 }),
    flash: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 1.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    signal: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 3, 2.8), toneMapped: false }),
  };

  // card: extruded rounded plate with a lanyard slot
  const cs = roundedRect(2.2, 3.1, 0.16);
  const slot = roundedRect(0.5, 0.1, 0.05);
  const hole = new THREE.Path(slot.getPoints(12).map((p) => new THREE.Vector2(p.x, p.y + 1.33)));
  cs.holes.push(hole);
  const card = new THREE.ExtrudeGeometry(cs, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 10 });
  card.translate(0, 0, -0.025);

  // usb body: extruded rounded body with a lanyard hole
  const us = roundedRect(1.0, 1.9, 0.22);
  const uh = new THREE.Path();
  uh.absarc(0, 0.72, 0.1, 0, Math.PI * 2, true);
  us.holes.push(uh);
  const usb = new THREE.ExtrudeGeometry(us, { depth: 0.24, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 5, curveSegments: 20 });
  usb.translate(0, 0, -0.12);

  const mug = new THREE.LatheGeometry(
    [[0, 0], [0.34, 0], [0.37, 0.02], [0.37, 0.52], [0.355, 0.54], [0.33, 0.52], [0.33, 0.06], [0, 0.06]].map(([x, y]) => new THREE.Vector2(x, y)),
    64,
  );

  return { mats, card, usb, mug, bump };
}

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.45;
    return () => { scene.environment = null; rt.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
}

function Keys({ mat }: { mat: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    let i = 0;
    const cols = 14, rows = 5;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      o.position.set(-1.0 + c * 0.155, 0.06, -0.27 + r * 0.14);
      o.scale.set(r === 4 && c > 3 && c < 9 ? 1 : 1, 1, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      const accent = (r === 0 && c === 0) || (r === 2 && c === 13);
      m.setColorAt(i, col.set(accent ? "#2b8f8a" : r === 4 ? "#222831" : "#1a1f27"));
      i++;
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 70]} castShadow receiveShadow material={mat}>
      <primitive object={rb(0.135, 0.05, 0.12, 0.02)} attach="geometry" />
    </instancedMesh>
  );
}

export default function USBTransformation({ skip, onDone, fx = false }: Props) {
  const t = useRef(0);
  const done = useRef(false);
  const screenOn = useRef(false);

  const drive = useRef<THREE.Group>(null);
  const cardG = useRef<THREE.Group>(null);
  const usbG = useRef<THREE.Group>(null);
  const signal = useRef<THREE.Mesh>(null);
  const signalLight = useRef<THREE.PointLight>(null);
  const flash = useRef<THREE.Mesh>(null);
  const flashLight = useRef<THREE.PointLight>(null);
  const screenMat = useRef<THREE.MeshBasicMaterial>(null);
  const screenLight = useRef<THREE.PointLight>(null);
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const usbLed = useRef<THREE.MeshStandardMaterial>(null);

  const kit = useMemo(makeKit, []);
  const M = kit.mats;
  const cardTex = useMemo(() => cardTexture(), []);
  const logoTex = useMemo(() => logoTexture(), []);
  const offTex = useMemo(() => screenTexture(false), []);
  const onTex = useMemo(() => screenTexture(true), []);
  const cardMat = useMemo(() => {
    cardTex.repeat.set(1 / 2.2, 1 / 3.1);
    cardTex.offset.set(0.5, 0.5);
    cardTex.anisotropy = 8;
    return new THREE.MeshPhysicalMaterial({ map: cardTex, roughness: 0.35, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
  }, [cardTex]);
  useEffect(() => () => { cardTex.dispose(); offTex.dispose(); onTex.dispose(); logoTex.dispose(); }, [cardTex, offTex, onTex, logoTex]);

  const q = useMemo(() => {
    const q0 = new THREE.Quaternion();
    // Long axis (connector end, local -Y) → world -Z, label face (local +Z) → up.
    const q1 = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2));
    return { q0, q1, cur: new THREE.Quaternion(), tilt: new THREE.Quaternion(), axisY: new THREE.Vector3(0, 1, 0) };
  }, []);

  const path = useMemo(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.8, 0.3, 0.8), new THREE.Vector3(-0.8, 0.63, 0.5), new THREE.Vector3(0, 0.63, 0.1),
      new THREE.Vector3(0, 1.05, -0.05), new THREE.Vector3(0, 1.3, -0.12),
    ], false, "catmullrom", 0.2),
    [],
  );
  const pathPts = useMemo(() => path.getPoints(40).map((p) => [p.x, p.y, p.z] as [number, number, number]), [path]);

  const v = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), p: new THREE.Vector3(), l: new THREE.Vector3() }), []);

  useEffect(() => { if (skip) t.current = Math.max(t.current, T_SCREEN + 0.01); }, [skip]);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    t.current += dt;
    const tt = t.current;
    const cam = state.camera;

    /* camera along keyframes */
    let i = 0;
    while (i < CAM_KEYS.length - 2 && tt > CAM_KEYS[i + 1].t) i++;
    const A = CAM_KEYS[i], B = CAM_KEYS[i + 1];
    const k = eio(clamp01((tt - A.t) / (B.t - A.t)));
    v.p.set(...A.p).lerp(v.a.set(...B.p), k);
    v.l.set(...A.l).lerp(v.b.set(...B.l), k);
    cam.position.copy(v.p);
    cam.lookAt(v.l);

    /* card → USB: the card shrinks away in a flash while the drive grows in the same place */
    const m = seg(tt, T_FLOAT, T_MORPH);
    const g = drive.current;
    if (g) {
      const kc = eio(clamp01(m * 1.7));
      const ku = eio(clamp01((m - 0.35) / 0.65));
      cardG.current?.scale.setScalar(Math.max(0.001, 1 - kc));
      usbG.current?.scale.setScalar(Math.max(0.001, ku));
      if (cardG.current) cardG.current.visible = kc < 0.995;
      if (usbG.current) usbG.current.visible = ku > 0.002;
      g.scale.setScalar(1 + (0.45 - 1) * m);

      q.cur.slerpQuaternions(q.q0, q.q1, m);
      q.tilt.setFromAxisAngle(q.axisY, Math.sin(tt * 1.3) * 0.25 * (1 - m) + m * Math.PI * 2);
      g.quaternion.copy(q.tilt).multiply(q.cur);

      const a = seg(tt, T_MORPH, T_APPROACH);
      const ins = seg(tt, T_APPROACH, T_INSERT);
      const floatY = tt < T_MORPH ? Math.sin(tt * 1.6) * 0.05 : 0;
      g.position.set(-0.8 * a, 1.3 - 1.0 * a + floatY, 2.6 + 0.8 * a - (3.4 - 1.525) * ins);

      const pulse = Math.sin(clamp01(m) * Math.PI);
      if (flash.current) {
        flash.current.position.copy(g.position);
        flash.current.scale.setScalar(0.25 + pulse * 0.55);
        M.flash.opacity = pulse * 0.35;
      }
      if (flashLight.current) {
        flashLight.current.position.copy(g.position);
        flashLight.current.intensity = pulse * 25;
      }
    }

    /* signal travels from the port to the screen, then the screen boots */
    const sg = clamp01((tt - T_INSERT) / (T_SIGNAL - T_INSERT));
    if (signal.current) {
      path.getPoint(eio(sg), v.p);
      signal.current.position.copy(v.p);
      signal.current.visible = sg > 0 && sg < 1;
    }
    if (signalLight.current) {
      signalLight.current.position.copy(signal.current?.position ?? v.p);
      signalLight.current.intensity = sg > 0 && sg < 1 ? 6 : 0;
    }
    if (led.current) led.current.emissiveIntensity = tt > T_INSERT ? 2.4 : 0;
    if (usbLed.current) usbLed.current.emissiveIntensity = tt > T_INSERT ? 2.4 + Math.sin(tt * 12) * 0.8 : tt > T_MORPH ? 0.6 : 0;

    const on = tt > T_SIGNAL;
    if (screenMat.current && on !== screenOn.current) {
      screenOn.current = on;
      screenMat.current.map = on ? onTex : offTex;
      screenMat.current.color.setScalar(on ? 1.5 : 1);
      screenMat.current.needsUpdate = true;
    }
    if (screenLight.current) screenLight.current.intensity = on ? 12 : 0;

    if (tt > T_SCREEN && !done.current) {
      done.current = true;
      onDone();
    }
  });

  const vents = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const feet = useMemo<[number, number][]>(() => [[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.7], [1.1, 0.7]], []);

  return (
    <>
      <color attach="background" args={["#05070b"]} />
      <fog attach="fog" args={["#05070b", 11, 26]} />
      <Env />
      <ambientLight intensity={0.15} color="#aebccc" />
      <directionalLight
        position={[3, 7, 6]}
        intensity={2.2}
        color="#fff0de"
        castShadow={fx}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <pointLight position={[-4, 2, 4]} intensity={22} color="#6d85ff" distance={14} decay={2} />
      <pointLight position={[4, 1.6, -3]} intensity={14} color="#42d9d1" distance={12} decay={2} />
      <pointLight ref={signalLight} color="#42d9d1" distance={4} decay={2} intensity={0} />
      <pointLight ref={flashLight} color="#6ff3ea" distance={7} decay={2} intensity={0} />
      <pointLight ref={screenLight} position={[0, 2.0, 1.4]} color="#42d9d1" distance={7} decay={2} intensity={0} />

      {/* desk + mat */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={M.desk}><planeGeometry args={[40, 40]} /></mesh>
      <mesh position={[0.6, 0.006, 1.9]} receiveShadow material={M.mat}><primitive object={rb(6.4, 0.012, 3.2, 0.005)} attach="geometry" /></mesh>

      {/* mini PC */}
      <group position={[0, 0, 0.1]}>
        <mesh position={[0, 0.34, 0]} castShadow receiveShadow material={M.pc}><primitive object={rb(2.6, 0.56, 1.4, 0.1)} attach="geometry" /></mesh>
        <mesh position={[0, 0.625, 0]} castShadow receiveShadow material={M.pcTop}><primitive object={rb(2.4, 0.04, 1.2, 0.03)} attach="geometry" /></mesh>
        {vents.map((i) => (
          <group key={i}>
            <mesh position={[-1.05 + (i % 6) * 0.07, 0.648, -0.25 + Math.floor(i / 6) * 0.0]}><boxGeometry args={[0.03, 0.006, 0.7]} /><primitive object={M.black} attach="material" /></mesh>
          </group>
        ))}
        {vents.map((i) => (
          <mesh key={`r${i}`} position={[0.65 + (i % 6) * 0.07, 0.648, -0.25]}><boxGeometry args={[0.03, 0.006, 0.7]} /><primitive object={M.black} attach="material" /></mesh>
        ))}
        {/* front face details */}
        <mesh position={[0, 0.2, 0.703]}><primitive object={rb(2.2, 0.02, 0.01, 0.005)} attach="geometry" /><primitive object={M.black} attach="material" /></mesh>
        <mesh position={[0.9, 0.3, 0.705]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 0.02, 32]} /><primitive object={M.steel} attach="material" /></mesh>
        <mesh position={[0.9, 0.3, 0.717]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.07, 0.008, 12, 40]} /><meshStandardMaterial ref={led} color="#062a2a" emissive="#42d9d1" emissiveIntensity={0} /></mesh>
        {/* USB-A port: steel surround, dark cavity, blue tongue, gold contacts */}
        <group position={[-0.8, 0.3, 0.7]}>
          <mesh castShadow><primitive object={rb(0.46, 0.17, 0.05, 0.02)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
          <mesh position={[0, 0, 0.026]}><boxGeometry args={[0.4, 0.11, 0.004]} /><primitive object={M.black} attach="material" /></mesh>
          <mesh position={[0, -0.01, 0.026]}><boxGeometry args={[0.34, 0.02, 0.012]} /><primitive object={M.tongue} attach="material" /></mesh>
          {[-0.12, -0.04, 0.04, 0.12].map((x) => (
            <mesh key={x} position={[x, 0.002, 0.026]}><boxGeometry args={[0.03, 0.01, 0.014]} /><primitive object={M.gold} attach="material" /></mesh>
          ))}
        </group>
        <mesh position={[-0.35, 0.3, 0.705]}><primitive object={rb(0.2, 0.08, 0.02, 0.03)} attach="geometry" /><primitive object={M.black} attach="material" /></mesh>
        {feet.map(([x, z], i) => (
          <mesh key={i} position={[x, 0.02, z]}><cylinderGeometry args={[0.1, 0.11, 0.05, 24]} /><primitive object={M.rubber} attach="material" /></mesh>
        ))}
      </group>
      <Line points={pathPts} color="#42d9d1" lineWidth={1} transparent opacity={0.22} />

      {/* monitor */}
      <mesh position={[0, 0.84, -0.12]} castShadow material={M.stand}><primitive object={rb(0.4, 0.46, 0.12, 0.03)} attach="geometry" /></mesh>
      <mesh position={[0, 2.25, -0.2]} castShadow receiveShadow material={M.bezel}><primitive object={rb(4.2, 2.5, 0.1, 0.08)} attach="geometry" /></mesh>
      <mesh position={[0, 2.25, -0.3]} castShadow material={M.pcTop}><primitive object={rb(3.4, 1.9, 0.14, 0.12)} attach="geometry" /></mesh>
      <mesh position={[0, 2.25, -0.1495]}>
        <planeGeometry args={[4.0, 2.28]} />
        <meshBasicMaterial ref={screenMat} map={offTex} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.25, -0.146]} material={M.glass}><planeGeometry args={[4.0, 2.28]} /></mesh>
      <mesh position={[0, 3.4, -0.145]}><cylinderGeometry args={[0.022, 0.022, 0.01, 16]} /><primitive object={M.black} attach="material" /></mesh>

      {/* keyboard, mouse, mug */}
      <group position={[1.35, 0.012, 2.35]} rotation={[0, -0.1, 0]}>
        <mesh position={[0, 0.03, 0]} castShadow receiveShadow material={M.keyboard}><primitive object={rb(2.34, 0.06, 0.86, 0.05)} attach="geometry" /></mesh>
        <mesh position={[0, 0.012, 0]} material={M.glow}><primitive object={rb(2.4, 0.01, 0.9, 0.04)} attach="geometry" /></mesh>
        <Keys mat={M.key} />
      </group>
      <group position={[3.2, 0.012, 2.4]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 0.07, 0]} scale={[0.2, 0.1, 0.32]} castShadow material={M.mouse}><sphereGeometry args={[1, 40, 24]} /></mesh>
        <mesh position={[0, 0.15, -0.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.05, 16]} /><primitive object={M.glow} attach="material" /></mesh>
      </group>
      <group position={[-2.6, 0.012, 1.3]}>
        <mesh geometry={kit.mug} castShadow receiveShadow material={M.mug} />
        <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.coffee}><circleGeometry args={[0.33, 40]} /></mesh>
        <mesh position={[0.37, 0.28, 0]} castShadow material={M.mug}><torusGeometry args={[0.15, 0.04, 14, 32, Math.PI]} /></mesh>
      </group>

      {/* the ID card / USB drive */}
      <group ref={drive} position={[0, 1.3, 2.6]}>
        {/* card */}
        <group ref={cardG}>
          <mesh castShadow receiveShadow>
            <primitive object={kit.card} attach="geometry" />
            <primitive object={cardMat} attach="material" />
          </mesh>
          {/* contact chip */}
          <mesh position={[-0.7, 0.45, 0.04]}><primitive object={rb(0.34, 0.26, 0.012, 0.04)} attach="geometry" /><primitive object={M.gold} attach="material" /></mesh>
          {/* holographic foil */}
          <mesh position={[0.78, -0.3, 0.036]}><primitive object={rb(0.38, 0.7, 0.01, 0.03)} attach="geometry" /><primitive object={M.foil} attach="material" /></mesh>
        </group>
        {/* usb drive: anodised body, plug, label */}
        <group ref={usbG}>
          <mesh castShadow receiveShadow>
            <primitive object={kit.usb} attach="geometry" />
            <primitive object={M.anodised} attach="material" />
          </mesh>
          <mesh position={[0, 0.0, 0.172]}>
            <planeGeometry args={[0.7, 0.7]} />
            <meshBasicMaterial map={logoTex} transparent />
          </mesh>
          <mesh position={[0, -0.62, 0.17]}><primitive object={rb(0.14, 0.05, 0.02, 0.01)} attach="geometry" /><meshStandardMaterial ref={usbLed} color="#062a2a" emissive="#42d9d1" emissiveIntensity={0} /></mesh>
          {/* plug */}
          <group position={[0, -0.95, 0]}>
            <mesh position={[0, -0.4, 0]} castShadow><primitive object={rb(0.62, 0.86, 0.2, 0.03)} attach="geometry" /><primitive object={M.steel} attach="material" /></mesh>
            <mesh position={[0, -0.835, 0]}><boxGeometry args={[0.54, 0.006, 0.13]} /><primitive object={M.black} attach="material" /></mesh>
            <mesh position={[0, -0.84, -0.01]}><boxGeometry args={[0.44, 0.012, 0.045]} /><primitive object={M.tongue} attach="material" /></mesh>
            {[-0.15, -0.05, 0.05, 0.15].map((x) => (
              <mesh key={x} position={[x, -0.842, 0.016]}><boxGeometry args={[0.05, 0.012, 0.01]} /><primitive object={M.gold} attach="material" /></mesh>
            ))}
          </group>
        </group>
      </group>

      <mesh ref={flash} material={M.flash}><sphereGeometry args={[0.6, 32, 24]} /></mesh>
      <mesh ref={signal} visible={false} material={M.signal}><sphereGeometry args={[0.07, 24, 24]} /></mesh>

      {fx && (
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <N8AO aoRadius={0.5} distanceFalloff={1.2} intensity={2.6} quality="medium" halfRes />
          <Bloom mipmapBlur luminanceThreshold={1.0} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
          <Vignette eskil={false} offset={0.25} darkness={0.65} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </>
  );
}
