import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QrScanner from 'react-qr-scanner';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { getContractReadOnly } from '../utils/web3';
import {
    ShieldCheck,
    LogOut,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Camera,
    Loader2,
    RefreshCw,
    User,
    Phone,
    ArrowRightLeft,
    UserCheck,
    Hash,
    Clock,
    Link as LinkIcon
} from 'lucide-react';

// Helper to decode JWT on frontend (without library)
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

const GatekeeperScannerPage = () => {
    const navigate = useNavigate();
    const [scanResult, setScanResult] = useState(null);
    const [isScanning, setIsScanning] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, processing, success, error, duplicate
    const [errorMessage, setErrorMessage] = useState('');
    const [lastScanData, setLastScanData] = useState(null);
    const isProcessingRef = useRef(false);

    // Get Gatekeeper Info
    const eventName = localStorage.getItem('gatekeeperEvent') || 'Unknown Event';
    const token = localStorage.getItem('gatekeeperToken');

    useEffect(() => {
        if (!token) {
            navigate('/gatekeeper/login');
        }
    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('gatekeeperToken');
        localStorage.removeItem('gatekeeperEvent');
        navigate('/gatekeeper/login');
    };

    const fetchRichTicketDetails = async (ticketId, ticketDataFromBackend) => {
        try {
            const contract = getContractReadOnly();
            const ticket = await contract.getTicket(ticketId);

            // Basic data from backend/contract
            let richData = {
                ...ticketDataFromBackend,
                ticketId: ticketId,
                eventName: ticket.eventName,
                buyer: ticket.buyer,
                isTransferred: ticket.isSecondHand,
                originalOwnerName: 'Unknown',
                originalOwnerPhone: 'N/A',
                originalOwnerAddress: null,
                buyerName: 'Unknown',
                buyerPhone: 'N/A',
                txHash: 'N/A',
                purchaseTime: null
            };

            // 1. Fetch Transfer History
            if (ticket.isSecondHand) {
                try {
                    const transferFilter = contract.filters.TicketTransferred(ticketId);
                    const transferEvents = await contract.queryFilter(transferFilter);

                    if (transferEvents.length > 0) {
                        const transferEvent = transferEvents[0];
                        richData.originalOwnerAddress = transferEvent.args.from;

                        // Fetch original owner details
                        try {
                            const originalOwnerResponse = await fetch(
                                `http://localhost:5000/api/purchases/by-wallet/${richData.originalOwnerAddress}/ticket/${ticketId}`
                            );
                            if (originalOwnerResponse.ok) {
                                const originalOwnerData = await originalOwnerResponse.json();
                                if (originalOwnerData.data?.purchase?.buyerInfo) {
                                    richData.originalOwnerName = originalOwnerData.data.purchase.buyerInfo.name || 'Unknown';
                                    richData.originalOwnerPhone = originalOwnerData.data.purchase.buyerInfo.phone || 'N/A';
                                }
                            }
                        } catch (err) {
                            console.warn("Could not fetch original owner details:", err);
                        }
                    }
                } catch (err) {
                    console.warn("Could not fetch transfer events:", err);
                }
            }

            // 2. Fetch Current Owner Details
            try {
                if (ticket.buyer) {
                    // Try getting user profile first
                    const userResponse = await fetch(`http://localhost:5000/api/users/${ticket.buyer}`);
                    let userFound = false;

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        if (userData.success && userData.data && userData.data.user) {
                            richData.buyerName = userData.data.user.username || userData.data.user.name || 'Unknown';
                            richData.buyerPhone = userData.data.user.phone || 'N/A';
                            userFound = true;
                        }
                    }

                    if (!userFound) {
                        // Fallback to purchase record
                        const response = await fetch(`http://localhost:5000/api/purchases/ticket/${ticketId}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (data.data?.purchase?.buyerInfo) {
                                richData.buyerName = data.data.purchase.buyerInfo.name || 'Unknown';
                                richData.buyerPhone = data.data.purchase.buyerInfo.phone || 'N/A';
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Could not fetch user details, using defaults", err);
            }

            // 3. Fetch Purchase TX Hash (for link)
            try {
                const filter = contract.filters.TicketPurchased(ticketId);
                const events = await contract.queryFilter(filter);
                if (events.length > 0) {
                    richData.txHash = events[events.length - 1].transactionHash;
                    const block = await events[events.length - 1].getBlock();
                    richData.purchaseTime = new Date(block.timestamp * 1000);
                }
            } catch (err) {
                console.warn("Could not fetch purchase event:", err);
            }

            return richData;
        } catch (error) {
            console.error("Error fetching rich details:", error);
            // Return queryable basics if blockchain fetch fails
            return {
                ...ticketDataFromBackend,
                buyerName: 'Error Loading Data',
                buyerPhone: 'N/A'
            };
        }
    };

    const handleScan = async (data) => {
        if (data && !isProcessingRef.current) {
            // Lock to prevent multi-scan
            isProcessingRef.current = true;
            setIsScanning(false);
            setVerificationStatus('processing');

            try {
                // Parse QR Data
                let ticketId, walletAddress, qrTimestamp, scannedEventName, qrToken;

                try {
                    const parsed = JSON.parse(data.text);

                    // CHECK FOR 2FA TOKEN
                    if (parsed.token) {
                        qrToken = parsed.token;
                        const decoded = parseJwt(qrToken);
                        if (!decoded) throw new Error("Invalid Token Format");

                        // Extract data from Token
                        ticketId = decoded.ticketId;
                        walletAddress = decoded.wallet;
                        qrTimestamp = decoded.timestamp;
                        // decoded token doesn't have eventName usually to save space, 
                        // but let's assume valid based on ticketId query later.
                        // Or we can add eventName to JWT payload in backend if needed.
                        // For now, let's rely on backend validation of ticket ownership.
                    } else {
                        // LEGACY / STATIC QR
                        ticketId = parsed.ticketId;
                        walletAddress = parsed.buyer;
                        qrTimestamp = parsed.timestamp;
                        scannedEventName = parsed.eventName;
                    }

                } catch (e) {
                    throw new Error("Invalid QR Code Format");
                }

                // SECURITY CHECK: Verify Event Match
                if (scannedEventName && eventName && scannedEventName.trim().toLowerCase() !== eventName.trim().toLowerCase()) {
                    setVerificationStatus('wrong_event');
                    setLastScanData({ eventName: scannedEventName });
                    return;
                }

                // Call API with custom header
                const response = await fetch('http://localhost:5000/api/entry/mark-used', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ticketId,
                        walletAddress,
                        eventName,
                        qrTimestamp,
                        qrToken // Send Token for Verification
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    // Success! Now fetch rich details for display
                    const richDetails = await fetchRichTicketDetails(ticketId, result.data);

                    setLastScanData(richDetails);
                    setVerificationStatus('success');

                    // Play success sound
                    new Audio('/sounds/success.mp3').play().catch(() => { });
                } else {
                    if (result.error === 'DUPLICATE_SCAN') {
                        // Fetch rich details for duplicate too if possible
                        const richDetails = await fetchRichTicketDetails(ticketId, result.lastScan);
                        setLastScanData(richDetails);
                        setVerificationStatus('duplicate');
                    } else if (result.error === 'ALREADY_USED') {
                        // Fetch details for used
                        const richDetails = await fetchRichTicketDetails(ticketId, result.previousEntry);
                        setLastScanData(richDetails);
                        setVerificationStatus('used');
                    } else if (result.error === 'QR_EXPIRED') {
                        setVerificationStatus('expired');
                    } else {
                        setVerificationStatus('error');
                    }
                    setErrorMessage(result.message);
                }

            } catch (error) {
                console.error("Scan error:", error);
                setVerificationStatus('error');
                setErrorMessage(error.message || "Failed to verify ticket");
            } finally {
                // Keep processing locked until user resets
            }
        }
    };

    const handleError = (err) => {
        console.error(err);
    };

    const resetScanner = () => {
        setVerificationStatus('idle');
        setScanResult(null);
        setErrorMessage('');
        setLastScanData(null);
        isProcessingRef.current = false;
        setIsScanning(true);
    };

    const openExplorer = (hash) => {
        if (hash && hash !== 'N/A') {
            window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank');
        }
    };

    // UI Components for States
    const renderStatus = () => {
        switch (verificationStatus) {
            case 'processing':
                return (
                    <div className="text-center py-10">
                        <Loader2 className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Verifying Ticket...</h2>
                        <p className="text-gray-500 mt-2">Checking Blockchain & Database</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-6 text-center animate-in zoom-in duration-300 w-full">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-4">ACCESS GRANTED</h2>

                        {/* Rich Ticket Card */}
                        <div className="w-full bg-white rounded-xl p-4 shadow-sm border border-green-100 space-y-3 text-left text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                <span className="text-gray-500 flex items-center"><Hash className="w-3 h-3 mr-1" /> Ticket ID</span>
                                <span className="font-mono font-bold text-gray-800">#{lastScanData?.ticketId}</span>
                            </div>

                            {/* Transferred Indicator */}
                            {lastScanData?.isTransferred && (
                                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 animate-in fade-in slide-in-from-top duration-300">
                                    <div className="flex items-center mb-2">
                                        <ArrowRightLeft className="w-4 h-4 text-amber-700 mr-2" />
                                        <span className="font-bold text-amber-900 text-xs uppercase tracking-wide">Transferred Ticket</span>
                                    </div>
                                    <div className="text-xs">
                                        <p className="text-gray-600">From: <span className="font-semibold">{lastScanData.originalOwnerName}</span></p>
                                        <p className="text-gray-600">To: <span className="font-bold text-green-700">{lastScanData.buyerName}</span></p>
                                    </div>
                                </div>
                            )}

                            {/* User Info */}
                            <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                <div className="flex items-center">
                                    <UserCheck className="w-4 h-4 mr-2 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Holder Name</p>
                                        <p className="font-semibold text-gray-900">{lastScanData?.buyerName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="font-semibold text-gray-900">{lastScanData?.buyerPhone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Wallet</span>
                                    <span className="font-mono text-gray-700 bg-gray-100 px-1 rounded truncate max-w-[150px]">{lastScanData?.buyer}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Purchased</span>
                                    <span className="text-gray-700">{lastScanData?.purchaseTime ? new Date(lastScanData.purchaseTime).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                {/* 2FA Indicator */}
                                {lastScanData && (
                                    <div className="flex items-center justify-between text-xs text-green-700 font-bold bg-green-50 px-2 py-1 rounded mt-2">
                                        <div className="flex items-center">
                                            <ShieldCheck className="w-3 h-3 mr-1" />
                                            2FA Verified
                                        </div>
                                    </div>
                                )}
                                {lastScanData?.txHash && lastScanData.txHash !== 'N/A' && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">Transaction</span>
                                        <button onClick={() => openExplorer(lastScanData.txHash)} className="text-primary-600 underline truncate max-w-[150px]">
                                            View on Etherscan
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={resetScanner} className="mt-6 w-full btn-primary py-3 text-lg shadow-lg shadow-green-500/20">
                            Scan Next Ticket
                        </button>
                    </div>
                );
            case 'duplicate':
                return (
                    <div className="bg-orange-50 border-2 border-orange-500 rounded-2xl p-8 text-center">
                        <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-12 h-12 text-orange-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-orange-800 mb-2">DUPLICATE SCAN</h2>
                        <p className="text-orange-700 text-lg mb-4">Ticket Just Scanned (Recently)</p>

                        {lastScanData && (
                            <div className="bg-white p-3 rounded-xl border border-orange-200 text-left mb-4">
                                <p className="text-sm font-bold text-gray-800">#{lastScanData.ticketId} - {lastScanData.buyerName}</p>
                                <p className="text-xs text-gray-500">Last scan: {new Date(lastScanData.scanTime || Date.now()).toLocaleTimeString()}</p>
                            </div>
                        )}

                        <button onClick={resetScanner} className="mt-4 w-full bg-orange-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-orange-700">
                            Scan Next Ticket
                        </button>
                    </div>
                );
            case 'used':
                return (
                    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center">
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-red-800 mb-2">ALREADY USED</h2>
                        <p className="text-red-700 text-lg mb-4">Entry Denied</p>

                        {lastScanData && (
                            <div className="bg-white p-3 rounded-xl border border-red-200 text-left mb-4">
                                <p className="text-sm font-bold text-gray-800">#{lastScanData.ticketId} - {lastScanData.buyerName}</p>
                                <p className="text-xs text-gray-500">Used at: {new Date(lastScanData.scanTime || Date.now()).toLocaleString()}</p>
                            </div>
                        )}

                        <button onClick={resetScanner} className="mt-4 w-full bg-red-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-red-700">
                            Scan Next Ticket
                        </button>
                    </div>
                );
            case 'expired':
                return (
                    <div className="bg-yellow-50 border-2 border-yellow-500 rounded-2xl p-8 text-center">
                        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RefreshCw className="w-12 h-12 text-yellow-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-yellow-800 mb-2">QR EXPIRED</h2>
                        <p className="text-yellow-700 text-lg mb-4">Code generated too long ago.</p>
                        <p className="text-gray-600">Please ask user to refresh their ticket page.</p>
                        <button onClick={resetScanner} className="mt-8 w-full bg-yellow-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-yellow-700">
                            Try Again
                        </button>
                    </div>
                );
            case 'wrong_event':
                return (
                    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-red-800 mb-2">ACCESS DENIED</h2>
                        <p className="text-red-700 text-lg mb-1">Wrong Event</p>
                        <p className="text-sm text-gray-500 mb-4">
                            Ticket is for: <span className="font-bold text-gray-800">{lastScanData?.eventName || 'Unknown'}</span>
                        </p>
                        <button onClick={resetScanner} className="mt-8 w-full bg-red-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-red-700">
                            Scan Next Ticket
                        </button>
                    </div>
                );
            case 'error':
            default:
                return (
                    <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center">
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-red-800 mb-2">INVALID TICKET</h2>
                        <p className="text-red-700 text-lg mb-4">{errorMessage || "Verification Failed"}</p>
                        <button onClick={resetScanner} className="mt-8 w-full bg-red-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-red-700">
                            Scan Next Ticket
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col">
            {/* Header */}
            <div className="bg-black/50 backdrop-blur-md p-4 flex justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary-600 p-2 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold leading-none">Gatekeeper</h1>
                        <p className="text-xs text-gray-400 font-mono mt-1">{eventName}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full">

                {verificationStatus === 'idle' ? (
                    <div className="flex-1 flex flex-col gap-6 ">
                        {/* Scanner Window */}
                        <div className="relative aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                            {isScanning && (
                                <QrScanner
                                    delay={300} // Fast scanning
                                    onError={handleError}
                                    onScan={handleScan}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    constraints={{
                                        video: { facingMode: { ideal: "environment" } }
                                    }}
                                />
                            )}

                            {/* Overlay Guides */}
                            <div className="absolute inset-0 border-2 border-primary-500/50 rounded-2xl pointer-events-none"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/30 rounded-xl pointer-events-none">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400"></div>
                            </div>

                            <div className="absolute bottom-4 left-0 w-full text-center">
                                <span className="bg-black/60 backdrop-blur text-xs px-3 py-1 rounded-full text-white/80">
                                    <Camera className="w-3 h-3 inline mr-1" />
                                    Align QR Code
                                </span>
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-gray-400 text-sm">Ready to scan tickets for</p>
                            <h3 className="text-xl font-bold text-white">{eventName}</h3>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {renderStatus()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GatekeeperScannerPage;
