/**
 * CampusGame.jsx — Naruto Campus Game
 * Bones wired up with exact names from your character.glb
 */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

const CAM = { alpha: Math.PI, beta: 0.35 };

// ── Naruto Character ──────────────────────────────────────────────────────────
function NarutoCharacter({ sliderInput, cameraInput }) {
  const group  = useRef();
  const { scene, animations } = useGLTF('/character.glb');
  const { actions, names }    = useAnimations(animations, group);
  const bonesRef = useRef({});
  const wasMoving = useRef(false);

  // Map all bones by name
  useEffect(() => {
    const boneMap = {};
    scene.traverse((child) => {
      if (child.isBone || child.type === 'Bone') {
        boneMap[child.name] = child;
      }
    });
    bonesRef.current = boneMap;
    console.log('Bones:', Object.keys(boneMap));

    // Try built-in animations first
    if (names.length > 0) {
      console.log('Animations:', names);
      const idle = names.find(n => n.toLowerCase().includes('idle'))
        || names.find(n => n.toLowerCase().includes('stand'))
        || names[0];
      if (idle && actions[idle]) {
        actions[idle].reset().play();
      }
    }
  }, [scene, names, actions]);

  useFrame((state) => {
    if (!group.current) return;

    // ── Camera ────────────────────────────────────────────────────────────
    CAM.alpha -= cameraInput.current.x * 0.004;
    CAM.beta   = Math.max(0.08, Math.min(1.2, CAM.beta + cameraInput.current.y * 0.004));
    cameraInput.current = { x: 0, y: 0 };

    // ── Movement ──────────────────────────────────────────────────────────
    const speed  = sliderInput.current;
    const moving = Math.abs(speed) > 0.05;
    const t      = state.clock.getElapsedTime();
    const bones  = bonesRef.current;

    if (moving) {
      // Move forward
      const fwd = new THREE.Vector3(Math.sin(CAM.alpha), 0, Math.cos(CAM.alpha));
      group.current.position.x += fwd.x * speed * 0.09;
      group.current.position.z += fwd.z * speed * 0.09;

      // Face direction
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        speed > 0 ? CAM.alpha + Math.PI : CAM.alpha,
        0.12
      );

      // Switch animations if available
      if (!wasMoving.current && names.length > 0) {
        const walkAnim = names.find(n =>
          n.toLowerCase().includes('walk') ||
          n.toLowerCase().includes('run')
        );
        if (walkAnim && actions[walkAnim]) {
          Object.values(actions).forEach(a => a.fadeOut(0.2));
          actions[walkAnim].reset().fadeIn(0.2).play();
        }
        wasMoving.current = true;
      }

      // Manual bone walking animation (if no built-in animation)
      const swing     = Math.sin(t * 8) * 0.6;
      const swingFast = Math.sin(t * 8);

      // Legs — exact bone names from your model
      if (bones['LeftUpLeg_01'])   bones['LeftUpLeg_01'].rotation.x   =  swing;
      if (bones['RightUpLeg_05'])  bones['RightUpLeg_05'].rotation.x  = -swing;
      if (bones['LeftLeg_02'])     bones['LeftLeg_02'].rotation.x     =  Math.max(0, swing) * 0.6;
      if (bones['RightLeg_06'])    bones['RightLeg_06'].rotation.x    =  Math.max(0, -swing) * 0.6;
      if (bones['LeftFoot_03'])    bones['LeftFoot_03'].rotation.x    = -Math.abs(swing) * 0.2;
      if (bones['RightFoot_07'])   bones['RightFoot_07'].rotation.x   = -Math.abs(swing) * 0.2;

      // Arms swing opposite to legs
      if (bones['LeftArm_013'])    bones['LeftArm_013'].rotation.x    = -swing * 0.5;
      if (bones['RightArm_017'])   bones['RightArm_017'].rotation.x   =  swing * 0.5;
      if (bones['LeftForeArm_014']) bones['LeftForeArm_014'].rotation.x = Math.abs(swing) * 0.2;
      if (bones['RightForeArm_018']) bones['RightForeArm_018'].rotation.x = Math.abs(swing) * 0.2;

      // Body slight bob while walking
      if (bones['Spine_011'])      bones['Spine_011'].rotation.x      = Math.sin(t * 8) * 0.04;
      if (bones['Spine01_010'])    bones['Spine01_010'].rotation.z     = Math.sin(t * 8) * 0.03;

      // Slight body bounce
      group.current.position.y = Math.abs(Math.sin(t * 8)) * 0.05;

    } else {
      // ── Idle animation ────────────────────────────────────────────────
      if (wasMoving.current && names.length > 0) {
        const idleAnim = names.find(n =>
          n.toLowerCase().includes('idle') ||
          n.toLowerCase().includes('stand')
        ) || names[0];
        if (idleAnim && actions[idleAnim]) {
          Object.values(actions).forEach(a => a.fadeOut(0.2));
          actions[idleAnim].reset().fadeIn(0.2).play();
        }
        wasMoving.current = false;
      }

      // Reset all bones smoothly to idle pose
      const resetBone = (name, speed = 0.1) => {
        if (bones[name]) {
          bones[name].rotation.x = THREE.MathUtils.lerp(bones[name].rotation.x, 0, speed);
          bones[name].rotation.z = THREE.MathUtils.lerp(bones[name].rotation.z, 0, speed);
        }
      };

      ['LeftUpLeg_01','RightUpLeg_05','LeftLeg_02','RightLeg_06',
       'LeftFoot_03','RightFoot_07','LeftArm_013','RightArm_017',
       'LeftForeArm_014','RightForeArm_018','Spine_011','Spine01_010'
      ].forEach(b => resetBone(b));

      // Idle breathing
      if (bones['Spine_011']) bones['Spine_011'].rotation.x = Math.sin(t * 1.5) * 0.02;
      if (bones['Spine02_09']) bones['Spine02_09'].rotation.x = Math.sin(t * 1.5) * 0.015;

      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.1);
    }

    // ── Camera follow ─────────────────────────────────────────────────────
    const px = group.current.position.x;
    const py = group.current.position.y;
    const pz = group.current.position.z;
    const R  = 5;
    state.camera.position.lerp(
      new THREE.Vector3(
        px + R * Math.sin(CAM.alpha) * Math.cos(CAM.beta),
        py + R * Math.sin(CAM.beta) + 0.5,
        pz + R * Math.cos(CAM.alpha) * Math.cos(CAM.beta)
      ), 0.1
    );
    state.camera.lookAt(px, py + 1.2, pz);
  });

  return (
    <group ref={group} position={[0, 0, 5]}>
      {/*
        If Naruto is underground → increase Y: position={[0, 1, 5]}
        If Naruto is floating    → decrease Y: position={[0, -1, 5]}
        If too big  → scale={0.01}
        If too small → scale={2}
      */}
      <primitive object={scene} scale={1} />
    </group>
  );
}

