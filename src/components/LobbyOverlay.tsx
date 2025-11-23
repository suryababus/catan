import React, { useState } from 'react';
import type { PlayerColor } from '../../shared/gameLogic';

interface LobbyPlayer {
  sessionId: string;
  name: string;
  color: PlayerColor;
  ready: boolean;
  isHost: boolean;
}

interface LobbyOverlayProps {
  players: LobbyPlayer[];
  localSessionId: string | null;
  shareUrl: string;
  roomId: string | null;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeave: () => void;
  canStart: boolean;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  players,
  localSessionId,
  shareUrl,
  roomId,
  onToggleReady,
  onStartGame,
  onLeave,
  canStart
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard error', err);
    }
  };

  const localPlayer = players.find((p) => p.sessionId === localSessionId);
  const everyoneReady = players.length > 0 && players.every((p) => p.ready);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Lobby</h2>
        {roomId && (
          <p style={{ marginTop: 0 }}>Room: <strong>{roomId}</strong></p>
        )}

        <div style={styles.shareRow}>
          <input
            type="text"
            value={shareUrl}
            readOnly
            style={styles.shareInput}
          />
          <button onClick={handleCopy} style={styles.copyButton}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div style={styles.playerList}>
          {players.map((player) => (
            <div key={player.sessionId} style={{
              ...styles.playerRow,
              borderColor: player.color,
              backgroundColor: player.ready ? 'rgba(0,0,0,0.05)' : 'white'
            }}>
              <div>
                <strong style={{ color: player.color }}>{player.name}</strong>
                {player.isHost && <span style={styles.hostBadge}>Host</span>}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                {player.ready ? 'Ready' : 'Not Ready'}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.actions}>
          <button onClick={onToggleReady} style={styles.primaryButton}>
            {localPlayer?.ready ? 'Unready' : 'Ready Up'}
          </button>
          {localPlayer?.isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart || !everyoneReady}
              style={{
                ...styles.secondaryButton,
                opacity: canStart && everyoneReady ? 1 : 0.5,
                cursor: canStart && everyoneReady ? 'pointer' : 'not-allowed'
              }}
            >
              Start Game
            </button>
          )}
          <button onClick={onLeave} style={styles.leaveButton}>Leave</button>
        </div>

        {!everyoneReady && (
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Waiting for everyone to ready up…</p>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.45)',
    zIndex: 20,
    padding: '20px'
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 15px 35px rgba(0,0,0,0.15)'
  },
  shareRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  shareInput: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #ccc'
  },
  copyButton: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: 'none',
    background: '#4a63e7',
    color: 'white',
    cursor: 'pointer'
  },
  playerList: {
    maxHeight: '240px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid transparent'
  },
  hostBadge: {
    marginLeft: '6px',
    fontSize: '0.75rem',
    background: '#f1c40f',
    borderRadius: '4px',
    padding: '2px 6px'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '8px'
  },
  primaryButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#2ecc71',
    color: 'white',
    cursor: 'pointer'
  },
  secondaryButton: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#3498db',
    color: 'white'
  },
  leaveButton: {
    flexBasis: '100%',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    background: 'transparent',
    cursor: 'pointer'
  }
};
