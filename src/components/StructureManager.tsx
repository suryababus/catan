import React, { useState } from 'react';
import type { BoardVertex, BoardEdge, PlacedStructure, PlayerColor } from '../../shared/gameLogic';
import { validateSettlementPlacement, validateRoadPlacement } from '../../shared/gameLogic';

interface StructureManagerProps {
  vertices: BoardVertex[];
  edges: BoardEdge[];
  placedStructures: PlacedStructure[];
  onPlaceStructure: (type: 'road' | 'settlement', locationId: string) => void;
  currentPlayerColor: PlayerColor;
  isSetupPhase?: boolean;
  canInteract?: boolean;
}

export const StructureManager: React.FC<StructureManagerProps> = ({
  vertices,
  edges,
  placedStructures,
  onPlaceStructure,
  currentPlayerColor,
  isSetupPhase = false,
  canInteract = true
}) => {
  const [hoveredItem, setHoveredItem] = useState<{ id: string, type: 'road' | 'settlement' } | null>(null);

  const handleVertexClick = (e: any, vertex: BoardVertex) => {
    if (!canInteract) return;
    e.stopPropagation();
    // Check if already occupied
    if (placedStructures.some(s => s.locationId === vertex.id)) return;

    if (!validateSettlementPlacement(vertex.id, currentPlayerColor, placedStructures, edges, isSetupPhase)) {
      // Add visual feedback or toast here in future
      console.warn("Invalid Settlement Placement");
      return;
    }

    onPlaceStructure('settlement', vertex.id);
  };

  const handleEdgeClick = (e: any, edge: BoardEdge) => {
    if (!canInteract) return;
    e.stopPropagation();
    if (placedStructures.some(s => s.locationId === edge.id)) return;

    if (!validateRoadPlacement(edge.id, currentPlayerColor, placedStructures, edges)) {
      console.warn("Invalid Road Placement");
      return;
    }

    onPlaceStructure('road', edge.id);
  };

  if (!canInteract) {
    return null;
  }

  return (
    <group>
      {/* Render Interactive Vertices (Settlement Spots) */}
      {vertices.map((v) => {
        const isOccupied = placedStructures.some(s => s.locationId === v.id);
        if (isOccupied) return null; 

        // Check if valid spot (optional: could dim invalid spots)
        // For performance, maybe only check on hover or calc all once?
        // Let's check on hover for color indication
        
        const isHovered = hoveredItem?.id === v.id;
        let isValid = true;
        if (isHovered) {
           isValid = validateSettlementPlacement(v.id, currentPlayerColor, placedStructures, edges, isSetupPhase);
        }
        
        return (
          <mesh
            key={v.id}
            position={[v.x, 0.35, v.z]}
            onClick={(e) => handleVertexClick(e, v)}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredItem({ id: v.id, type: 'settlement' });
            }}
            onPointerOut={() => {
                setHoveredItem(null);
            }}
            visible={!isOccupied} // Always render invisible trigger or visible ghost
          >
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial 
                color={isValid ? (isHovered ? currentPlayerColor : "white") : "red"} 
                transparent 
                opacity={isHovered ? 0.8 : 0.0} 
            />
          </mesh>
        );
      })}

      {/* Render Interactive Edges (Road Spots) */}
      {edges.map((e) => {
        const isOccupied = placedStructures.some(s => s.locationId === e.id);
        if (isOccupied) return null;

        const isHovered = hoveredItem?.id === e.id;
        let isValid = true;
        if (isHovered) {
           isValid = validateRoadPlacement(e.id, currentPlayerColor, placedStructures, edges);
        }

        return (
             <mesh
                key={e.id}
                position={[e.x, 0.32, e.z]} 
                rotation={[0, e.rotation, 0]}
                onClick={(ev) => handleEdgeClick(ev, e)}
                onPointerOver={(ev) => {
                    ev.stopPropagation();
                    setHoveredItem({ id: e.id, type: 'road' });
                }}
                onPointerOut={() => setHoveredItem(null)}
             >
                <boxGeometry args={[0.6, 0.15, 0.25]} />
                 <meshStandardMaterial 
                    color={isValid ? (isHovered ? currentPlayerColor : "white") : "red"} 
                    transparent 
                    opacity={isHovered ? 0.8 : 0.0} 
                />
             </mesh>
        )
      })}
    </group>
  );
};