// ── Loading placeholder ───────────────────────────────────────────────────────
function LoadingBox({ sliderInput, cameraInput }) {
  const group = useRef();
  useFrame((state) => {
    if (!group.current) return;
    CAM.alpha -= cameraInput.current.x * 0.004;
    CAM.beta   = Math.max(0.08, Math.min(1.2, CAM.beta + cameraInput.current.y * 0.004));
    cameraInput.current = { x: 0, y: 0 };
    const speed = sliderInput.current;
    if (Math.abs(speed) > 0.05) {
      const fwd = new THREE.Vector3(Math.sin(CAM.alpha), 0, Math.cos(CAM.alpha));
      group.current.position.x += fwd.x * speed * 0.09;
      group.current.position.z += fwd.z * speed * 0.09;
    }
    group.current.rotation.y += 0.02;
    const px = group.current.position.x;
    const py = group.current.position.y;
    const pz = group.current.position.z;
    state.camera.position.lerp(new THREE.Vector3(
      px + 5 * Math.sin(CAM.alpha),
      py + 3,
      pz + 5 * Math.cos(CAM.alpha)
    ), 0.1);
    state.camera.lookAt(px, py + 1, pz);
  });
  return (
    <group ref={group} position={[0, 0, 5]}>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[0.8, 1.6, 0.4]} />
        <meshStandardMaterial color="#FF6600" />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#FFCCA0" />
      </mesh>
    </group>
  );
}

