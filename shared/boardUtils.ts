import type { TerrainType } from './types';
import type { HexData } from './types';

export const generateBoard = (): HexData[] => {
  const tiles: HexData[] = [];
  const terrainCounts: Record<TerrainType, number> = {
    forest: 4,
    pasture: 4,
    fields: 4,
    hills: 3,
    mountains: 3,
    desert: 1
  };

  const terrainPool: TerrainType[] = [];
  Object.entries(terrainCounts).forEach(([type, count]) => {
    for (let i = 0; i < count; i++) {
      terrainPool.push(type as TerrainType);
    }
  });

  // Shuffle terrain
  for (let i = terrainPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [terrainPool[i], terrainPool[j]] = [terrainPool[j], terrainPool[i]];
  }

  const numberTokens = [
    5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11
  ];
  
  let tokenIndex = 0;
  let terrainIndex = 0;

  for (let q = -2; q <= 2; q++) {
    const r1 = Math.max(-2, -q - 2);
    const r2 = Math.min(2, -q + 2);
    for (let r = r1; r <= r2; r++) {
        const terrain = terrainPool[terrainIndex++];
        let token: number | undefined = undefined;
        
        if (terrain !== 'desert') {
            token = numberTokens[tokenIndex++];
        }

        tiles.push({
            q,
            r,
            terrain,
            numberToken: token
        });
    }
  }

  return tiles;
};

