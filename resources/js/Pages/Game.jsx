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


        const checkForForcedPickup = async () => {
        if (currentTurn === players.find(player => player.id === currentUserId)?.name) {
            try {
                const response = await axios.post(`/game/${lobby.id}/forced-pickup`, {
                    checkOnly: true
                });

                if (response.data.mustPickUp) {
                    // Update the local state with the new cards
                    setCards(prevCards => {
                        const nonPlayedCards = prevCards.filter(card => card.type !== 'played');
                        const newHandCards = response.data.pickedUpCards.map(card => ({
                            ...card,
                            type: 'hand',
                            player_id: currentUserId
                        }));
                        return [...nonPlayedCards, ...newHandCards];
                    });

                    setPlayedCards([]);

                    setNotification({
                        visible: true,
                        message: "No playable cards. Picked up all cards from the pile."
                    });
                }
            } catch (error) {
                console.error('Error checking for forced pickup:', error);
            }
        }
    };

    useEffect(() => {
        if (currentTurn) {
            checkForForcedPickup();

            const interval = setInterval(checkForForcedPickup, 5000);
            checkForForcedPickup();

        return () => clearInterval(interval); // Cleanup interval on unmount
        }
    }, [currentTurn]);



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
                // console.error('Error playing card:', error.response?.data || error.message);
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
            setDraggedCard(card);
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


        const interval = setInterval(fetchCurrentTurnPlayer, 1000);
        fetchCurrentTurnPlayer();

        return () => clearInterval(interval); // Cleanup interval on unmount
    }, [lobby.id]);

    useEffect(() => {
        const fetch_game = async () => {
            try {
                const response = await axios.get(`/game/${lobby.id}/game`);
                const cardsArray = Array.isArray(response.data.cards) ? response.data.cards : [];
                
                // Set regular cards (excluding played ones)
                setCards(cardsArray.filter(card => card.type !== 'played'));
                
                // Get played cards and sort by timestamp in ascending order
                // This will put newest cards last in the array
                const playedCardsData = cardsArray
                    .filter(card => card.type === 'played')
                    .sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));
                
                setPlayedCards(playedCardsData);
            } catch (error) {
                console.error('Error fetching game data:', error);
            }
        };
    
        const interval = setInterval(fetch_game, 2000);
        fetch_game();
    
        return () => clearInterval(interval);
    }, [lobby.id]);


    const handleCardClick = (card) => {

            setFlippedCards((prevFlippedCards) => {
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


    const canPlayCard = (card, lastPlayedCard) => {
        if (!lastPlayedCard) return true;
        
        const valueMap = {
            'ACE': 14, 'KING': 13, 'QUEEN': 12, 'JACK': 11,
            '10': 15, '9': 9, '8': 8, '7': 7, '6': 6,
            '5': 5, '4': 4, '3': 3, '2': 2
        };

        // If the last played card was a 6, any card can be played
        if (lastPlayedCard.value === '6') return true;
        // If this card is a 6, it can be played on anything
        if (card.value === '6') return true;

        return valueMap[card.value] >= valueMap[lastPlayedCard.value];
    };

    const getCardStyle = (card) => {
        const lastPlayedCard = playedCards[playedCards.length - 1];
        const isPlayable = canPlayCard(card, lastPlayedCard);
        const isCurrentPlayerTurn = currentTurn === players.find(player => player.id === currentUserId)?.name;

        return {
            border: isCurrentPlayerTurn ? (isPlayable ? '2px solid rgb(34, 197, 94)' : '2px solid rgb(239, 68, 68)') : 'none',
            borderRadius: '8px',
            transition: 'all 0.3s ease'
        };
    };

    const allDiscardedCards = cards.filter(card => card.type === "discarded");
    const allDeckCards = cards.filter(card => card.type === "in_deck");
    const discardedCount = allDiscardedCards.length;
    const deckCount = allDeckCards.length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 to-emerald-950 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
                <button
                    onClick={handleLeaveGame}
                    className="px-6 py-3 bg-red-500/90 hover:bg-red-600/90 text-white font-semibold rounded-full shadow-lg backdrop-blur-sm transition-all duration-300"
                >
                    Leave Game
                </button>

                <div className={`px-6 py-3 rounded-full shadow-lg backdrop-blur-sm ${
                    currentTurn === players.find(player => player.id === currentUserId)?.name 
                    ? 'bg-green-500/90 text-white' 
                    : 'bg-red-500/90 text-white'
                }`}>
                    <span className="font-semibold">Current Turn:</span> {currentTurn || 'Unknown'}
                </div>
            
            </div>
            {/* Game Center Area */}

            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-12">
                {/* Deck Pile */}
                <div className="relative w-36 h-48 rounded-xl bg-white/10 backdrop-blur-md shadow-xl border-2 border-white/20">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-4 py-1 rounded-full shadow-lg backdrop-blur-sm">
                        {deckCount}
                    </div>
                    {allDeckCards.slice(-5).map((_, index) => (
                        <div
                            key={index}
                            className="absolute w-24 transition-all duration-300 hover:translate-y--2"
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
                                className="w-full h-auto rounded-lg shadow-md hover:brightness-100 transition-all duration-300"
                            />
                        </div>
                    ))}
                </div>
                {/* Play Area */}
                <div
                    className="relative w-36 h-48 rounded-xl bg-white/10 backdrop-blur-md shadow-xl border-2 border-white/20"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {playedCards.map((card, index) => (
                        <div
                            key={`${card.code}-${card.updated_at}`}
                            className="absolute w-24 transition-all duration-300"
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(0deg)`,
                                zIndex: index
                            }}
                        >
                            <img src={card.image} alt={`${card.value} of ${card.suit}`} className="w-full h-auto rounded-lg shadow-lg" />
                        </div>
                    ))}
                </div>

                {/* Discard Pile */}
                <div className="relative w-36 h-48 rounded-xl bg-white/10 backdrop-blur-md shadow-xl border-2 border-white/20">
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-1 rounded-full shadow-lg backdrop-blur-sm">
                        {discardedCount}
                    </div>
                    {allDiscardedCards.slice(-5).map((card, index) => (
                        <div
                            key={card.code}
                            className="discarded-card absolute w-24"
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%)`,
                                zIndex: index
                            }}
                        >
                            <img
                                src="https://deckofcardsapi.com/static/img/back.png"
                                alt="Card Back"
                                className="w-full h-auto rounded-lg shadow-md"
                            />
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
                        <div className={`bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-4 text-white font-semibold shadow-lg ${player.id === currentUserId ? 'bottom-name' : 'top-name'}`}>
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
                                        key={`${card.code}`}
                                            className={`card ${animatingCard === card.code ? 'animate-to-center' : ''}`}

                                        draggable="true"
                                        onDragStart={() => handleDragStart(card)}
                                    >
                                        <img
                                            src={player.id === currentUserId ? card.image : "https://deckofcardsapi.com/static/img/back.png"}
                                            alt={player.id === currentUserId ? `${card.value} of ${card.suit}` : "Card Back"}
                                            className="w-16 h-auto rounded-lg shadow-lg"
                                            style={player.id === currentUserId ? getCardStyle(card) : {}}
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
            {notification.visible && (
                <div className="fixed bottom-4 right-4 bg-blue-500/90 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm">
                    {notification.message}
                </div>
            )}
        </div>
    );
};

export default Game;
