import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { getContractReadOnly, formatAddress } from '../utils/web3';
import { 
  Shield, 
  Search, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  User, 
  Calendar,
  Ticket
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminVerifyPage = () => {
  const { isConnected, isSupportedNetwork } = useWeb3();
  const [ticketId, setTicketId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null); // 'valid', 'invalid', 'refunded', 'unsold'

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!ticketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }

    setIsVerifying(true);
    setTicketData(null);
    setVerificationStatus(null);

    try {
      const contract = getContractReadOnly();
      
      // We use getTicket instead of verifyTicket because admins need to check 
      // tickets they don't own (verifyTicket checks msg.sender == owner)
      const ticket = await contract.getTicket(ticketId);

      // Check if ticket exists (ID != 0)
      if (ticket.ticketId.toString() === '0') {
        setVerificationStatus('invalid');
        toast.error('Ticket ID does not exist');
        setIsVerifying(false);
        return;
      }

      // Format data for display
      const formattedTicket = {
        id: ticket.ticketId.toString(),
        eventName: ticket.eventName,
        organizer: ticket.organizer,
        eventDate: new Date(Number(ticket.eventDate) * 1000),
        buyer: ticket.buyer,
        isSold: ticket.isSold,
        isRefunded: ticket.isRefunded,
        isDownloaded: ticket.isDownloaded
      };

      setTicketData(formattedTicket);

      // Determine status
      if (formattedTicket.isRefunded) {
        setVerificationStatus('refunded');
      } else if (!formattedTicket.isSold) {
        setVerificationStatus('unsold');
      } else {
        setVerificationStatus('valid');
        toast.success('Valid ticket found!');
      }

    } catch (error) {
      console.error('Verification error:', error);
      if (error.message.includes('Ticket does not exist')) {
        setVerificationStatus('invalid');
      } else {
        toast.error('Failed to verify ticket. Please check the network.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Ticket Verification
          </h1>
          <p className="text-gray-600 mt-2">
            Verify customer tickets at the venue entrance.
          </p>
        </div>

        <form onSubmit={handleVerify} className="mb-8">
          <div className="relative">
            <input
              type="number"
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="Enter Ticket ID"
              className="input-field pl-12"
              min="1"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={isVerifying || !isConnected}
            className="w-full btn-primary mt-4 flex items-center justify-center space-x-2"
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
          
          {!isConnected && (
            <p className="text-sm text-red-500 text-center mt-2">
              Please connect your wallet to verify tickets
            </p>
          )}
        </form>

        {/* Results Section */}
        {verificationStatus && (
          <div className={`rounded-lg border-2 p-6 animate-fade-in ${
            verificationStatus === 'valid' 
              ? 'border-green-100 bg-green-50' 
              : 'border-red-100 bg-red-50'
          }`}>
            <div className="flex items-center justify-center mb-4">
              {verificationStatus === 'valid' ? (
                <div className="flex items-center text-green-700">
                  <CheckCircle className="w-8 h-8 mr-2" />
                  <span className="text-xl font-bold">Valid Ticket</span>
                </div>
              ) : (
                <div className="flex items-center text-red-700">
                  <XCircle className="w-8 h-8 mr-2" />
                  <span className="text-xl font-bold">
                    {verificationStatus === 'refunded' ? 'Ticket Refunded' : 
                     verificationStatus === 'unsold' ? 'Ticket Not Sold' : 
                     'Invalid Ticket'}
                  </span>
                </div>
              )}
            </div>

            {ticketData && (
              <div className="space-y-3 border-t border-gray-200/50 pt-4 mt-4">
                <div className="flex items-start justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Ticket className="w-4 h-4 mr-2" /> Event:
                  </span>
                  <span className="font-semibold text-right">{ticketData.eventName}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <Calendar className="w-4 h-4 mr-2" /> Date:
                  </span>
                  <span className="font-medium">
                    {ticketData.eventDate.toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 flex items-center">
                    <User className="w-4 h-4 mr-2" /> Owner:
                  </span>
                  <span className="font-mono text-sm bg-white/50 px-2 py-1 rounded">
                    {formatAddress(ticketData.buyer)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ticketData.isDownloaded 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ticketData.isDownloaded ? 'Downloaded (NFT Minted)' : 'Not Downloaded'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVerifyPage;