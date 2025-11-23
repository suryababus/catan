import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { TerrainType } from '../../shared/types';
import { MountainFeature } from './MountainFeature';
import { BrickFeature } from './BrickFeature';
import { ForestFeature } from './ForestFeature';
import { SheepFeature } from './SheepFeature';
import { WheatFeature } from './WheatFeature';

// Reusable materials to save performance
const treeMaterial = new THREE.MeshStandardMaterial({ color: '#1a472a', roughness: 0.8 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: '#4d3319', roughness: 1 });
const wheatMaterial = new THREE.MeshStandardMaterial({ color: '#e6c200', roughness: 0.8 });
const sheepMaterial = new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.9 });

interface TerrainFeaturesProps {
  terrain: TerrainType;
}

export const TerrainFeatures: React.FC<TerrainFeaturesProps> = ({ terrain }) => {
  const features = useMemo(() => {
    switch (terrain) {
      case 'forest': // Trees
        return <ForestFeature />;


      case 'mountains':
        return <MountainFeature />;
      
      case 'hills':
        return <BrickFeature />;

      case 'fields': // Wheat stalks
        return <WheatFeature />;

      case 'pasture': // Sheep
         return <SheepFeature />;

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

