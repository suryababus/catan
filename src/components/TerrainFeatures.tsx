import React, { useMemo } from 'react';
import type { TerrainType } from '../../shared/types';
import { MountainFeature } from './MountainFeature';
import { BrickFeature } from './BrickFeature';
import { ForestFeature } from './ForestFeature';
import { SheepFeature } from './SheepFeature';
import { WheatFeature } from './WheatFeature';

// Reusable materials to save performance

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

