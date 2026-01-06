import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContractReadOnly, formatETH, formatAddress } from '../utils/web3';
import { getIPFSUrl } from '../utils/ipfs';
import IPFSImage from '../components/IPFSImage';
import contractInfo from '../contracts/TicketSale.json';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  User, 
  Clock,
  Download,
  Shield,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Printer,
  Copy,
  ExternalLink
} from 'lucide-react';

const PrintTicketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, isSupportedNetwork } = useWeb3();
  const [ticket, setTicket] = useState(null);
  const [buyerInfo, setBuyerInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastTransactionHash, setLastTransactionHash] = useState(null);
  const [hasBlockchainHash, setHasBlockchainHash] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicketData();
    }
  }, [id]);

  const loadTicketData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const contract = getContractReadOnly();
      const ticketData = await contract.getTicket(id);
      
      setTicket({
        id: id,
        eventName: ticketData.eventName,
        organizer: ticketData.organizer,
        eventDate: new Date(Number(ticketData.eventDate) * 1000),
        saleEndDate: new Date(Number(ticketData.saleEndDate) * 1000),
        price: ticketData.price.toString(),
        posterUrl: ticketData.posterUrl,
        ticketImageUrl: ticketData.ticketImageUrl,
        seller: ticketData.seller,
        buyer: ticketData.buyer,
        isSold: ticketData.isSold,
        isDownloaded: ticketData.isDownloaded,
        isRefunded: ticketData.isRefunded,
        totalTickets: ticketData.totalTickets,
        availableTickets: ticketData.availableTickets,
      });

      // Try to get transaction hash from contract events
      await loadTransactionHash();

      // Load buyer information from backend
      try {
        const response = await fetch(`http://localhost:5000/api/purchases/ticket/${id}`);
        if (response.ok) {
          const purchaseData = await response.json();
          setBuyerInfo(purchaseData.data.purchase.buyerInfo);
          // Only set transaction hash from backend if we don't already have one from blockchain events
          if (!hasBlockchainHash && purchaseData.data.purchase.purchaseTxHash) {
            setLastTransactionHash(purchaseData.data.purchase.purchaseTxHash);
          }
        }
      } catch (backendError) {
        console.warn('Failed to load buyer information:', backendError);
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      setError('Failed to load ticket details');
      toast.error('Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactionHash = async () => {
    try {
      const contract = getContractReadOnly();
      
      // First try to get TicketDownloaded event
      let filter = contract.filters.TicketDownloaded(id);
      let events = await contract.queryFilter(filter);
      
      // If no download event, try TicketPurchased event
      if (events.length === 0) {
        filter = contract.filters.TicketPurchased(id);
        events = await contract.queryFilter(filter);
      }
      
      if (events.length > 0) {
        // Get the transaction hash from the most recent event
        const latestEvent = events[events.length - 1];
        setLastTransactionHash(latestEvent.transactionHash);
        setHasBlockchainHash(true);
        console.log('Found transaction hash:', latestEvent.transactionHash);
      } else {
        console.log('No transaction events found for ticket:', id);
      }
    } catch (error) {
      console.log('Could not load transaction hash:', error.message);
      // Don't set error state for this, it's not critical
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handlePrint = () => {
    window.print();
  };

  const isOwner = () => {
    return ticket.buyer && account && ticket.buyer.toLowerCase() === account.toLowerCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Ticket Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            The ticket you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/tickets')}
            className="btn-primary"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (!ticket.isDownloaded) {
    return (
      <div className="text-center">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Ticket Not Ready
          </h2>
          <p className="text-gray-600 mb-6">
            This ticket has not been downloaded yet. Please download the ticket first.
          </p>
          <button
            onClick={() => navigate(`/ticket/${id}`)}
            className="btn-primary"
          >
            Go to Ticket
          </button>
        </div>
      </div>
    );
  }

  if (!isOwner()) {
    return (
      <div className="text-center">
        <div className="card max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            You are not authorized to view this ticket.
          </p>
          <button
            onClick={() => navigate('/tickets')}
            className="btn-primary"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/my-tickets')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Tickets</span>
      </button>

      {/* Print Button */}
      <div className="flex justify-end">
        <button
          onClick={handlePrint}
          className="btn-primary flex items-center space-x-2"
        >
          <Printer className="w-5 h-5" />
          <span>Print Ticket</span>
        </button>
      </div>

      {/* Ticket Print Layout */}
      <div className="bg-white border-2 border-gray-300 rounded-lg p-8 print:border-0 print:rounded-none print:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {ticket.eventName}
          </h1>
          <p className="text-xl text-gray-600">Digital Ticket</p>
        </div>

        {/* Ticket Image */}
        <div className="text-center mb-8">
          <div className="inline-block border-2 border-gray-300 rounded-lg overflow-hidden">
            <img
              src={getIPFSUrl(ticket.ticketImageUrl.replace('ipfs://', ''))}
              alt={`${ticket.eventName} Ticket`}
              className="w-80 h-48 object-cover"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPgo=';
              }}
            />
          </div>
        </div>

        {/* Ticket Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-5 h-5 mr-3 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Organizer:</span>
                    <p className="font-medium">{ticket.organizer}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Event Date:</span>
                    <p className="font-medium">{formatDate(ticket.eventDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-3 text-gray-600" />
                  <div>
                    <span className="text-sm text-gray-600">Price:</span>
                    <p className="font-medium text-lg">{formatETH(ticket.price)} ETH</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Information */}
            {buyerInfo && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{buyerInfo.name}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">Phone:</span>
                    <p className="font-medium">{buyerInfo.phone}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">Address:</span>
                    <p className="font-medium">{buyerInfo.address}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">Seller Phone:</span>
                    <p className="font-medium">{buyerInfo.sellerPhone}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ticket Number:</span>
                  <span className="font-mono font-semibold">#{ticket.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Contract Address:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs">{formatAddress(contractInfo?.address || '')}</span>
                    <button
                      onClick={() => copyToClipboard(contractInfo?.address || '')}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Token ID:</span>
                  <span className="font-mono font-semibold">{ticket.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Buyer Address:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs">{formatAddress(ticket.buyer)}</span>
                    <button
                      onClick={() => copyToClipboard(ticket.buyer)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Transaction Hash:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs">
                      {lastTransactionHash ? `${lastTransactionHash.slice(0, 10)}...` : 'N/A'}
                    </span>
                    {lastTransactionHash && (
                      <button
                        onClick={() => copyToClipboard(lastTransactionHash)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Network:</span>
                  <span className="font-semibold">Localhost (31337)</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Block Explorer:</span>
                  <span className="text-blue-600 text-xs">Local Network</span>
                </div>
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Features
              </h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Blockchain Verified</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Non-Transferable (Soulbound)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Unique Token ID</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span>Immutable Record</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p>This is a digital ticket. Please present this ticket at the event.</p>
          <p className="mt-2">Generated on {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default PrintTicketPage;

