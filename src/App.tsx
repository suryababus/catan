import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import GameBoard from './components/GameBoard';
import { GameHUD } from './components/GameHUD';
import { LobbyOverlay } from './components/LobbyOverlay';
import { useOnlineGame } from './hooks/useOnlineGame';
import type { HexData } from '../shared/types';
import type { BoardVertex, BoardEdge, PlacedStructure, Player } from '../shared/gameLogic';
import type { GamePhase, TurnPhase } from '../shared/gameLogic';
import type { PlayerColor } from '../shared/gameLogic';

const DEFAULT_STRUCTURES = { roads: 15, settlements: 5, cities: 4 };
type LobbyListItem = {
  sessionId: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
};

function App() {
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('catan:playerName') ?? '';
  });
  const [roomCodeInput, setRoomCodeInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('roomId') ?? '';
  });

  const {
    phase,
    state,
    error,
    roomId,
    shareUrl,
    localSessionId,
    connect,
    leaveRoom,
    actions,
    clearError
  } = useOnlineGame();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('catan:playerName', playerName);
  }, [playerName]);

  const boardData = useMemo<HexData[]>(() => {
    const board = state?.board ?? [];
    return board.map((tile) => ({
      q: tile.q,
      r: tile.r,
      terrain: tile.terrain,
      numberToken: tile.numberToken > 0 ? tile.numberToken : undefined
    }));
  }, [state]);

  const vertices = useMemo<BoardVertex[]>(() => {
    const verts = state?.vertices ?? [];
    return verts.map((vertex) => ({
      id: vertex.id,
      x: vertex.x,
      z: vertex.z,
      adjacentHexes: vertex.adjacentHexes
    }));
  }, [state]);

  const edges = useMemo<BoardEdge[]>(() => {
    const allEdges = state?.edges ?? [];
    return allEdges.map((edge) => ({
      id: edge.id,
      v1: edge.v1,
      v2: edge.v2,
      x: edge.x,
      z: edge.z,
      rotation: edge.rotation
    }));
  }, [state]);

  const placedStructures = useMemo<PlacedStructure[]>(() => {
    const structures = state?.placedStructures ?? [];
    return structures.map((structure) => ({
      id: structure.id,
      type: structure.type,
      color: structure.color as PlayerColor,
      locationId: structure.locationId
    }));
  }, [state]);

  const players = useMemo<Player[]>(() => {
    if (!state) return [];
    return (state.turnOrder ?? [])
      .map((sessionId, index) => {
        const net = state.players[sessionId];
        if (!net) return null;
        return {
          id: index,
          color: net.color,
          name: net.name,
          resources: net.resources ?? { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 },
          victoryPoints: net.victoryPoints,
          structures: { ...DEFAULT_STRUCTURES }
        } satisfies Player;
      })
      .filter(Boolean) as Player[];
  }, [state]);

  const currentPlayerIndex = state?.currentPlayerIndex ?? 0;
  const currentPlayer = players[currentPlayerIndex] ?? players[0];
  const isSetupPhase = state?.gamePhase?.startsWith('SETUP') ?? false;
  const currentPlayerColor = currentPlayer?.color ?? 'red';
  const diceRoll = state && state.diceRoll > 0 ? state.diceRoll : null;
  const lastDistributedResources = state?.lastDistributedResources ?? {};
  const gameLog = state?.gameLog ?? [];
  const currentTurnSession = state?.turnOrder?.[currentPlayerIndex] ?? null;
  const isLocalTurn = Boolean(
    state &&
    currentTurnSession &&
    localSessionId &&
    currentTurnSession === localSessionId &&
    state.gamePhase !== 'LOBBY'
  );
  const canInteract = Boolean(isLocalTurn);
  const canRollDice = Boolean(
    state &&
    isLocalTurn &&
    state.gamePhase === 'PLAY_TURN' &&
    state.turnPhase === 'ROLL_DICE'
  );
  const canEndTurn = Boolean(
    state &&
    isLocalTurn &&
    (state.gamePhase?.startsWith('SETUP') || (state.gamePhase === 'PLAY_TURN' && state.turnPhase !== 'ROLL_DICE'))
  );

  const actionHint = useMemo(() => {
    if (!state || !players.length) return undefined;
    if (!isLocalTurn) {
      const waitingFor = currentTurnSession ? state.players[currentTurnSession]?.name : null;
      return `Waiting for ${waitingFor ?? 'other players'}…`;
    }
    if (state.gamePhase === 'PLAY_TURN' && state.turnPhase === 'ROLL_DICE') {
      return 'Roll the dice to start your turn.';
    }
    if (isSetupPhase) {
      return 'Place a settlement and a connecting road.';
    }
    return undefined;
  }, [state, players.length, isLocalTurn, currentTurnSession, isSetupPhase]);

  const lobbyPlayers = useMemo<LobbyListItem[]>(() => {
    if (!state) return [];
    return (state.turnOrder ?? [])
      .map((sessionId) => {
        const net = state.players[sessionId];
        if (!net) return null;
        return {
          sessionId,
          name: net.name,
          color: net.color,
          ready: net.ready,
          isHost: net.isHost
        };
      })
      .filter((player): player is LobbyListItem => Boolean(player));
  }, [state]);

  const canStart = Boolean((state?.turnOrder?.length ?? 0) >= 2);

  const gamePhaseForHud = (state?.gamePhase ?? 'LOBBY') as GamePhase;
  const turnPhaseForHud = ((state?.turnPhase ?? 'ROLL_DICE') === 'LOBBY'
    ? 'ROLL_DICE'
    : state?.turnPhase ?? 'ROLL_DICE') as TurnPhase;

  const handleCreate = () => connect({ mode: 'create', name: playerName });
  const handleJoin = () => connect({ mode: 'join', name: playerName, roomId: roomCodeInput.trim() });

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {phase === 'disconnected' && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Play Catan Online</h2>
            <label style={styles.label}>
              Display Name
              <input
                style={styles.input}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="E.g. SettlerSam"
              />
            </label>
            <button style={styles.primaryButton} onClick={handleCreate}>Create & Host Game</button>
            <div style={{ textAlign: 'center', margin: '12px 0', color: '#999' }}>or join an existing room</div>
            <label style={styles.label}>
              Room Code
              <input
                style={styles.input}
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                placeholder="Copy the shared code"
              />
            </label>
            <button style={styles.secondaryButton} onClick={handleJoin}>Join Game</button>
            {error && (
              <div style={styles.errorBox}>
                <span>{error}</span>
                <button onClick={clearError} style={styles.errorClose}>×</button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'connecting' && (
        <div style={styles.statusOverlay}>Connecting to server…</div>
      )}

      {phase === 'lobby' && state && (
        <LobbyOverlay
          players={lobbyPlayers}
          localSessionId={localSessionId}
          shareUrl={shareUrl}
          roomId={roomId}
          onToggleReady={actions.toggleReady}
          onStartGame={actions.startGame}
          onLeave={leaveRoom}
          canStart={canStart}
        />
      )}

      {phase !== 'disconnected' && roomId && (
        <div style={styles.roomBadge}>
          <div>
            Room <strong>{roomId}</strong> • {phase === 'playing' ? 'Game in progress' : 'Waiting room'}
          </div>
          <button style={styles.leaveSmallButton} onClick={leaveRoom}>Leave Room</button>
        </div>
      )}

      {error && phase !== 'disconnected' && (
        <div style={styles.toast}>
          <span>{error}</span>
          <button onClick={clearError} style={styles.errorClose}>×</button>
        </div>
      )}

      {state && currentPlayer && phase === 'playing' && (
        <GameHUD
          players={players}
          currentPlayer={currentPlayer}
          gamePhase={gamePhaseForHud}
          turnPhase={turnPhaseForHud}
          diceRoll={diceRoll}
          gameLog={gameLog}
          onRollDice={actions.rollDice}
          onEndTurn={actions.endTurn}
          canRollDice={canRollDice}
          canEndTurn={canEndTurn}
          actionHint={actionHint}
          lastDistributedResources={lastDistributedResources}
        />
      )}

      <Canvas shadows camera={{ position: [0, 12, 12], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <ambientLight intensity={0.4} color="#ffeebb" />
        <hemisphereLight intensity={0.3} groundColor="#332200" color="#ddeeff" />
        <pointLight 
            position={[0, 15, 0]} 
            intensity={800} 
            distance={60} 
            decay={2} 
            color="#fff5e0" 
            castShadow 
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0001}
        />
        {/* <directionalLight
          position={[10, 20, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        /> */}

        <GameBoard
          boardData={boardData}
          vertices={vertices}
          edges={edges}
          placedStructures={placedStructures}
          currentPlayerColor={currentPlayerColor}
          onPlaceStructure={actions.placeStructure}
          isSetupPhase={isSetupPhase}
          canInteract={canInteract}
          highlightNumber={diceRoll}
        />

        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={30} />
      </Canvas>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    padding: '16px'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'white',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
    fontWeight: 600,
    fontSize: '0.9rem'
  },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '1rem'
  },
  primaryButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: '#2ecc71',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: '#3498db',
    color: 'white',
    fontSize: '1rem',
    cursor: 'pointer'
  },
  errorBox: {
    marginTop: '12px',
    padding: '10px',
    borderRadius: '8px',
    background: 'rgba(231, 76, 60, 0.15)',
    color: '#c0392b',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  errorClose: {
    border: 'none',
    background: 'transparent',
    fontSize: '1.2rem',
    cursor: 'pointer',
    color: '#c0392b'
  },
  statusOverlay: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
    padding: '10px 18px',
    borderRadius: '999px',
    zIndex: 18
  },
  roomBadge: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.9)',
    padding: '10px 16px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 12,
    boxShadow: '0 8px 20px rgba(0,0,0,0.15)'
  },
  leaveSmallButton: {
    border: 'none',
    background: '#e74c3c',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  toast: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 25
  }
};

export default App;
