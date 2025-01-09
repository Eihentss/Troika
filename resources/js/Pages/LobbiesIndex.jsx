import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import CreateLobbyModal from '../Components/CreateLobbyModal';
import SearchBar from '../Components/SearchBar';
import PasswordModal from '../Components/PasswordModal';
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
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [filteredLobbies, setFilteredLobbies] = useState([]); // New state for filtered lobbies



    useEffect(() => {
        setLobbiesData(lobbies.data || []); 
        setFilteredLobbies(lobbies.data || []); // Initialize filtered lobbies
    }, [lobbies]);


    useEffect(() => {
        const intervalId = setInterval(handleRefresh, 2000); // Refresh every 2 seconds

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
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4"
                >
                    {/* Header Text */}
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
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-100"
                        >
                            <Users className="w-5 h-5 text-green-500" />
                            <span className="text-blue-700 font-medium">
                                {auth?.user?.name || 'Guest'}
                            </span>
                        </motion.div>


                    {/* Search Bar, Refresh, and Create Lobby Buttons */}
    <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        {/* Search Bar */}
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="flex items-center w-full sm:w-auto"
        >

                    <SearchBar
                    lobbies={lobbiesData}
                    onSearch={(filtered) => setFilteredLobbies(filtered)}
                    
                />
        </motion.div>

        {/* Refresh Button */}
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
            <span>{isLoading ? 'Refresh' : 'Refresh'}</span>
        </motion.button>
        
        {/* Create Lobby Button */}
        <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg"
        >
            <Plus className="w-5 h-5" />
            <span>Create Lobby</span>
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
 <PasswordModal 
    showPasswordModal={showPasswordModal}
    selectedLobbyId={selectedLobbyId}
    onClose={() => setShowPasswordModal(false)}
    onSuccess={() => setShowPasswordModal(false)}
/>
            </div>
        </motion.div>
    );
}