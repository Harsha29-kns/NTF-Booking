import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    MapPin,
    Users,
    ArrowRight,
    BarChart2,
    Loader2
} from 'lucide-react';

const OrganizerEventsPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyEvents();
    }, []);

    const fetchMyEvents = async () => {
        try {
            const response = await api.get('/events/my-events');
            if (response.data.success) {
                setEvents(response.data.data.events);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
            toast.error('Failed to load your events');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Event Analytics</h1>
                <p className="text-gray-500 mt-2">Select an event to view detailed guest lists and attendance reports.</p>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900">No Events Found</h3>
                    <p className="text-gray-500 mt-2">You haven't created any events yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <div
                            key={event._id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                            onClick={() => navigate(`/organizer/analytics/${encodeURIComponent(event.eventName)}`)}
                        >
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={event.posterUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')}
                                    alt={event.eventName}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-4 left-4 text-white">
                                    <h3 className="text-xl font-bold truncate pr-4">{event.eventName}</h3>
                                    <div className="flex items-center text-sm text-white/90 mt-1">
                                        <Calendar className="w-4 h-4 mr-1.5" />
                                        {new Date(event.eventDate).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                                    <div className="flex items-center">
                                        <Users className="w-4 h-4 mr-1.5" />
                                        <span>{event.capacity} Capacity</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${new Date() > new Date(event.eventDate)
                                            ? 'bg-gray-100 text-gray-600'
                                            : 'bg-green-100 text-green-700'
                                        }`}>
                                        {new Date() > new Date(event.eventDate) ? 'Past Event' : 'Upcoming'}
                                    </span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/organizer/analytics/${encodeURIComponent(event.eventName)}`);
                                    }}
                                    className="w-full flex items-center justify-center space-x-2 bg-gray-50 hover:bg-primary-50 text-gray-700 hover:text-primary-700 py-2.5 rounded-lg border border-gray-200 hover:border-primary-200 transition-all font-medium"
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    <span>View Reports</span>
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrganizerEventsPage;
