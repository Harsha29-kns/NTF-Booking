import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, formatAddress, getContractReadOnly, getProvider } from '../utils/web3';
import toast from 'react-hot-toast';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Search,
  Calendar,
  User,
  MapPin
} from 'lucide-react';

const VerifyTicketPage = () => {
  const { isConnected, isSupportedNetwork } = useWeb3();
  const [searchParams] = useSearchParams();
  const [ticketId, setTicketId] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [ticketDetails, setTicketDetails] = useState(null);
  const [verificationMethod, setVerificationMethod] = useState('ticketId'); // 'ticketId' or 'transactionHash'

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setTicketId(idFromUrl);
    }
  }, [searchParams]);

  const handleVerify = async (e) => {
    e.preventDefault();
    
    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    if (verificationMethod === 'ticketId' && !ticketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }

    if (verificationMethod === 'transactionHash' && !transactionHash.trim()) {
      toast.error('Please enter a transaction hash');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);
    setTicketDetails(null);
    
    try {
      const contract = await getContract();
      
      let isValid = false;
      let details = null;

      if (verificationMethod === 'ticketId') {
        // Verify by ticket ID
        isValid = await contract.verifyTicket(ticketId);
        
        if (isValid) {
          try {
            const ticket = await contract.getTicket(ticketId);
            details = {
              ticketId: ticketId,
              eventName: ticket.eventName,
              organizer: ticket.organizer,
              eventDate: new Date(Number(ticket.eventDate) * 1000),
              price: ticket.price.toString(),
              seller: ticket.seller,
              buyer: ticket.buyer,
              isDownloaded: ticket.isDownloaded,
              totalTickets: Number(ticket.totalTickets),
              availableTickets: Number(ticket.availableTickets),
            };
          } catch (error) {
            console.error('Error fetching ticket details:', error);
          }
        }
      } else {
        // Verify by transaction hash
        try {
          // Get provider directly
          const provider = getProvider();
          console.log('Provider:', provider);
          
          if (!provider) {
            throw new Error('Provider not available');
          }
          
          // Get transaction details
          console.log('Getting transaction for hash:', transactionHash);
          const tx = await provider.getTransaction(transactionHash);
          console.log('Transaction found:', tx);
          if (!tx) {
            throw new Error('Transaction not found');
          }

          // Get transaction receipt to get events
          console.log('Getting transaction receipt...');
          const receipt = await provider.getTransactionReceipt(transactionHash);
          console.log('Transaction receipt found:', receipt);
          if (!receipt) {
            throw new Error('Transaction receipt not found');
          }

          // Look for TicketDownloaded or TicketPurchased events in the transaction
          const readOnlyContract = getContractReadOnly();
          console.log('Read-only contract:', readOnlyContract);
          console.log('Receipt logs:', receipt.logs);
          
          const events = receipt.logs.filter(log => {
            try {
              const decoded = readOnlyContract.interface.parseLog(log);
              console.log('Decoded log:', decoded);
              return decoded.name === 'TicketDownloaded' || decoded.name === 'TicketPurchased';
            } catch (error) {
              console.log('Error parsing log:', error);
              return false;
            }
          });

          console.log('Filtered events:', events);

          if (events.length > 0) {
            // Get the ticket ID from the event
            const event = readOnlyContract.interface.parseLog(events[0]);
            const foundTicketId = event.args.ticketId.toString();
            console.log('Found ticket ID:', foundTicketId);
            console.log('Event type:', event.name);
            
            // Verify the ticket
            isValid = await contract.verifyTicket(foundTicketId);
            
            if (isValid) {
              const ticket = await contract.getTicket(foundTicketId);
              details = {
                ticketId: foundTicketId,
                transactionHash: transactionHash,
                eventName: ticket.eventName,
                organizer: ticket.organizer,
                eventDate: new Date(Number(ticket.eventDate) * 1000),
                price: ticket.price.toString(),
                seller: ticket.seller,
                buyer: ticket.buyer,
                isDownloaded: ticket.isDownloaded,
                totalTickets: Number(ticket.totalTickets),
                availableTickets: Number(ticket.availableTickets),
              };
            }
          } else {
            throw new Error('No TicketDownloaded or TicketPurchased event found in this transaction');
          }
        } catch (error) {
          console.error('Error verifying by transaction hash:', error);
          throw new Error('Invalid transaction hash or transaction does not contain a ticket purchase/download event');
        }
      }
      
      setVerificationResult(isValid);
      setTicketDetails(details);
      
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

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verify Ticket
          </h1>
          <p className="text-gray-600">
            Verify the authenticity and ownership of an NFT ticket
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Connect your wallet to verify tickets
            </div>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Connect Wallet
            </button>
          </div>
        ) : !isSupportedNetwork ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-4">
              Please switch to Sepolia or Localhost network
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6">
            {/* Verification Method Selection */}
            <div>
              <label className="label">Verification Method</label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="verificationMethod"
                    value="ticketId"
                    checked={verificationMethod === 'ticketId'}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span>By Ticket ID</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="verificationMethod"
                    value="transactionHash"
                    checked={verificationMethod === 'transactionHash'}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="mr-2"
                  />
                  <span>By Transaction Hash</span>
                </label>
              </div>
            </div>

            {/* Ticket ID Input */}
            {verificationMethod === 'ticketId' && (
              <div>
                <label className="label">
                  <Search className="w-4 h-4 inline mr-2" />
                  Ticket ID
                </label>
                <input
                  type="text"
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  className="input-field"
                  placeholder="Enter ticket ID to verify"
                />
              </div>
            )}

            {/* Transaction Hash Input */}
            {verificationMethod === 'transactionHash' && (
              <div>
                <label className="label">
                  <Search className="w-4 h-4 inline mr-2" />
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="input-field"
                  placeholder="Enter transaction hash to verify"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter the transaction hash from when the ticket was purchased or downloaded
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full btn-primary flex items-center justify-center space-x-2"
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
          </form>
        )}

        {/* Verification Result */}
        {verificationResult !== null && (
          <div className="mt-8">
            <div className={`p-6 rounded-lg ${
              verificationResult ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center space-x-3 mb-4">
                {verificationResult ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h3 className={`text-xl font-semibold ${
                    verificationResult ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {verificationResult ? 'Ticket Verified!' : 'Verification Failed'}
                  </h3>
                  <p className={`${
                    verificationResult ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {verificationResult 
                      ? 'This ticket is authentic and owned by your wallet'
                      : 'This ticket is invalid or not owned by your wallet'
                    }
                  </p>
                </div>
              </div>

              {/* Ticket Details */}
              {ticketDetails && (
                <div className="bg-white rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">Ticket Details</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Event:</span>
                      <span className="font-medium">{ticketDetails.eventName}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Organizer:</span>
                      <span className="font-medium">{ticketDetails.organizer}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{formatDate(ticketDetails.eventDate)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticketDetails.isDownloaded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticketDetails.isDownloaded ? 'Downloaded' : 'Pending Download'}
                      </span>
                    </div>

                    {ticketDetails.ticketId && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Ticket ID:</span>
                        <span className="font-mono text-sm">{ticketDetails.ticketId}</span>
                      </div>
                    )}

                    {ticketDetails.transactionHash && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Transaction Hash:</span>
                        <span className="font-mono text-xs text-blue-600">
                          {ticketDetails.transactionHash.slice(0, 10)}...{ticketDetails.transactionHash.slice(-8)}
                        </span>
                      </div>
                    )}

                    {ticketDetails.totalTickets !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Total Tickets:</span>
                        <span className="font-medium">{ticketDetails.totalTickets}</span>
                      </div>
                    )}

                    {ticketDetails.availableTickets !== undefined && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium">{ticketDetails.availableTickets}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Seller: {formatAddress(ticketDetails.seller)}</div>
                      <div>Buyer: {formatAddress(ticketDetails.buyer)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How to Verify</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Enter the ticket ID you want to verify</li>
            <li>• Make sure you're connected with the wallet that owns the ticket</li>
            <li>• The system will check if the ticket is valid and owned by you</li>
            <li>• Only downloaded tickets can be verified</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyTicketPage;

