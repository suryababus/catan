import { useState, useCallback } from 'react';
import type { 
    Player, 
    GamePhase, 
    TurnPhase, 
    PlacedStructure, 
    BoardVertex,
    BoardEdge
} from '../../shared/gameLogic';
import { 
    validateSettlementPlacement, 
    validateRoadPlacement,
    getResourcesForRoll
} from '../../shared/gameLogic';
import { BUILDING_COSTS, TERRAIN_RESOURCES } from '../../shared/types';
import type { Resources, HexData } from '../../shared/types';

const INITIAL_RESOURCES: Resources = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };

const INITIAL_PLAYERS: Player[] = [
    { id: 0, color: 'red', name: 'Red', resources: { ...INITIAL_RESOURCES }, victoryPoints: 0, structures: { roads: 15, settlements: 5, cities: 4 } },
    { id: 1, color: 'blue', name: 'Blue', resources: { ...INITIAL_RESOURCES }, victoryPoints: 0, structures: { roads: 15, settlements: 5, cities: 4 } },
    { id: 2, color: 'white', name: 'White', resources: { ...INITIAL_RESOURCES }, victoryPoints: 0, structures: { roads: 15, settlements: 5, cities: 4 } },
    { id: 3, color: 'orange', name: 'Orange', resources: { ...INITIAL_RESOURCES }, victoryPoints: 0, structures: { roads: 15, settlements: 5, cities: 4 } },
];

