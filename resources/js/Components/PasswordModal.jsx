import React from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

export default function PasswordModal({ 
    showPasswordModal, 
    selectedLobbyId, 
    onClose, 
    onSuccess 
}) {
    const [password, setPassword] = React.useState('');
    const [passwordError, setPasswordError] = React.useState('');

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`/lobbies/${selectedLobbyId}/join`, {
                password: password
            });
            
            if (response.status === 200) {
                setPassword('');
                setPasswordError('');
                onSuccess();
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

    const handleClose = () => {
        setPassword('');
        setPasswordError('');
        onClose();
    };

    if (!showPasswordModal) return null;

    return (
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
                            onClick={handleClose}
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
    );
}