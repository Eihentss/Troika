import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

const Game = ({ lobby, players, is_creator = false, currentUserId }) => {
    const [gameInitialized, setGameInitialized] = useState(false);
    const [deckId, setDeckId] = useState(null); // To store the deck ID
    const [cards, setCards] = useState({}); // Stores cards for each player

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
                setGameInitialized(true);
            }
        };

        const fetchCards = async () => {
            try {
                // Create a new deck only once
                if (!deckId) {
                    const deckResponse = await axios.get('https://deckofcardsapi.com/api/deck/new/shuffle/');
                    setDeckId(deckResponse.data.deck_id);

                    // Deal cards to players (3 face-down cards and 3 face-up cards)
                    const dealResponse = await axios.get(`https://deckofcardsapi.com/api/deck/${deckResponse.data.deck_id}/draw/?count=18`);
                    const playerCards = dealResponse.data.cards;

                    // Organize the cards for each player
                    const organizedCards = {};
                    players.forEach((player, index) => {
                        organizedCards[player.id] = {
                            faceDown: playerCards.slice(index * 3, index * 3 + 3), // Slice 3 cards for face-down
                            faceUp: playerCards.slice(index * 3 + 3, index * 3 + 6), // Next 3 cards for face-up
                        };
                    });

                    setCards(organizedCards);
                }
            } catch (error) {
                console.error('Error fetching cards:', error);
            }
        };

        if (!gameInitialized) {
            initializeGame();
        }

        // Fetch cards only when game is initialized and deck is not yet set
        if (gameInitialized && !deckId) {
            fetchCards();
        }
    }, [lobby.id, is_creator, gameInitialized, deckId, players]);

    return (
        <div className="game-container">
            {players.map((player) => {
                const playerCards = cards[player.id] || { faceUp: [], faceDown: [] };
                const positionClass =
                    player.id === currentUserId
                        ? 'bottom-player'
                        : 'other-player';

                return (
                    <div className={`player ${positionClass}`} key={player.id}>
                        <div className="player-name">
                            {/* Show the player's name */}
                            <strong>{player.name}</strong>
                        </div>
                        <div className="cards">
                            <div className="face-down">
                                {/* Show face-down cards (with the back image) */}
                                {playerCards.faceDown.map((card) => (
                                    <div key={card.code} className="card">
                                        <img src="https://deckofcardsapi.com/static/img/back.png" alt="Card Back" />
                                    </div>
                                ))}
                            </div>

                            {/* Show face-up cards above face-down cards */}
                            <div className="face-up">
                                {playerCards.faceUp.map((card, index) => (
                                    <div
                                        key={card.code}
                                        className={`card ${index !== 0 ? 'tilted-card' : ''}`}
                                    >
                                        <img
                                            src={card.image}
                                            alt={`${card.value} of ${card.suit}`}
                                        />
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