export const useGameState = (
    boardData: HexData[],
    vertices: BoardVertex[],
    edges: BoardEdge[]
) => {
    const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP_ROUND_1');
    const [turnPhase, setTurnPhase] = useState<TurnPhase>('BUILDING'); // During setup, effectively 'BUILDING'
    const [placedStructures, setPlacedStructures] = useState<PlacedStructure[]>([]);
    const [diceRoll, setDiceRoll] = useState<number | null>(null);
    const [gameLog, setGameLog] = useState<string[]>(["Game Started. Setup Round 1."]);

    const currentPlayer = players[currentPlayerIndex];

    const addLog = (msg: string) => setGameLog(prev => [msg, ...prev].slice(0, 50));

    // --- Helper: Check Affordability ---
    const canAfford = (cost: Resources) => {
        const p = currentPlayer;
        return (
            p.resources.wood >= cost.wood &&
            p.resources.brick >= cost.brick &&
            p.resources.sheep >= cost.sheep &&
            p.resources.wheat >= cost.wheat &&
            p.resources.ore >= cost.ore
        );
    };

    // --- Helper: Pay Cost ---
    const payCost = (playerId: number, cost: Resources) => {
        setPlayers(prev => prev.map(p => {
            if (p.id !== playerId) return p;
            return {
                ...p,
                resources: {
                    wood: p.resources.wood - cost.wood,
                    brick: p.resources.brick - cost.brick,
                    sheep: p.resources.sheep - cost.sheep,
                    wheat: p.resources.wheat - cost.wheat,
                    ore: p.resources.ore - cost.ore,
                }
            };
        }));
    };

    // --- Action: Roll Dice ---
    const rollDice = useCallback(() => {
        if (gamePhase !== 'PLAY_TURN' || turnPhase !== 'ROLL_DICE') return;

        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const roll = d1 + d2;
        setDiceRoll(roll);
        addLog(`${currentPlayer.name} rolled ${roll} (${d1}+${d2})`);

        if (roll === 7) {
            addLog("Robber moved! (Logic pending)");
            // TODO: Implement Robber logic
        } else {
            // Distribute Resources
            const distribution = getResourcesForRoll(roll, boardData, placedStructures, vertices);
            
            if (distribution.size > 0) {
                setPlayers(prev => prev.map(p => {
                    const gain = distribution.get(p.color);
                    if (!gain) return p;
                    
                    const newResources = { ...p.resources };
                    Object.entries(gain).forEach(([key, amount]) => {
                         if (amount) newResources[key as keyof Resources] += amount;
                    });
                    
                    // Simplified log for brevity
                    // addLog(`${p.name} got resources`);
                    return { ...p, resources: newResources };
                }));
            } else {
                addLog("No resources produced.");
            }
        }

        setTurnPhase('BUILDING'); // Skipping trading for now, go straight to build/pass
    }, [gamePhase, turnPhase, currentPlayer, boardData, placedStructures, vertices]);

    // --- Action: End Turn ---
    const endTurn = useCallback(() => {
        if (gamePhase === 'SETUP_ROUND_1') {
            if (currentPlayerIndex < 3) {
                setCurrentPlayerIndex(prev => prev + 1);
            } else {
                setGamePhase('SETUP_ROUND_2');
                addLog("Setup Round 2 (Reverse Order)");
                // Keep current player (3), just switch phase logic to allow another placement
            }
        } else if (gamePhase === 'SETUP_ROUND_2') {
            if (currentPlayerIndex > 0) {
                setCurrentPlayerIndex(prev => prev - 1);
            } else {
                setGamePhase('PLAY_TURN');
                setTurnPhase('ROLL_DICE');
                addLog("Game Started! Red's Turn.");
            }
        } else if (gamePhase === 'PLAY_TURN') {
            setCurrentPlayerIndex(prev => (prev + 1) % 4);
            setTurnPhase('ROLL_DICE');
            setDiceRoll(null);
        }
    }, [gamePhase, currentPlayerIndex]);

    // --- Action: Build Structure ---
    const buildStructure = useCallback((type: 'road' | 'settlement', locationId: string) => {
        const cost = BUILDING_COSTS[type];
        
        // 1. Check setup phase limits
        if (gamePhase.startsWith('SETUP')) {
            // Check if player already placed structure for this turn
            // Setup turn: 1 Settlement AND 1 Road
            // We need to track what they placed THIS turn. 
            // Simplified: Just allow 1 of each. 
            // We can calculate based on total count.
            // Setup 1: Should have 1 settlement, 1 road.
            // Setup 2: Should have 2 settlements, 2 roads.
            
            const myStructs = placedStructures.filter(s => s.color === currentPlayer.color);
            const settlementCount = myStructs.filter(s => s.type === 'settlement').length;
            const roadCount = myStructs.filter(s => s.type === 'road').length;
            
            const expectedCount = gamePhase === 'SETUP_ROUND_1' ? 0 : 1; // Before placing
            
            // If trying to place settlement
            if (type === 'settlement') {
                if (settlementCount > expectedCount) {
                    addLog("Already placed settlement for this setup round.");
                    return;
                }
                
                if (!validateSettlementPlacement(locationId, currentPlayer.color, placedStructures, edges, true)) {
                    return; // Log handled in validator
                }

                // Place it
                const newStruct: PlacedStructure = {
                    id: `${type}-${Date.now()}`,
                    type,
                    color: currentPlayer.color,
                    locationId
                };
                setPlacedStructures(prev => [...prev, newStruct]);
                addLog(`${currentPlayer.name} placed a Settlement.`);
                
                // Award 1 VP
                setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, victoryPoints: p.victoryPoints + 1 } : p));

                // If Setup 2, give resources for adjacent hexes immediately
                if (gamePhase === 'SETUP_ROUND_2') {
                     // Find adjacent hexes
                     const vertex = vertices.find(v => v.id === locationId);
                     if (vertex) {
                        const newRes = { ...currentPlayer.resources };
                        vertex.adjacentHexes.forEach(hKey => {
                            const [q, r] = hKey.split(',').map(Number);
                            const hex = boardData.find(b => b.q === q && b.r === r);
                            if (hex && hex.terrain !== 'desert') {
                                const resourceType = TERRAIN_RESOURCES[hex.terrain];
                                if (resourceType) {
                                    newRes[resourceType] += 1;
                                }
                            }
                        });
                        setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, resources: newRes } : p));
                     }
                }

            } else if (type === 'road') {
                 if (roadCount > expectedCount) {
                    addLog("Already placed road for this setup round.");
                    return;
                }
                // Must place settlement first in setup? Usually yes.
                if (settlementCount === expectedCount) {
                    addLog("Place Settlement before Road.");
                    return;
                }

                // Validate connection to the just-placed settlement (or existing ones)
                // Setup rule: Road must connect to the settlement just placed? 
                // Official rules: "place a road adjacent to that settlement".
                // Since we just allowed 'validateSettlement' to be free, we must ensure road connects to OUR structures.
                if (!validateRoadPlacement(locationId, currentPlayer.color, placedStructures, edges)) {
                    return;
                }

                 const newStruct: PlacedStructure = {
                    id: `${type}-${Date.now()}`,
                    type,
                    color: currentPlayer.color,
                    locationId
                };
                setPlacedStructures(prev => [...prev, newStruct]);
                addLog(`${currentPlayer.name} placed a Road.`);
                
                // Auto-end turn in setup if both placed
                if (settlementCount === (expectedCount + 1) && roadCount === expectedCount) {
                     setTimeout(endTurn, 500);
                }
            }

        } else {
            // PLAY_TURN
            if (turnPhase !== 'BUILDING') return;
            
            if (!canAfford(cost)) {
                addLog("Not enough resources.");
                return;
            }

            let isValid = false;
            if (type === 'settlement') {
                isValid = validateSettlementPlacement(locationId, currentPlayer.color, placedStructures, edges);
            } else {
                isValid = validateRoadPlacement(locationId, currentPlayer.color, placedStructures, edges);
            }

            if (isValid) {
                payCost(currentPlayer.id, cost);
                const newStruct: PlacedStructure = {
                    id: `${type}-${Date.now()}`,
                    type,
                    color: currentPlayer.color,
                    locationId
                };
                setPlacedStructures(prev => [...prev, newStruct]);
                addLog(`${currentPlayer.name} built a ${type}.`);
                 if (type === 'settlement') {
                    setPlayers(prev => prev.map(p => p.id === currentPlayer.id ? { ...p, victoryPoints: p.victoryPoints + 1 } : p));
                }
            }
        }
    }, [gamePhase, turnPhase, currentPlayer, placedStructures, edges, boardData, vertices, canAfford, payCost, endTurn]);


    return {
        players,
        currentPlayer,
        gamePhase,
        turnPhase,
        diceRoll,
        placedStructures,
        gameLog,
        rollDice,
        endTurn,
        buildStructure
    };
};
