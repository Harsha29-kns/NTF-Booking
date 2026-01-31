import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import {
    Loader2,
    ArrowLeft,
    Download,
    Search,
    UserCheck,
    Ticket,
    DollarSign,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    ArrowRightLeft
} from 'lucide-react';
import { formatAddress } from '../utils/web3';

const OrganizerEventAnalyticsPage = () => {
    const { eventName } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, entered, not_entered

    useEffect(() => {
        fetchAnalytics();
    }, [eventName]);

    const fetchAnalytics = async () => {
        try {
            const decodedName = decodeURIComponent(eventName);
            const response = await api.get(`/organizer/event-analytics/${encodeURIComponent(decodedName)}`);
            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Analytics fetch error:', error);
            toast.error('Failed to load event data');
            navigate('/organizer/analytics');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (!data) return;

        // Simple CSV Export
        const headers = ['Ticket ID', 'Buyer Name', 'Wallet', 'Phone', 'Price', 'Status', 'Entry Time'];
        const rows = data.guests.map(g => [
            g.ticketId,
            g.buyerName,
            g.buyerWallet,
            g.buyerPhone,
            g.price,
            g.isUsed ? 'Attrnded' : 'Pending',
            g.entryTime ? new Date(g.entryTime).toLocaleString() : '-'
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${data.event.name}_guest_list.csv`);
        document.body.appendChild(link);
        link.click();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!data) return null;

    const filteredGuests = data.guests.filter(guest => {
        const matchesSearch =
            guest.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.buyerWallet.toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.ticketId.toString().includes(searchTerm);

        const matchesFilter =
            filter === 'all' ? true :
                filter === 'entered' ? guest.isUsed :
                    !guest.isUsed;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <button
                        onClick={() => navigate('/organizer/analytics')}
                        className="flex items-center text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Events
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">{data.event.name}</h1>
                    <p className="text-gray-500 flex items-center mt-1">
                        <Clock className="w-4 h-4 mr-1.5" />
                        {new Date(data.event.date).toLocaleDateString()}
                    </p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center btn-secondary"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Total Sold Card */}
                <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Ticket className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tickets Sold</span>
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalSold}</p>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Out of {data.event.totalTickets} available</p>
                    </div>
                </div>

                {/* Checked In Card */}
                <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <UserCheck className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Guest Check-ins</span>
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.stats.totalEntered}</p>
                        <div className="flex items-center mt-1">
                            <span className="text-sm text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full">
                                {data.stats.attendanceRate.toFixed(1)}% Turnout
                            </span>
                        </div>
                    </div>
                </div>

                {/* Revenue Card (Enhanced) */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-xl shadow-lg border border-indigo-500 text-white transition-all hover:-translate-y-1 hover:shadow-indigo-500/30 relative overflow-hidden group">
                    {/* Decorative Background Circle */}
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>

                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <DollarSign className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">Total Revenue</span>
                    </div>
                    <div className="relative z-10">
                        <p className="text-3xl font-extrabold tracking-tight truncate" title={`${data.stats.revenue} ETH`}>
                            {parseFloat(data.stats.revenue).toFixed(4)} <span className="text-lg opacity-80 font-medium">ETH</span>
                        </p>
                        <p className="text-sm text-indigo-100 mt-1 font-medium">Gross Earnings</p>
                    </div>
                </div>

                {/* Pending Card */}
                <div className="bg-white p-6 rounded-xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Pending Guests</span>
                    </div>
                    <div>
                        <p className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {data.stats.totalSold - data.stats.totalEntered}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Not yet arrived</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search name, wallet, or ticket ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                        />
                    </div>
                    <div className="flex bg-gray-200 rounded-lg p-1">
                        {['all', 'entered', 'not_entered'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {f === 'all' ? 'All Guests' : f === 'entered' ? 'Attended' : 'Pending'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Guest Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entry Time</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wallet</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredGuests.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        No guests found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredGuests.map((guest) => (
                                    <tr key={guest.ticketId} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-100 to-indigo-100 flex items-center justify-center text-primary-700 font-bold mr-3">
                                                    {guest.buyerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{guest.buyerName}</p>
                                                    <p className="text-xs text-gray-500">{guest.buyerPhone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded text-sm">
                                                #{guest.ticketId}
                                            </span>
                                            {guest.isTransferred && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="Transferred Ticket">
                                                    <ArrowRightLeft className="w-3 h-3 mr-1" /> Transferred
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {guest.isUsed ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Entered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {guest.entryTime ? (
                                                <span>
                                                    {new Date(guest.entryTime).toLocaleTimeString()}
                                                    <br />
                                                    <span className="text-xs text-gray-400">{new Date(guest.entryTime).toLocaleDateString()}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                                            {formatAddress(guest.buyerWallet)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (Visual only for now) */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <span className="text-sm text-gray-500">Showing {filteredGuests.length} results</span>
                </div>
            </div>
        </div>
    );
};

export default OrganizerEventAnalyticsPage;
