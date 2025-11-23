import { Room, Client } from 'colyseus';
import { randomUUID } from 'crypto';
import { CatanState, PlayerState, BoardHexState, VertexState, EdgeState, PlacedStructureState, PlayerResourcesState } from './schema/CatanState';
import { generateBoard } from '../../../shared/boardUtils';
import { generateGridDetails } from '../../../shared/gridUtils';
import {
  type HexData,
  type Resources,
  TERRAIN_RESOURCES,
  BUILDING_COSTS
} from '../../../shared/types';
import {
  getResourcesForRoll,
  validateRoadPlacement,
  validateSettlementPlacement,
  type BoardEdge,
  type BoardVertex,
  type PlacedStructure,
  type PlayerColor
} from '../../../shared/gameLogic';

interface JoinOptions {
  name?: string;
}

interface PlaceStructurePayload {
  type: 'road' | 'settlement';
  locationId: string;
}

const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'white', 'orange'];

export class CatanRoom extends Room<CatanState> {
  public maxClients = 4;

  private board: HexData[] = [];
  private boardIndex = new Map<string, HexData>();
  private vertices: BoardVertex[] = [];
  private edges: BoardEdge[] = [];

  onCreate() {
    this.setState(new CatanState());
    this.state.roomCode = this.roomId;
    this.state.gamePhase = 'LOBBY';
    this.state.turnPhase = 'LOBBY';
    this.setupBoard();

    this.onMessage('toggle_ready', (client) => this.toggleReady(client.sessionId));
    this.onMessage('start_game', (client) => this.tryStartGame(client.sessionId));
    this.onMessage('place_structure', (client, message: PlaceStructurePayload) =>
      this.handlePlaceStructure(client, message)
    );
    this.onMessage('roll_dice', (client) => this.handleRollDice(client));
    this.onMessage('end_turn', (client) => this.handleEndTurn(client));
  }

  onJoin(client: Client, options: JoinOptions) {
    const color = this.getAvailableColor();
    if (!color) {
      client.leave(4002, 'Room is full');
      return;
    }

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.name = this.sanitizeName(options?.name) ?? `Player ${this.state.players.size + 1}`;
    player.color = color;
    player.isHost = this.state.hostSessionId === '';
    if (player.isHost) {
      this.state.hostSessionId = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);
    this.state.turnOrder.push(client.sessionId);
    this.addLog(`${player.name} joined the lobby.`);
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const leavingIndex = this.state.turnOrder.findIndex((id) => id === client.sessionId);
    if (leavingIndex >= 0) {
      this.state.turnOrder.splice(leavingIndex, 1);
      if (this.state.currentPlayerIndex >= this.state.turnOrder.length) {
        this.state.currentPlayerIndex = Math.max(0, this.state.turnOrder.length - 1);
      } else if (leavingIndex <= this.state.currentPlayerIndex && this.state.currentPlayerIndex > 0) {
        this.state.currentPlayerIndex -= 1;
      }
    }

    this.state.players.delete(client.sessionId);
    this.addLog(`${player.name} left the room.`);

    if (this.state.hostSessionId === client.sessionId) {
      this.assignNewHost();
    }

    if (this.state.turnOrder.length === 0) {
      this.disconnect();
    }
  }

  // --- Lobby helpers ---

