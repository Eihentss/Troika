import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';

const Game = ({ lobby, players, is_creator = false, currentUserId }) => {
    // Previous state declarations remain the same
    const [gameInitialized, setGameInitialized] = useState(false);
    const [cards, setCards] = useState([]);
    const [currentTurn, setCurrentTurn] = useState();
    const [playedCards, setPlayedCards] = useState([]);
    const [animatingCard, setAnimatingCard] = useState(null);
    const [notification, setNotification] = useState({ visible: false, message: '' });
    const [draggedCard, setDraggedCard] = useState(null);  // To store the dragged card
    const [flippedCards, setFlippedCards] = useState([]);  // To track which cards are flipped

    // Previous useEffect and handler functions remain the same


       



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
                setCards(response.data);
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

   

    useEffect(() => {
        if (notification.visible) {
            const timer = setTimeout(() => {
                setNotification({ visible: false, message: '' });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);


    const handleLeaveGame = () => {
        router.get(route('lobbies.index'));
    };





   

    



    const getPositionClasses = (player, index) => {
        let positionClass = 'second-player';
        let handClass = 'hand-top';

        if (player.id === currentUserId) {
            positionClass = 'bottom-player';
            handClass = 'hand-bottom';
        } else if (index === 2) {
            positionClass = 'third-player';
            handClass = 'hand-left';
        } else if (index === 3) {
            positionClass = 'four-player';
            handClass = 'hand-right';
        }

        return { positionClass, handClass };
    };




    

    const allDiscardedCards = cards.filter(card => card.type === "discarded");
    const allDeckCards = cards.filter(card => card.type === "in_deck");


    return (
        <div className="game-container">

            <button
                onClick={handleLeaveGame}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
            >
                Leave Game
            </button>

            <div
                className={`absolute top-4 left-4 font-bold py-2 px-4 rounded-lg shadow-md`}
            >
                Current Turn: {currentTurn || 'Unknown'}
            </div>

            {/* Game Center Area */}

            <div className="center-area-container absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">

                <div
                    className="play-area relative w-48 h-48 border-4 border-green-500 rounded-lg bg-green-50/20"

                >
                    {playedCards.map((card, index) => (
                        <div
                            key={`${card.code}-${card.updated_at}`}
                            className="deck-card absolute w-24"
                            style={{
                                zIndex: index,
                            }}
                        >
                            <img src={card.image} alt={`${card.value} of ${card.suit}`} className="w-full h-auto" />
                        </div>
                    ))}
                </div>

            </div>

            {/* Player sections remain the same */}
            {players.map((player, index) => {
                const { positionClass, handClass } = getPositionClasses(player, index);
                const playerCards = cards.filter(card => card.player_id === player.id);
                const handCards = playerCards.filter(card => card.type === "hand");
                const faceUpCards = playerCards.filter(card => card.type === "face_up");
                const faceDownCards = playerCards.filter(card => card.type === "face_down");

                return (
                    <div className={`player ${positionClass}`} key={player.id}>
                        <div className={`player-name ${player.id === currentUserId ? 'bottom-name' : 'top-name'}`}>
                            <strong>{player.name}</strong>
                        </div>
                        <div className="cards">
                            <div className="face-down">
                                {faceDownCards.map((card) => (
                                    <div
                                        key={card.code}
                                        className="card"

                                    >
                                        {flippedCards.some((flippedCard) => flippedCard.code === card.code) ? (
                                            <img
                                                src={card.image}
                                                alt={`Card ${card.code}`}

                                            />
                                        ) : (
                                            <img
                                                src="https://deckofcardsapi.com/static/img/back.png"
                                                alt="Card Back"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="face-up">
                                {faceUpCards.map((card) => (
                                    <div
                                        key={`${card.code}-${index}`}  // Use a combination of card.code and index to ensure uniqueness
                                        className={`card tilted-card ${animatingCard === card.code ? 'animate-to-center' : ''}`}
                                    >
                                        <img src={card.image} alt={`${card.value} of ${card.suit}`} />
                                    </div>
                                ))}
                            </div>
                            {(player.name) ? (
                                <div className={`hand ${handClass}`}>
                                    {handCards.map((card) => (
                                        <div
                                            key={`${card.code}`}  // Use a combination of card.code and index to ensure uniqueness
                                            className={`card ${animatingCard === card.code ? 'animate-to-center' : ''}`}
                                        >
                                        <img 
                                            src="https://deckofcardsapi.com/static/img/back.png"
                                            alt={`${card.value} of ${card.suit}` }
  
                                        />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="hand-container"></div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Game;