// ── World ─────────────────────────────────────────────────────────────────────
function Tree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.28, 2, 7]} />
        <meshStandardMaterial color="#5C3D11" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <sphereGeometry args={[1.2, 8, 7]} />
        <meshStandardMaterial color="#2D7A1F" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Building({ position, w, h, d, color, roofColor }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, h + 0.3, 0]}>
        <boxGeometry args={[w + 0.4, 0.6, d + 0.4]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
    </group>
  );
}

function World() {
  return (
    <>
      <Sky sunPosition={[80, 40, 100]} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[30, 50, 20]} castShadow intensity={1.3} />

      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#3a8c2a" roughness={0.95} />
      </mesh>

      {/* Road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 10]}>
        <planeGeometry args={[6, 60]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>
      {[-20,-10,0,10,20,30].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
          <planeGeometry args={[0.2, 3]} />
          <meshStandardMaterial color="#FFFF00" />
        </mesh>
      ))}

      {/* Buildings */}
      <Building position={[0,0,-25]}   w={20} h={10} d={10} color="#C8A870" roofColor="#8B2222" />
      <Building position={[-28,0,5]}   w={14} h={7}  d={9}  color="#B0BEC5" roofColor="#607D8B" />
      <Building position={[26,0,5]}    w={12} h={6}  d={8}  color="#FFE0B2" roofColor="#E65100" />
      <Building position={[-14,0,-10]} w={8}  h={5}  d={6}  color="#E8D5B0" roofColor="#7B5E3A" />
      <Building position={[14,0,-10]}  w={8}  h={5}  d={6}  color="#D4C5A0" roofColor="#7B5E3A" />

      {/* Gate */}
      {[-5.5, 5.5].map((x, i) => (
        <mesh key={i} position={[x, 3.5, 28]} castShadow>
          <boxGeometry args={[2, 7, 2]} />
          <meshStandardMaterial color="#C8A870" />
        </mesh>
      ))}
      <mesh position={[0, 7.2, 28]}>
        <boxGeometry args={[13, 0.8, 1.5]} />
        <meshStandardMaterial color="#8B6914" />
      </mesh>

      {/* Compound walls */}
      {[[-15,2,5],[15,2,5]].map(([x,y,z],i) => (
        <mesh key={i} position={[x,y,z]}>
          <boxGeometry args={[1,4,50]} />
          <meshStandardMaterial color="#D4B896" />
        </mesh>
      ))}

      {/* Trees */}
      {[
        [-9,0,12],[9,0,12],[-9,0,4],[9,0,4],
        [-9,0,-4],[9,0,-4],[-6,0,20],[6,0,20],
        [-20,0,0],[20,0,0],[-12,0,-16],[12,0,-16],
      ].map((pos, i) => <Tree key={i} position={pos} />)}

      {/* Ramen orbs */}
      {[[6,1,-4],[-6,1,3],[10,1,-12]].map((pos,i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.3,8,8]} />
          <meshStandardMaterial color="#FF6600" emissive="#FF3300" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </>
  );
}

