import { useCallback, useMemo, useRef, useState } from 'react';
import Colyseus, { Room } from 'colyseus.js';
import type { GamePhase, TurnPhase, PlacedStructure, PlayerColor } from '../../shared/gameLogic';
import type { HexData, Resources } from '../../shared/types';

const DEFAULT_ENDPOINT = import.meta.env.VITE_COLYSEUS_ENDPOINT ?? 
  (window.location.hostname === 'localhost' ? 'ws://localhost:2567' : `${window.location.protocol.replace('http', 'ws')}//${window.location.host}`);

type ConnectionPhase = 'disconnected' | 'connecting' | 'lobby' | 'playing';

type TurnPhaseWithLobby = TurnPhase | 'LOBBY';

export interface NetworkPlayer {
  sessionId: string;
  name: string;
  color: PlayerColor;
  victoryPoints: number;
  ready: boolean;
  connected: boolean;
  isHost: boolean;
  resources: Resources;
}

export interface NetworkState {
  board: Array<HexData & { numberToken: number }>;
  vertices: Array<{ id: string; x: number; z: number; adjacentHexes: string[] }>;
  edges: Array<{ id: string; v1: string; v2: string; x: number; z: number; rotation: number }>;
  players: Record<string, NetworkPlayer>;
  turnOrder: string[];
  placedStructures: PlacedStructure[];
  gameLog: string[];
  gamePhase: GamePhase;
  turnPhase: TurnPhaseWithLobby;
  currentPlayerIndex: number;
  diceRoll: number;
  hostSessionId: string;
  roomCode: string;
}

interface ConnectOptions {
  name: string;
  roomId?: string;
  mode: 'create' | 'join';
}

export interface MultiplayerActions {
  toggleReady: () => void;
  startGame: () => void;
  rollDice: () => void;
  endTurn: () => void;
  placeStructure: (type: 'road' | 'settlement', locationId: string) => void;
}

export const useOnlineGame = () => {
  const [phase, setPhase] = useState<ConnectionPhase>('disconnected');
  const [state, setState] = useState<NetworkState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room<unknown> | null>(null);
  const clientRef = useRef<Colyseus.Client | null>(null);

  if (!clientRef.current) {
    clientRef.current = new Colyseus.Client(DEFAULT_ENDPOINT);
  }

  const updateUrl = useCallback((roomId?: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (roomId) {
      url.searchParams.set('roomId', roomId);
    } else {
      url.searchParams.delete('roomId');
    }
    window.history.replaceState({}, '', url);
  }, []);

  const wireRoom = useCallback((nextRoom: Room<unknown>) => {
    setRoom(nextRoom);
    setPhase('lobby');
    updateUrl(nextRoom.roomId);

    const handleStateChange = (newState: any) => {
      const json = newState.toJSON() as NetworkState;
      setState(json);
      setPhase(json.gamePhase === 'LOBBY' ? 'lobby' : 'playing');
    };

    nextRoom.onStateChange(handleStateChange);
    if (nextRoom.state) {
      handleStateChange(nextRoom.state);
    }
    nextRoom.onError((code, message) => {
      setError(message ?? `Room error (${code})`);
    });
    nextRoom.onLeave(() => {
      setRoom(null);
      setState(null);
      setPhase('disconnected');
      updateUrl(undefined);
    });
  }, [updateUrl]);

  const connect = useCallback(async ({ mode, name, roomId }: ConnectOptions) => {
    if (!name.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (mode === 'join' && !roomId) {
      setError('Room ID required to join.');
      return;
    }

    setPhase('connecting');
    setError(null);

    try {
      const client = clientRef.current!;
      const nextRoom =
        mode === 'create'
          ? await client.create('catan', { name })
          : await client.joinById(roomId!, { name });
      wireRoom(nextRoom);
    } catch (err) {
      console.error(err);
      setError((err as Error)?.message ?? 'Unable to connect');
      setPhase('disconnected');
    }
  }, [wireRoom]);

  const leaveRoom = useCallback(async () => {
    if (!room) return;
    try {
      await room.leave();
    } catch (err) {
      console.error('Failed to leave room', err);
    } finally {
      setRoom(null);
      setState(null);
      setPhase('disconnected');
      updateUrl(undefined);
    }
  }, [room, updateUrl]);

  const send = useCallback(<T,>(type: string, payload?: T) => {
    if (!room) return;
    room.send(type, payload);
  }, [room]);

  const actions = useMemo<MultiplayerActions>(() => ({
    toggleReady: () => send('toggle_ready'),
    startGame: () => send('start_game'),
    rollDice: () => send('roll_dice'),
    endTurn: () => send('end_turn'),
    placeStructure: (type, locationId) => send('place_structure', { type, locationId })
  }), [send]);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return room ? `${window.location.origin}?roomId=${room.roomId}` : '';
  }, [room]);

  const localSessionId = room?.sessionId ?? null;

  return {
    phase,
    state,
    error,
    roomId: room?.roomId ?? null,
    shareUrl,
    localSessionId,
    connect,
    leaveRoom,
    actions,
    clearError: () => setError(null)
  };
};
