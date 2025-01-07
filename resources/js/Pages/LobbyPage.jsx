import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Head, Link } from '@inertiajs/react';
import { Users, LogOut, UserPlus, Copy, Trophy,Eye,Unlock,EyeOff,Shield, Settings,Key, CheckCircle2,Lock, XCircle, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { router } from '@inertiajs/react';
import ChatComponent from './ChatComponent';

export default function LobbyPage({ lobby, auth }) {
    const [copied, setCopied] = useState(false);
    const [players, setPlayers] = useState([]); // Initialize as an empty array
    const [inviteEmail, setInviteEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [userReadyStatus, setUserReadyStatus] = useState(false);
    const [allPlayersReady, setAllPlayersReady] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false); // Track modal visibility
    
    const [updatedSettings, setUpdatedSettings] = useState({
        max_players: 4, // Default to 4 players
        spectate_allowed: lobby.spectate_allowed,
        is_private: lobby.is_private,
        game_ranking: lobby.game_ranking
    });

    const toggleSettingsModal = () => {
        setSettingsModalOpen(!settingsModalOpen);
    };

    const handleSettingsChange = (name, value) => {
        // If the field is max_players and the value is greater than 4, limit it to 4
        if (name === 'max_players' && value > 4) {
            return; // Prevent updating the value if it's greater than 4
        }
    
        // Update the state based on the selected value
        setUpdatedSettings({
            ...updatedSettings,
            [name]: value
        });
    };
    

    const saveSettings = async () => {
        try {
            const response = await axios.post(`/api/lobbies/${lobby.id}/update-settings`, updatedSettings);
            setSettingsModalOpen(false);
            // Optionally, you can update the lobby state here after successful update
            console.log('Settings updated:', response.data);
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };

    // Fetch participants when the component mounts
    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const response = await axios.get(`/api/lobbies/${lobby.id}`);
                if (Array.isArray(response.data.players)) {
                    setPlayers(response.data.players);
                    
                    // Check if the current user is ready
                    const currentUser = response.data.players.find(player => player.id === auth.user.id);
                    if (currentUser) {
                        setUserReadyStatus(currentUser.status === 'ready');
                    }

                    // Check if all players are ready
                    const allReady = response.data.players.every(player => player.status === 'ready');
                    setAllPlayersReady(allReady);
                } else {
                    setPlayers([]);
                }
            } catch (error) {
                console.error('Error fetching players:', error);
            }
        };

        fetchPlayers();
        const intervalId = setInterval(fetchPlayers, 5000);

        return () => clearInterval(intervalId);
    }, [lobby.id, auth.user.id]);

    useEffect(() => {
        const intervalId = setInterval(handleRefresh, 2000); // Refresh every 2 seconds

        return () => {
            clearInterval(intervalId); // Cleanup on component unmount
        };
    }, []);
