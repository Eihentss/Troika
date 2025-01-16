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

    const handleCardPlay = async (card) => {
        if (!card || !card.code) {
            console.error('Invalid card object:', card);
            return;
        }

        if (currentTurn === players.find((player) => player.id === currentUserId)?.name) {
            setAnimatingCard(card);

            try {
                const response = await axios.post(`/game/${lobby.id}/play-card`, {
                    card: card.code,
                    player_id: currentUserId,
                });

                // Update played cards with the correct card object from the response
                const playedCard = response.data.playedCard;
                setPlayedCards(prev => [...prev, playedCard]);

                // Update cards state to remove the played card and add any new cards
                setCards(prevCards => {
                    const newCards = response.data.newCards || [];
                    return [
                        ...prevCards.filter(c => c.code !== (typeof card.code === 'object' ? card.code.code : card.code)),
                        ...newCards
                    ];
                });

                setNotification({
                    visible: true,
                    message: response.data.message || 'Card played successfully!'
                });
            } catch (error) {
                console.error('Error playing card:', error.response?.data || error.message);
                setNotification({
                    visible: true,
                    message: error.response?.data?.error || 'Error playing card'
                });
            } finally {
                setAnimatingCard(null);
            }
        } else {
            setNotification({
                visible: true,
                message: "It's not your turn!"
            });
        }
    };

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


    const handleDragStart = (card) => {
        setDraggedCard(card);  // Store dragged card
        console.log('Dragged card:', card);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (draggedCard) {
            handleCardPlay(draggedCard);  // Play the card when dropped
            setDraggedCard(null);  // Reset the dragged card
        }

    };

    const handleDragOver = (e) => {
        e.preventDefault();  // Allow drop by preventing default behavior

    };


    useEffect(() => {
        const fetchCurrentTurnPlayer = async () => {
            try {
                const response = await axios.get(`/game/${lobby.id}/current-turn-player`);
                if (response.data.name) {
                    setCurrentTurn(response.data.name);
                }
            } catch (error) {
                console.error('Error fetching current turn player:', error);
            }
        };


        const interval = setInterval(fetchCurrentTurnPlayer, 5000);
        fetchCurrentTurnPlayer();

        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [lobby.id]);

    useEffect(() => {
        const fetch_game = async () => {
            try {
                const response = await axios.get(`/game/${lobby.id}/game`);
                setCards(response.data);
            } catch (error) {
                console.error('Error fetching current turn player:', error);
            }
        };


        const interval = setInterval(fetch_game, 2000);
        fetch_game();

        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [lobby.id]);


    const handleCardClick = (card) => {
        setFlippedCards((prevFlippedCards) => {
            // Only flip the card if it's not already flipped
            if (!prevFlippedCards.some((flippedCard) => flippedCard.code === card.code)) {
                return [...prevFlippedCards, card];
            }
            return prevFlippedCards;
        });
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
    const discardedCount = allDiscardedCards.length;
    const deckCount = allDeckCards.length;

    return (
        <div className="game-container">

            <button
                onClick={handleLeaveGame}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200"
            >
                Leave Game
            </button>

            <div
                className={`absolute top-4 left-4 font-bold py-2 px-4 rounded-lg shadow-md ${currentTurn === players.find(player => player.id === currentUserId)?.name ? 'bg-green-500' : 'bg-red-500'
                    }`}
            >
                Current Turn: {currentTurn || 'Unknown'}
            </div>
            {notification.visible && (
                <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-4 py-4 rounded-lg shadow-md">
                    <div className="text-center font-bold text-lg mb-2  ">{notification.message}</div>
                </div>
            )}
            {/* Game Center Area */}

            <div className="center-area-container absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                {/* Deck Pile */}
                <div className="deck-pile relative w-48 h-48 border-4 border-blue-500 rounded-lg bg-blue-50/20">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full">
                        {deckCount} cards
                    </div>
                    {allDeckCards.slice(-5).map((_, index) => (
                        <div
                            key={index}
                            className="deck-card absolute w-24"
                            style={{
                                top: `${50 - index * 2}%`,
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: index
                            }}
                        >
                            <img
                                src="https://deckofcardsapi.com/static/img/back.png"
                                alt="Card Back"
                                className="w-full h-auto shadow-md"
                            />
                        </div>
                    ))}
                </div>
                {/* Play Area */}
                <div
                    className="play-area relative w-48 h-48 border-4 border-green-500 rounded-lg bg-green-50/20"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {playedCards.map((card, index) => (
                        <div
                            key={card.code}
                            className="deck-card absolute w-24"
                            style={{
                                zIndex: index,
                                transform: `rotate(${Math.random() * 30 - 15}deg)`
                            }}
                        >
                            <img src={card.image} alt={`${card.value} of ${card.suit}`} className="w-full h-auto" />
                        </div>
                    ))}
                </div>

                {/* Discard Pile */}
                <div className="discard-pile relative w-48 h-48 border-4 border-red-500 rounded-lg bg-red-50/20">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full">
                        {discardedCount} cards
                    </div>
                    {allDiscardedCards.slice(-5).map((card, index) => (
                        <div
                            key={card.code}
                            className="discarded-card absolute w-24"
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${Math.random() * 30 - 15}deg)`,
                                zIndex: index
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
                                        onClick={() => handleCardClick(card)}
                                    >
                                        {flippedCards.some((flippedCard) => flippedCard.code === card.code) ? (
                                            <img
                                                src={card.image}
                                                alt={`Card ${card.code}`}
                                                draggable="true"
                                                onDragStart={(e) => handleDragStart(e, card)}
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

                                        draggable="true"
                                        onDragStart={() => handleDragStart(card)} // Handle dragging
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

                                            draggable="true"
                                            onDragStart={() => handleDragStart(card)} // Handle dragging
                                        >
                                            <img src={card.image} alt={`${card.value} of ${card.suit}`} />
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
