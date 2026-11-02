"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

/**
 * Living particle sphere.
 *  - Intro: ~3s, thousands of points fly in from the void and lock onto a sphere shell
 *    while wireframe rings and a core spin up.
 *  - Shapes: the same points morph between a sphere, "SN" lettering, a neural net, a knot and a helix.
 *  - After: points breathe, get pushed away by the cursor, a click sends a shockwave sweeping up
 *    the sphere, the whole thing tilts toward the pointer, and scrolling dives the camera in.
 */

const RADIUS = 2.5;
const COUNT = 3600;
const INTRO_SECONDS = 3;

const vert = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aFrom;
  attribute vec3 aTarget;
  attribute float aRand;
  uniform float uTime, uAssemble, uShock, uPx, uMorph;
  uniform vec2 uMouse;
  varying float vGlow;
  varying float vMix;

  void main() {
    float k = clamp(uAssemble * 1.7 - aRand * 0.7, 0.0, 1.0);
    float e = k * k * (3.0 - 2.0 * k);
    float km = clamp(uMorph * 1.6 - aRand * 0.6, 0.0, 1.0);
    float em = km * km * (3.0 - 2.0 * km);
    vec3 shape = mix(aFrom, aTarget, em);
    vec3 p = mix(aStart, shape, e);

    // Swirl while particles travel between shapes.
    float transit = sin(em * 3.14159);
    float ang = transit * (aRand - 0.5) * 3.2;
    float cs = cos(ang), sn = sin(ang);
    p.xz = mat2(cs, -sn, sn, cs) * p.xz;

    vec3 n = normalize(shape + vec3(1e-4));
    p += n * sin(uTime * 1.1 + aRand * 40.0) * 0.045 * e;

    // Shockwave: a band sweeping from the south pole to the north pole.
    float front = -${RADIUS.toFixed(2)} + (uTime - uShock) * 7.0;
    float band = exp(-pow((shape.y - front) * 2.4, 2.0)) * step(0.0, uTime - uShock) * e;
    p += n * band * 0.55;

    vec4 w = modelMatrix * vec4(p, 1.0);
    vec2 away = w.xy - uMouse;
    float d = length(away);
    float push = smoothstep(1.7, 0.0, d);
    w.xy += normalize(away + 1e-4) * push * 0.75;
    w.z += push * 0.6;

    vGlow = band + push * 0.8 + transit * 0.9;
    vMix = clamp(shape.y / ${RADIUS.toFixed(2)} * 0.5 + 0.5, 0.0, 1.0);

    vec4 mv = viewMatrix * w;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (0.5 + aRand * 0.9 + vGlow * 1.2) * (9.5 / -mv.z);
  }
`;

const frag = /* glsl */ `
  varying float vGlow;
  varying float vMix;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float a = smoothstep(0.5, 0.0, r);
    vec3 teal = vec3(0.26, 0.85, 0.82);
    vec3 indigo = vec3(0.43, 0.52, 1.0);
    vec3 c = mix(indigo, teal, vMix) * (0.7 + vGlow * 1.2);
    gl_FragColor = vec4(c, a * (0.7 + vGlow * 0.5));
  }