// ── Vertical Slider ───────────────────────────────────────────────────────────
function VerticalSlider({ onValue }) {
  const TRACK_H = 140;
  const [thumbY, setThumbY] = useState(0);
  const touchId = useRef(null);
  const startY  = useRef(0);
  const ref     = useRef(null);
  const onPD = (e) => { e.stopPropagation(); touchId.current = e.pointerId; startY.current = e.clientY; ref.current?.setPointerCapture(e.pointerId); };
  const onPM = (e) => {
    if (e.pointerId !== touchId.current) return;
    const clamped = Math.max(-TRACK_H/2, Math.min(TRACK_H/2, startY.current - e.clientY));
    setThumbY(clamped);
    onValue(clamped / (TRACK_H / 2));
  };
  const onPU = (e) => { if (e.pointerId !== touchId.current) return; touchId.current = null; setThumbY(0); onValue(0); };
  return (
    <div ref={ref} onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}
      style={{ position:'absolute', bottom:60, left:44, width:60, height:TRACK_H+60, display:'flex', alignItems:'center', justifyContent:'center', touchAction:'none', userSelect:'none', WebkitUserSelect:'none' }}>
      <div style={{ position:'absolute', width:4, height:TRACK_H, background:'rgba(255,255,255,0.3)', borderRadius:4, top:30 }} />
      <div style={{ position:'absolute', top:16, color:'rgba(255,255,255,0.5)', fontSize:14, pointerEvents:'none' }}>▲</div>
      <div style={{ position:'absolute', bottom:16, color:'rgba(255,255,255,0.5)', fontSize:14, pointerEvents:'none' }}>▼</div>
      <div style={{ position:'absolute', top:'50%', width:50, height:50, borderRadius:'50%', background:'rgba(255,255,255,0.88)', boxShadow:'0 4px 16px rgba(0,0,0,0.35)', border:'2px solid rgba(255,255,255,0.95)', transform:`translateY(calc(-50% + ${-thumbY}px))`, transition:thumbY===0?'transform 0.2s ease':'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:20, height:3, background:'rgba(0,0,0,0.25)', borderRadius:2, boxShadow:'0 5px 0 rgba(0,0,0,0.25),0 -5px 0 rgba(0,0,0,0.25)' }} />
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function CampusGame({ onClose }) {
  const sliderInput  = useRef(0);
  const cameraInput  = useRef({ x:0, y:0 });
  const containerRef = useRef(null);
  const camTouchId   = useRef(null);
  const lastCam      = useRef({ x:0, y:0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTS = (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX >= window.innerWidth/2 && camTouchId.current === null) {
          camTouchId.current = t.identifier;
          lastCam.current = { x:t.clientX, y:t.clientY };
        }
      }
    };
    const onTM = (e) => {
      if (e.cancelable) e.preventDefault();
      for (const t of e.touches) {
        if (t.identifier === camTouchId.current) {
          cameraInput.current = { x: t.clientX-lastCam.current.x, y: -(t.clientY-lastCam.current.y) };
          lastCam.current = { x:t.clientX, y:t.clientY };
        }
      }
    };
    const onTE = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === camTouchId.current) { camTouchId.current=null; cameraInput.current={x:0,y:0}; }
      }
    };
    el.addEventListener('touchstart', onTS, { passive:false });
    el.addEventListener('touchmove',  onTM, { passive:false });
    el.addEventListener('touchend',   onTE, { passive:false });
    el.addEventListener('touchcancel',onTE, { passive:false });
    return () => {
      el.removeEventListener('touchstart', onTS);
      el.removeEventListener('touchmove',  onTM);
      el.removeEventListener('touchend',   onTE);
      el.removeEventListener('touchcancel',onTE);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position:'fixed', inset:0, zIndex:300, background:'#87CEEB', touchAction:'none', fontFamily:"'Segoe UI', sans-serif" }}>
      <Canvas shadows camera={{ fov:60, near:0.1, far:500, position:[0,5,12] }}>
        <World />
        <Suspense fallback={<LoadingBox sliderInput={sliderInput} cameraInput={cameraInput} />}>
          <NarutoCharacter sliderInput={sliderInput} cameraInput={cameraInput} />
        </Suspense>
      </Canvas>

      {/* HUD */}
      <div style={{ position:'absolute', top:14, left:14, right:14, display:'flex', justifyContent:'space-between', pointerEvents:'none' }}>
        <div style={{ background:'rgba(15,23,42,0.88)', backdropFilter:'blur(10px)', borderRadius:12, padding:'10px 14px', border:'1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize:10, color:'#94a3b8', marginBottom:2 }}>SSIMS CAMPUS</div>
          <div style={{ fontSize:14, fontWeight:800, color:'#FF6600' }}>🍥 Naruto Campus Quest</div>
          <div style={{ fontSize:10, color:'#fbbf24', marginTop:2 }}>Believe it! Explore the campus!</div>
        </div>
        <button onClick={onClose} style={{ pointerEvents:'all', background:'rgba(15,23,42,0.88)', backdropFilter:'blur(10px)', color:'#fff', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'8px 16px', cursor:'pointer', fontSize:13, fontWeight:600 }}>✕ Exit</button>
      </div>

      {/* Slider */}
      <VerticalSlider onValue={v => { sliderInput.current = v; }} />
      <div style={{ position:'absolute', bottom:26, left:112, color:'rgba(255,255,255,0.4)', fontSize:10, pointerEvents:'none' }}>Slide to move</div>
      <div style={{ position:'absolute', bottom:26, right:14, color:'rgba(255,255,255,0.4)', fontSize:10, pointerEvents:'none', textAlign:'right' }}>Drag right side<br/>to look</div>
    </div>
  );
}

