    import React, { useState } from 'react';
    import { useForm } from '@inertiajs/react';
    import axios from 'axios';
    import { 
        Users, 
        Lock, 
        Unlock, 
        Eye, 
        EyeOff, 
        Trophy, 
        Shield,
        Key
    } from 'lucide-react';

    export default function CreateLobbyModal({ isOpen, onClose, auth }) {
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);
        const [showPassword, setShowPassword] = useState(false);

        const { data, setData, post, processing, errors, reset } = useForm({
            name: '',
            max_players: 4,
            spectate_allowed: true,
            is_private: false,
            password: '',
            game_ranking: 'unranked'
        });

        const handleSubmit = async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);

            if (!auth?.user) {
                setError('User is not authenticated.');
                setLoading(false);
                return;
            }

            // Validate password for private lobbies
            if (data.is_private && !data.password) {
                setError('Password is required for private lobbies');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.post('/api/lobbies', {
                    name: data.name,
                    creator_id: auth.user.id,
                    max_players: data.max_players,
                    spectate_allowed: data.spectate_allowed,
                    is_private: data.is_private,
                    password: data.password, // Always send password, even for public lobbies
                    game_ranking: data.game_ranking
                });

                const lobbyId = response.data.id;
                window.location.href = `/api/lobbies/${lobbyId}`;

                reset();
                onClose();

            } catch (err) {
                console.error('Error creating lobby:', err);
                setError(err.response?.data?.message || 'Failed to create lobby. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        // Reset password when switching to public lobby
        const handlePrivacyChange = (isPrivate) => {
            setData(prevData => ({
                ...prevData,
                is_private: isPrivate,
                // Keep the password value regardless of privacy setting
                password: prevData.password
            }));
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-[500px] max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Create New Lobby</h2>
                        <button 
                            onClick={onClose} 
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Existing form fields remain the same until Lobby Privacy */}
                        
                        {/* Lobby Name */}
                        <div>
                            <label 
                                htmlFor="lobbyName" 
                                className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
                            >
                                <Users className="mr-2 text-blue-500" /> Lobby Name
                            </label>
                            <input
                                id="lobbyName"
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter lobby name"
                                required
                            />
                            {errors.name && (
                                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Max Players */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Maximum Players
                            </label>
                            <div className="flex space-x-2">
                                {[2, 3, 4].map((players) => (
                                    <button
                                        key={players}
                                        type="button"
                                        onClick={() => setData('max_players', players)}
                                        className={`px-4 py-2 rounded-lg transition-all ${
                                            data.max_players === players 
                                            ? 'bg-blue-500 text-white' 
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {players} Players
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Spectate Allowed */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                {data.spectate_allowed ? <Eye className="mr-2 text-green-500" /> : <EyeOff className="mr-2 text-red-500" />}
                                Allow Spectators
                            </label>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setData('spectate_allowed', true)}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        data.spectate_allowed 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Allow
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('spectate_allowed', false)}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        !data.spectate_allowed 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Disallow
                                </button>
                            </div>
                        </div>

                        {/* Lobby Privacy */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                {data.is_private ? <Lock className="mr-2 text-red-500" /> : <Unlock className="mr-2 text-green-500" />}
                                Lobby Privacy
                            </label>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => handlePrivacyChange(false)}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        !data.is_private 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Public
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handlePrivacyChange(true)}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        data.is_private 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Private
                                </button>
                            </div>
                        </div>

                        {/* Password Field - Only shown for private lobbies */}
                        {data.is_private && (
                            <div>
                                <label 
                                    htmlFor="password" 
                                    className="block text-sm font-medium text-gray-700 mb-2 flex items-center"
                                >
                                    <Key className="mr-2 text-red-500" /> Lobby Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter lobby password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>
                        )}

                        {/* Game Ranking */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                {data.game_ranking === 'ranked' ? <Trophy className="mr-2 text-yellow-500" /> : <Shield className="mr-2 text-gray-500" />}
                                Game Ranking
                            </label>
                            <div className="flex space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setData('game_ranking', 'unranked')}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        data.game_ranking === 'unranked' 
                                        ? 'bg-gray-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Unranked
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('game_ranking', 'ranked')}
                                    className={`px-4 py-2 rounded-lg transition-all ${
                                        data.game_ranking === 'ranked' 
                                        ? 'bg-yellow-500 text-white' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    Ranked
                                </button>
                            </div>
                        </div>

                        {/* Error Display */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
                            >
                                {processing ? 'Creating...' : 'Create Lobby'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }