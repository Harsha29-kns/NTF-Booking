import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContractReadOnly } from '../utils/web3';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import { 
  Loader2,
  ArrowLeft,
  Shield,
  Maximize2,
  Info
} from 'lucide-react';

const PrintTicketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useWeb3();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicketData();
    }
  }, [id]);

  const loadTicketData = async () => {
    try {
      setIsLoading(true);
      const contract = getContractReadOnly();
      const ticketData = await contract.getTicket(id);
      
      setTicket({
        id: id,
        eventName: ticketData.eventName,
        organizer: ticketData.organizer,
        eventDate: new Date(Number(ticketData.eventDate) * 1000),
        buyer: ticketData.buyer,
        isDownloaded: ticketData.isDownloaded,
      });

    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  };

  const isOwner = () => {
    return ticket?.buyer && account && ticket.buyer.toLowerCase() === account.toLowerCase();
  };

  // Generate the QR payload
  const qrPayload = ticket ? JSON.stringify({
    ticketId: ticket.id,
    eventName: ticket.eventName,
    buyer: ticket.buyer,
    timestamp: Date.now() // Adds uniqueness to prevent static screenshot replay attacks if validated strictly
  }) : "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!ticket || !isOwner()) {
    return (
      <div className="text-center mt-10">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="text-gray-600 mt-2">You do not own this ticket.</p>
        <button onClick={() => navigate('/my-tickets')} className="btn-primary mt-4">
          Back to My Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Navigation */}
      <button
        onClick={() => navigate('/my-tickets')}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Main Ticket Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Event Header */}
        <div className="bg-primary-600 p-6 text-white text-center">
          <h1 className="text-2xl font-bold">{ticket.eventName}</h1>
          <p className="opacity-90 mt-1">
            {ticket.eventDate.toLocaleDateString()} • {ticket.eventDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        {/* QR Code Section */}
        <div className="p-8 flex flex-col items-center justify-center bg-white">
          <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-300">
            <QRCode 
              value={qrPayload} 
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-6 flex items-center">
            <Maximize2 className="w-4 h-4 mr-1" />
            Show this QR code at the entrance
          </p>
        </div>

        {/* Security Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center">
          <div className="flex items-center text-green-700 text-sm font-medium">
            <Shield className="w-4 h-4 mr-1.5" />
            Verified Owner
          </div>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-primary-600 text-sm hover:underline flex items-center"
          >
            <Info className="w-4 h-4 mr-1" />
            {showDetails ? 'Hide Details' : 'Ticket Info'}
          </button>
        </div>

        {/* Toggleable Details */}
        {showDetails && (
          <div className="p-6 bg-gray-50 border-t border-gray-200 animate-fade-in">
             <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Ticket ID</span>
                  <span className="font-mono font-bold">#{ticket.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Organizer</span>
                  <span className="font-medium">{ticket.organizer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Owner</span>
                  <span className="font-mono text-xs text-gray-600">{ticket.buyer}</span>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintTicketPage;