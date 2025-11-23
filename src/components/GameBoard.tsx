import React from 'react';
import { HexTile } from './HexTile';
import type { HexData } from '../../shared/types';
import type { PlacedStructure, PlayerColor, BoardVertex, BoardEdge } from '../../shared/gameLogic';
import { StructureManager } from './StructureManager';
import { Settlement, Road } from './Structures';

const HEX_RADIUS = 1;

interface GameBoardProps {
    boardData: HexData[];
    vertices: BoardVertex[];
    edges: BoardEdge[];
    placedStructures: PlacedStructure[];
    currentPlayerColor: PlayerColor;
    onPlaceStructure: (type: 'road' | 'settlement', locationId: string) => void;
    isSetupPhase: boolean;
    canInteract: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
    boardData,
    vertices,
    edges,
    placedStructures,
    currentPlayerColor,
    onPlaceStructure,
    isSetupPhase,
    canInteract
}) => {

  return (
    <group>
      {/* Sea Plane */}
      <mesh position={[0, -0.2, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[15, 64]} />
        <meshPhysicalMaterial 
            color="#006994" 
            transparent 
            opacity={0.8} 
            transmission={0.2}
            roughness={0.1}
            metalness={0.1}
        />
      </mesh>

      {/* Board Container */}
      <group position={[0, 0, 0]}>
        {boardData.map((tile) => {
            const x = HEX_RADIUS * Math.sqrt(3) * (tile.q + tile.r / 2);
            const z = HEX_RADIUS * 3 / 2 * tile.r;
            return (
                <HexTile 
                    key={`${tile.q}-${tile.r}`}
                    x={x}
                    z={z}
                    terrain={tile.terrain}
                    numberToken={tile.numberToken}
                />
            );
        })}
      </group>

      {/* Interaction Layer */}
      <StructureManager 
        vertices={vertices}
        edges={edges}
        placedStructures={placedStructures}
        onPlaceStructure={onPlaceStructure}
        currentPlayerColor={currentPlayerColor}
        isSetupPhase={isSetupPhase}
        canInteract={canInteract}
      />

      {/* Render Placed Structures */}
      {placedStructures.map((struct) => {
          if (struct.type === 'settlement') {
              const vertex = vertices.find(v => v.id === struct.locationId);
              if (!vertex) return null;
              return (
                  <Settlement 
                    key={struct.id}
                    position={[vertex.x, 0.3, vertex.z]}
                    color={struct.color}
                  />
              );
          } else if (struct.type === 'road') {
              const edge = edges.find(e => e.id === struct.locationId);
              if (!edge) return null;
              return (
                  <Road 
                    key={struct.id}
                    // Lifted up so it sits on terrain, not inside
                    position={[edge.x, 0.35, edge.z]}
                    rotation={[0, edge.rotation, 0]}
                    color={struct.color}
                  />
              );
          }
          return null;
      })}
    </group>
  );
};

export default GameBoard;
