import React, { useState, useEffect } from 'react';
import { Users, User, Crown, RefreshCw } from 'lucide-react';

const Game = ({ lobby, players, is_creator = false }) => {
    const [gameState, setGameState] = useState({
        deckId: null,
        currentPlayer: null,
        drawnCards: {},
        roundWinner: null,
        gameStarted: false,
        loading: false,
        error: null
    });

    useEffect(() => {
        if (!gameState.gameStarted && is_creator) {
            initializeGame();
        }
    }, [is_creator, gameState.gameStarted]);

    const initializeGame = async () => {
        try {
            setGameState(prev => ({ ...prev, loading: true }));
            const response = await fetch('https://deckofcardsapi.com/api/deck/new/shuffle/');
            const data = await response.json();
            setGameState(prev => ({
                ...prev,
                deckId: data.deck_id,
                currentPlayer: players[0].id,
                gameStarted: true,
                loading: false
            }));
        } catch (error) {
            setGameState(prev => ({
                ...prev,
                error: 'Failed to initialize game',
                loading: false
            }));
        }
    };

    const drawCard = async () => {
        try {
            setGameState(prev => ({ ...prev, loading: true }));
            const response = await fetch(
                `https://deckofcardsapi.com/api/deck/${gameState.deckId}/draw/?count=1`
            );
            const data = await response.json();
            const card = data.cards[0];
            const userId = window.__auth?.user?.id;

            setGameState(prev => ({
                ...prev,
                drawnCards: {
                    ...prev.drawnCards,
                    [userId]: card
                },
                loading: false
            }));

            const currentPlayerIndex = players.findIndex(p => p.id === gameState.currentPlayer);
            const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
            const nextPlayer = players[nextPlayerIndex];

            if (Object.keys(gameState.drawnCards).length === players.length - 1) {
                determineWinner();
            } else {
                setGameState(prev => ({
                    ...prev,
                    currentPlayer: nextPlayer.id
                }));
            }
        } catch (error) {
            setGameState(prev => ({
                ...prev,
                error: 'Failed to draw card',
                loading: false
            }));
        }
    };

    const getCardValue = (card) => {
        const values = {
            'ACE': 14,
            'KING': 13,
            'QUEEN': 12,
            'JACK': 11
        };
        return values[card.value] || parseInt(card.value);
    };

    const determineWinner = () => {
        const cardValues = Object.entries(gameState.drawnCards).map(([playerId, card]) => ({
            playerId,
            value: getCardValue(card)
        }));

        const winner = cardValues.reduce((highest, current) => {
            return current.value > highest.value ? current : highest;
        });

        setGameState(prev => ({
            ...prev,
            roundWinner: winner.playerId,
            gameStarted: false
        }));
    };

    const startNewRound = () => {
        setGameState(prev => ({
            ...prev,
            drawnCards: {},
            roundWinner: null,
            gameStarted: true,
            currentPlayer: players[0].id
        }));
    };

    const getCurrentUserId = () => window.__auth?.user?.id;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="w-full max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <span className="text-2xl font-semibold">Card Game</span>
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                </div>
                <div className="p-6">
                    {gameState.error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                            {gameState.error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Players
                            </h2>
                            {players.map((player) => (
                                <div
                                    key={player.id}
                                    className={`p-4 rounded-lg border ${
                                        player.id === gameState.currentPlayer
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{player.name}</span>
                                        {gameState.drawnCards[player.id] && (
                                            <div className="flex items-center">
                                                <img
                                                    src={gameState.drawnCards[player.id].image}
                                                    alt={`${player.name}'s card`}
                                                    className="w-12 h-16 object-contain"
                                                />
                                            </div>
                                        )}
                                        {player.id === gameState.roundWinner && (
                                            <Crown className="w-5 h-5 text-yellow-500" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4">
                            {gameState.gameStarted ? (
                                <button
                                    onClick={drawCard}
                                    disabled={
                                        gameState.loading ||
                                        gameState.currentPlayer !== getCurrentUserId()
                                    }
                                    className="w-full bg-blue-500 text-white p-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                                >
                                    {gameState.loading ? (
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        'Draw Card'
                                    )}
                                </button>
                            ) : (
                                is_creator && (
                                    <button
                                        onClick={startNewRound}
                                        disabled={gameState.loading}
                                        className="w-full bg-green-500 text-white p-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
                                    >
                                        Start New Round
                                    </button>
                                )
                            )}

                            {gameState.roundWinner && (
                                <div className="p-4 bg-yellow-50 rounded-lg">
                                    <h3 className="text-lg font-semibold text-yellow-700">
                                        Round Winner:
                                    </h3>
                                    <p className="text-yellow-600">
                                        {players.find(p => p.id === gameState.roundWinner)?.name}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Game;