import React from 'react';

export interface StructureProps {
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const Settlement: React.FC<StructureProps> = ({ color, position, rotation = [0, 0, 0] }) => {
  return (
    <group position={position} rotation={rotation as any}>
        {/* Base */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color={color} />
        </mesh>
        {/* Roof */}
        <mesh position={[0, 0.375, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[0.28, 0.25, 4]} />
            <meshStandardMaterial color={color} />
        </mesh>
    </group>
  );
};

export const Road: React.FC<StructureProps> = ({ color, position, rotation = [0, 0, 0] }) => {
    return (
        <mesh position={position} rotation={rotation as any} castShadow receiveShadow>
            {/* Aligned along X-axis to match atan2 angle 0 */}
            <boxGeometry args={[0.8, 0.1, 0.15]} />
            <meshStandardMaterial color={color} />
        </mesh>
    );
};
