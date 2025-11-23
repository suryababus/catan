import { Schema, type, ArraySchema, MapSchema } from '@colyseus/schema';

export class BoardHexState extends Schema {
  @type('number') q = 0;
  @type('number') r = 0;
  @type('string') terrain = 'forest';
  @type('number') numberToken = -1;
}

export class VertexState extends Schema {
  @type('string') id = '';
  @type('number') x = 0;
  @type('number') z = 0;
  @type(['string']) adjacentHexes = new ArraySchema<string>();
}

export class EdgeState extends Schema {
  @type('string') id = '';
  @type('string') v1 = '';
  @type('string') v2 = '';
  @type('number') x = 0;
  @type('number') z = 0;
  @type('number') rotation = 0;
}

export class PlayerResourcesState extends Schema {
  @type('number') wood = 0;
  @type('number') brick = 0;
  @type('number') sheep = 0;
  @type('number') wheat = 0;
  @type('number') ore = 0;
}

export class PlayerStructuresState extends Schema {
  @type('number') roads = 15;
  @type('number') settlements = 5;
  @type('number') cities = 4;
}

export class PlayerState extends Schema {
  @type('string') sessionId = '';
  @type('string') name = '';
  @type('string') color = 'red';
  @type(PlayerResourcesState) resources = new PlayerResourcesState();
  @type(PlayerStructuresState) structures = new PlayerStructuresState();
  @type('number') victoryPoints = 0;
  @type('boolean') ready = false;
  @type('boolean') connected = true;
  @type('boolean') isHost = false;
}

export class PlacedStructureState extends Schema {
  @type('string') id = '';
  @type('string') type: 'road' | 'settlement' | 'city' = 'road';
  @type('string') color = 'red';
  @type('string') locationId = '';
}

export class CatanState extends Schema {
  @type([BoardHexState]) board = new ArraySchema<BoardHexState>();
  @type([VertexState]) vertices = new ArraySchema<VertexState>();
  @type([EdgeState]) edges = new ArraySchema<EdgeState>();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(['string']) turnOrder = new ArraySchema<string>();
  @type([PlacedStructureState]) placedStructures = new ArraySchema<PlacedStructureState>();
  @type({ map: PlayerResourcesState }) lastDistributedResources = new MapSchema<PlayerResourcesState>();
  @type(['string']) gameLog = new ArraySchema<string>();
  @type('string') gamePhase: string = 'LOBBY';
  @type('string') turnPhase: string = 'LOBBY';
  @type('number') currentPlayerIndex = 0;
  @type('number') diceRoll = -1;
  @type('string') hostSessionId = '';
  @type('string') roomCode = '';
}
