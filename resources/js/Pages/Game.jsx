import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

const Game = ({ lobby, players, is_creator = false, currentUserId, currentTurnPlayerId = null }) => {
    const [gameInitialized, setGameInitialized] = useState(false);
    const [cards, setCards] = useState({});
    const [currentTurn, setCurrentTurn] = useState(currentTurnPlayerId);
    const [playedCards, setPlayedCards] = useState([]);

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
                    await axios.post(`/game/${lobby.id}/initialize`);
                    setGameInitialized(true);
                } catch (error) {
                    console.error('Error initializing game:', error);
                }
            }
        };

        const fetchCards = async () => {
            try {
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

    const handleCardPlay = async (card) => {
        if (currentUserId !== currentTurn) {
            alert("It's not your turn!");
            return;
        }
    
        try {
            const response = await axios.post(`/game/${lobby.id}/play-card`, { card_code: card.code });
            setPlayedCards((prev) => [...prev, response.data.card]);
            setCurrentTurn(response.data.nextPlayerId);
        } catch (error) {
            console.error('Error playing card:', error);
        }
    };

    const handleLeaveGame = () => {
        router.get(route('lobbies.index'));
    };

    const currentTurnPlayer = players.find(player => player.id === currentTurn);

    return (
        <div className="game-container">
            <button
                onClick={handleLeaveGame}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
            >
                Leave Game
            </button>

            {/* Current turn information */}
            <div className="absolute top-4 left-4 bg-gray-800 text-white font-bold py-2 px-4 rounded-lg shadow-md">
            Current Turn: {currentTurnPlayer ? currentTurnPlayer.name : 'Unknown'}
        </div>

            {/* Played cards */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-green-500 rounded-lg bg-green-50/20">
                <div className="w-full h-full flex items-center justify-center text-green-600 font-semibold">
                    {playedCards.map((card) => (
                        <img key={card.code} src={card.image} alt={`${card.value} of ${card.suit}`} />
                    ))}
                </div>
            </div>

            {players.map((player, index) => {
    const playerCards = cards[player.id] || { faceUp: [], faceDown: [] };
    let positionClass = 'second-player';

    // Set position for the current user (bottom of the screen)
    if (player.id === 1) {
        positionClass = 'bottom-player';
    } 
    // Set position for the third player (left side of the screen)
    else if (index === 2) {
        positionClass = 'third-player';
    }
    else if (index === 3) {
        positionClass = 'four-player';
    }
    else if (index === 4) {
        positionClass = 'four-player';
    }

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
                    {playerCards.faceUp.map((card) => (
                        <div key={card.code} className="card" onClick={() => handleCardPlay(card)}>
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