`;

type Props = { mode: "play" | "final"; shape?: number; onReveal?: () => void; onDone?: () => void };

function sphereShape(): Float32Array {
  const out = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const inner = Math.random() < 0.14 ? 0.35 + Math.random() * 0.55 : 0.97 + Math.random() * 0.06;
    out.set([Math.cos(th) * r * RADIUS * inner, y * RADIUS * inner, Math.sin(th) * r * RADIUS * inner], i * 3);
  }
  return out;
}

/** Points sampled from filled pixels of the letters "SN". */
function textShape(): Float32Array {
  const out = new Float32Array(COUNT * 3);
  const W = 640, H = 320;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const pts: number[] = [];
  if (ctx) {
    ctx.fillStyle = "#fff";
    ctx.font = "900 300px Inter, Arial Black, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SN", W / 2, H / 2 + 12);
    const d = ctx.getImageData(0, 0, W, H).data;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
  }
  const n = pts.length / 2;
  for (let i = 0; i < COUNT; i++) {
    const k = n ? Math.floor(Math.random() * n) * 2 : 0;
    out.set([(pts[k] / W - 0.5) * 6.4, -(pts[k + 1] / H - 0.5) * 3.2, (Math.random() - 0.5) * 0.5], i * 3);
  }
  return out;
}

/** Four layers of nodes; most points ride the edges between neighbouring layers. */
function networkShape(): Float32Array {
  const out = new Float32Array(COUNT * 3);
  const layers = [4, 6, 6, 3];
  const nodes: THREE.Vector3[][] = layers.map((count, li) =>
    Array.from({ length: count }, (_, ni) => {
      const a = (ni / count) * Math.PI * 2 + li;
      const ring = count > 3 ? 1.9 : 1.2;
      return new THREE.Vector3(-3.3 + li * 2.2, Math.sin(a) * ring, Math.cos(a) * ring * 0.8);
    }),
  );
  for (let i = 0; i < COUNT; i++) {
    if (Math.random() < 0.3) {
      const L = nodes[Math.floor(Math.random() * nodes.length)];
      const nd = L[Math.floor(Math.random() * L.length)];
      const r = Math.random() * 0.2;
      const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
      out.set([nd.x + r * Math.sin(v) * Math.cos(u), nd.y + r * Math.sin(v) * Math.sin(u), nd.z + r * Math.cos(v)], i * 3);
    } else {
      const li = Math.floor(Math.random() * (nodes.length - 1));
      const a = nodes[li][Math.floor(Math.random() * nodes[li].length)];
      const b = nodes[li + 1][Math.floor(Math.random() * nodes[li + 1].length)];
      const t = Math.random();
      out.set([a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t], i * 3);
    }
  }
  return out;
}

function knotShape(): Float32Array {
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = 1.55 + Math.cos(3 * t) * 0.55;
    const cx = r * Math.cos(2 * t) * 1.15, cy = r * Math.sin(2 * t) * 1.15, cz = -Math.sin(3 * t) * 1.2;
    const rr = Math.random() * 0.2, u = Math.random() * Math.PI * 2;
    out.set([cx + rr * Math.cos(u), cy + rr * Math.sin(u), cz + (Math.random() - 0.5) * 0.2], i * 3);
  }
  return out;
}

function helixShape(): Float32Array {
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const y = (Math.random() - 0.5) * 6.4;
    const a = y * 1.6;
    if (Math.random() < 0.22) {
      const k = Math.random() * 2 - 1; // rung between the strands
      out.set([Math.cos(a) * 1.3 * k, Math.floor(y * 3) / 3, Math.sin(a) * 1.3 * k], i * 3);
    } else {
      const s = Math.random() < 0.5 ? 0 : Math.PI;
      out.set([Math.cos(a + s) * 1.3 + (Math.random() - 0.5) * 0.14, y, Math.sin(a + s) * 1.3 + (Math.random() - 0.5) * 0.14], i * 3);
    }
  }
  return out;
}

export default function NeuralScene({ mode, shape = 0, onReveal, onDone }: Props) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { camera, viewport } = useThree();

  const t0 = useRef<number | null>(null);
  const assemble = useRef(0);
  const revealed = useRef(false);
  const done = useRef(false);
  const mouse = useRef({ x: 0, y: 0 });
  const tilt = useRef({ x: 0, y: 0 });
  const shock = useRef(-100);
  const scroll = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const geo = useRef<THREE.BufferGeometry>(null);
  const morph = useRef(1);
  const yaw = useRef(0);
  const sphereness = useRef(1);
  const shapeRef = useRef(0);
  const shapes = useRef<Float32Array[]>([]);

  const { start, from, target, position, rand } = useMemo(() => {
    const start = new Float32Array(COUNT * 3);
    const target = sphereShape();
    const from = target.slice();
    const position = target.slice();
    const rand = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Start: a wide, flat-ish cloud far from the camera.
      const a = Math.random() * Math.PI * 2;
      const d = 6 + Math.random() * 10;
      start.set([Math.cos(a) * d, (Math.random() - 0.5) * 14, Math.sin(a) * d - 6], i * 3);
      rand[i] = Math.random();
    }
    return { start, from, target, position, rand };
  }, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAssemble: { value: 0 },
      uMorph: { value: 1 },
      uShock: { value: -100 },
      uPx: { value: 1 },
      uMouse: { value: new THREE.Vector2(999, 999) },
    }),
    [],
  );

  // Switching shape: freeze where each point currently is, then fly it to the new shape.
  useEffect(() => {
    if (shape === shapeRef.current) return;
    if (!shapes.current.length) shapes.current = [target.slice()];
    const gens = [sphereShape, textShape, networkShape, knotShape, helixShape];
    const next = (shapes.current[shape] ??= gens[shape]());
    for (let i = 0; i < COUNT; i++) {
      const km = Math.min(1, Math.max(0, morph.current * 1.6 - rand[i] * 0.6));
      const em = km * km * (3 - 2 * km);
      for (let j = 0; j < 3; j++) from[i * 3 + j] += (target[i * 3 + j] - from[i * 3 + j]) * em;
    }
    target.set(next);
    morph.current = 0;
    shapeRef.current = shape;
    const g = geo.current;
    if (g) { g.attributes.aFrom.needsUpdate = true; g.attributes.aTarget.needsUpdate = true; }
  }, [shape, target, from, rand]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("a,button")) return;
      shock.current = -1; // resolved to scene time in useFrame
    };
    const onScroll = () => { scroll.current = Math.min(1, window.scrollY / window.innerHeight); };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useFrame((state, dt) => {
    const time = state.clock.elapsedTime;
    if (t0.current === null) t0.current = time;
    const m = mat.current;
    if (!m) return;

    // Intro progress. "final" (returning visitor / skipped) snaps straight to the end state.
    if (modeRef.current === "final") {
      assemble.current = 1;
    } else {
      assemble.current = Math.min(1, (time - t0.current) / INTRO_SECONDS);
    }
    const a = assemble.current;
    if (!revealed.current && a > 0.4) { revealed.current = true; onReveal?.(); }
    if (!done.current && a >= 1) { done.current = true; onDone?.(); }

    if (shock.current === -1) shock.current = time;

    // Mouse in world units on the z=0 plane.
    const persp = camera as THREE.PerspectiveCamera;
    const halfH = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * persp.position.z;
    const halfW = halfH * viewport.aspect;
    const idle = mouse.current.x === 0 && mouse.current.y === 0;
    m.uniforms.uMouse.value.set(idle ? 999 : mouse.current.x * halfW, idle ? 999 : mouse.current.y * halfH);

    morph.current = Math.min(1, morph.current + dt / 1.9);
    m.uniforms.uMorph.value = morph.current;
    m.uniforms.uTime.value = time;
    m.uniforms.uAssemble.value = a;
    m.uniforms.uShock.value = shock.current;
    m.uniforms.uPx.value = state.viewport.dpr * 2.6;

    // Tilt toward the pointer, slow spin.
    const g = group.current;
    if (g) {
      const k = 1 - Math.exp(-3 * dt);
      tilt.current.x += (mouse.current.y * 0.35 - tilt.current.x) * k;
      tilt.current.y += (mouse.current.x * 0.5 - tilt.current.y) * k;
      g.rotation.x = tilt.current.x;
      // The lettering holds still facing the camera; every other shape keeps turning.
      if (shapeRef.current === 1) yaw.current += (Math.round(yaw.current / (Math.PI * 2)) * Math.PI * 2 - yaw.current) * (1 - Math.exp(-2.5 * dt));
      else yaw.current += dt * 0.12;
      g.rotation.y = yaw.current + tilt.current.y + (1 - a) * 2.5;
      const s = 0.7 + a * 0.08;
      g.scale.setScalar(s);
      g.position.x = viewport.aspect > 1.4 ? 3.4 : 0;
    }

    sphereness.current += ((shapeRef.current === 0 ? 1 : 0) - sphereness.current) * (1 - Math.exp(-4 * dt));
    const orb = Math.max(0.001, a * sphereness.current);
    if (core.current) {
      core.current.rotation.x = time * 0.3;
      core.current.rotation.y = -time * 0.4;
      core.current.scale.setScalar(orb * (1 + Math.sin(time * 1.6) * 0.04));
    }
    rings.current.forEach((r, i) => {
      if (!r) return;
      r.rotation.x = time * (0.15 + i * 0.07) + i * 1.1;
      r.rotation.y = time * (0.1 - i * 0.05) + i * 0.7;
      r.scale.setScalar(orb);
    });

    // Scroll dives in.
    persp.position.z = THREE.MathUtils.lerp(persp.position.z, 9.5 - scroll.current * 5, 1 - Math.exp(-4 * dt));
  });

  return (
    <>
      <group ref={group}>
        <points frustumCulled={false}>
          <bufferGeometry ref={geo}>
            <bufferAttribute attach="attributes-position" args={[position, 3]} />
            <bufferAttribute attach="attributes-aFrom" args={[from, 3]} />
            <bufferAttribute attach="attributes-aTarget" args={[target, 3]} />
            <bufferAttribute attach="attributes-aStart" args={[start, 3]} />
            <bufferAttribute attach="attributes-aRand" args={[rand, 1]} />
          </bufferGeometry>
          <shaderMaterial
            ref={mat}
            vertexShader={vert}
            fragmentShader={frag}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        <mesh ref={core}>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshBasicMaterial color="#42d9d1" wireframe transparent opacity={0.55} toneMapped={false} />
        </mesh>

        {[3.3, 3.7, 4.1].map((r, i) => (
          <mesh key={r} ref={(el) => { rings.current[i] = el; }}>
            <torusGeometry args={[r, 0.008, 8, 180]} />
            <meshBasicMaterial color={i === 1 ? "#6d85ff" : "#42d9d1"} transparent opacity={0.5} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.35} luminanceSmoothing={0.4} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </>
  );
}
