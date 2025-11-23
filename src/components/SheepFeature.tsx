import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import sheepUrl from '../assets/3d/sheep.stl';
import * as THREE from 'three';

export const SheepFeature: React.FC = () => {
  const geometry = useLoader(STLLoader, sheepUrl);
  
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
      <meshStandardMaterial color="#f0f0f0" roughness={0.9} />
    </mesh>
  );
};


