import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { getContractReadOnly, formatAddress } from '../utils/web3';
import QrScanner from 'react-qr-scanner';
import toast from 'react-hot-toast';
import { 
  Shield, 
  Camera, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  RotateCcw,
  Calendar,
  User,
  Hash,
  Clock,
  Link as LinkIcon,
  Phone,
  UserCheck
} from 'lucide-react';

const AdminVerifyPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = async (data) => {
    if (data && !scanResult) {
      setScanResult(data);
      setIsScanning(false);
      await verifyTicket(data.text);
    }
  };

  const handleError = (err) => {
    console.error(err);
    if (!err.message.includes('The request is not allowed')) {
      toast.error("Ensure camera permissions are allowed");
    }
  };

  const verifyTicket = async (qrContent) => {
    setVerificationStatus('loading');
    
    try {
      // 1. Parse QR Data
      let ticketId;
      try {
        const parsed = JSON.parse(qrContent);
        ticketId = parsed.ticketId;
      } catch (e) {
        ticketId = qrContent;
      }

      if (!ticketId) throw new Error("Invalid QR Code format");

      const contract = getContractReadOnly();

      // 2. Fetch Blockchain Status
      const ticket = await contract.getTicket(ticketId);

      if (ticket.ticketId.toString() === '0') {
        throw new Error("Ticket does not exist");
      }

      // 3. Fetch Historical Data (Events)
      let txHash = 'N/A';
      let purchaseTime = null;

      try {
        const filter = contract.filters.TicketPurchased(ticketId);
        const events = await contract.queryFilter(filter);
        
        if (events.length > 0) {
          const purchaseEvent = events[events.length - 1];
          txHash = purchaseEvent.transactionHash;
          const block = await purchaseEvent.getBlock();
          purchaseTime = new Date(block.timestamp * 1000);
        }
      } catch (err) {
        console.warn("Could not fetch event history:", err);
      }

      // 4. Fetch Personal Details from Backend (Database) [NEW STEP]
      let buyerName = 'Unknown';
      let buyerPhone = 'N/A';

      try {
        const response = await fetch(`http://localhost:5000/api/purchases/ticket/${ticketId}`);
        if (response.ok) {
          const data = await response.json();
          // Accessing structure based on your PrintTicketPage logic
          if (data.data && data.data.purchase && data.data.purchase.buyerInfo) {
            buyerName = data.data.purchase.buyerInfo.name || 'Unknown';
            buyerPhone = data.data.purchase.buyerInfo.phone || 'N/A';
          }
        }
      } catch (err) {
        console.error("Could not fetch backend details:", err);
      }

      // 5. Format Data
      const formattedData = {
        id: ticket.ticketId.toString(),
        eventName: ticket.eventName,
        organizer: ticket.organizer,
        buyer: ticket.buyer,
        isSold: ticket.isSold,
        isRefunded: ticket.isRefunded,
        purchaseTime: purchaseTime || new Date(),
        txHash: txHash,
        // New Fields
        buyerName: buyerName,
        buyerPhone: buyerPhone
      };

      setTicketData(formattedData);

      // 6. Set Status
      if (formattedData.isRefunded) {
        setVerificationStatus('refunded');
      } else if (!formattedData.isSold) {
        setVerificationStatus('unsold');
      } else {
        setVerificationStatus('valid');
        toast.success("Ticket Verified Successfully!");
      }

    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationStatus('invalid');
      setErrorMsg(error.message || "Invalid Ticket Data");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationStatus(null);
    setTicketData(null);
    setIsScanning(true);
  };

  const openExplorer = (hash) => {
    if (hash && hash !== 'N/A') {
      window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center">
          <Shield className="w-6 h-6 mr-2 text-primary-600" />
          Gatekeeper Scanner
        </h1>
        <p className="text-gray-500 text-sm mt-1">Scan customer QR for entry details</p>
      </div>

      <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col items-center justify-center">
        
        {/* State: Camera Active */}
        {isScanning && (
          <div className="w-full h-full relative">
            <QrScanner
              delay={300}
              onError={handleError}
              onScan={handleScan}
              style={{ width: '100%', height: '400px', objectFit: 'cover' }}
              constraints={{ video: { facingMode: "environment" } }}
            />
            <div className="absolute inset-0 border-2 border-primary-500/50 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-white rounded-lg opacity-80"></div>
              <p className="absolute bottom-6 left-0 right-0 text-center text-white font-medium bg-black/60 py-2">
                Align QR Code within frame
              </p>
            </div>
          </div>
        )}

        {/* State: Idle */}
        {!isScanning && !verificationStatus && (
          <div className="bg-gray-900 w-full h-[400px] flex flex-col items-center justify-center text-white p-6">
            <Camera className="w-16 h-16 text-gray-600 mb-4" />
            <p className="text-gray-400 mb-6 text-center">Ready to verify incoming guests</p>
            <button 
              onClick={() => setIsScanning(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-full font-bold flex items-center transition-all transform hover:scale-105 shadow-lg shadow-primary-600/30"
            >
              <Camera className="w-5 h-5 mr-2" />
              Activate Scanner
            </button>
          </div>
        )}

        {/* State: Processing */}
        {verificationStatus === 'loading' && (
          <div className="bg-white w-full h-[400px] flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium animate-pulse">Fetching Details...</p>
          </div>
        )}

        {/* State: RESULT - VALID */}
        {verificationStatus === 'valid' && ticketData && (
          <div className="bg-green-50 w-full h-full p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800 mb-4">ACCESS GRANTED</h2>
            
            {/* Customer Details Card */}
            <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-green-100 space-y-3 text-left text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <span className="text-gray-500 flex items-center"><Hash className="w-3 h-3 mr-1"/> Ticket ID</span>
                <span className="font-mono font-bold text-gray-800">#{ticketData.id}</span>
              </div>

              {/* Personal Info Section */}
              <div className="bg-gray-50 p-2 rounded-lg space-y-2 mb-2">
                <div className="flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="font-semibold text-gray-900">{ticketData.buyerName}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-semibold text-gray-900">{ticketData.buyerPhone}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-1">
                <div className="flex items-start">
                  <User className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                  <div className="w-full">
                    <p className="text-xs text-gray-500">Wallet</p>
                    <p className="font-mono text-[10px] text-gray-600 break-all bg-gray-100 p-1 rounded">
                      {ticketData.buyer}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Purchased</p>
                    <p className="text-gray-800 text-xs">
                      {ticketData.purchaseTime?.toLocaleString() || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <LinkIcon className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">Transaction</p>
                    <button 
                      onClick={() => openExplorer(ticketData.txHash)}
                      className="text-primary-600 hover:text-primary-800 text-xs font-mono underline text-left break-all"
                    >
                      {ticketData.txHash.substring(0, 15)}...
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={resetScanner}
              className="mt-4 w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center shadow-lg shadow-green-600/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Scan Next Ticket
            </button>
          </div>
        )}

        {/* State: RESULT - INVALID */}
        {(verificationStatus === 'invalid' || verificationStatus === 'refunded' || verificationStatus === 'unsold') && (
          <div className="bg-red-50 w-full h-full p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-1">ACCESS DENIED</h2>
            <p className="text-red-600/80 mb-6 font-medium text-center px-4">
              {verificationStatus === 'refunded' ? 'Ticket REFUNDED' : 
               verificationStatus === 'unsold' ? 'Ticket NEVER SOLD' : 
               errorMsg}
            </p>

            <button 
              onClick={resetScanner}
              className="mt-2 w-full bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVerifyPage;