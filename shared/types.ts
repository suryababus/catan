export type TerrainType = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert';

export type ResourceType = 'wood' | 'brick' | 'sheep' | 'wheat' | 'ore';

export interface Resources {
  wood: number;
  brick: number;
  sheep: number;
  wheat: number;
  ore: number;
}

export interface HexData {
  q: number;
  r: number;
  terrain: TerrainType;
  numberToken?: number;
}

export const TERRAIN_COLORS: Record<TerrainType, string> = {
  forest: '#228B22',   // Wood
  hills: '#B22222',    // Brick
  pasture: '#90EE90',  // Sheep
  fields: '#FFD700',   // Wheat
  mountains: '#808080', // Ore
  desert: '#F4A460'    // None
};

export const TERRAIN_RESOURCES: Record<TerrainType, ResourceType | null> = {
  forest: 'wood',
  hills: 'brick',
  pasture: 'sheep',
  fields: 'wheat',
  mountains: 'ore',
  desert: null
};

export const BUILDING_COSTS: Record<'road' | 'settlement' | 'city' | 'devCard', Resources> = {
    road: { wood: 1, brick: 1, sheep: 0, wheat: 0, ore: 0 },
    settlement: { wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 0 },
    city: { wood: 0, brick: 0, sheep: 0, wheat: 2, ore: 3 },
    devCard: { wood: 0, brick: 0, sheep: 1, wheat: 1, ore: 1 }
};