  private sanitizeName(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 24);
  }

  private getAvailableColor(): PlayerColor | undefined {
    const usedColors = new Set(
      Array.from(this.state.players.values()).map((player) => player.color as PlayerColor)
    );
    return PLAYER_COLORS.find((color) => !usedColors.has(color));
  }

  private toggleReady(sessionId: string) {
    if (this.state.gamePhase !== 'LOBBY') return;
    const player = this.state.players.get(sessionId);
    if (!player) return;
    player.ready = !player.ready;
  }

  private tryStartGame(sessionId: string) {
    if (this.state.gamePhase !== 'LOBBY') return;
    if (this.state.hostSessionId !== sessionId) return;
    if (this.state.turnOrder.length < 2) {
      this.addLog('Need at least two players to start.');
      return;
    }

    const everyoneReady = this.state.turnOrder.every((id) => this.state.players.get(id)?.ready);
    if (!everyoneReady) {
      this.addLog('All players must be ready.');
      return;
    }

    this.state.gamePhase = 'SETUP_ROUND_1';
    this.state.turnPhase = 'BUILDING';
    this.state.currentPlayerIndex = 0;
    this.state.diceRoll = -1;
    this.state.turnOrder.forEach((id) => {
      const player = this.state.players.get(id);
      if (player) {
        player.ready = false;
        player.victoryPoints = 0;
        player.resources.wood = 0;
        player.resources.brick = 0;
        player.resources.sheep = 0;
        player.resources.wheat = 0;
        player.resources.ore = 0;
      }
    });
    this.state.placedStructures.splice(0, this.state.placedStructures.length);
    this.addLog('Setup Round 1 started.');
  }

  private assignNewHost() {
    for (const player of this.state.players.values()) {
      player.isHost = false;
    }
    const nextHostId = this.state.turnOrder[0];
    if (!nextHostId) {
      this.state.hostSessionId = '';
      return;
    }
    this.state.hostSessionId = nextHostId;
    const player = this.state.players.get(nextHostId);
    if (player) {
      player.isHost = true;
    }
  }

  // --- Game flow ---

  private handlePlaceStructure(client: Client, payload: PlaceStructurePayload) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    if (!['road', 'settlement'].includes(payload.type)) return;
    if (!payload.locationId) return;

    const isCurrentPlayer = this.isCurrentPlayer(client.sessionId);
    if (!isCurrentPlayer) return;

    const structures = this.getPlacedStructures();

    if (this.state.gamePhase === 'SETUP_ROUND_1' || this.state.gamePhase === 'SETUP_ROUND_2') {
      this.handleSetupPlacement(player, payload, structures);
      return;
    }

    if (this.state.gamePhase !== 'PLAY_TURN' || this.state.turnPhase !== 'BUILDING') {
      return;
    }

    const cost = BUILDING_COSTS[payload.type];
    if (!this.hasResources(player, cost)) {
      this.addLog(`${player.name} cannot afford a ${payload.type}.`);
      return;
    }

    const isValid =
      payload.type === 'settlement'
        ? validateSettlementPlacement(payload.locationId, player.color as PlayerColor, structures, this.edges)
        : validateRoadPlacement(payload.locationId, player.color as PlayerColor, structures, this.edges);

    if (!isValid) return;

    this.payCost(player, cost);
    this.pushStructure(payload.type, player.color as PlayerColor, payload.locationId);

    if (payload.type === 'settlement') {
      player.victoryPoints += 1;
    }

    this.addLog(`${player.name} built a ${payload.type}.`);
  }

  private handleSetupPlacement(
    player: PlayerState,
    payload: PlaceStructurePayload,
    structures: PlacedStructure[]
  ) {
    const playerStructures = structures.filter((s) => s.color === player.color);
    const settlementCount = playerStructures.filter((s) => s.type === 'settlement').length;
    const roadCount = playerStructures.filter((s) => s.type === 'road').length;
    const expectedBeforePlacement = this.state.gamePhase === 'SETUP_ROUND_1' ? 0 : 1;

    if (payload.type === 'settlement') {
      if (settlementCount > expectedBeforePlacement) {
        return;
      }

      const valid = validateSettlementPlacement(
        payload.locationId,
        player.color as PlayerColor,
        structures,
        this.edges,
        true
      );

      if (!valid) return;

      this.pushStructure('settlement', player.color as PlayerColor, payload.locationId);
      player.victoryPoints += 1;
      this.addLog(`${player.name} placed a settlement.`);

      if (this.state.gamePhase === 'SETUP_ROUND_2') {
        this.awardInitialResources(player, payload.locationId);
      }
      return;
    }

    // Road placement
    if (roadCount > expectedBeforePlacement) {
      return;
    }
    if (settlementCount === expectedBeforePlacement) {
      return;
    }

    const validRoad = validateRoadPlacement(
      payload.locationId,
      player.color as PlayerColor,
      structures,
      this.edges
    );

    if (!validRoad) return;

    this.pushStructure('road', player.color as PlayerColor, payload.locationId);
    this.addLog(`${player.name} placed a road.`);

    const placedAllThisRound =
      settlementCount === expectedBeforePlacement + 1 && roadCount === expectedBeforePlacement;
    if (placedAllThisRound) {
      this.advanceSetupTurn();
    }
  }

  private handleRollDice(client: Client) {
    if (!this.isCurrentPlayer(client.sessionId)) return;
    if (this.state.gamePhase !== 'PLAY_TURN') return;
    if (this.state.turnPhase !== 'ROLL_DICE') return;

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const roll = d1 + d2;

    this.state.diceRoll = roll;
    this.state.turnPhase = 'BUILDING';
    this.state.lastDistributedResources.clear();

    const roller = this.getCurrentPlayer();
    this.addLog(`${roller?.name ?? 'Player'} rolled ${roll} (${d1}+${d2}).`);

    if (roll === 7) {
      this.addLog('Robber triggered (not implemented).');
      return;
    }

    const distribution = getResourcesForRoll(roll, this.board, this.getPlacedStructures(), this.vertices);
    distribution.forEach((gain, color) => {
      const player = Array.from(this.state.players.values()).find((p) => p.color === color);
      if (!player) return;

      // Record distribution for UI
      const resState = new PlayerResourcesState();
      resState.wood = gain.wood || 0;
      resState.brick = gain.brick || 0;
      resState.sheep = gain.sheep || 0;
      resState.wheat = gain.wheat || 0;
      resState.ore = gain.ore || 0;
      this.state.lastDistributedResources.set(color, resState);

      Object.entries(gain).forEach(([resource, amount]) => {
        if (!amount) return;
        const key = resource as keyof PlayerState['resources'];
        (player.resources as unknown as Record<string, number>)[key] += amount;
      });
    });
  }

  private handleEndTurn(client: Client) {
    if (!this.isCurrentPlayer(client.sessionId)) return;

    if (this.state.gamePhase === 'SETUP_ROUND_1' || this.state.gamePhase === 'SETUP_ROUND_2') {
      this.advanceSetupTurn();
      return;
    }

    if (this.state.gamePhase !== 'PLAY_TURN') return;

    this.advancePlayTurn();
  }

  private advanceSetupTurn() {
    if (this.state.gamePhase === 'SETUP_ROUND_1') {
      if (this.state.currentPlayerIndex < this.state.turnOrder.length - 1) {
        this.state.currentPlayerIndex += 1;
      } else {
        this.state.gamePhase = 'SETUP_ROUND_2';
        this.addLog('Setup Round 2 (reverse order).');
      }
      return;
    }

    if (this.state.gamePhase === 'SETUP_ROUND_2') {
      if (this.state.currentPlayerIndex > 0) {
        this.state.currentPlayerIndex -= 1;
      } else {
        this.state.gamePhase = 'PLAY_TURN';
        this.state.turnPhase = 'ROLL_DICE';
        this.state.diceRoll = -1;
        const current = this.getCurrentPlayer();
        this.addLog(`${current?.name ?? 'Player'} starts the game.`);
      }
    }
  }

  private advancePlayTurn() {
    if (this.state.turnOrder.length === 0) return;
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.turnOrder.length;
    this.state.turnPhase = 'ROLL_DICE';
    this.state.diceRoll = -1;
    this.state.lastDistributedResources.clear();
    const current = this.getCurrentPlayer();
    this.addLog(`${current?.name ?? 'Player'}'s turn.`);
  }

  private setupBoard() {
    this.board = generateBoard();
    this.boardIndex.clear();
    this.board.forEach((hex) => {
      this.boardIndex.set(`${hex.q},${hex.r}`, hex);
      const stateHex = new BoardHexState();
      stateHex.q = hex.q;
      stateHex.r = hex.r;
      stateHex.terrain = hex.terrain;
      stateHex.numberToken = hex.numberToken ?? -1;
      this.state.board.push(stateHex);
    });

    const { vertices, edges } = generateGridDetails(this.board);
    this.vertices = vertices;
    this.edges = edges;

    vertices.forEach((vertex) => {
      const vertexState = new VertexState();
      vertexState.id = vertex.id;
      vertexState.x = vertex.x;
      vertexState.z = vertex.z;
      vertexState.adjacentHexes.push(...vertex.adjacentHexes);
      this.state.vertices.push(vertexState);
    });

    edges.forEach((edge) => {
      const edgeState = new EdgeState();
      edgeState.id = edge.id;
      edgeState.v1 = edge.v1;
      edgeState.v2 = edge.v2;
      edgeState.x = edge.x;
      edgeState.z = edge.z;
      edgeState.rotation = edge.rotation;
      this.state.edges.push(edgeState);
    });
  }

  private payCost(player: PlayerState, cost: Resources) {
    player.resources.wood -= cost.wood;
    player.resources.brick -= cost.brick;
    player.resources.sheep -= cost.sheep;
    player.resources.wheat -= cost.wheat;
    player.resources.ore -= cost.ore;
  }

  private hasResources(player: PlayerState, cost: Resources) {
    return (
      player.resources.wood >= cost.wood &&
      player.resources.brick >= cost.brick &&
      player.resources.sheep >= cost.sheep &&
      player.resources.wheat >= cost.wheat &&
      player.resources.ore >= cost.ore
    );
  }

  private getPlacedStructures(): PlacedStructure[] {
    return this.state.placedStructures.map((structure) => ({
      id: structure.id,
      type: structure.type,
      color: structure.color as PlayerColor,
      locationId: structure.locationId
    }));
  }

  private pushStructure(type: 'road' | 'settlement', color: PlayerColor, locationId: string) {
    const struct = new PlacedStructureState();
    struct.id = randomUUID();
    struct.type = type;
    struct.color = color;
    struct.locationId = locationId;
    this.state.placedStructures.push(struct);
  }

  private isCurrentPlayer(sessionId: string): boolean {
    const currentId = this.state.turnOrder[this.state.currentPlayerIndex];
    return currentId === sessionId;
  }

  private getCurrentPlayer(): PlayerState | undefined {
    const id = this.state.turnOrder[this.state.currentPlayerIndex];
    return id ? this.state.players.get(id) : undefined;
  }

  private awardInitialResources(player: PlayerState, vertexId: string) {
    const vertex = this.vertices.find((v) => v.id === vertexId);
    if (!vertex) return;
    vertex.adjacentHexes.forEach((key) => {
      const hex = this.boardIndex.get(key);
      if (!hex || hex.terrain === 'desert') return;
      const resourceType = TERRAIN_RESOURCES[hex.terrain];
      if (!resourceType) return;
      (player.resources as unknown as Record<string, number>)[resourceType] += 1;
    });
  }

  private addLog(entry: string) {
    this.state.gameLog.unshift(entry);
    if (this.state.gameLog.length > 50) {
      this.state.gameLog.pop();
    }
  }
}
