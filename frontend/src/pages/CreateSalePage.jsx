import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext'; // Import Auth Context
import { getContract, parseETH, isCircuitBreakerOpen, resetMetaMaskConnection } from '../utils/web3';
import { uploadImage, validateFile, fileToBase64 } from '../utils/ipfs';
import toast from 'react-hot-toast';
import {
  Upload,
  Calendar,
  DollarSign,
  User,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

const CreateSalePage = () => {
  const navigate = useNavigate();
  const { account, isConnected, isSupportedNetwork } = useWeb3();
  const { user } = useAuth(); // Get user from Auth Context
  const [isLoading, setIsLoading] = useState(false);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);
  const [formData, setFormData] = useState({
    eventName: '',
    organizer: user?.username || '', // Pre-fill if available
    eventDate: '',
    saleEndDate: '',
    price: '',
    totalTickets: '',
    posterFile: null,
    ticketFile: null,
  });
  const [previews, setPreviews] = useState({
    poster: null,
    ticket: null,
  });

  // Security check: Redirect if not an organizer
  useEffect(() => {
    if (user && !user.isOrganizer) {
      toast.error('Access denied. Only organizers can create events.');
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      validateFile(file);
      const preview = await fileToBase64(file);

      setFormData(prev => ({
        ...prev,
        [`${type}File`]: file
      }));

      setPreviews(prev => ({
        ...prev,
        [type]: preview
      }));

      toast.success(`${type} uploaded successfully`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResetConnection = async () => {
    try {
      await resetMetaMaskConnection();
      setCircuitBreakerOpen(false);
      toast.success('MetaMask connection reset. Please try again.');
    } catch (error) {
      toast.error('Failed to reset connection. Please refresh the page and reconnect your wallet.');
      // Force page refresh after a delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  };

  const checkCircuitBreaker = async () => {
    try {
      // Add a small delay to avoid rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 500));
      const isOpen = await isCircuitBreakerOpen();
      setCircuitBreakerOpen(isOpen);
      return isOpen;
    } catch (error) {
      console.warn('Circuit breaker check failed:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    if (!user?.isOrganizer) {
      toast.error('You must be an organizer to create an event');
      return;
    }

    // Skip proactive circuit breaker check to avoid additional requests
    // We'll handle circuit breaker errors reactively in the catch block

    if (!formData.posterFile || !formData.ticketFile) {
      toast.error('Please upload both poster and ticket images');
      return;
    }

    // Basic form validations before hitting the contract
    const eventTimestamp = Math.floor(new Date(formData.eventDate).getTime() / 1000);
    const saleEndTimestamp = Math.floor(new Date(formData.saleEndDate).getTime() / 1000);
    const nowTs = Math.floor(Date.now() / 1000);

    console.log('Date validation:', {
      currentTime: nowTs,
      eventTimestamp,
      saleEndTimestamp,
      eventDate: new Date(formData.eventDate).toLocaleString(),
      saleEndDate: new Date(formData.saleEndDate).toLocaleString(),
      currentDate: new Date().toLocaleString()
    });

    if (!eventTimestamp || !saleEndTimestamp || Number.isNaN(eventTimestamp) || Number.isNaN(saleEndTimestamp)) {
      toast.error('Please provide valid dates');
      return;
    }

    if (saleEndTimestamp >= eventTimestamp) {
      toast.error('Sale end date must be before the event date');
      return;
    }

    if (saleEndTimestamp <= nowTs) {
      const timeDiff = nowTs - saleEndTimestamp;
      const hoursDiff = Math.floor(timeDiff / 3600);
      const minutesDiff = Math.floor((timeDiff % 3600) / 60);
      toast.error(`Sale end date must be in the future. Your date is ${hoursDiff}h ${minutesDiff}m in the past.`);
      return;
    }

    if (eventTimestamp <= nowTs) {
      toast.error('Event date must be in the future');
      return;
    }

    // Additional validation: ensure sale end is at least 1 hour in the future
    const oneHourFromNow = nowTs + 3600;
    if (saleEndTimestamp < oneHourFromNow) {
      toast.error('Sale end date must be at least 1 hour in the future');
      return;
    }

    if (!formData.price || Number(formData.price) <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    if (!formData.totalTickets || Number(formData.totalTickets) <= 0) {
      toast.error('Total tickets must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      // Upload images to IPFS
      toast.loading('Uploading images to IPFS...', { id: 'upload' });

      const [posterCID, ticketCID] = await Promise.all([
        uploadImage(formData.posterFile),
        uploadImage(formData.ticketFile)
      ]);

      console.log('IPFS Upload Results:', { posterCID, ticketCID });
      toast.success('Images uploaded successfully!', { id: 'upload' });

      // Get contract and create sale with retry logic
      let contract;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          contract = await getContract();
          break;
        } catch (error) {
          retryCount++;
          if (error.message.includes('circuit breaker') || error.message.includes('Execution prevented')) {
            if (retryCount < maxRetries) {
              toast.loading(`MetaMask circuit breaker detected. Retrying in ${retryCount * 2} seconds...`, { id: 'retry' });
              await new Promise(resolve => setTimeout(resolve, retryCount * 2000));
              continue;
            } else {
              throw new Error('MetaMask circuit breaker is open. Please wait a few minutes and try again, or refresh the page and reconnect your wallet.');
            }
          }
          throw error;
        }
      }

      toast.loading('Creating ticket sale...', { id: 'create' });

      console.log('Creating sale with data:', {
        eventName: formData.eventName,
        organizer: formData.organizer,
        eventTimestamp,
        saleEndTimestamp,
        price: parseETH(formData.price),
        totalTickets: Number(formData.totalTickets),
        posterCID,
        ticketCID
      });

      // Additional debugging
      console.log('Contract address:', contract.target);
      console.log('Current timestamp:', Math.floor(Date.now() / 1000));
      console.log('Event timestamp:', eventTimestamp);
      console.log('Sale end timestamp:', saleEndTimestamp);

      // Check if event already exists
      try {
        const existingTicketId = await contract.eventToTicketId(formData.eventName);
        console.log('Existing ticket ID for event:', existingTicketId.toString());
        if (existingTicketId.toString() !== "0") {
          toast.error('An event with this name already exists. Please use a different name.');
          return;
        }
      } catch (error) {
        console.log('Could not check existing event:', error.message);
      }

      // Try the simplest possible approach - no gas limits, let MetaMask handle everything
      console.log('Attempting transaction with no gas limits...');

      const tx = await contract.createSale(
        formData.eventName,
        formData.organizer,
        eventTimestamp,
        saleEndTimestamp,
        parseETH(formData.price),
        Number(formData.totalTickets),
        posterCID,
        ticketCID
      );

      console.log('Transaction submitted:', tx.hash);
      toast.loading('Waiting for confirmation...', { id: 'create' });

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      toast.success('Ticket sale created successfully!', { id: 'create' });

      // Reset form
      setFormData({
        eventName: '',
        organizer: user?.username || '', // Reset to user name if available
        eventDate: '',
        saleEndDate: '',
        price: '',
        totalTickets: '',
        posterFile: null,
        ticketFile: null,
      });
      setPreviews({
        poster: null,
        ticket: null,
      });

      // Notify other pages that tickets have been updated
      try {
        window.dispatchEvent(new CustomEvent('ticketsUpdated', {
          detail: { action: 'created' }
        }));
      } catch (e) {
        // noop
      }

      // Redirect to tickets page after a short delay
      setTimeout(() => {
        window.location.href = '/tickets';
      }, 1500);

    } catch (error) {
      console.error('Error creating sale:', error);

      // Handle specific error types
      if (error.message.includes('circuit breaker') || error.message.includes('Execution prevented')) {
        setCircuitBreakerOpen(true);
        toast.error('MetaMask circuit breaker is open. Please use the reset button above or refresh the page.');
      } else if (error.message.includes('User rejected')) {
        toast.error('Transaction was cancelled by user');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient funds for transaction');
      } else if (error.message.includes('network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Internal JSON-RPC error')) {
        toast.error('Blockchain error. Please try again or check your network connection.');
        console.log('Full error details:', error);
      } else if (error.message.includes('gas')) {
        toast.error('Gas estimation failed. Please try again.');
      } else if (error.message.includes('Sale end date must be in the future')) {
        toast.error('Sale end date must be in the future. Please choose a later date.');
      } else if (error.message.includes('Event date must be in the future')) {
        toast.error('Event date must be in the future. Please choose a later date.');
      } else if (error.message.includes('Sale must end before event')) {
        toast.error('Sale end date must be before the event date.');
      } else if (error.message.includes('Event already exists')) {
        toast.error('An event with this name already exists. Please choose a different name.');
      } else {
        console.error('Full error details:', error);
        toast.error(error.message || 'Failed to create ticket sale');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 mb-6">
            You need to connect your wallet to create ticket sales.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (!isSupportedNetwork) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Wrong Network
          </h2>
          <p className="text-gray-600 mb-6">
            Please switch to Sepolia or Localhost network to create ticket sales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create Ticket Sale
        </h1>

        {/* Circuit Breaker Warning */}
        {circuitBreakerOpen && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">
                  MetaMask Circuit Breaker Active
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  MetaMask has temporarily blocked requests due to too many failed attempts.
                  This usually happens when the local blockchain isn't running or there are network issues.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setCircuitBreakerOpen(false);
                      toast.success('Circuit breaker state cleared. Please try again.');
                    }}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Clear State
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Name */}
          <div>
            <label className="label">
              <User className="w-4 h-4 inline mr-2" />
              Event Name
            </label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., Rock Concert 2024"
              required
            />
          </div>

          {/* Organizer */}
          <div>
            <label className="label">
              <User className="w-4 h-4 inline mr-2" />
              Organizer
            </label>
            <input
              type="text"
              name="organizer"
              value={formData.organizer}
              onChange={handleInputChange}
              className="input-field"
              placeholder="e.g., Music Events Inc"
              required
            />
          </div>

          {/* Event Date */}
          <div>
            <label className="label">
              <Calendar className="w-4 h-4 inline mr-2" />
              Event Date
            </label>
            <input
              type="datetime-local"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          {/* Sale End Date */}
          <div>
            <label className="label">
              <Calendar className="w-4 h-4 inline mr-2" />
              Sale End Date
            </label>
            <input
              type="datetime-local"
              name="saleEndDate"
              value={formData.saleEndDate}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="label">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Price (ETH)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              className="input-field"
              placeholder="0.1"
              step="0.001"
              min="0"
              required
            />
          </div>

          {/* Total Tickets */}
          <div>
            <label className="label">
              <User className="w-4 h-4 inline mr-2" />
              Total Available Tickets
            </label>
            <input
              type="number"
              name="totalTickets"
              value={formData.totalTickets}
              onChange={handleInputChange}
              className="input-field"
              placeholder="100"
              min="1"
              required
            />
          </div>

          {/* Poster Upload */}
          <div>
            <label className="label">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Event Poster
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'poster')}
                className="hidden"
                id="poster-upload"
              />
              <label htmlFor="poster-upload" className="cursor-pointer">
                {previews.poster ? (
                  <div className="space-y-4">
                    <img
                      src={previews.poster}
                      alt="Poster preview"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-gray-600">
                      Click to change poster
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-gray-600">
                      Click to upload event poster
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Ticket Image Upload */}
          <div>
            <label className="label">
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Ticket Image
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'ticket')}
                className="hidden"
                id="ticket-upload"
              />
              <label htmlFor="ticket-upload" className="cursor-pointer">
                {previews.ticket ? (
                  <div className="space-y-4">
                    <img
                      src={previews.ticket}
                      alt="Ticket preview"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <p className="text-sm text-gray-600">
                      Click to change ticket image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-gray-600">
                      Click to upload ticket image
                    </p>
                    <p className="text-sm text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Sale...</span>
              </>
            ) : (
              <span>Create Ticket Sale</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSalePage;
