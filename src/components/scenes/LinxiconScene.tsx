"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { asset } from "@/lib/asset";
import { CLUSTERED, EDGES, GROUPS, NODES, SCATTER, neighborsOf } from "@/content/linxiconExample";

/**
 * Words float isolated → glowing curved bonds form (springy settle into clusters) → camera pulls back → free orbit.
 * Data is the ILLUSTRATIVE example set in content/linxiconExample.ts, not real Linxicon output.
 */

export type Cmd = { n: number; type: "reset" | "zoom" | "rotate"; dir?: number };

type Props = {
  selected: number | null;
  showLabels: boolean;
  cmd: Cmd;
  skipIntro: boolean;
  /** Extra glow pass on connectors (high quality tier only). */
  fancy?: boolean;
  onSelect: (id: number | null) => void;
  onIntroDone: () => void;
};

const FONT = asset("/fonts/inter-400.woff");
const T_ISOLATED = 1.0;
const T_FORM_END = 3.0;
const T_PULL_END = 4.6;
const T_SETTLED = 3.4; // nodes and bonds have stopped moving after this
const SEG = 18;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Underdamped spring step response (0→1 with a little overshoot). */
function spring(t: number) {
  if (t <= 0) return 0;
  const z = 0.55, w = 6.5, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.22, "rgba(255,255,255,0.5)");
  gr.addColorStop(0.55, "rgba(255,255,255,0.12)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const coreColor = (hex: string) => `#${new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.35).getHexString()}`;

export default function LinxiconScene({ selected, showLabels, cmd, skipIntro, fancy = false, onSelect, onIntroDone }: Props) {
  const { camera, gl, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const labelRefs = useRef<(THREE.Group | null)[]>([]);
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const t = useRef(0);
  const introDone = useRef(false);
  const spin = useRef(true);
  const spinOffset = useRef(0);
  const selRef = useRef<number | null>(selected);
  selRef.current = selected;
  const drawnSel = useRef<number | null | undefined>(undefined);

  const neighborIds = useMemo(() => {
    if (selected === null) return null;
    return new Set(neighborsOf(selected).map((n) => n.other));
  }, [selected]);

  const halo = useMemo(haloTexture, []);
  useEffect(() => () => halo.dispose(), [halo]);

  const dust = useMemo(() => {
    const r = rng(5);
    const a = new Float32Array(420 * 3);
    for (let i = 0; i < 420; i++) {
      const u = r() * Math.PI * 2, v = Math.acos(2 * r() - 1), d = 14 + r() * 14;
      a[i * 3] = d * Math.sin(v) * Math.cos(u);
      a[i * 3 + 1] = d * Math.cos(v) * 0.7;
      a[i * 3 + 2] = d * Math.sin(v) * Math.sin(u);
    }
    return a;
  }, []);

  // Curved connectors: one shared geometry per edge, drawn once thin and bright, and (high tier) once wide and faint.
  const mats = useMemo(() => {
    const mk = (linewidth: number, opacity: number) =>
      new LineMaterial({ color: 0xffffff, linewidth, vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
    return { core: mk(2.2, 1), glow: mk(9, 0.2) };
  }, []);
  const edges = useMemo(() => {
    const r = rng(7);
    return EDGES.map(() => {
      const geo = new LineGeometry();
      geo.setPositions(new Float32Array((SEG + 1) * 3));
      geo.setColors(new Float32Array((SEG + 1) * 3));
      const core = new Line2(geo, mats.core);
      core.frustumCulled = false;
      const glow = fancy ? new Line2(geo, mats.glow) : null;
      if (glow) glow.frustumCulled = false;
      const ref = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      return { geo, core, glow, ref };
    });
  }, [mats, fancy]);

  useEffect(() => {
    mats.core.resolution.set(size.width, size.height);
    mats.glow.resolution.set(size.width, size.height);
  }, [mats, size.width, size.height]);

  useEffect(() => () => {
    edges.forEach((e) => e.geo.dispose());
  }, [edges]);
  useEffect(() => () => { mats.core.dispose(); mats.glow.dispose(); }, [mats]);

  // Selecting something means the user is exploring: stop the idle spin.
  useEffect(() => { if (selected !== null) spin.current = false; }, [selected]);

  // Toolbar commands.
  useEffect(() => {
    if (cmd.n === 0) return;
    const c = controls.current;
    if (cmd.type === "reset") {
      camera.position.set(0, 3, 18);
      c?.target.set(0, 0, 0);
      c?.update();
      spinOffset.current = 0;
      if (group.current) group.current.rotation.y = 0;
      spin.current = true;
    } else if (cmd.type === "zoom") {
      const d = camera.position.length();
      const nd = Math.min(32, Math.max(6, d * (cmd.dir! > 0 ? 0.82 : 1.22)));
      camera.position.setLength(nd);
    } else if (cmd.type === "rotate" && group.current) {
      spin.current = false;
      group.current.rotation.y += (cmd.dir ?? 1) * 0.35;
    }
  }, [cmd, camera]);

  useEffect(() => {
    if (skipIntro) t.current = Math.max(t.current, T_PULL_END + 0.01);
  }, [skipIntro]);

  const tmp = useMemo(() => ({
    c: new THREE.Color(), c2: new THREE.Color(), w: new THREE.Color("#ffffff"),
    dir: new THREE.Vector3(), perp: new THREE.Vector3(), ctrl: new THREE.Vector3(),
    pa: new Float32Array((SEG + 1) * 3), ca: new Float32Array((SEG + 1) * 3),
  }), []);
  const pos = useMemo(() => NODES.map(() => new THREE.Vector3()), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    t.current += dt;
    const tt = t.current;

    // node positions
    NODES.forEach((n, i) => {
      const k = spring((tt - T_ISOLATED - (i % 8) * 0.05) / 1.2);
      const s = SCATTER[i], c = CLUSTERED[i];
      // gentle drift while isolated
      const drift = tt < T_ISOLATED + 0.6 ? Math.sin(tt * 0.9 + i) * 0.15 : 0;
      pos[i].set(s[0] + (c[0] - s[0]) * k, s[1] + (c[1] - s[1]) * k + drift, s[2] + (c[2] - s[2]) * k);
      nodeRefs.current[i]?.position.copy(pos[i]);
      labelRefs.current[i]?.position.set(pos[i].x, pos[i].y + (n.hub ? 0.6 : 0.46), pos[i].z);
    });

    // connectors: quadratic curves that grow out of the first word; rebuilt while moving or when the selection changes
    const sel = selRef.current;
    if (tt < T_SETTLED || drawnSel.current !== sel) {
      drawnSel.current = sel;
      const { pa, ca, c, c2, dir, perp, ctrl } = tmp;
      EDGES.forEach((e, i) => {
        const a = pos[e.a], b = pos[e.b];
        const grow = clamp01((tt - (T_ISOLATED + 0.25 + (i % 12) * 0.06)) / 0.7);
        dir.subVectors(b, a);
        const len = dir.length();
        perp.crossVectors(dir, edges[i].ref);
        if (perp.lengthSq() < 1e-6) perp.set(0, 1, 0);
        perp.normalize().multiplyScalar(len * 0.26);
        ctrl.addVectors(a, b).multiplyScalar(0.5).add(perp);

        const incident = sel !== null && (e.a === sel || e.b === sel);
        const bright = sel === null ? 0.85 : incident ? 1.35 : 0.07;
        c.set(GROUPS[NODES[e.a].group].color);
        c2.set(GROUPS[NODES[e.b].group].color);
        for (let s = 0; s <= SEG; s++) {
          const u = (s / SEG) * grow, m = 1 - u;
          pa[s * 3] = m * m * a.x + 2 * m * u * ctrl.x + u * u * b.x;
          pa[s * 3 + 1] = m * m * a.y + 2 * m * u * ctrl.y + u * u * b.y;
          pa[s * 3 + 2] = m * m * a.z + 2 * m * u * ctrl.z + u * u * b.z;
          // gradient from one word's colour to the other, brighter toward the middle of the arc
          const f = s / SEG;
          const pulse = bright * (0.75 + 0.5 * Math.sin(f * Math.PI));
          ca[s * 3] = (c.r + (c2.r - c.r) * f) * pulse;
          ca[s * 3 + 1] = (c.g + (c2.g - c.g) * f) * pulse;
          ca[s * 3 + 2] = (c.b + (c2.b - c.b) * f) * pulse;
        }
        edges[i].geo.setPositions(pa);
        edges[i].geo.setColors(ca);
      });
    }

    // camera: close on isolated words → pull back → hand over to orbit controls
    if (!introDone.current) {
      const dist = tt < T_FORM_END ? 11 - easeInOut(clamp01((tt - T_ISOLATED) / (T_FORM_END - T_ISOLATED))) * 2 : 9 + easeInOut(clamp01((tt - T_FORM_END) / (T_PULL_END - T_FORM_END))) * 9;
      const a = 0.3;
      camera.position.set(Math.sin(a) * dist * 0.35, 2.2 + (dist - 9) * 0.12, dist);
      camera.lookAt(0, 0, 0);
      if (tt >= T_PULL_END) {
        introDone.current = true;
        if (controls.current) {
          controls.current.enabled = true;
          controls.current.update();
        }
        onIntroDone();
      }
    }
    if (controls.current) controls.current.enabled = introDone.current;

    // slow idle rotation until the user interacts
    if (group.current && introDone.current && spin.current) group.current.rotation.y += dt * 0.06;
  });

  // Stop idle spin on any pointer interaction with the canvas.
  useEffect(() => {
    const el = gl.domElement;
    const stop = () => { spin.current = false; };
    el.addEventListener("pointerdown", stop);
    return () => el.removeEventListener("pointerdown", stop);
  }, [gl]);

  const nodeState = (id: number): "normal" | "selected" | "neighbor" | "dim" => {
    if (selected === null) return "normal";
    if (id === selected) return "selected";
    if (neighborIds?.has(id)) return "neighbor";
    return "dim";
  };

  return (
    <>
      <color attach="background" args={["#05071a"]} />

      <group ref={group}>
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dust, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.07} color="#8b9bff" transparent opacity={0.55} depthWrite={false} sizeAttenuation />
        </points>

        {edges.map((e, i) => (
          <group key={i}>
            {e.glow && <primitive object={e.glow} />}
            <primitive object={e.core} />
          </group>
        ))}

        {NODES.map((n) => {
          const st = nodeState(n.id);
          const color = GROUPS[n.group].color;
          const haloOpacity = st === "dim" ? 0 : st === "selected" ? 1 : st === "neighbor" ? 0.9 : n.hub ? 0.8 : 0.55;
          return (
            <group key={n.id}>
              <group ref={(g) => { nodeRefs.current[n.id] = g; }}>
                <mesh
                  onClick={(e) => { e.stopPropagation(); onSelect(selected === n.id ? null : n.id); }}
                  onPointerOver={() => { document.body.style.cursor = "pointer"; }}
                  onPointerOut={() => { document.body.style.cursor = ""; }}
                >
                  <sphereGeometry args={[n.hub ? 0.3 : 0.2, 24, 24]} />
                  <meshBasicMaterial color={st === "dim" ? "#2a3052" : st === "selected" ? "#ffffff" : coreColor(color)} toneMapped={false} />
                </mesh>
                <sprite scale={n.hub ? [3, 3, 1] : [2, 2, 1]} raycast={() => null}>
                  <spriteMaterial map={halo} color={color} transparent opacity={haloOpacity} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
                </sprite>
              </group>
              <group ref={(g) => { labelRefs.current[n.id] = g; }}>
                <Billboard>
                  <Text
                    font={FONT}
                    fontSize={n.hub ? 0.46 : 0.34}
                    color={st === "dim" ? "#4a5278" : "#eef0ff"}
                    anchorX="center"
                    anchorY="bottom"
                    outlineWidth={0.025}
                    outlineColor="#05071a"
                  >
                    {n.word}
                  </Text>
                </Billboard>
              </group>
            </group>
          );
        })}

        {/* Relationship labels for the selected word's connections */}
        {showLabels && selected !== null &&
          EDGES.filter((e) => e.a === selected || e.b === selected).map((e, i) => {
            const a = CLUSTERED[e.a], b = CLUSTERED[e.b];
            return (
              <Billboard key={i} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]}>
                <Text font={FONT} fontSize={0.26} color="#ffd86b" outlineWidth={0.02} outlineColor="#05071a">
                  {e.rel}
                </Text>
              </Billboard>
            );
          })}
      </group>

      <OrbitControls
        ref={controls}
        makeDefault
        enabled={false}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
      />
    </>
  );
}
