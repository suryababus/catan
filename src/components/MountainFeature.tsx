import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { STLLoader } from 'three-stdlib';
import mountainUrl from '../assets/3d/mountain.stl';
import * as THREE from 'three';

export const MountainFeature: React.FC = () => {
  const geometry = useLoader(STLLoader, mountainUrl);
  
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
      scale={[0.023, 0.023, 0.023]} // Increased scale to cover more of the tile
      rotation={[-Math.PI / 2, 0, 0]} // Rotate Z-up to Y-up
      position={[0, 0, 0]}
    >
      <meshStandardMaterial color="#555555" roughness={0.9} />
    </mesh>
  );
};

