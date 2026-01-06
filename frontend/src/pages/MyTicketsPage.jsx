import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, formatETH, formatAddress } from '../utils/web3'; // CHANGED: Imported getContract
import { getIPFSUrl } from '../utils/ipfs';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  User, 
  Download,
  Shield,
  Loader2,
  Ticket,
  Eye,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const MyTicketsPage = () => {
  const { account, isConnected, isSupportedNetwork } = useWeb3();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyTickets = useCallback(async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      setError(null);
      
      // FIX: Use getContract() instead of getContractReadOnly()
      // This ensures 'msg.sender' is YOUR wallet address, not an anonymous provider
      const contract = await getContract();
      
      console.log('Fetching tickets for account:', account);
      
      // Get tickets purchased by current user
      let myTicketIdsResult;
      try {
        myTicketIdsResult = await contract.getMyTickets();
      } catch (error) {
        console.warn('Error fetching tickets (user might have none):', error.message);
        setTickets([]);
        return;
      }
      
      // Convert result to array safely
      const myTicketIds = Array.from(myTicketIdsResult || []);
      
      console.log('Ticket IDs found:', myTicketIds.toString());
      
      if (myTicketIds.length === 0) {
        setTickets([]);
        return;
      }
      
      // Fetch details for each ticket
      const ticketPromises = myTicketIds.map(async (ticketId) => {
        try {
          const ticket = await contract.getTicket(ticketId);
          return {
            id: ticketId.toString(),
            eventName: ticket.eventName,
            organizer: ticket.organizer,
            eventDate: new Date(Number(ticket.eventDate) * 1000),
            price: ticket.price.toString(),
            posterUrl: ticket.posterUrl,
            ticketImageUrl: ticket.ticketImageUrl,
            seller: ticket.seller,
            buyer: ticket.buyer,
            isSold: ticket.isSold,
            isDownloaded: ticket.isDownloaded,
            isRefunded: ticket.isRefunded,
            totalTickets: Number(ticket.totalTickets),
            availableTickets: Number(ticket.availableTickets),
          };
        } catch (error) {
          console.warn(`Failed to load ticket ${ticketId}:`, error);
          return null;
        }
      });
      
      const ticketData = await Promise.all(ticketPromises);
      const validTickets = ticketData.filter(ticket => ticket !== null);
      
      // Sort by newest first
      setTickets(validTickets.reverse());
      
    } catch (error) {
      console.error('Error loading my tickets:', error);
      setError('Failed to load your tickets');
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (isConnected && account) {
      loadMyTickets();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, account, loadMyTickets]);

  // Listen for global updates
  useEffect(() => {
    const handler = (e) => {
      console.log('Global ticket update detected, reloading...');
      loadMyTickets();
    };
    window.addEventListener('ticketsUpdated', handler);
    return () => window.removeEventListener('ticketsUpdated', handler);
  }, [loadMyTickets]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTicketStatus = (ticket) => {
    if (ticket.isRefunded) return { text: 'Refunded', color: 'bg-red-100 text-red-800' };
    if (ticket.isDownloaded) return { text: 'Downloaded (NFT)', color: 'bg-green-100 text-green-800' };
    if (ticket.isSold) return { text: 'Purchased', color: 'bg-blue-100 text-blue-800' };
    return { text: 'Available', color: 'bg-gray-100 text-gray-800' };
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
        <p className="text-gray-600 mb-6">Please connect your wallet to view your tickets.</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Connect</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
        <p className="text-gray-600">Loading your tickets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">
            Wallet: <span className="font-mono">{formatAddress(account)}</span>
          </p>
        </div>
        <button 
          onClick={loadMyTickets}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Tickets Found</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            You haven't purchased any tickets yet with this wallet ({formatAddress(account)}).
          </p>
          <Link to="/tickets" className="btn-primary">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => {
            const status = getTicketStatus(ticket);
            return (
              <div key={ticket.id} className="card group hover:shadow-lg transition-all duration-300">
                {/* Image */}
                <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                  <img
                    src={getIPFSUrl(ticket.posterUrl)}
                    alt={ticket.eventName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1459749411177-2c46996b3e81?auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold ${status.color}`}>
                    {status.text}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{ticket.eventName}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(ticket.eventDate)}
                    </div>
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="truncate">Org: {ticket.organizer}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    <Link 
                      to={`/ticket/${ticket.id}`} 
                      className="flex-1 btn-outline text-center text-sm py-2"
                    >
                      View
                    </Link>
                    
                    {!ticket.isDownloaded ? (
                      <Link 
                        to={`/ticket/${ticket.id}`} 
                        className="flex-1 btn-primary text-center text-sm py-2 flex items-center justify-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download
                      </Link>
                    ) : (
                      <Link 
                        to={`/ticket/${ticket.id}/print`} 
                        className="flex-1 btn-secondary text-center text-sm py-2 flex items-center justify-center gap-1"
                      >
                        <Shield className="w-3 h-3" /> Print
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyTicketsPage;
