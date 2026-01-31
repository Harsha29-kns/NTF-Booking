import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import {
    ShieldCheck,
    Plus,
    Trash2,
    Copy,
    Loader2,
    Users
} from 'lucide-react';

const OrganizerGatekeepers = () => {
    const [codes, setCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [newEventName, setNewEventName] = useState('');

    const [events, setEvents] = useState([]);

    useEffect(() => {
        loadCodes();
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const { data } = await api.get('/events/my-events');
            if (data.success && data.data && data.data.events) {
                setEvents(data.data.events);
                // Default to first event if valid
                if (data.data.events.length > 0) {
                    setNewEventName(data.data.events[0].eventName);
                }
            }
        } catch (error) {
            console.error('Failed to load events:', error);
        }
    };

    const loadCodes = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/gatekeepers/my-codes');
            setCodes(data);
        } catch (error) {
            console.error('Failed to load codes:', error);
            // Don't toast on load failure to avoid spamming if empty
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!newEventName.trim()) return;

        try {
            setGenerating(true);
            const { data } = await api.post('/gatekeepers/generate', {
                eventName: newEventName
            });

            if (data.success) {
                toast.success(`Access Code Generated: ${data.code}`);
                loadCodes(); // Refresh list
            }
        } catch (error) {
            console.error('Generation failed:', error);
            toast.error(error.response?.data?.message || 'Failed to generate code');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (codeId) => {
        if (!window.confirm('Are you sure you want to revoke this access code? Gatekeepers using it will be logged out.')) return;

        try {
            await api.post('/gatekeepers/revoke', { codeId });
            toast.success('Code revoked');
            setCodes(prev => prev.filter(c => c._id !== codeId));
        } catch (error) {
            console.error('Revoke failed:', error);
            toast.error('Failed to revoke code');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Code copied to clipboard');
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gatekeeper Management</h1>
                    <p className="text-gray-500 mt-1">Manage access codes for your event staff</p>
                </div>
                <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                    <Users className="w-4 h-4" />
                    Active Codes: {codes.length}
                </div>
            </div>

            {/* Generate Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate New Access Code</h2>
                <form onSubmit={handleGenerate} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Event</label>
                        {events.length > 0 ? (
                            <select
                                value={newEventName}
                                onChange={(e) => setNewEventName(e.target.value)}
                                className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                required
                            >
                                <option value="" disabled>Choose an event...</option>
                                {events.map(event => (
                                    <option key={event._id} value={event.eventName}>
                                        {event.eventName} ({new Date(event.eventDate).toLocaleDateString()})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="bg-yellow-50 text-yellow-800 px-4 py-2 rounded-lg border border-yellow-200 text-sm">
                                You haven't created any events yet. <a href="/organizer/create-event" className="underline font-bold">Create one first</a>.
                            </div>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={generating || events.length === 0}
                        className="btn-primary flex items-center gap-2 py-2.5"
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Generate Code
                    </button>
                </form>
            </div>

            {/* Codes List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
            ) : codes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No Active Codes</h3>
                    <p className="text-gray-500 mt-2">Generate an access code to allow gatekeepers to verify tickets.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {codes.map((code) => (
                        <div key={code._id} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900">{code.eventName}</h3>
                                <p className="text-sm text-gray-500">Created: {new Date(code.createdAt).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <span className="block text-xs text-gray-500 uppercase font-semibold tracking-wider mb-1">Access Code</span>
                                    <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                                        <span className="font-mono text-xl font-bold text-primary-700 tracking-widest">{code.code}</span>
                                        <button
                                            onClick={() => copyToClipboard(code.code)}
                                            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Copy Code"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRevoke(code._id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Revoke and Delete Code"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrganizerGatekeepers;
