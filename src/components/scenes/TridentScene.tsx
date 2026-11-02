"use client";

import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";

/**
 * Sculptural version of the UC San Diego trident (three bevelled gold bars) lit by cool-blue and warm-gold lights.
 * Intro: dark silhouette → camera climbs the structure while the lights come up → pull back.
 * Environment reflections come from three's built-in RoomEnvironment, so no files are fetched.
 */

const S = 0.25; // svg-grid unit → scene units
const X = (x: number) => (x - 16) * S;
const Y = (y: number) => (32 - y) * S;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const eio = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const seg = (t: number, a: number, b: number) => eio(clamp01((t - a) / (b - a)));

const T_LIGHT = 0.7, T_CLIMB = 2.9, T_PULL = 4.5;

/** Flat bar with softly bevelled edges, so the polished gold catches the lights. */
function barGeometry(w: number, h: number) {
  const depth = 0.3, bevel = 0.04;
  const sh = new THREE.Shape();
  sh.moveTo(-w / 2 + bevel, bevel); sh.lineTo(w / 2 - bevel, bevel); sh.lineTo(w / 2 - bevel, h - bevel); sh.lineTo(-w / 2 + bevel, h - bevel); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
}

export default function TridentScene({ parallax }: { parallax: boolean }) {
  const { gl, scene } = useThree();
  const rig = useRef<THREE.Group>(null);
  const blue = useRef<THREE.DirectionalLight>(null);
  const gold = useRef<THREE.DirectionalLight>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(0);

  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    pm.dispose();
    return () => { scene.environment = null; env.dispose(); };
  }, [gl, scene]);

  const goldMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#e2b94d", metalness: 1, roughness: 0.17, clearcoat: 0.35, clearcoatRoughness: 0.2, envMapIntensity: 0.15 }), []);
  const plinthMat = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#0d131c", metalness: 0.7, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.25 }), []);
  useEffect(() => () => { goldMat.dispose(); plinthMat.dispose(); }, [goldMat, plinthMat]);

  // Official UCSD trident proportions (see PixelTrident BARS), in scene units.
  const bar = { w: 3.118 * S, gap: 0.683 * S };
  const geo = useMemo(() => {
    const centre = barGeometry(bar.w, 8);
    const side = barGeometry(bar.w, 17.926 * S);
    const plinth = new THREE.LatheGeometry(
      [[0, -0.34], [1.9, -0.34], [1.95, -0.3], [1.95, -0.2], [1.78, -0.16], [1.7, -0.1], [1.55, -0.08], [1.5, -0.02], [0, -0.02]].map(([x, y]) => new THREE.Vector2(x, y)),
      128,
    );
    return { centre, side, plinth };
  }, [bar.w]);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const v = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3() }), []);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    t.current += dt;
    const tt = t.current;
    const cam = state.camera;

    // light ramp
    const lit = seg(tt, T_LIGHT, T_CLIMB);
    if (blue.current) blue.current.intensity = 3.2 * lit;
    if (gold.current) gold.current.intensity = 3.6 * lit;
    if (halo.current) halo.current.opacity = 0.12 + 0.2 * lit;
    goldMat.envMapIntensity = 0.15 + 1.1 * lit;

    // camera: low start → climb along the trident → pull back to the full monument
    const climb = seg(tt, T_LIGHT, T_CLIMB);
    const pull = seg(tt, T_CLIMB, T_PULL);
    v.a.set(0.6, 0.4 + climb * 7.4, 4.2);
    v.l.set(0, 0.8 + climb * 6.8, 0);
    v.b.set(0, 4.2, 15.5);
    cam.position.copy(v.a).lerp(v.b, pull);
    const look = new THREE.Vector3(0, 3.8, 0);
    v.l.lerp(look, pull);
    cam.lookAt(v.l);

    // gentle parallax + slow drift once settled
    if (rig.current) {
      const target = parallax && tt > T_PULL ? state.pointer.x * 0.25 : 0;
      const idle = parallax && tt > T_PULL ? Math.sin(tt * 0.25) * 0.12 : 0;
      rig.current.rotation.y += (target + idle - rig.current.rotation.y) * (1 - Math.exp(-3 * dt));
    }
  });

  return (
    <>
      <color attach="background" args={["#04060a"]} />
      <ambientLight intensity={0.08} />
      <directionalLight ref={blue} position={[-6, 6, 5]} color="#5b8cff" intensity={0} />
      <directionalLight ref={gold} position={[6, 4, 6]} color="#ffd277" intensity={0} />
      <pointLight position={[0, 4, -5]} color="#6d85ff" intensity={30} />

      {/* soft backlight so the silhouette reads before the lights come up */}
      <mesh position={[0, 4.2, -3]}>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial ref={halo} color="#1c3a7a" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <group ref={rig}>
        {/* plinth */}
        <mesh geometry={geo.plinth} material={plinthMat} />

        {/* official trident: tall centre bar, two shorter side bars */}
        <mesh geometry={geo.centre} material={goldMat} />
        {[-1, 1].map((sg) => (
          <mesh key={sg} geometry={geo.side} material={goldMat} position={[sg * (bar.w + bar.gap), Y(22.409), 0]} />
        ))}
      </group>

      <EffectComposer multisampling={0} enableNormalPass={false}>
        <N8AO aoRadius={0.8} distanceFalloff={1.5} intensity={2.4} quality="medium" halfRes />
        <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.2} intensity={0.55} radius={0.6} />
        <Vignette eskil={false} offset={0.3} darkness={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
}
