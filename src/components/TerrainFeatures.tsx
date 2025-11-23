import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { TerrainType } from '../../shared/types';

// Reusable materials to save performance
const treeMaterial = new THREE.MeshStandardMaterial({ color: '#1a472a', roughness: 0.8 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#4d3319', roughness: 1 });
const rockMaterial = new THREE.MeshStandardMaterial({ color: '#666666', roughness: 0.6 });
const snowMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
const wheatMaterial = new THREE.MeshStandardMaterial({ color: '#e6c200', roughness: 0.8 });
const sheepMaterial = new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.9 });
const brickMaterial = new THREE.MeshStandardMaterial({ color: '#8b4513', roughness: 0.7 });

interface TerrainFeaturesProps {
  terrain: TerrainType;
}

export const TerrainFeatures: React.FC<TerrainFeaturesProps> = ({ terrain }) => {
  const features = useMemo(() => {
    switch (terrain) {
      case 'forest': // Trees
        return (
          <group>
            {[...Array(3)].map((_, i) => {
              const angle = (i * Math.PI * 2) / 3;
              const r = 0.5;
              return (
                <group key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}>
                   {/* Trunk */}
                   <mesh position={[0, 0.1, 0]} material={trunkMaterial}>
                     <cylinderGeometry args={[0.05, 0.08, 0.2, 5]} />
                   </mesh>
                   {/* Leaves */}
                   <mesh position={[0, 0.3, 0]} material={treeMaterial}>
                     <coneGeometry args={[0.25, 0.5, 7]} />
                   </mesh>
                </group>
              );
            })}
          </group>
        );

      case 'mountains':
        return null;
      
      case 'hills':
        return null;

      case 'fields': // Wheat stalks
        return (
           <group>
              {[...Array(15)].map((_, i) => {
                 const x = (Math.random() - 0.5) * 1.2;
                 const z = (Math.random() - 0.5) * 1.2;
                 return (
                    <mesh key={i} position={[x, 0.1, z]} material={wheatMaterial}>
                       <boxGeometry args={[0.05, 0.2, 0.05]} />
                    </mesh>
                 )
              })}
           </group>
        );

      case 'pasture': // Sheep (simplified as spheres)
         return (
            <group>
               <mesh position={[0.2, 0.1, 0.2]} material={sheepMaterial}>
                  <sphereGeometry args={[0.15, 16, 16]} />
               </mesh>
               <mesh position={[-0.3, 0.1, -0.2]} material={sheepMaterial}>
                  <sphereGeometry args={[0.15, 16, 16]} />
               </mesh>
            </group>
         )

      case 'desert':
          return (
             <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
                <torusGeometry args={[0.4, 0.1, 8, 20]} />
                <meshStandardMaterial color="#c2b280" />
             </mesh>
          )

      default:
        return null;
    }
  }, [terrain]);

  return <group>{features}</group>;
};

