import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import forestUrl from '../assets/3d/forest.stl';
import * as THREE from 'three';

export const ForestFeature: React.FC = () => {
  const geometry = useLoader(STLLoader, forestUrl);
  
  const processedGeometry = useMemo(() => {
    const geo = geometry.clone();
    if (!geo.boundingBox) geo.computeBoundingBox();
    const box = geo.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Assume Z-up (Blender default). 
    // Center X and Y. Move Z so min Z is at 0.
    geo.translate(-center.x, -center.y, -box.min.z);
    
    return geo;
  }, [geometry]);

  return (
    <mesh 
      castShadow 
      receiveShadow 
      geometry={processedGeometry}
      scale={[0.023, 0.023, 0.023]} // Use same scale as other features for consistency
      rotation={[-Math.PI / 2, 0, 0]} // Rotate Z-up to Y-up
      position={[0, 0, 0]}
    >
      <meshStandardMaterial color="#1a472a" roughness={0.8} />
    </mesh>
  );
};


