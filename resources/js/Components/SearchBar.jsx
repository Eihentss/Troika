import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SearchBar({ lobbies, onSearch }) {
    // Initialize searchTerm from localStorage or empty string
    const [searchTerm, setSearchTerm] = useState(() => {
        return localStorage.getItem('lobbySearchTerm') || '';
    });
    
    // Apply search filter on component mount and when lobbies update
    useEffect(() => {
        if (searchTerm.trim() !== '') {
            const filtered = lobbies.filter(
                (lobby) =>
                    lobby.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    lobby.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            onSearch(filtered);
        } else {
            onSearch(lobbies);
        }
    }, [lobbies, searchTerm]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        // Save search term to localStorage
        localStorage.setItem('lobbySearchTerm', value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="flex items-center w-full sm:w-auto"
        >
            <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by code or name..."
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
        </motion.div>
    );
}