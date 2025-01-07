import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import CreateLobbyModal from '../Components/CreateLobbyModal';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { 
    Users, 
    Plus,  
    Server, 
    LockKeyhole,
    Globe,
    Shield,
    Trophy,
    RefreshCcw,
    Key
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LobbiesIndex({ auth, lobbies }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lobbiesData, setLobbiesData] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLobbyId, setSelectedLobbyId] = useState(null);
    const [password, setPassword] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Search term state
    const [filteredLobbies, setFilteredLobbies] = useState([]); // New state for filtered lobbies

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.trim() === '') {
            // Show all lobbies if search input is empty
            setFilteredLobbies(lobbiesData);
        } else {
            // Filter lobbies by code or name
            setFilteredLobbies(
                lobbiesData.filter(
                    (lobby) =>
                        lobby.code.toLowerCase().includes(value.toLowerCase()) || // Match code
                        lobby.name.toLowerCase().includes(value.toLowerCase())    // Match name (optional)
                )
            );
        }
    };

    useEffect(() => {
        setLobbiesData(lobbies.data || []); 
    }, [lobbies]);


    useEffect(() => {
        const intervalId = setInterval(handleRefresh, 15000); // Refresh every 2 seconds

        return () => {
            clearInterval(intervalId); // Cleanup on component unmount
        };
    }, []);

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            router.reload({
                only: ['lobbies'],
                onFinish: () => setIsLoading(false)
            });
        } catch (error) {
            console.error('Error refreshing lobbies:', error);
            setIsLoading(false);
        }
    };


    const handleJoinLobby = async (e, lobbyId, isPrivate) => {
        e.preventDefault();
        if (isPrivate) {
            setSelectedLobbyId(lobbyId);
            setShowPasswordModal(true);
            setPasswordError('');
        } else {
            try {
                const response = await axios.post(`/lobbies/${lobbyId}/join`);
                if (response.status === 200) {
                    window.location.href = `/api/lobbies/${lobbyId}`;
                }
            } catch (error) {
                console.error(error.response?.data?.message || 'Failed to join lobby');
            }
        }
    };
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`/lobbies/${selectedLobbyId}/join`, {
                password: password
            });
            if (response.status === 200) {
                setShowPasswordModal(false);
                setPassword('');
                window.location.href = `/api/lobbies/${selectedLobbyId}`;
            }
        } catch (error) {
            if (error.response?.status === 403) {
                setPasswordError('Incorrect password');
            } else {
                setPasswordError(error.response?.data?.message || 'Failed to join lobby');
            }
        }
    };
    const PasswordModal = () => (
        showPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl"
                >
                    <h3 className="text-xl font-bold text-slate-800 mb-4">Enter Lobby Password</h3>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                            {passwordError && (
                                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPassword('');
                                    setPasswordError('');
                                }}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                            >
                                Join Lobby
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        )
    );

    const handleJoinBack = async (e, lobbyId) => {
    try {
        // Redirect directly to the lobby page if already a member
        window.location.href = '/api/lobbies/' + lobbyId;
    } catch (error) {
        console.error('Error joining back lobby:', error);
    }
};


    const getLobbyStatusColor = (status) => {
        switch(status) {
            case 'waiting': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'playing': return 'bg-amber-50 text-amber-600 border-amber-200';
            case 'finished': return 'bg-rose-50 text-rose-600 border-rose-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200';
        }
    };

        const AnimatedPrivacyIcon = ({ isPrivate }) => (
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ 
                scale: 1.1, 
                rotate: isPrivate ? [-5, 5, -5, 5, 0] : 0,
                transition: { duration: 0.3 }
            }}
            className="cursor-help"
            title={isPrivate ? "Private Lobby" : "Public Lobby"}
        >
            {isPrivate ? (
                <LockKeyhole 
                    className="w-4 h-4 text-gray-500 transition-colors hover:text-blue-600"
                    strokeWidth={2.5}
                />
            ) : (
                <Globe 
                    className="w-4 h-4 text-gray-500 transition-colors hover:text-green-600"
                    strokeWidth={2.5}
                />
            )}
        </motion.div>
    );
    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-slate-50 via-white to-blue-100 min-h-screen py-12"
        >
            <div className="container mx-auto px-4 max-w-7xl space-y-8">
                <Head title="Game Lobbies" />
                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-lg"
                >
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={handleSearchChange}
                        placeholder="Search by lobby code..."
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </motion.div>
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 flex justify-between items-center space-x-4"
                >
                    <div className="flex items-center space-x-6">
                        <div className="bg-blue-100 p-4 rounded-2xl shadow-md">
                            <Server className="text-blue-700 w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                                Game Lobbies
                            </h1>
                            <p className="text-slate-500 mt-2 text-lg">
                                Discover and join exciting game sessions
                            </p>
                        </div>
                    </div>

                    <div className="flex space-x-4">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={`px-6 py-3 rounded-xl transition-all duration-300 ease-in-out flex items-center justify-center space-x-2 shadow-lg ${isLoading 
                                ? 'bg-slate-400 text-white cursor-not-allowed' 
                                : 'bg-slate-800 text-white hover:bg-slate-700'
                            }`}
                        >
                            <motion.div
                                animate={{ 
                                    rotate: isLoading ? 360 : 0,
                                    transition: { 
                                        repeat: isLoading ? Infinity : 0, 
                                        duration: 0.8, 
                                        ease: "linear" 
                                    }
                                }}
                                className="flex justify-center items-center"
                            >
                                <RefreshCcw className="w-5 h-5" />
                            </motion.div>
                            {isLoading ? '' : ''}
                        </motion.button>
                        
                        <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Create Lobby
                        </motion.button>
                    </div>
                </motion.div>

                <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { 
                            opacity: 1,
                            transition: {
                                delayChildren: 0.2,
                                staggerChildren: 0.1
                            }
                        }
                    }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {Array.isArray(filteredLobbies) && filteredLobbies.length > 0 ? (
    filteredLobbies.map((lobby) => (
        <motion.div 
            key={lobby.id} 
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.5 }
                }
            }}
            className="bg-white border border-slate-100 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-2 overflow-hidden"
        >
            <div className="p-6 relative">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold border ${getLobbyStatusColor(lobby.status)}`}
                >
                    {lobby.status.charAt(0).toUpperCase() + lobby.status.slice(1)}
                </motion.div>

                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2 truncate max-w-[200px]">
                            {lobby.name}
                        </h2>
                        <div className="flex space-x-2 items-center">
                            <AnimatedPrivacyIcon isPrivate={lobby.is_private} />
                            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                                #{lobby.code}
                            </span>
                            {lobby.is_private && (
                                <div className="flex items-center space-x-1 bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full">
                                    <Key className="w-3 h-3" />
                                </div>
                            )}
                            {lobby.game_ranking === 'ranked' && (
                                <motion.div
                                    whileHover={{ rotate: 360, transition: { duration: 0.5 } }}
                                >
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                </motion.div>
                            )}
                            {lobby.game_ranking === 'unranked' && (
                                <motion.div
                                    whileHover={{ rotate: 360, transition: { duration: 0.5 } }}
                                >
                                    <Shield className="w-4 h-4 text-blue-900" />
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-slate-500" />
                            <p className="text-sm text-slate-600">
                                {lobby.current_players}/{lobby.max_players} Players
                            </p>
                        </div>
                        <p className="text-sm text-slate-500">
                            Created by: {lobby.creator?.name || 'Anonymous'}
                        </p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                        <motion.button
                            onClick={(e) => 
                                lobby.is_current_user_in_lobby 
                                    ? handleJoinBack(e, lobby.id) 
                                    : handleJoinLobby(e, lobby.id, lobby.is_private)
                            }
                            disabled={!lobby.is_current_user_in_lobby && lobby.current_players >= lobby.max_players}  
                            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                                !lobby.is_current_user_in_lobby && lobby.current_players >= lobby.max_players
                                    ? 'bg-red-500 text-white cursor-not-allowed opacity-70'  
                                    : lobby.is_current_user_in_lobby
                                        ? 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700'  
                            }`}
                        >
                            {!lobby.is_current_user_in_lobby && lobby.current_players >= lobby.max_players 
                                ? 'Lobby Full' 
                                : lobby.is_current_user_in_lobby 
                                    ? 'Join Back' 
                                    : 'Join Lobby'}  
                        </motion.button>
                        <PasswordModal />
                        <span className="text-xs text-slate-400">
                            {new Date(lobby.created_at).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    ))
) : (
    <p className="col-span-full text-center text-lg text-gray-600">No lobbies found</p>
)}

                </motion.div>

                {/* Pagination remains the same */}
                {lobbies.last_page > 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 100 }}
                        className="flex justify-center mt-10"
                    >
                        <div className="bg-white border border-slate-100 rounded-xl shadow-lg p-2 inline-flex space-x-1">
                            {Array.from({ length: lobbies.last_page }, (_, i) => i + 1).map((page) => (
                                <Link
                                    key={page}
                                    href={`/api/lobbies?page=${page}`}
                                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                                        page === lobbies.current_page 
                                            ? 'bg-blue-600 text-white font-bold' 
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    {page}
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}

                <CreateLobbyModal 
                    isOpen={isModalOpen} 
                    onClose={() => setIsModalOpen(false)} 
                    auth={auth}
                />
            </div>
        </motion.div>
    );
}