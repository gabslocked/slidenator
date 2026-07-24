import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion, type MotionValue } from "framer-motion";

/** Deterministic PRNG (mulberry32) — never Math.random() in a re-renderable context */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FrameDatum {
  px: number;
  py: number;
  pz: number;
  rx: number;
  ry: number;
  rz: number;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  phase: number;
  marks: number; // 0, 1 ou 2 barras de conteúdo
  accent: boolean; // moldura em destaque
}

const FRAME_COUNT = 16;

// Geradas uma vez no load — totalmente determinístico
const FRAME_DATA: FrameDatum[] = (() => {
  const rng = mulberry32(1337);
  return Array.from({ length: FRAME_COUNT }, () => ({
    px: (rng() - 0.5) * 11,
    py: (rng() - 0.5) * 6,
    pz: -(rng() * 6.5 + 1),
    rx: (rng() - 0.5) * 0.45,
    ry: (rng() - 0.5) * 0.55,
    rz: (rng() - 0.5) * 0.1,
    dx: (rng() + 0.15) * 0.55,
    dy: (rng() + 0.15) * 0.45,
    sx: rng() * 0.16 + 0.04,
    sy: rng() * 0.12 + 0.04,
    phase: rng() * Math.PI * 2,
    marks: rng() > 0.7 ? 2 : rng() > 0.4 ? 1 : 0,
    accent: rng() > 0.82,
  }));
})();

// Geometrias compartilhadas — uma moldura 16:9 + barras de conteúdo
const EDGE_GEO = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 0.9, 0.008));
const MARK_GEO_1 = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.52, 0.12, 0, 0.52, 0.12, 0]), 3));
  return g;
})();
const MARK_GEO_2 = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-0.52, -0.08, 0, 0.24, -0.08, 0]), 3));
  return g;
})();

function Scene({ color, scroll }: { color: THREE.Color; scroll?: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group | null>(null);

  const edgeMat = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
    [color],
  );
  const accentMat = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    [color],
  );
  const markMat = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.26 }),
    [color],
  );

  useFrame(({ clock, camera }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.elapsedTime;
    // Lido de um MotionValue: zero re-render de React por scroll
    const s = scroll ? scroll.get() : 0;

    // Câmera recua e o campo abre à medida que o herói sai de cena
    camera.position.z = 7 + s * 3.4;
    g.rotation.y = s * 0.32;
    g.rotation.x = s * 0.12;

    const spread = 1 + s * 0.55;
    const fade = 1 - s * 0.55;
    edgeMat.opacity = 0.6 * fade;
    accentMat.opacity = 0.95 * fade;
    markMat.opacity = 0.26 * fade;

    const children = g.children;
    FRAME_DATA.forEach((f, i) => {
      const child = children[i];
      if (!child) return;
      child.position.x = f.px * spread + Math.sin(t * 0.075 + f.phase) * f.dx;
      child.position.y = f.py + Math.sin(t * 0.1 + f.phase * 1.3) * f.dy;
      child.rotation.x = f.rx + Math.sin(t * 0.065 + f.phase * 0.8) * f.sx;
      child.rotation.y = f.ry + Math.sin(t * 0.05 + f.phase * 1.2) * f.sy;
    });
  });

  return (
    <group ref={groupRef}>
      {FRAME_DATA.map((f, i) => (
        <group key={i} position={[f.px, f.py, f.pz]} rotation={[f.rx, f.ry, f.rz]}>
          <lineSegments geometry={EDGE_GEO} material={f.accent ? accentMat : edgeMat} />
          {f.marks >= 1 && <lineSegments geometry={MARK_GEO_1} material={markMat} />}
          {f.marks >= 2 && <lineSegments geometry={MARK_GEO_2} material={markMat} />}
        </group>
      ))}
    </group>
  );
}

/**
 * Campo de slides estilo blueprint: 16 molduras 16:9 wireframe flutuando em
 * profundidade, com deriva senoidal lenta. Reage ao scroll (câmera recua, o
 * campo abre e desvanece) lendo um MotionValue dentro de useFrame — nunca por
 * re-render de React. 100% procedural, sem texturas. Null em reduced-motion.
 */
export default function SlideField({
  tone = "#a8b8d4",
  scroll,
}: {
  tone?: string;
  scroll?: MotionValue<number>;
}) {
  const reduced = useReducedMotion() ?? false;
  const color = useMemo(() => new THREE.Color(tone), [tone]);

  if (reduced) return null;

  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 58 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.5]}>
      <Scene color={color} scroll={scroll} />
    </Canvas>
  );
}
