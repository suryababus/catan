import type { Resources, HexData } from './types';
import { TERRAIN_RESOURCES } from './types';

export type PlayerColor = 'red' | 'blue' | 'white' | 'orange';

export interface Player {
    id: number;
    color: PlayerColor;
    name: string;
    resources: Resources;
    victoryPoints: number;
    structures: {
        roads: number;
        settlements: number;
        cities: number;
    };
}

export type GamePhase = 'LOBBY' | 'SETUP_ROUND_1' | 'SETUP_ROUND_2' | 'PLAY_TURN' | 'GAME_OVER';
export type TurnPhase = 'ROLL_DICE' | 'TRADING' | 'BUILDING';

export interface Coordinate3D {
    x: number;
    y: number;
    z: number;
}

// Represents a unique vertex on the board (hashed by coordinates)
export interface BoardVertex {
    id: string; // "x,z" fixed precision
    x: number;
    z: number;
    adjacentHexes: string[]; // "q,r"
}

// Represents a unique edge on the board
export interface BoardEdge {
    id: string; // "v1_id|v2_id" sorted
    v1: string; // Vertex ID
    v2: string; // Vertex ID
    x: number; // Midpoint
    z: number;
    rotation: number; // Angle for the road
}

export interface PlacedStructure {
    id: string;
    type: 'road' | 'settlement' | 'city';
    color: PlayerColor;
    locationId: string; // Edge ID or Vertex ID
}

// --- Validation Logic ---

/**
 * Check if a Settlement can be placed at the given vertex.
 * Rules:
 * 1. Distance Rule: No other settlement/city adjacent (distance < 2 edges).
 * 2. Connection Rule: Must connect to an existing road of the same color (unless it's the first piece?).
 */
export const validateSettlementPlacement = (
    vertexId: string,
    playerColor: PlayerColor,
    placedStructures: PlacedStructure[],
    allEdges: BoardEdge[],
    isSetupPhase: boolean = false
): boolean => {
    // 1. Check Distance Rule
    // Find all edges connected to this vertex
    const connectedEdges = allEdges.filter(e => e.v1 === vertexId || e.v2 === vertexId);
    
    // Get all adjacent vertex IDs
    const neighborVertexIds = connectedEdges.map(e => e.v1 === vertexId ? e.v2 : e.v1);

    // Check if any neighbor has a building
    const hasNeighborBuilding = placedStructures.some(s => 
        (s.type === 'settlement' || s.type === 'city') && 
        neighborVertexIds.includes(s.locationId)
    );

    if (hasNeighborBuilding) {
        console.log("Placement Failed: Too close to another settlement");
        return false;
    }

    // 2. Check Road Connection Rule
    // During setup, we don't need road connection (we place settlement THEN road)
    if (isSetupPhase) {
        return true;
    }

    const playerRoads = placedStructures.filter(s => s.type === 'road' && s.color === playerColor);
    
    // If somehow strict rules apply but player has no roads (shouldn't happen after setup), allow? 
    // No, after setup you MUST connect.
    
    const hasConnectedRoad = playerRoads.some(r => {
        // Find the edge object for this road
        return connectedEdges.some(e => e.id === r.locationId);
    });

    if (!hasConnectedRoad) {
        console.log("Placement Failed: Must connect to your road");
        return false;
    }

    return true;
};

/**
 * Check if a Road can be placed at the given edge.
 * Rules:
 * 1. Must connect to an existing Road of same color OR existing Building of same color.
 */
export const validateRoadPlacement = (
    edgeId: string,
    playerColor: PlayerColor,
    placedStructures: PlacedStructure[],
    allEdges: BoardEdge[]
): boolean => {
    // Find the edge details
    const targetEdge = allEdges.find(e => e.id === edgeId);
    if (!targetEdge) return false;

    const { v1, v2 } = targetEdge;

    // Check connections at v1
    const connectedToV1 = placedStructures.some(s => {
        if (s.color !== playerColor) return false;
        
        // Check for Building at V1
        if ((s.type === 'settlement' || s.type === 'city') && s.locationId === v1) return true;

        // Check for Road connected to V1 (must check edges adjacent to v1)
        if (s.type === 'road') {
             const roadEdge = allEdges.find(e => e.id === s.locationId);
             if (roadEdge && (roadEdge.v1 === v1 || roadEdge.v2 === v1)) return true;
        }
        return false;
    });

    if (connectedToV1) return true;

    // Check connections at v2
    const connectedToV2 = placedStructures.some(s => {
        if (s.color !== playerColor) return false;
        
        if ((s.type === 'settlement' || s.type === 'city') && s.locationId === v2) return true;

        if (s.type === 'road') {
             const roadEdge = allEdges.find(e => e.id === s.locationId);
             if (roadEdge && (roadEdge.v1 === v2 || roadEdge.v2 === v2)) return true;
        }
        return false;
    });

    if (connectedToV2) return true;

    console.log("Placement Failed: Must connect to existing road or settlement");
    return false;
};

// --- Resource Logic ---

export const getResourcesForRoll = (
    roll: number, 
    boardTiles: HexData[], 
    structures: PlacedStructure[],
    vertices: BoardVertex[]
): Map<PlayerColor, Partial<Resources>> => {
    const distribution = new Map<PlayerColor, Partial<Resources>>();

    // 1. Find tiles with this number
    const activeTiles = boardTiles.filter(t => t.numberToken === roll && t.terrain !== 'desert');

    activeTiles.forEach(tile => {
        const resourceType = TERRAIN_RESOURCES[tile.terrain];
        if (!resourceType) return;

        // 2. Find vertices adjacent to this tile
        // This requires matching tile q,r to vertex adjacentHexes strings
        const tileKey = `${tile.q},${tile.r}`;
        
        // Find structures on vertices adjacent to this tile
        structures.forEach(struct => {
            if (struct.type === 'road') return; // Roads don't get resources

            const vertex = vertices.find(v => v.id === struct.locationId);
            if (vertex && vertex.adjacentHexes.includes(tileKey)) {
                // Award resources
                const amount = struct.type === 'city' ? 2 : 1;
                
                const current = distribution.get(struct.color) || {};
                const currentAmount = current[resourceType] || 0;
                
                distribution.set(struct.color, {
                    ...current,
                    [resourceType]: currentAmount + amount
                });
            }
        });
    });

    return distribution;
};
