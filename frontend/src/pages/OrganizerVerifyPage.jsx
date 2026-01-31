import React, { useState, useRef } from 'react';
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
  UserCheck,
  ArrowRightLeft,  // ✅ NEW: For transfer indicator
  AlertTriangle  // ✅ NEW: For duplicate warnings
} from 'lucide-react';

const OrganizerVerifyPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false); // ✅ Fix: Ref to prevent double-scans
  const [scanResult, setScanResult] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [ticketData, setTicketData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // ✅ NEW: Entry tracking state
  const [entryStatus, setEntryStatus] = useState(null); // 'unused', 'used', 'duplicate'
  const [entryTime, setEntryTime] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const handleScan = async (data) => {
    if (data && !scanResult && !isScanningRef.current) {
      isScanningRef.current = true; // ✅ Fix: Lock scanner immediately
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

      // ✅ NEW: Check if ticket was transferred
      let isTransferred = ticket.isSecondHand;
      let originalOwnerName = null;
      let originalOwnerPhone = null;
      let originalOwnerAddress = null;

      // If transferred, get original owner details
      if (isTransferred) {
        try {
          const transferFilter = contract.filters.TicketTransferred(ticketId);
          const transferEvents = await contract.queryFilter(transferFilter);

          if (transferEvents.length > 0) {
            const transferEvent = transferEvents[0];
            originalOwnerAddress = transferEvent.args.from;

            // Fetch original owner details from backend
            try {
              const originalOwnerResponse = await fetch(
                `http://localhost:5000/api/purchases/by-wallet/${originalOwnerAddress}/ticket/${ticketId}`
              );
              if (originalOwnerResponse.ok) {
                const originalOwnerData = await originalOwnerResponse.json();
                if (originalOwnerData.data && originalOwnerData.data.purchase && originalOwnerData.data.purchase.buyerInfo) {
                  originalOwnerName = originalOwnerData.data.purchase.buyerInfo.name || 'Unknown';
                  originalOwnerPhone = originalOwnerData.data.purchase.buyerInfo.phone || 'N/A';
                }
              }
            } catch (err) {
              console.warn("Could not fetch original owner details:", err);
              originalOwnerName = 'Unknown';
              originalOwnerPhone = 'N/A';
            }
          }
        } catch (err) {
          console.warn("Could not fetch transfer events:", err);
        }
      }

      // Fetch current owner details
      // ✅ ALWAYS fetch from user profile by wallet address (source of truth)
      // Purchase records can be stale or incomplete
      try {
        if (ticket.buyer) {
          const userResponse = await fetch(`http://localhost:5000/api/users/${ticket.buyer}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.success && userData.data && userData.data.user) {
              buyerName = userData.data.user.username || userData.data.user.name || 'Unknown';
              buyerPhone = userData.data.user.phone || 'N/A';
              console.log(`✅ Fetched user profile for ${ticket.buyer}:`, buyerName, buyerPhone);
            } else {
              console.warn('User profile not found, falling back to purchase record');
              // Fallback to purchase record if user profile doesn't exist
              const response = await fetch(`http://localhost:5000/api/purchases/ticket/${ticketId}`);
              if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.purchase && data.data.purchase.buyerInfo) {
                  buyerName = data.data.purchase.buyerInfo.name || 'Unknown';
                  buyerPhone = data.data.purchase.buyerInfo.phone || 'N/A';
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Could not fetch user details:", err);
        // Last resort: try purchase record
        try {
          const response = await fetch(`http://localhost:5000/api/purchases/ticket/${ticketId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.data && data.data.purchase && data.data.purchase.buyerInfo) {
              buyerName = data.data.purchase.buyerInfo.name || 'Unknown';
              buyerPhone = data.data.purchase.buyerInfo.phone || 'N/A';
            }
          }
        } catch (purchaseErr) {
          console.error("Could not fetch purchase details:", purchaseErr);
        }
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
        // Current owner fields
        buyerName: buyerName,
        buyerPhone: buyerPhone,
        // ✅ NEW: Transfer fields
        isTransferred: isTransferred,
        originalOwnerName: originalOwnerName,
        originalOwnerPhone: originalOwnerPhone,
        originalOwnerAddress: originalOwnerAddress
      };

      setTicketData(formattedData);

      // ✅ NEW: 6. Check Entry Status (Has ticket been used?)
      try {
        const isUsed = await contract.hasTicketBeenUsed(ticketId);

        if (isUsed) {
          // Ticket already used for entry
          const entryTimestamp = await contract.getTicketEntryTime(ticketId);
          const entryDate = new Date(entryTimestamp.toNumber() * 1000);

          setEntryStatus('used');
          setEntryTime(entryDate);
          setVerificationStatus('already_used');
          toast.error("Ticket Already Used!");
          return;
        }

        // Ticket not used yet - mark as used
        setEntryStatus('unused');

        // Call backend to log entry and check for duplicates
        try {
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:5000/api/entry/mark-used', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              ticketId: ticketId,
              eventName: ticket.eventName,
              walletAddress: ticket.buyer, // <--- ADDED: Required by EntryLog schema
              location: { gate: 'Main Entrance' }
            })
          });

          const data = await response.json();

          if (!data.success) {
            if (data.error === 'DUPLICATE_SCAN') {
              // Duplicate scan detected (Warning)
              setDuplicateWarning(data.lastScan);
              setVerificationStatus('duplicate'); // Or keep 'valid' but with warning, user wanted red for "Already Used"
              toast.error("Duplicate Scan Detected!");
              return;
            }

            if (data.error === 'ALREADY_USED') {
              // Ticket used previously (Error)
              setEntryStatus('used');
              setEntryTime(new Date(data.entryTime));
              setVerificationStatus('already_used');
              toast.error("Ticket Already Used!");
              return;
            }
          }

          // Success - first time scan
          setVerificationStatus('valid');
          toast.success("Ticket Verified Successfully!");

        } catch (err) {
          console.error('Entry marking failed:', err);
          // Still show as valid even if backend logging fails
          setVerificationStatus('valid');
          toast.success("Ticket Verified (Backend logging unavailable)");
        }

      } catch (err) {
        console.error('Entry status check failed:', err);
        // Fallback to showing as valid if blockchain check fails
        setVerificationStatus('valid');
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
    setEntryStatus(null);
    setEntryTime(null);
    setDuplicateWarning(null);
    isScanningRef.current = false; // ✅ Fix: Reset lock
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
              // Use user-facing camera if environment is not available (common on laptops)
              constraints={{
                video: {
                  facingMode: { ideal: "environment" }
                }
              }}
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
                <span className="text-gray-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> Ticket ID</span>
                <span className="font-mono font-bold text-gray-800">#{ticketData.id}</span>
              </div>

              {/* ✅ NEW: Duplicate Scan Warning */}
              {duplicateWarning && (
                <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top duration-300">
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-700 mr-2 flex-shrink-0" />
                    <span className="font-bold text-red-900 text-sm uppercase tracking-wide">Duplicate Scan Detected!</span>
                  </div>
                  <p className="text-xs text-red-800 mb-2">
                    This ticket was scanned recently. Possible fraud attempt.
                  </p>
                  <div className="bg-white rounded p-2 text-xs">
                    <p className="text-gray-600">Last Scan: {new Date(duplicateWarning.time).toLocaleString()}</p>
                    {duplicateWarning.location && (
                      <p className="text-gray-600">Location: {duplicateWarning.location.gate || 'Unknown'}</p>
                    )}
                  </div>
                </div>
              )}

              {/* ✅ NEW: Transfer Indicator Section */}
              {ticketData.isTransferred && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3 mb-3 animate-in fade-in slide-in-from-top duration-300">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-2">
                      <ArrowRightLeft className="w-4 h-4 text-amber-700" />
                    </div>
                    <span className="font-bold text-amber-900 text-sm uppercase tracking-wide">Transferred Ticket</span>
                  </div>

                  {/* Original Owner */}
                  <div className="bg-white rounded-lg p-3 mb-2 border border-amber-200">
                    <div className="flex items-start">
                      <User className="w-4 h-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Original Buyer</p>
                        <p className="font-semibold text-gray-900">{ticketData.originalOwnerName || 'Unknown'}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{ticketData.originalOwnerPhone || 'N/A'}</p>
                        {ticketData.originalOwnerAddress && (
                          <p className="text-[10px] text-gray-400 font-mono mt-1 break-all">
                            {ticketData.originalOwnerAddress.slice(0, 10)}...{ticketData.originalOwnerAddress.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex justify-center my-1">
                    <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="w-3 h-3 text-amber-700" />
                    </div>
                  </div>

                  {/* Current Owner */}
                  <div className="bg-green-50 rounded-lg p-3 border-2 border-green-300">
                    <div className="flex items-start">
                      <UserCheck className="w-4 h-4 mr-2 text-green-700 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-green-700 font-semibold mb-1">Current Owner (Valid Holder)</p>
                        <p className="font-bold text-green-900">{ticketData.buyerName}</p>
                        <p className="text-xs text-green-800 mt-0.5">{ticketData.buyerPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Personal Info Section (Only show if NOT transferred) */}
              {!ticketData.isTransferred && (
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
              )}

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

        {/* ✅ NEW: State: ALREADY USED */}
        {verificationStatus === 'already_used' && ticketData && (
          <div className="bg-orange-50 w-full h-full p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <XCircle className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-orange-800 mb-2">ALREADY USED</h2>
            <p className="text-orange-700 mb-4 text-center font-medium">
              This ticket was already scanned for entry
            </p>

            <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-orange-200 space-y-2 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> Ticket ID</span>
                <span className="font-mono font-bold text-gray-800">#{ticketData.id}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-orange-100">
                <span className="text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Entry Time</span>
                <span className="font-semibold text-orange-800">{entryTime?.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-orange-100">
                <p className="text-xs text-gray-500 mb-1">Ticket Holder</p>
                <p className="font-semibold text-gray-900">{ticketData.buyerName}</p>
                <p className="text-xs text-gray-600 mt-0.5">{ticketData.buyerPhone}</p>
              </div>
            </div>

            <button
              onClick={resetScanner}
              className="mt-2 w-full bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Scan Next Ticket
            </button>
          </div>
        )}

        {/* State: RESULT - DUPLICATE (Soft Warning) */}
        {verificationStatus === 'duplicate' && ticketData && (
          <div className="bg-amber-50 w-full h-full p-6 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-2">DUPLICATE SCAN</h2>
            <p className="text-amber-700 mb-4 text-center font-medium">
              This ticket was just scanned!
            </p>

            <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-amber-200 space-y-2 text-sm mb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> Ticket ID</span>
                <span className="font-mono font-bold text-gray-800">#{ticketData.id}</span>
              </div>
              {duplicateWarning && (
                <div className="flex justify-between items-center pt-2 border-t border-amber-100">
                  <span className="text-gray-500 flex items-center"><Clock className="w-3 h-3 mr-1" /> Previous Scan</span>
                  <span className="font-semibold text-amber-800">
                    {new Date(duplicateWarning.scanTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-amber-100">
                <p className="text-xs text-gray-500 mb-1">Ticket Holder</p>
                <p className="font-semibold text-gray-900">{ticketData.buyerName}</p>
              </div>
            </div>

            <button
              onClick={resetScanner}
              className="mt-2 w-full bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 font-semibold flex items-center justify-center"
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

export default OrganizerVerifyPage;