import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, RepeatWrapping } from 'three';
import { HexTile } from './HexTile';
import type { HexData } from '../../shared/types';
import type { PlacedStructure, PlayerColor, BoardVertex, BoardEdge } from '../../shared/gameLogic';
import { StructureManager } from './StructureManager';
import { Settlement, Road } from './Structures';
import tableImg from '../assets/table.png';

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
    highlightNumber: number | null;
}

const GameBoard: React.FC<GameBoardProps> = ({
    boardData,
    vertices,
    edges,
    placedStructures,
    currentPlayerColor,
    onPlaceStructure,
    isSetupPhase,
    canInteract,
    highlightNumber
}) => {
  const tableTexture = useLoader(TextureLoader, tableImg);
  tableTexture.wrapS = tableTexture.wrapT = RepeatWrapping;
  tableTexture.repeat.set(4, 4);

  return (
    <group>
      {/* Table Plane */}
      <mesh position={[0, -0.3, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
            map={tableTexture}
            roughness={0.8}
            metalness={0.2}
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
                    isHighlighted={tile.numberToken === highlightNumber}
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
