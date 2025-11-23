import type { HexData } from './types';
import type { BoardVertex, BoardEdge } from './gameLogic';

const HEX_RADIUS = 1; // Matches GameBoard logic

// Helper to snap coordinates to avoid float precision issues
// Using 3 decimal places to ensure adjacent hex vertices match perfectly
const snap = (val: number) => (Math.round(val * 1000) / 1000).toFixed(3);
const getKey = (x: number, z: number) => `${snap(x)},${snap(z)}`;

// Function to calculate all unique vertices and edges from the board layout
export const generateGridDetails = (hexes: HexData[]): { vertices: BoardVertex[], edges: BoardEdge[] } => {
    const verticesMap = new Map<string, BoardVertex>();
    const edgesMap = new Map<string, BoardEdge>();

    hexes.forEach(hex => {
        // Calculate hex center
        const hexX = HEX_RADIUS * Math.sqrt(3) * (hex.q + hex.r / 2);
        const hexZ = HEX_RADIUS * 3 / 2 * hex.r;

        const corners: string[] = [];

        // Calculate 6 corners
        for (let i = 0; i < 6; i++) {
            // Angle matches the Shape definition in HexTile (starts at 30 degrees)
            const angle = (i * Math.PI * 2) / 6 + Math.PI / 6;
            // Use the full radius (without the gap offset) for logical vertices
            const vx = hexX + Math.cos(angle) * HEX_RADIUS;
            const vz = hexZ + Math.sin(angle) * HEX_RADIUS;
            
            // Key for deduping (rounded to avoid float precision issues)
            const key = getKey(vx, vz);
            corners.push(key);

            if (!verticesMap.has(key)) {
                verticesMap.set(key, {
                    id: key,
                    x: Number(snap(vx)),
                    z: Number(snap(vz)),
                    adjacentHexes: [`${hex.q},${hex.r}`]
                });
            } else {
                const v = verticesMap.get(key)!;
                if (!v.adjacentHexes.includes(`${hex.q},${hex.r}`)) {
                    v.adjacentHexes.push(`${hex.q},${hex.r}`);
                }
            }
        }

        // Create edges between consecutive corners
        for (let i = 0; i < 6; i++) {
            const v1 = corners[i];
            const v2 = corners[(i + 1) % 6];
            
            // Sort IDs to ensure undirected edge uniqueness
            const edgeId = [v1, v2].sort().join('|');

            if (!edgesMap.has(edgeId)) {
                const vert1 = verticesMap.get(v1)!;
                const vert2 = verticesMap.get(v2)!;

                const midX = (vert1.x + vert2.x) / 2;
                const midZ = (vert1.z + vert2.z) / 2;
                
                // Calculate rotation angle for the road
                const dx = vert2.x - vert1.x;
                const dz = vert2.z - vert1.z;
                const rotation = Math.atan2(dz, dx);

                edgesMap.set(edgeId, {
                    id: edgeId,
                    v1,
                    v2,
                    x: midX,
                    z: midZ,
                    rotation: -rotation 
                });
            }
        }
    });

    console.log(`Generated Grid: ${verticesMap.size} vertices, ${edgesMap.size} edges`);

    return {
        vertices: Array.from(verticesMap.values()),
        edges: Array.from(edgesMap.values())
    };
};
