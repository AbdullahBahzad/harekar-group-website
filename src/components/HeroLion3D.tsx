"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

/** Swap this to change the 3D lion model. */
const LION_MODEL = "/models/lion.glb";

/** Run an effect exactly once on mount. */
function useEffectOnce(effect: () => void) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** How tall the lion stands in scene units once auto-normalised. */
const LION_HEIGHT = 2.3;

/** Maximum cursor-driven yaw in radians (~28°). */
const MAX_YAW = 0.5;

/**
 * Walk path: at progress 0 the lion sits deep in the golden ring; scrolling
 * walks him forward past the camera. Scrolling up walks him backward inside.
 */
const WALK_FROM_Z = -2.6;
const WALK_TO_Z = 2.4;

type SharedMotion = {
  /** Hero scroll progress, 0-1. */
  progress: MotionValue<number>;
  /** Damped cursor position, -1..1. */
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Fired once the model is on screen, so the 2D stand-in can bow out. */
  onReady?: () => void;
};

/**
 * The interactive 3D lion.
 *
 * The GLB is a static Higgsfield mesh (quadruped rigs aren't supported by the
 * generation pipeline), so the walk is procedural: scroll velocity drives a
 * gait phase that bobs and sways the body exactly as fast as he advances —
 * scroll down and he strides out of the ring toward the viewer, scroll up and
 * he paces backward into it. The cursor turns his whole body with heavy
 * damping so he tracks the visitor like something alive rather than a toy.
 */
function LionModel({ progress, pointerX, pointerY, onReady }: SharedMotion) {
  const { scene } = useGLTF(LION_MODEL);

  // Mounting means the GLB finished loading (Suspense has resolved).
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);
  useEffectOnce(() => readyRef.current?.());

  // Normalise once: scale to a known height and centre the body on the
  // origin so the straight-on camera frames him dead-centre in the ring.
  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = LION_HEIGHT / (size.y || 1);
    clone.scale.setScalar(scale);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const centre = scaledBox.getCenter(new THREE.Vector3());
    clone.position.set(-centre.x, -centre.y, -centre.z);
    return clone;
  }, [scene]);

  const group = useRef<THREE.Group>(null);
  const gait = useRef({ phase: 0, lastZ: WALK_FROM_Z, yaw: 0, pitch: 0 });

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    const p = progress.get();
    const z = WALK_FROM_Z + (WALK_TO_Z - WALK_FROM_Z) * p;

    // Gait phase advances with distance travelled — in either direction —
    // so leg-beat frequency always matches apparent speed.
    const s = gait.current;
    const travelled = z - s.lastZ;
    s.phase += Math.abs(travelled) * 3.4;
    s.lastZ = z;

    // Step cycle: vertical bob at twice the stride, lateral roll at stride.
    const speedEnvelope = THREE.MathUtils.clamp(Math.abs(travelled) / (delta || 0.016) / 1.4, 0, 1);
    const idlePulse = 0.18; // faint breathing motion when standing still
    const amp = Math.max(speedEnvelope, idlePulse);

    const bob = Math.sin(s.phase * 2) * 0.045 * amp;
    const roll = Math.sin(s.phase) * 0.035 * amp;
    const pitchGait = Math.sin(s.phase * 2 + Math.PI / 2) * 0.02 * amp;

    // Cursor attention — heavily damped whole-body turn + slight nod.
    const targetYaw = pointerX.get() * MAX_YAW;
    const targetPitch = pointerY.get() * 0.12;
    s.yaw = THREE.MathUtils.damp(s.yaw, targetYaw, 3.2, delta);
    s.pitch = THREE.MathUtils.damp(s.pitch, targetPitch, 3.2, delta);

    g.position.set(0, bob, z);
    g.rotation.set(s.pitch + pitchGait, s.yaw, roll);
  });

  return (
    <group ref={group}>
      <primitive object={prepared} />
      {/* Shadow rides with him so his weight stays planted mid-walk. */}
      <GroundShadow y={-LION_HEIGHT / 2 + 0.01} />
    </group>
  );
}

/** Soft contact shadow so the lion carries weight instead of floating. */
function GroundShadow({ y = 0 }: { y?: number }) {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    grad.addColorStop(0, "rgba(0,0,0,0.75)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.35)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
      <planeGeometry args={[6.5, 4]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}

/**
 * The canvas wrapper. Renders transparent over the DOM gold ring so the ring,
 * text, and page background stay ordinary HTML — only the lion is WebGL.
 */
export default function HeroLion3D(props: SharedMotion) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [0, 1.35, 6.4], fov: 32 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      aria-label="Interactive Harekar lion"
      role="img"
    >
      {/* Warm architectural lighting: gold key, amber rims, faint fill. */}
      <ambientLight intensity={0.35} color="#f3ece1" />
      <directionalLight position={[2.5, 4, 5]} intensity={2.1} color="#efcc6e" />
      <directionalLight position={[-4, 2.5, -3]} intensity={1.4} color="#c59c40" />
      <directionalLight position={[4, 1.5, -4]} intensity={1.1} color="#c59c40" />
      <Suspense fallback={null}>
        <LionModel {...props} />
        <GroundShadow />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(LION_MODEL);
