import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import brickUrl from '../assets/3d/brick.stl';
import * as THREE from 'three';

export const BrickFeature: React.FC = () => {
  const geometry = useLoader(STLLoader, brickUrl);
  
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
      scale={[0.023, 0.023, 0.023]} // Use same scale as mountains for now
      rotation={[-Math.PI / 2, 0, 0]} // Rotate Z-up to Y-up
      position={[0, 0, 0]}
    >
      <meshStandardMaterial color="#8B4513" roughness={0.8} />
    </mesh>
  );
};