const handleRefresh = async () => {
    try {
        // Atsvaidzināt datus par lobby bez lapas pārlādēšanas
        await router.visit(window.location.href, {
            method: 'get',
            only: ['lobby'], // Atsvaidzināt tikai "lobbies" datus
            preserveState: true, // Saglabāt lapas stāvokli (t.i., tas neizmantos jaunu URL)
            replace: true, // Aizvietot URL, lai saglabātu pašreizējo lapu
        });
    } catch (error) {
        console.error('Error refreshing this lobby:', error);
    }
};
const copyLobbyCode = () => {
    if (navigator.clipboard) {
        // Use Clipboard API if available
        navigator.clipboard.writeText(lobby.code).then(() => {
            setCopied(true);
            console.log('Lobby code copied to clipboard');

            setTimeout(() => setCopied(false), 2000);
        }).catch((error) => {
            console.error('Failed to copy: ', error);
        });
    } else {
        // Fallback method for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = lobby.code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        setCopied(true);
        console.log('Lobby code copied to clipboard (fallback)');

        setTimeout(() => setCopied(false), 2000);
    }
};



    const handleInvitePlayer = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/lobbies/${lobby.id}/invite`, { email: inviteEmail });
            setInviteEmail('');
        } catch (error) {
            console.error('Error inviting player:', error);
        }
    };

    const leaveLobby = async () => {
        try {
            await axios.post(`/api/lobbies/${lobby.id}/leave`);
            window.location.href = '/api/lobbies';
        } catch (error) {
            console.error('Error leaving lobby:', error);
        }
    };


const toggleReadyStatus = async () => {
        try {
            const response = await axios.post(`/api/lobbies/${lobby.id}/toggle-ready`);
            setUserReadyStatus(response.data.status === 'ready');
            console.log('Ready status toggled:', response.data.status);
        } catch (error) {
            console.error('Error toggling ready status:', error);
        }
    };
    useEffect(() => {
        const checkLobbyStatus = async () => {
            try {
                const response = await axios.get(`/api/lobbies/${lobby.id}`);
                if (response.data.status === 'playing') {
                    // Redirect to game if lobby status is 'playing'
                    window.location.href = `/game/${lobby.id}`;
                }
            } catch (error) {
                console.error('Error checking lobby status:', error);
            }
        };
    
        const intervalId = setInterval(checkLobbyStatus, 2000);
        return () => clearInterval(intervalId);
    }, [lobby.id]);


    const startGame = async () => {
        try {
            await axios.get(`/api/lobbies/${lobby.id}/start-game`);
            // The redirect will be handled by the useEffect hook above
        } catch (error) {
            console.error('Error starting game:', error);
        }
    };

    
    const textVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { 
                duration: 0.5,
                type: "spring",
                stiffness: 100 
            }
        }
    };

    const symbolVariants = {
        initial: { scale: 0, rotate: -180 },
        animate: { 
            scale: 1, 
            rotate: 0,
            transition: { 
                type: "spring", 
                stiffness: 300, 
                damping: 10 
            }
        },
        hover: { 
            scale: 1.2,
            rotate: 360,
            transition: { duration: 0.3 }
        }
    };
    return (
        
        <motion.div 
        
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 relative"
        >
            <div className="container mx-auto px-4 py-8 max-w-6xl">
                <Head title={`Lobby`} />

                {/* Lobby Header */}
 <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white border border-gray-100 rounded-2xl shadow-xl p-6 mb-8"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <motion.h1 
                                variants={textVariants}
                                initial="hidden"
                                animate="visible"
                                className="text-3xl font-bold text-gray-900 flex items-center"
                            >
                                {lobby.name}
                                {lobby.game_ranking === 'ranked' && (
                                    <motion.div 
                                        variants={symbolVariants}
                                        initial="initial"
                                        animate="animate"
                                        whileHover="hover"
                                        className="ml-2"
                                    >
                                        <Trophy className="text-yellow-500" />
                                    </motion.div>
                                )}
                            </motion.h1>
                            <motion.div 
                            variants={textVariants}
                            initial="hidden"
                            animate="visible"
                            className="mt-2 flex items-center space-x-2"
                        >
                            <motion.span 
                                variants={symbolVariants}
                                initial="initial"
                                animate="animate"
                                className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium"
                            >
                                Lobby Code: {lobby.code || 'N/A'}
                            </motion.span>
                            <motion.button 
                                variants={symbolVariants}
                                initial="initial"
                                animate="animate"
                                whileHover="hover"
                                onClick={copyLobbyCode}
                                className="text-gray-500 hover:text-blue-600"
                            >
                                {copied ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Copy className="w-5 h-5" />
                                )}
                            </motion.button>
                        </motion.div>
                        </div>
                        <motion.button 
                            initial="initial"
                            animate="animate"
                            whileHover="hover"
                            whileTap={{ scale: 0.95 }}
                            onClick={leaveLobby}
                            className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl hover:bg-red-100 transition-colors"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Leave Lobby</span>
                        </motion.button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Players Section */}
                    <motion.div 
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="md:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-lg p-6"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-semibold flex items-center">
                                <Users className="mr-2 text-gray-500" />
                                Players ({lobby.current_players}/{lobby.max_players})
                            </h2>
                            
                            <motion.button 
                                whileHover={{ scale: 1.1 }}
                                className="text-blue-600 hover:bg-blue-50 p-2 rounded-full"
                            >
                              {lobby.creator_id === auth.user.id && (
                                    <motion.button onClick={toggleSettingsModal} className="text-blue-600 hover:bg-blue-50 p-2 rounded-full">
                                        <Settings className="w-5 h-5" />
                                    </motion.button>   
                                )}
 
                            </motion.button>
                        </div>
                        {settingsModalOpen && (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-xl shadow-lg w-1/3">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center text-gray-800">
                    <Settings className="mr-2 text-blue-500" /> Lobby Settings
                </h2>
                <button
                    onClick={() => setSettingsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                    ×
                </button>
            </div>
            <div className="space-y-4">
                {/* Max Players */}
                <div className="flex space-x-2">
                    {[2, 3, 4].map((players) => (
                        <button
                            key={players}
                            type="button"
                            onClick={() => handleSettingsChange('max_players', players)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                updatedSettings.max_players === players
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {players} Players
                        </button>
                    ))}
                </div>

                {/* Allow Spectators */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        {updatedSettings.spectate_allowed ? (
                            <Eye className="mr-2 text-green-500" />
                        ) : (
                            <EyeOff className="mr-2 text-red-500" />
                        )}
                        Allow Spectators
                    </label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleSettingsChange('spectate_allowed', true)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                updatedSettings.spectate_allowed
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Allow
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSettingsChange('spectate_allowed', false)}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                !updatedSettings.spectate_allowed
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Disallow
                        </button>
                    </div>
                </div>

                {/* Private Lobby */}
                
                
                {/* Game Ranking */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        {updatedSettings.game_ranking === 'ranked' ? (
                            <Trophy className="mr-2 text-yellow-500" />
                        ) : (
                            <Shield className="mr-2 text-gray-500" />
                        )}
                        Game Ranking
                    </label>
                    <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={() => handleSettingsChange('game_ranking', 'unranked')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                updatedSettings.game_ranking === 'unranked'
                                    ? 'bg-gray-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Unranked
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSettingsChange('game_ranking', 'ranked')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                updatedSettings.game_ranking === 'ranked'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            Ranked
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-4">
                <button
                    onClick={() => setSettingsModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                >
                    Cancel
                </button>
                <button
                    onClick={saveSettings}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                    Save
                </button>
            </div>
        </div>
    </div>
)}

                             
                                    
                        <div className="space-y-4">
                            {players.map((player) => (
                                <motion.div 
                                    key={player.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            {player.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium">{player.name}</p>
                                            <p className="text-sm text-gray-500">
                                                {player.status === 'ready' && <span className="text-green-500">Ready</span>}
                                                {player.status === 'waiting' && <span className="text-yellow-500">Waiting</span>}
                                                {player.status === 'not ready' && <span className="text-red-500">Not Ready</span>}
                                                {player.status === 'playing' && <span className="text-blue-500">Playing</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {player.id === lobby.creator_id && (
                                        <span className="bg-green-50 text-green-600 px-2 py-1 rounded-full text-xs">
                                            Host
                                        </span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div 
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="space-y-6"
                    >
                        {/* Ready Status Section */}
                        <motion.div 
                            className="bg-white border border-gray-100 rounded-2xl shadow-lg p-6"
                        >
                            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                                <UserCheck className="mr-2 text-gray-500" />
                                Ready Status
                            </h2>
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={toggleReadyStatus}
                                disabled={userReadyStatus}
                                className={`w-full p-4 rounded-xl transition-colors text-lg font-semibold ${
                                    userReadyStatus 
                                    ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {userReadyStatus ? 'You are Ready' : 'Set Ready'}
                            </motion.button>
                        </motion.div>

                        {/* Invite Players Section (previous code) */}
                        <motion.div 
                            className="bg-white border border-gray-100 rounded-2xl shadow-lg p-6"
                        >
                            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                                <UserPlus className="mr-2 text-gray-500" />
                                Invite Players
                            </h2>
                            {/* Invite player form remains the same */}
                        </motion.div>

                        {/* Start Game Button */}
                        {lobby.creator_id === auth.user.id && allPlayersReady && lobby.current_players === lobby.max_players && (
                            <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => startGame()}
                                className="w-full bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition-colors text-lg font-semibold"
                            >
                                Start Game
                            </motion.button>
                        )}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-transparent z-50">
                <div className="max-w-6xl mx-auto">
                    <ChatComponent lobby={lobby} auth={auth} />
                </div>
            </div>


                    </motion.div>
                </div>
            </div>
            
        </motion.div>
        
    );
    
}