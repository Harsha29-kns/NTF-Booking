import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContractReadOnly, formatETH } from '../utils/web3';
import { getIPFSUrl } from '../utils/ipfs';
import IPFSImage from '../components/IPFSImage';
import { Calendar, MapPin, Tag, Search, Loader2 } from 'lucide-react';

const TicketListPage = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTickets();
    setupRealTimeListener();

    // Listen for local updates (from CreateSalePage)
    const handleLocalUpdate = (e) => {
      if (e.detail?.action === 'created') {
        loadTickets();
      }
    };
    window.addEventListener('ticketsUpdated', handleLocalUpdate);

    return () => {
      const contract = getContractReadOnly();
      if (contract) {
        contract.removeAllListeners('TicketCreated'); // Cleanup listener
      }
      window.removeEventListener('ticketsUpdated', handleLocalUpdate);
    };
  }, []);

  const setupRealTimeListener = async () => {
    try {
      const contract = getContractReadOnly();
      // Listen for ANY new ticket creation on the blockchain
      contract.on('TicketCreated', (ticketId, name, organizer, price, total) => {
        console.log("New Event Created on Blockchain:", name);
        loadTickets(); // Reload the list immediately
      });
    } catch (e) {
      console.error("Listener setup failed:", e);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const contract = getContractReadOnly();
      
      // FIX: We use getAvailableTickets() because ticketCount() DOES NOT EXIST in your contract
      const availableTicketIds = await contract.getAvailableTickets();
      
      console.log("Available Ticket IDs found:", availableTicketIds);
      
      const ticketsData = [];

      // Loop through the IDs returned by the contract
      // We reverse the array to show the newest events first
      for (let i = availableTicketIds.length - 1; i >= 0; i--) {
        try {
          const id = availableTicketIds[i]; 
          const ticket = await contract.getTicket(id);
          
          // Double check sold/refund status
          if (!ticket.isSold && !ticket.isRefunded) {
             ticketsData.push({
              id: ticket.ticketId.toString(),
              eventName: ticket.eventName,
              organizer: ticket.organizer,
              eventDate: new Date(Number(ticket.eventDate) * 1000),
              saleEndDate: new Date(Number(ticket.saleEndDate) * 1000),
              price: ticket.price,
              posterUrl: ticket.posterUrl,
              availableTickets: ticket.availableTickets.toString(),
              totalTickets: ticket.totalTickets.toString()
            });
          }
        } catch (err) {
          console.warn(`Failed to load ticket ID ${availableTicketIds[i]}`, err);
        }
      }
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.organizer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="text-gray-600 mt-2">Discover and book unique NFT tickets</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Search events or organizers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((ticket) => (
            <div 
              key={ticket.id} 
              onClick={() => navigate(`/ticket/${ticket.id}`)}
              className="card hover:shadow-lg transition-shadow cursor-pointer group"
            >
              {/* Poster Image */}
              <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                <IPFSImage 
                  cid={ticket.posterUrl} 
                  alt={ticket.eventName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-sm font-semibold text-primary-700">
                  {formatETH(ticket.price)} ETH
                </div>
              </div>

              {/* Event Info */}
              <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                {ticket.eventName}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{ticket.eventDate.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="line-clamp-1">By {ticket.organizer}</span>
                </div>
                <div className="flex items-center text-primary-600">
                  <Tag className="w-4 h-4 mr-2" />
                  <span>{ticket.availableTickets} / {ticket.totalTickets} available</span>
                </div>
              </div>

              <button className="w-full mt-4 btn-primary">
                View Details
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No events found</h3>
          <p className="text-gray-500">Check back later for new ticket releases.</p>
        </div>
      )}
    </div>
  );
};

export default TicketListPage;
