import React from 'react';
import type { Player, GamePhase, TurnPhase } from '../../shared/gameLogic';

interface GameHUDProps {
    players: Player[];
    currentPlayer: Player;
    gamePhase: GamePhase;
    turnPhase: TurnPhase;
    diceRoll: number | null;
    gameLog: string[];
    onRollDice: () => void;
    onEndTurn: () => void;
    canRollDice?: boolean;
    canEndTurn?: boolean;
    actionHint?: string;
}

const ResourceCard: React.FC<{ type: string; count: number; color?: string }> = ({ type, count, color }) => (
    <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        margin: '0 2px',
        backgroundColor: '#f0f0f0',
        padding: '2px 5px',
        borderRadius: '3px',
        minWidth: '30px',
        border: color ? `2px solid ${color}` : 'none'
    }}>
        <span style={{ fontSize: '10px', textTransform: 'capitalize' }}>{type.slice(0,2)}</span>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{count}</span>
    </div>
);

export const GameHUD: React.FC<GameHUDProps> = ({
    players,
    currentPlayer,
    gamePhase,
    turnPhase,
    diceRoll,
    gameLog,
    onRollDice,
    onEndTurn,
    canRollDice = true,
    canEndTurn = true,
    actionHint
}) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Let clicks pass through to canvas
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
        }}>
            {/* Top Bar: Game Info & All Player Stats */}
            <div style={{
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                justifyContent: 'space-between',
                pointerEvents: 'auto',
                alignItems: 'flex-start'
            }}>
                <div>
                    <h2 style={{ margin: 0 }}>Catan</h2>
                    <div style={{ fontSize: '14px' }}>Phase: {gamePhase}</div>
                </div>

                {/* All Players Summary */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {players.map(p => (
                        <div key={p.id} style={{ 
                            padding: '5px', 
                            border: `2px solid ${p.color}`,
                            borderRadius: '5px',
                            backgroundColor: currentPlayer.id === p.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                            opacity: currentPlayer.id === p.id ? 1 : 0.7
                        }}>
                            <div style={{ fontWeight: 'bold', color: p.color, fontSize: '14px', marginBottom: '5px' }}>
                                {p.name} ({p.victoryPoints} VP)
                            </div>
                            <div style={{ display: 'flex' }}>
                                {Object.entries(p.resources).map(([res, count]) => (
                                    <ResourceCard key={res} type={res} count={count} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ textAlign: 'right' }}>
                    <h3 style={{ margin: 0, color: currentPlayer.color }}>{currentPlayer.name}'s Turn</h3>
                    <div>{turnPhase === 'ROLL_DICE' ? 'Waiting to Roll' : 'Actions Available'}</div>
                </div>
            </div>

            {/* Middle: Dice & Log */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '20px',
                flexGrow: 1
            }}>
                {/* Log */}
                <div style={{
                    width: '250px',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    borderRadius: '5px',
                    padding: '10px',
                    overflowY: 'auto',
                    maxHeight: '200px',
                    pointerEvents: 'auto',
                    fontSize: '12px',
                    alignSelf: 'flex-start'
                }}>
                    {gameLog.map((log, i) => (
                        <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
                    ))}
                </div>

                {/* Dice Result */}
                {diceRoll && (
                    <div style={{
                        alignSelf: 'center',
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '10px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        Rolled: {diceRoll}
                    </div>
                )}
            </div>

            {/* Bottom Bar: Current Player Controls */}
            <div style={{
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                pointerEvents: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* Large Current Player Resources */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: '15px', fontWeight: 'bold', fontSize: '18px', color: currentPlayer.color }}>
                        Your Resources:
                    </div>
                    {Object.entries(currentPlayer.resources).map(([res, count]) => (
                        <div key={res} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            margin: '0 10px',
                            backgroundColor: '#f0f0f0',
                            padding: '8px',
                            borderRadius: '5px',
                            minWidth: '50px',
                            border: `2px solid ${currentPlayer.color}`
                        }}>
                            <span style={{ fontSize: '14px', textTransform: 'capitalize' }}>{res}</span>
                            <span style={{ fontWeight: 'bold', fontSize: '20px' }}>{count}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    {gamePhase === 'PLAY_TURN' && turnPhase === 'ROLL_DICE' && (
                        <button 
                            onClick={onRollDice}
                            disabled={!canRollDice}
                            style={{ 
                                padding: '10px 20px', 
                                fontSize: '16px', 
                                cursor: canRollDice ? 'pointer' : 'not-allowed',
                                opacity: canRollDice ? 1 : 0.6
                            }}
                        >
                            Roll Dice
                        </button>
                    )}

                    {/* End Turn is available after roll or during setup */}
                    {(turnPhase !== 'ROLL_DICE' || gamePhase !== 'PLAY_TURN') && (
                         <button 
                            onClick={onEndTurn}
                            disabled={!canEndTurn}
                            style={{ 
                                padding: '10px 20px', 
                                fontSize: '16px', 
                                cursor: canEndTurn ? 'pointer' : 'not-allowed',
                                opacity: canEndTurn ? 1 : 0.6
                            }}
                         >
                            {gamePhase.startsWith('SETUP') ? 'End Setup Turn' : 'End Turn'}
                        </button>
                    )}
                </div>
                {actionHint && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                        {actionHint}
                    </div>
                )}
            </div>
        </div>
    );
};
