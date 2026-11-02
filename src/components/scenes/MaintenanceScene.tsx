"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { PARTS, type CaseRecord, type CaseStatus } from "@/content/courtPartExample";

/**
 * Courthouse floor plan: six court parts as rooms off a central corridor. Each case is a small block
 * sitting in its part, colored by status. Click a room to inspect it. All data is sample data
 * (content/courtPartExample.ts).
 */

export type MCmd = { n: number; type: "reset" | "zoom"; dir?: number };

type Props = {
  cases: CaseRecord[];
  selected: string | null;
  autoRotate: boolean;
  cmd: MCmd;
  onSelect: (id: string | null) => void;
};

const ORANGE = "#ff7a1a";
const CYAN = "#39c4d8";
const STATUS_COLOR: Record<CaseStatus, string> = {
  Active: "#39c4d8",
  "Ready for trial": "#7ee0a8",
  Adjourned: "#f0c36a",
};

const ROOM_W = 2.6;
const ROOM_D = 2.1;
const GAP_X = 3.0;
const OFFSET_Z = 1.75;
const CAM_ISO = new THREE.Vector3(7.5, 9.5, 11);

const roomPos = (slot: { col: number; side: -1 | 1 }): [number, number, number] => [(slot.col - 1) * GAP_X, 0, slot.side * OFFSET_Z];

/** Case block: pops in when it first appears. */
function CaseBlock({ position, status }: { position: [number, number, number]; status: CaseStatus }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    const s = m.scale.x + (1 - m.scale.x) * (1 - Math.exp(-9 * Math.min(dt, 0.05)));
    m.scale.setScalar(s);
  });
  return (
    <mesh ref={ref} position={position} scale={0.001}>
      <boxGeometry args={[0.46, 0.34, 0.46]} />
      <meshStandardMaterial color={STATUS_COLOR[status]} roughness={0.45} metalness={0.15} />
    </mesh>
  );
}

/** Flat floor label drawn to a canvas texture. Avoids drei Text, which suspends the whole scene while its font loads. */
function Label({ text, color, size = 0.5, position }: { text: string; color: string; size?: number; position: [number, number, number] }) {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const g = c.getContext("2d")!;
    g.font = "500 64px Inter, system-ui, sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = color;
    g.fillText(text, 256, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, color]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size * 4, size]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

function Room({
  part, cases, selected, delay, onSelect,
}: {
  part: (typeof PARTS)[number]; cases: CaseRecord[]; selected: boolean; delay: number; onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const t = useRef(0);
  const lift = useRef(0);
  const pos = roomPos(part.slot);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    t.current += dt;
    const g = group.current;
    if (!g) return;
    const rise = Math.min(1, Math.max(0, (t.current - delay) / 0.7));
    const eased = 1 - Math.pow(1 - rise, 3);
    lift.current += ((selected ? 0.22 : 0) - lift.current) * (1 - Math.exp(-10 * dt));
    g.scale.y = Math.max(0.001, eased);
    g.position.y = lift.current;
    if (mat.current) {
      mat.current.emissive.set(selected ? ORANGE : "#000000");
      mat.current.emissiveIntensity = selected ? 0.22 : 0;
    }
  });

  return (
    <group position={[pos[0], 0, pos[2]]}>
      <group ref={group}>
        <mesh
          position={[0, 0.07, 0]}
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = ""; }}
        >
          <boxGeometry args={[ROOM_W, 0.14, ROOM_D]} />
          <meshStandardMaterial ref={mat} color="#1d5a9c" roughness={0.6} metalness={0.1} />
          <Edges color={selected ? ORANGE : CYAN} threshold={20} />
        </mesh>
        {cases.slice(0, 9).map((c, i) => (
          <CaseBlock
            key={c.id}
            status={c.status}
            position={[(i % 3 - 1) * 0.62, 0.29, Math.floor(i / 3) * 0.5 - 0.35]}
          />
        ))}
      </group>
      <Label text={part.name} color={selected ? ORANGE : "#cfe9f7"} position={[0, 0.02, -part.slot.side * (ROOM_D / 2 + 0.22)]} />
    </group>
  );
}

export default function MaintenanceScene({ cases, selected, autoRotate, cmd, onSelect }: Props) {
  const { camera } = useThree();
  const controls = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const root = useRef<THREE.Group>(null);
  const byPart = useMemo(() => {
    const m: Record<string, CaseRecord[]> = {};
    cases.forEach((c) => { (m[c.part] ??= []).push(c); });
    return m;
  }, [cases]);

  useEffect(() => {
    if (cmd.n === 0) return;
    const c = controls.current;
    if (cmd.type === "reset") {
      camera.position.copy(CAM_ISO);
      c?.target.set(0, 0, 0);
      c?.update();
      if (root.current) root.current.rotation.y = 0;
    } else {
      const off = camera.position.clone();
      off.setLength(Math.min(30, Math.max(7, off.length() * (cmd.dir! > 0 ? 0.82 : 1.22))));
      camera.position.copy(off);
      c?.update();
    }
  }, [cmd, camera]);

  useFrame((_, dt) => {
    if (root.current && autoRotate) root.current.rotation.y += Math.min(dt, 0.05) * 0.3;
  });

  return (
    <>
      <color attach="background" args={["#071a33"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[6, 10, 6]} intensity={1.3} />
      <pointLight position={[-6, 4, -4]} intensity={25} color="#8fd8ff" />
      <gridHelper args={[28, 28, "#2a6fb5", "#17406f"]} position={[0, -0.02, 0]} />

      <group ref={root}>
        {/* Floor slab with the corridor running between the two rows */}
        <mesh position={[0, -0.06, 0]} onClick={() => onSelect(null)}>
          <boxGeometry args={[GAP_X * 3 + 0.4, 0.08, OFFSET_Z * 2 + ROOM_D + 0.9]} />
          <meshStandardMaterial color="#123f73" roughness={0.9} />
          <Edges color="#1c3d69" />
        </mesh>
        {PARTS.map((p, i) => (
          <Room
            key={p.id}
            part={p}
            cases={byPart[p.id] ?? []}
            selected={selected === p.id}
            delay={0.15 + i * 0.12}
            onSelect={() => onSelect(selected === p.id ? null : p.id)}
          />
        ))}
      </group>

      <OrbitControls ref={controls} makeDefault enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2 - 0.05} />
    </>
  );
}
