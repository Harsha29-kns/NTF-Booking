import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { getContractReadOnly } from '../utils/web3';
import { api } from '../services/api'; // Import API service
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import {
  Loader2,
  ArrowLeft,
  Shield,
  Maximize2,
  Info,

  Clock,
  Lock, // Added Lock icon
  Eye // Added Eye icon
} from 'lucide-react';

const PrintTicketPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useWeb3();
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // 2FA State
  const [isRevealed, setIsRevealed] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [qrToken, setQrToken] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Timer States
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeToExpiry, setTimeToExpiry] = useState("5:00");
  const [refreshSeed, setRefreshSeed] = useState(0); // To force QR visual change

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

  // Dynamic QR Logic (ONLY runs if Revealed)
  const REFRESH_INTERVAL = 30; // Seconds (Updated to 30s)
  const [timeLeft, setTimeLeft] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    if (!isRevealed || !qrToken || !expiresAt) return;

    const timer = setInterval(() => {
      // 1. Update Token Expiry Countdown
      const now = Date.now();
      const diff = Math.max(0, expiresAt - now);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeToExpiry(`${minutes}:${seconds.toString().padStart(2, '0')}`);

      if (diff <= 0) {
        // Token Expired
        setIsRevealed(false);
        setQrToken(null);
        toast.error("Session Expired. Please verify again.");
      }

      // 2. Update Refresh Timer
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setRefreshSeed(s => s + 1); // Force QR visual change
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRevealed, qrToken, expiresAt]);

  const handleRevealClick = async () => {
    try {
      if (!account) return;
      setIsVerifying(true);

      // Request OTP
      const response = await api.post('/auth/generate-qr-otp', { walletAddress: account });
      if (response.data.success) {
        toast.success(`OTP Sent to your email! (${response.data.debug})`);
        setShowOtpModal(true);
      }
    } catch (error) {
      console.error('OTP Gen Error:', error);
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!otpCode || otpCode.length !== 6) {
        toast.error('Please enter a 6-digit code');
        return;
      }
      setIsVerifying(true);

      const response = await api.post('/auth/verify-qr-otp', {
        walletAddress: account,
        otp: otpCode,
        ticketId: ticket.id
      });

      if (response.data.success) {
        setQrToken(response.data.data.qrToken);
        setExpiresAt(Date.now() + 5 * 60 * 1000); // Set expiry 5 mins from now
        setIsRevealed(true);
        setShowOtpModal(false);
        toast.success('Identity Verified!');
        new Audio('/sounds/success.mp3').play().catch(() => { });
      }
    } catch (error) {
      console.error('OTP Verify Error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  // The Payload includes a random seed 'r' to force visual changes every 30s
  const qrPayload = qrToken ? JSON.stringify({ token: qrToken, r: refreshSeed }) : "";

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
            {ticket.eventDate.toLocaleDateString()} • {ticket.eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* QR Code Section */}
        <div className="p-8 flex flex-col items-center justify-center bg-white relative">

          {isRevealed ? (
            <>
              {/* REVEALED STATE */}
              <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-gray-300 animate-in zoom-in duration-300">
                <QRCode
                  value={qrPayload}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>

              {/* Timer */}
              {/* Timer */}
              <div className="mt-6 space-y-3 w-full">
                {/* Expiry Timer */}
                <div className="flex items-center justify-between text-sm font-medium bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>Token Expires in:</span>
                  </div>
                  <span className="font-mono text-lg font-bold">{timeToExpiry}</span>
                </div>

                {/* Refresh Timer */}
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded-md">
                    Refreshes in {timeLeft}s
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* HIDDEN / BLURRED STATE */}
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/50 z-10"></div>

                {/* Mock QR Background */}
                <div className="opacity-10 absolute inset-0 flex items-center justify-center">
                  <QRCode value="MOCK_DATA" size={200} />
                </div>

                <div className="z-20 flex flex-col items-center p-6 text-center">
                  <div className="bg-white p-3 rounded-full shadow-md mb-3">
                    <Lock className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1">Secure Ticket</h3>
                  <p className="text-xs text-gray-500 mb-4">2FA Verification Required</p>

                  <button
                    onClick={handleRevealClick}
                    disabled={isVerifying}
                    className="btn-primary py-2 px-6 shadow-lg shadow-primary-500/30 flex items-center"
                  >
                    {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                    Reveal Ticket
                  </button>
                </div>
              </div>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6 flex items-center">
            <Maximize2 className="w-4 h-4 mr-1" />
            Show this QR code at the entrance
          </p>
        </div>

        {/* OTP MODAL */}
        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl m-4">
              <h3 className="text-xl font-bold text-center mb-2">Verify Identity</h3>
              <p className="text-gray-500 text-center text-sm mb-6">Enter the 6-digit code sent to your email</p>

              <input
                type="text"
                maxLength="6"
                className="w-full text-center text-3xl font-mono tracking-widest border-2 border-gray-200 rounded-xl py-4 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 outline-none transition-all mb-6"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
              />

              <button
                onClick={handleVerifyOtp}
                disabled={isVerifying || otpCode.length !== 6}
                className="w-full btn-primary py-3 mb-3"
              >
                {isVerifying ? 'Verifying...' : 'Verify & Unlock'}
              </button>

              <button
                onClick={() => setShowOtpModal(false)}
                className="w-full text-gray-500 text-sm hover:text-gray-800 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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