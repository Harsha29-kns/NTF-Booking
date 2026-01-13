import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, formatAddress } from '../utils/web3';
import { getIPFSUrl } from '../utils/ipfs';
import { api } from '../services/api'; 
import toast from 'react-hot-toast';
import { 
  Calendar, 
  User, 
  Download,
  Shield,
  Loader2,
  Ticket,
  RefreshCw,
  Send,      
  X,         
  Clock,     
  ArrowRight // ✅ NEW: Added ArrowRight icon
} from 'lucide-react';

const MyTicketsPage = () => {
  const { account, isConnected } = useWeb3();
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- NEW STATE: Transfer Feature ---
  const [pendingTicketIds, setPendingTicketIds] = useState(new Set());
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [transferForm, setTransferForm] = useState({
    receiverAddress: '',
    reason: ''
  });
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Load Tickets from Blockchain
  const loadMyTickets = useCallback(async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const contract = await getContract();
      
      // 1. Get blockchain tickets
      let myTicketIdsResult;
      try {
        myTicketIdsResult = await contract.getMyTickets();
      } catch (error) {
        console.warn('Error fetching tickets:', error.message);
        setTickets([]);
        return;
      }
      
      const myTicketIds = Array.from(myTicketIdsResult || []);
      
      // 2. Fetch Pending Transfer Requests from Backend
      let pendingIds = new Set();
      try {
        const { data: requests } = await api.get('/transfers/my-requests');
        requests.forEach(req => {
          if (req.status === 'pending') {
            pendingIds.add(req.ticketId.toString());
          }
        });
        setPendingTicketIds(pendingIds);
      } catch (err) {
        console.warn('Failed to fetch pending transfers:', err);
      }

      if (myTicketIds.length === 0) {
        setTickets([]);
        return;
      }
      
      // 3. Fetch details for each ticket
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
            // ✅ Read updated transfer fields
            isSecondHand: ticket.isSecondHand, 
            previousOwner: ticket.previousOwner, // ✅ Get previous owner
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

  // --- HANDLERS ---

  const openTransferModal = (ticket) => {
    setSelectedTicket(ticket);
    setTransferForm({ receiverAddress: '', reason: '' });
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setIsSubmittingTransfer(true);
      
      if (!transferForm.receiverAddress.startsWith('0x') || transferForm.receiverAddress.length !== 42) {
        toast.error("Invalid Ethereum address format");
        return;
      }

      await api.post('/transfers/request', {
        ticketId: selectedTicket.id,
        receiverAddress: transferForm.receiverAddress,
        reason: transferForm.reason,
        eventName: selectedTicket.metadata?.name || selectedTicket.name || selectedTicket.eventName || "Event Name"
      });

      toast.success("Transfer request submitted! Waiting for organizer approval.");
      setShowTransferModal(false);
      loadMyTickets();

    } catch (error) {
      console.error("Transfer request failed:", error);
      toast.error(error.response?.data?.message || "Failed to submit transfer request");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

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
    if (pendingTicketIds.has(ticket.id)) {
      return { text: 'Transfer Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    }
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
    <div className="space-y-6 relative">
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
            const isPending = pendingTicketIds.has(ticket.id);

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
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 ${status.color}`}>
                    {status.icon && <status.icon className="w-3 h-3" />}
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

                    {/* ✅ NEW: Display Transferred From info */}
                    {ticket.isSecondHand && ticket.previousOwner && ticket.previousOwner !== '0x0000000000000000000000000000000000000000' && (
                        <div className="flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs mt-1 border border-blue-100">
                            <ArrowRight className="w-3 h-3 mr-1" />
                            <span className="truncate">From: {formatAddress(ticket.previousOwner)}</span>
                        </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-gray-100">
                    <div className="flex gap-2">
                        <Link 
                        to={`/ticket/${ticket.id}`} 
                        className="flex-1 btn-outline text-center text-sm py-2"
                        >
                        View
                        </Link>
                        
                        {!ticket.isDownloaded && !isPending ? (
                        <Link 
                            to={`/ticket/${ticket.id}`} 
                            className="flex-1 btn-primary text-center text-sm py-2 flex items-center justify-center gap-1"
                        >
                            <Download className="w-3 h-3" /> Download
                        </Link>
                        ) : ticket.isDownloaded ? (
                        <Link 
                            to={`/ticket/${ticket.id}/print`} 
                            className="flex-1 btn-secondary text-center text-sm py-2 flex items-center justify-center gap-1"
                        >
                            <Shield className="w-3 h-3" /> Print
                        </Link>
                        ) : (
                             <span className="hidden"></span>
                        )}
                    </div>
                    
                    {/* Transfer Button Logic */}
                    {!isPending && !ticket.isRefunded && !ticket.isSecondHand && (
                        <button
                          onClick={() => openTransferModal(ticket)}
                          className="w-full text-xs text-gray-500 hover:text-primary-600 flex items-center justify-center gap-1 py-1 border border-transparent hover:border-gray-200 rounded transition-colors"
                        >
                          <Send className="w-3 h-3" /> Transfer / Gift Ticket
                        </button>
                    )}
                    
                    {/* Limit Reached Info */}
                    {ticket.isSecondHand && (
                         <div className="text-center text-xs text-gray-400 font-medium py-1">
                             Ticket Non-Transferable (Limit Reached)
                         </div>
                    )}

                    {isPending && (
                        <div className="text-center text-xs text-yellow-600 font-medium py-1">
                            Transfer Request Under Review
                        </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Transfer Ticket</h3>
              <button 
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 mb-4">
                <p className="font-semibold">Requesting transfer for: {selectedTicket?.eventName}</p>
                <p className="mt-1 text-xs opacity-80">
                  This request will be sent to the organizer for approval. 
                  Once approved, the ticket will be moved to the new wallet address.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Receiver Wallet Address (0x...)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                  value={transferForm.receiverAddress}
                  onChange={(e) => setTransferForm({...transferForm, receiverAddress: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Transfer
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="e.g. Cannot attend due to illness, Gift for a friend..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all resize-none"
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({...transferForm, reason: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingTransfer ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyTicketsPage;