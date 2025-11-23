import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three';
import type { TerrainType } from '../../shared/types';
import { TERRAIN_COLORS } from '../../shared/types';
import { Text } from '@react-three/drei';

import brickImg from '../assets/images/brick.png';
import forestImg from '../assets/images/forest.png';
import mountainImg from '../assets/images/mountain.png';
import sheepImg from '../assets/images/sheep.png';
import wheatImg from '../assets/images/wheat.png';
import desertImg from '../assets/images/desert.png';

interface HexTileProps {
  x: number;
  z: number;
  terrain: TerrainType;
  numberToken?: number;
  isHighlighted?: boolean;
}

const HEX_RADIUS = 1;
const HEX_HEIGHT = 0.3; // Slightly thicker

const TERRAIN_IMAGES: Partial<Record<TerrainType, string>> = {
  hills: brickImg,
  forest: forestImg,
  mountains: mountainImg,
  pasture: sheepImg,
  fields: wheatImg,
  desert: desertImg,
};

const TexturedHexFace: React.FC<{ url: string }> = ({ url }) => {
  const texture = useLoader(TextureLoader, url);
  
  // Adjust texture mapping to fit the hex coordinate system
  // The hex coordinates are roughly [-1, 1]. 
  // We map this range to [0, 1] for UVs.
  // Using repeat 0.5 and offset 0.5 maps [-1, 1] to [0, 1]
  texture.center.set(0, 0);
  texture.repeat.set(0.5, 0.5);
  texture.offset.set(0.5, 0.5);
  
  return (
    <meshStandardMaterial 
      attach="material-0"
      map={texture}
      color="#ffffff" 
      roughness={0.8}
      metalness={0.1}
    />
  );
};

const HexFaceMaterial: React.FC<{ terrain: TerrainType; color: string }> = ({ terrain, color }) => {
  const textureUrl = TERRAIN_IMAGES[terrain];
  
  // If we have a texture, load it via sub-component to avoid conditional hook
  if (textureUrl) {
    return <TexturedHexFace url={textureUrl} />;
  }

  // Fallback for no texture (e.g. desert)
  return (
    <meshStandardMaterial 
      attach="material-0"
      color={color} 
      roughness={0.8}
      metalness={0.1}
    />
  );
};

export const HexTile: React.FC<HexTileProps> = ({ x, z, terrain, numberToken, isHighlighted }) => {
  const highlightMesh = useRef<THREE.Mesh>(null);
  // We use a ref to track when the highlight started
  const highlightStartRef = useRef<number>(0);
  // We need to know if we are currently in a "newly highlighted" state to reset the timer
  const prevHighlightedRef = useRef<boolean>(false);

  useFrame((state) => {
    if (!highlightMesh.current) return;

    // Detect rising edge of isHighlighted
    if (isHighlighted && !prevHighlightedRef.current) {
      highlightStartRef.current = state.clock.getElapsedTime();
    }
    prevHighlightedRef.current = !!isHighlighted;

    if (isHighlighted) {
      const elapsed = state.clock.getElapsedTime() - highlightStartRef.current;
      
      if (elapsed < 2.0) {
         // Blink for 2 seconds
         const blink = Math.sin(elapsed * 15) * 0.5 + 0.5; // Fast blink
         (highlightMesh.current.material as THREE.MeshBasicMaterial).opacity = blink;
         (highlightMesh.current.material as THREE.MeshBasicMaterial).transparent = true;
         highlightMesh.current.visible = true;
      } else {
         // After 2 seconds, stay solid (or hide? user said "highlight the tile", implies static highlight is okay, but "blink it for 2s")
         // Let's keep it solid but slightly transparent to show it's the active number
         (highlightMesh.current.material as THREE.MeshBasicMaterial).opacity = 0.8;
         highlightMesh.current.visible = true;
      }
    }
  });
  
  const shape = useMemo(() => {
    const shape = new THREE.Shape();
    const sides = 6;
    const radius = HEX_RADIUS - 0.05; // slight gap between tiles
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides + Math.PI / 6; // Rotate to flat top
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    return shape;
  }, []);

  const extrudeSettings = useMemo(() => ({
    depth: HEX_HEIGHT,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
    material: 0, // Top face
    extrudeMaterial: 1 // Sides
  }), []);

  // Determine color based on terrain, but maybe slightly muted or textured look
  const color = TERRAIN_COLORS[terrain];

  // Position number token - Center it since we are using flat tiles now
  const tokenPos: [number, number, number] = [0, HEX_HEIGHT + 0.05, 0];

  return (
    <group position={[x, 0, z]}>
      {/* Hexagon Mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        
        {/* Material 0: Top Face */}
        <HexFaceMaterial terrain={terrain} color={color} />
        
        {/* Material 1: Sides (Solid Color) */}
        <meshStandardMaterial 
          attach="material-1"
          color={color} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* No 3D Terrain Features anymore */}

      {/* Number Token */}
      {numberToken && (
        <group position={tokenPos}>
          {/* Token Base */}
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
            <meshStandardMaterial color="#f4e4bc" roughness={0.5} />
          </mesh>
          
          {/* Number Text */}
          <Text
            position={[0, 0.026, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.2}
            color={numberToken === 6 || numberToken === 8 ? '#d93636' : '#222'}
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
          >
            {numberToken.toString()}
          </Text>

          {/* Highlight Ring */}
          {isHighlighted && (
            <mesh ref={highlightMesh} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
               <ringGeometry args={[0.28, 0.36, 32]} />
               <meshBasicMaterial color="#FFD700" toneMapped={false} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};
