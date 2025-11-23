import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { TerrainType } from '../../shared/types';
import { TERRAIN_COLORS } from '../../shared/types';
import { Text } from '@react-three/drei';
import { TerrainFeatures } from './TerrainFeatures';

interface HexTileProps {
  x: number;
  z: number;
  terrain: TerrainType;
  numberToken?: number;
}

const HEX_RADIUS = 1;
const HEX_HEIGHT = 0.3; // Slightly thicker

export const HexTile: React.FC<HexTileProps> = ({ x, z, terrain, numberToken }) => {
  
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
    bevelSegments: 2
  }), []);

  // Determine color based on terrain, but maybe slightly muted or textured look
  const color = TERRAIN_COLORS[terrain];

  return (
    <group position={[x, 0, z]}>
      {/* Hexagon Mesh */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      {/* Terrain Features (Trees, etc) sitting on top */}
      <group position={[0, HEX_HEIGHT + 0.05, 0]}>
         <TerrainFeatures terrain={terrain} />
      </group>

      {/* Number Token */}
      {numberToken && (
        <group position={[0, HEX_HEIGHT + 0.25, 0]}>
          {/* Token Base */}
          <mesh castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 32]} />
            <meshStandardMaterial color="#f4e4bc" roughness={0.5} />
          </mesh>
          {/* Dots for probability (visual flair, optional but cool) */}
          
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
        </group>
      )}
    </group>
  );
};
