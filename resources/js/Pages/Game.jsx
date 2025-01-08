import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

const Game = ({ lobby, players, is_creator = false, currentUserId }) => {
    const [gameInitialized, setGameInitialized] = useState(false);
    const [cards, setCards] = useState({});
    const [currentTurn, setCurrentTurn] = useState(null);
    const [playedCard, setPlayedCard] = useState(null); 

    useEffect(() => {
        const initializeGame = async () => {
            if (!is_creator) {
                try {
                    const response = await axios.get(`/api/lobbies/${lobby.id}`);
                    const updatedLobby = response.data;
                    if (updatedLobby.status === 'playing') {
                        setGameInitialized(true);
                    }
                } catch (error) {
                    console.error('Game initialization error:', error);
                }
            } else {
                try {
                    // Updated route to match Laravel route
                    await axios.post(`/game/${lobby.id}/initialize`);
                    const randomPlayerIndex = Math.floor(Math.random() * players.length);
                    setCurrentTurn(players[randomPlayerIndex].id);
                    setGameInitialized(true);
                } catch (error) {
                    console.error('Error initializing game:', error);
                }
            }
        };

        const fetchCards = async () => {
            try {
                // Updated route to match Laravel route
                const response = await axios.get(`/game/${lobby.id}/cards`);
                const playerCards = response.data;
                
                const organizedCards = {};
                Object.keys(playerCards).forEach(playerId => {
                    organizedCards[playerId] = {
                        faceDown: playerCards[playerId].filter(card => card.type === 'face_down'),
                        faceUp: playerCards[playerId].filter(card => card.type === 'face_up')
                    };
                });
                
                setCards(organizedCards);
            } catch (error) {
                console.error('Error fetching cards:', error);
            }
        };

        if (!gameInitialized) {
            initializeGame();
        }

        if (gameInitialized) {
            fetchCards();
        }
    }, [lobby.id, is_creator, gameInitialized]);

    const handleLeaveGame = () => {
        router.get(route('lobbies.index'));
    };

    const handleCardClick = (card, playerId) => {
        // Only allow card placement if it's the player's turn
        if (currentTurn === playerId && currentUserId === playerId) {
            setPlayedCard(card);
            // Switch turn to the next player
            const currentPlayerIndex = players.findIndex(p => p.id === currentTurn);
            const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
            setCurrentTurn(players[nextPlayerIndex].id);
        }
    };
    
    return (
        
        <div className="game-container">
            <button
                onClick={handleLeaveGame}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
            >
                Leave Game
            </button>

                        {/* Turn Indicator */}
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-100 px-4 py-2 rounded-lg shadow-md">
                {currentTurn && (
                    <div className="text-center">
                        <span className="font-semibold">Current Turn: </span>
                        {players.find(p => p.id === currentTurn)?.name}
                        {currentTurn === currentUserId && " (Your Turn)"}
                    </div>
                )}
            </div>


            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-green-500 rounded-lg bg-green-50/20">
                <div className="w-full h-full flex items-center justify-center text-green-600 font-semibold">
                    Drop Cards Here
                </div>
            </div>

            {players.map((player) => {
                const playerCards = cards[player.id] || { faceUp: [], faceDown: [] };
                const positionClass = player.id === currentUserId ? 'bottom-player' : 'other-player';

                return (
                    
                    <div className={`player ${positionClass}`} key={player.id}>
                        <div className="player-name">
                            <strong>{player.name}</strong>
                        </div>
                        <div className="cards">
                            <div className="face-down">
                                {playerCards.faceDown.map((card) => (
                                    <div key={card.code} className="card">
                                        <img src="https://deckofcardsapi.com/static/img/back.png" alt="Card Back" />
                                    </div>
                                ))}
                            </div>
                            <div className="face-up">
                                    {playerCards.faceUp.map((card, index) => (
                                        <div 
                                            key={card.code} 
                                            className={`card ${index !== 0 ? 'tilted-card' : ''} ${
                                                currentTurn && player.id === currentUserId ? 'cursor-pointer hover:scale-105' : ''
                                            }`}
                                            onClick={() => handleCardClick(card, player.id)}
                                        >
                                            <img src={card.image} alt={`${card.value} of ${card.suit}`} />
                                        </div>
                                    ))}
                                </div>
                        </div>
                    </div>
                    
                );
            })}
        </div>
    );
};

export default Game;