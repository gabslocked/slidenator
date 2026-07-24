import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

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
  hasMark: boolean;
}

// All frame positions and behaviour generated once at module load — fully deterministic
const FRAME_DATA: FrameDatum[] = (() => {
  const rng = mulberry32(1337);
  return Array.from({ length: 12 }, () => ({
    px: (rng() - 0.5) * 9.5,
    py: (rng() - 0.5) * 5.5,
    pz: -(rng() * 5 + 1.5),
    rx: (rng() - 0.5) * 0.45,
    ry: (rng() - 0.5) * 0.55,
    rz: (rng() - 0.5) * 0.1,
    dx: (rng() + 0.15) * 0.55,
    dy: (rng() + 0.15) * 0.45,
    sx: rng() * 0.16 + 0.04,
    sy: rng() * 0.12 + 0.04,
    phase: rng() * Math.PI * 2,
    hasMark: rng() > 0.45,
  }));
})();

// Shared geometry singletons — one 16:9 wireframe outline + one content-bar hint
const EDGE_GEO = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.6, 0.9, 0.008));
const MARK_GEO = (() => {
  const g = new THREE.BufferGeometry();
  // Two vertices = one segment rendered by LineSegments (horizontal bar suggesting content)
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-0.52, 0.1, 0, 0.52, 0.1, 0]), 3),
  );
  return g;
})();

function Scene({ color, paused }: { color: THREE.Color; paused: boolean }) {
  const groupRef = useRef<THREE.Group | null>(null);

  const edgeMat = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
    [color],
  );
  const markMat = useMemo(
    () => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 }),
    [color],
  );

  useFrame(({ clock }) => {
    if (paused || !groupRef.current) return;
    const t = clock.elapsedTime;
    const children = groupRef.current.children;
    FRAME_DATA.forEach((f, i) => {
      const child = children[i];
      if (!child) return;
      // Slow sinusoidal drift — each frame on its own phase so they never sync
      child.position.x = f.px + Math.sin(t * 0.075 + f.phase) * f.dx;
      child.position.y = f.py + Math.sin(t * 0.1 + f.phase * 1.3) * f.dy;
      child.rotation.x = f.rx + Math.sin(t * 0.065 + f.phase * 0.8) * f.sx;
      child.rotation.y = f.ry + Math.sin(t * 0.05 + f.phase * 1.2) * f.sy;
    });
  });

  return (
    <group ref={groupRef}>
      {FRAME_DATA.map((f, i) => (
        <group key={i} position={[f.px, f.py, f.pz]} rotation={[f.rx, f.ry, f.rz]}>
          <lineSegments geometry={EDGE_GEO} material={edgeMat} />
          {f.hasMark && <lineSegments geometry={MARK_GEO} material={markMat} />}
        </group>
      ))}
    </group>
  );
}

/**
 * Blueprint-style slide field: 12 wireframe 16:9 frames floating in depth.
 * Slow sinusoidal drift + light rotation, some with a horizontal content-bar.
 * No textures, no external assets — 100% procedural.
 * Returns null when prefers-reduced-motion is set.
 */
export default function SlideField({ tone = "#a8b8d4" }: { tone?: string }) {
  const reduced = useReducedMotion() ?? false;
  const color = useMemo(() => new THREE.Color(tone), [tone]);

  if (reduced) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 7], fov: 58 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 1.5]}
    >
      <Scene color={color} paused={false} />
    </Canvas>
  );
}
