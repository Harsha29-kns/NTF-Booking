import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, getContractReadOnly, formatETH, formatAddress, parseETH, waitForTransaction } from '../utils/web3';
import { getIPFSUrl } from '../utils/ipfs';
import IPFSImage from '../components/IPFSImage';
import TicketQuantityManager from '../components/TicketQuantityManager';
import contractInfo from '../contracts/TicketSale.json';
import toast from 'react-hot-toast';
import { 
  Calendar, 
  MapPin, 
  DollarSign, 
  User, 
  Clock,
  ShoppingCart,
  Download,
  Shield,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle
} from 'lucide-react';

const TicketDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, isConnected, isSupportedNetwork } = useWeb3();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastTransactionHash, setLastTransactionHash] = useState(null);

  useEffect(() => {
    if (id) {
      loadTicket();
      setupRealTimeListener();
    }
    // Cleanup listener on unmount
    return () => {
      const contract = getContractReadOnly();
      contract.removeAllListeners('TicketPurchased');
    };
  }, [id]);

  const setupRealTimeListener = () => {
    try {
      const contract = getContractReadOnly();
      // Listen for any ticket purchase to update availability
      contract.on('TicketPurchased', (ticketId, buyer, price) => {
        console.log('Real-time update: Ticket purchased!', ticketId, buyer);
        loadTicket(); // Reload data to update available tickets count
      });
    } catch (e) {
      console.error("Failed to setup event listener", e);
    }
  };

  const loadTicket = async () => {
    try {
      // Don't set loading to true here to avoid flickering on real-time updates
      // only set it if ticket is null (first load)
      if (!ticket) setIsLoading(true);
      setError(null);
      
      const contract = getContractReadOnly();
      
      // First check if ticket exists by trying to get it
      let ticketData;
      try {
        ticketData = await contract.getTicket(id);
      } catch (ticketError) {
        if (ticketError.message.includes("Ticket does not exist")) {
          setError('Ticket not found. It may have been deleted or the ID is invalid.');
          toast.error('Ticket not found');
          return;
        }
        throw ticketError; // Re-throw if it's a different error
      }
      
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
        totalTickets: Number(ticketData.totalTickets),
        availableTickets: Number(ticketData.availableTickets),
      });

      // Try to get transaction hash from contract events
      await loadTransactionHash();
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
      }
    } catch (error) {
      console.log('Could not load transaction hash:', error.message);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    setIsPurchasing(true);
    
    try {
      const contract = await getContract();
      
      toast.loading('Purchasing ticket...', { id: 'purchase' });
      
      // ticket.price is stored from the contract in wei already
      const tx = await contract.buyTicket(id, {
        value: BigInt(ticket.price)
      });
      
      toast.loading('Waiting for confirmation...', { id: 'purchase' });
      await tx.wait();
      
      toast.success('Ticket purchased successfully!', { id: 'purchase' });
      
      console.log('Purchase transaction completed:', tx.hash);
      
      // Store purchase information in backend (using wallet address for identification)
      try {
        const response = await fetch('http://localhost:5000/api/purchases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketId: parseInt(id),
            walletAddress: account, // Use the connected wallet address
            purchaseTxHash: tx.hash,
            eventName: ticket.eventName,
            organizer: ticket.organizer,
            eventDate: ticket.eventDate,
            posterUrl: ticket.posterUrl,
            ticketImageUrl: ticket.ticketImageUrl,
            price: ticket.price,
            seller: ticket.seller
          })
        });
        
        if (!response.ok) {
          console.warn('Failed to store purchase information in backend');
        }
      } catch (backendError) {
        console.warn('Backend error:', backendError);
      }
      
      // Reload ticket data
      await loadTicket();

     // notify other pages that tickets changed
     try {
       window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: { ticketId: id, action: 'purchased' } }));
     } catch (e) {
       // noop
     }
      
    } catch (error) {
      console.error('Error purchasing ticket:', error);
      toast.error(error.message || 'Failed to purchase ticket');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    setIsDownloading(true);
    
    try {
      toast.loading('Downloading ticket...', { id: 'download' });
      
      const contract = await getContract();
      const tx = await contract.downloadTicket(id);
      
      toast.loading('Waiting for confirmation...', { id: 'download' });
      const receipt = await tx.wait();
      
      // Store transaction hash for display
      setLastTransactionHash(tx.hash);
      
      toast.success('Ticket downloaded successfully! NFT minted to your wallet.', { id: 'download' });
      
      // Reload ticket data
      await loadTicket();
      
     // notify other pages
     try {
       window.dispatchEvent(new CustomEvent('ticketsUpdated', { detail: { ticketId: id, action: 'downloaded', txHash: tx?.hash } }));
     } catch (e) {
       // noop
     }
      
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error(error.message || 'Failed to download ticket');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleVerify = async () => {
    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    setIsVerifying(true);
    
    try {
      const contract = await getContract();
      const isValid = await contract.verifyTicket(id);
      
      setVerificationResult(isValid);
      
      if (isValid) {
        toast.success('Ticket verification successful!');
      } else {
        toast.error('Ticket verification failed');
      }
      
    } catch (error) {
      console.error('Error verifying ticket:', error);
      toast.error(error.message || 'Failed to verify ticket');
      setVerificationResult(false);
    } finally {
      setIsVerifying(false);
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

  const isSaleActive = () => {
    return new Date() < ticket.saleEndDate;
  };

  const isOwner = () => {
    return ticket.buyer && account && ticket.buyer.toLowerCase() === account.toLowerCase();
  };

  const isSeller = () => {
    return ticket.seller && account && ticket.seller.toLowerCase() === account.toLowerCase();
  };

  const canPurchase = () => {
    return isConnected && isSupportedNetwork && isSaleActive() && !ticket.isSold && !ticket.isRefunded && Number(ticket.availableTickets || 0) > 0;
  };

  const canDownload = () => {
    return isConnected && isSupportedNetwork && ticket.isSold && isOwner() && !ticket.isDownloaded && !ticket.isRefunded;
  };

  const canVerify = () => {
    return isConnected && isSupportedNetwork && ticket.isDownloaded;
  };

  if (isLoading && !ticket) {
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/tickets')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Events</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images */}
        <div className="space-y-6">
          {/* Poster */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Poster</h3>
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <IPFSImage
                cid={ticket.posterUrl}
                alt={ticket.eventName}
                className="w-full h-full object-cover"
                fallbackSrc="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPgo="
              />
            </div>
          </div>

          {/* Ticket Image */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Design</h3>
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <img
                src={getIPFSUrl(ticket.ticketImageUrl.replace('ipfs://', ''))}
                alt={`${ticket.eventName} Ticket`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBDMTYwIDgwIDE2MCA4MCAxNjAgODBaIiBmaWxsPSIjOUNBM0FGIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNkI3MjgwIiBmb250LWZhbWlseT0ic3lzdGVtLXVpIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPgo=';
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Details and Actions */}
        <div className="space-y-6">
          {/* Event Details */}
          <div className="card">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {ticket.eventName}
            </h1>
            
            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <User className="w-5 h-5 mr-3" />
                <span className="font-medium">Organizer:</span>
                <span className="ml-2">{ticket.organizer}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-3" />
                <span className="font-medium">Event Date:</span>
                <span className="ml-2">{formatDate(ticket.eventDate)}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <Clock className="w-5 h-5 mr-3" />
                <span className="font-medium">Sale Ends:</span>
                <span className="ml-2">{formatDate(ticket.saleEndDate)}</span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <DollarSign className="w-5 h-5 mr-3" />
                <span className="font-medium">Price:</span>
                <span className="ml-2 text-xl font-bold text-primary-600">
                  {formatETH(ticket.price)} ETH
                </span>
              </div>
              
              <div className="flex items-center text-gray-600">
                <User className="w-5 h-5 mr-3" />
                <span className="font-medium">Available Tickets:</span>
                <span className="ml-2 font-semibold">
                  {Number(ticket.availableTickets || 0)} / {Number(ticket.totalTickets || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Status</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sale Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isSaleActive() ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isSaleActive() ? 'Active' : 'Ended'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Purchase Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ticket.isSold ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {ticket.isSold ? 'Sold' : 'Available'}
                </span>
              </div>
              
              {ticket.isSold && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Download Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.isDownloaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ticket.isDownloaded ? 'Downloaded' : 'Pending Download'}
                  </span>
                </div>
              )}
              
              {ticket.isRefunded && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Refund Status:</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Refunded
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            
            <div className="space-y-3">
              {/* Purchase Button */}
              {canPurchase() && (
                <button
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      <span>Buy Ticket</span>
                    </>
                  )}
                </button>
              )}

              {/* Download Button */}
              {canDownload() && (
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Download Ticket</span>
                    </>
                  )}
                </button>
              )}

              {/* Verify Button */}
              {canVerify() && (
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full btn-outline flex items-center justify-center space-x-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      <span>Verify Ticket</span>
                    </>
                  )}
                </button>
              )}

              {/* Print Ticket Button */}
              {ticket.isDownloaded && isOwner() && (
                <button
                  onClick={() => navigate(`/ticket/${id}/print`)}
                  className="w-full btn-outline flex items-center justify-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Print Ticket</span>
                </button>
              )}

              {/* Verification Result */}
              {verificationResult !== null && (
                <div className={`p-3 rounded-lg flex items-center space-x-2 ${
                  verificationResult ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                }`}>
                  {verificationResult ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span>
                    {verificationResult ? 'Ticket is valid!' : 'Ticket verification failed'}
                  </span>
                </div>
              )}

              {/* Disabled States */}
              {!isConnected && (
                <div className="text-center text-gray-500 py-4">
                  Connect your wallet to interact with tickets
                </div>
              )}
              
              {isConnected && !isSupportedNetwork && (
                <div className="text-center text-red-500 py-4">
                  Please switch to Sepolia or Localhost network
                </div>
              )}
            </div>
          </div>

          {/* Ticket Details */}
          {ticket.isDownloaded && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ticket Number:</span>
                  <span className="font-mono font-semibold">#{ticket.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contract Address:</span>
                  <span className="font-mono text-xs">{formatAddress(contractInfo?.address || '')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Token ID:</span>
                  <span className="font-mono font-semibold">{ticket.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Buyer Address:</span>
                  <span className="font-mono text-xs">{formatAddress(ticket.buyer)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Hash:</span>
                  <span className="font-mono text-xs text-blue-600">
                    {lastTransactionHash ? `${lastTransactionHash.slice(0, 10)}...` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network:</span>
                  <span className="font-semibold">Localhost (31337)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Block Explorer:</span>
                  <span className="text-blue-600 text-xs">Local Network</span>
                </div>
              </div>
            </div>
          )}

          {/* Seller Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Seller:</span>
              <span className="font-mono text-sm">{formatAddress(ticket.seller)}</span>
            </div>
          </div>

          {/* Ticket Quantity Manager (for sellers) */}
          {isSeller() && (
            <TicketQuantityManager 
              ticket={ticket} 
              onUpdate={loadTicket}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;