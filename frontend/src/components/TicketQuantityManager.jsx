import React, { useState } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, parseETH } from '../utils/web3';
import toast from 'react-hot-toast';
import { 
  RefreshCw, 
  Loader2, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const TicketQuantityManager = ({ ticket, onUpdate }) => {
  const { account, isConnected, isSupportedNetwork } = useWeb3();
  const [isResetting, setIsResetting] = useState(false);
  const [newTotalTickets, setNewTotalTickets] = useState(ticket.totalTickets);
  const [showResetForm, setShowResetForm] = useState(false);

  const isOwner = () => {
    return ticket.seller && account && ticket.seller.toLowerCase() === account.toLowerCase();
  };

  const handleReset = async () => {
    if (!isConnected || !isSupportedNetwork) {
      toast.error('Please connect your wallet and switch to the correct network');
      return;
    }

    if (!isOwner()) {
      toast.error('Only the ticket seller can reset quantities');
      return;
    }

    if (newTotalTickets <= 0) {
      toast.error('Total tickets must be greater than 0');
      return;
    }

    if (newTotalTickets < ticket.totalTickets - ticket.availableTickets) {
      toast.error('New total cannot be less than tickets already sold');
      return;
    }

    setIsResetting(true);
    
    try {
      const contract = await getContract();
      
      toast.loading('Resetting ticket quantities...', { id: 'reset' });
      
      const tx = await contract.resetTicketQuantities(ticket.id, newTotalTickets);
      
      toast.loading('Waiting for confirmation...', { id: 'reset' });
      await tx.wait();
      
      toast.success('Ticket quantities reset successfully!', { id: 'reset' });
      
      // Reset form
      setShowResetForm(false);
      setNewTotalTickets(ticket.totalTickets);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
      
    } catch (error) {
      console.error('Error resetting ticket quantities:', error);
      toast.error(error.message || 'Failed to reset ticket quantities');
    } finally {
      setIsResetting(false);
    }
  };

  if (!isOwner()) {
    return null;
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <RefreshCw className="w-5 h-5 mr-2" />
        Ticket Quantity Management
      </h3>
      
      <div className="space-y-4">
        {/* Current Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Tickets:</span>
              <p className="font-semibold">{Number(ticket.totalTickets || 0)}</p>
            </div>
            <div>
              <span className="text-gray-600">Available:</span>
              <p className="font-semibold">{Number(ticket.availableTickets || 0)}</p>
            </div>
            <div>
              <span className="text-gray-600">Sold:</span>
              <p className="font-semibold">{Number(ticket.totalTickets || 0) - Number(ticket.availableTickets || 0)}</p>
            </div>
            <div>
              <span className="text-gray-600">Remaining:</span>
              <p className="font-semibold">{Number(ticket.availableTickets || 0)}</p>
            </div>
          </div>
        </div>

        {/* Reset Form */}
        {!showResetForm ? (
          <button
            onClick={() => setShowResetForm(true)}
            className="w-full btn-outline flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Reset Ticket Quantities</span>
          </button>
        ) : (
          <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">
                  Reset Ticket Quantities
                </h4>
                <p className="text-sm text-yellow-700 mb-4">
                  This will reset the total number of tickets available for sale. 
                  The new total must be at least as many as tickets already sold.
                </p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Total Tickets
              </label>
              <input
                type="number"
                value={newTotalTickets}
                onChange={(e) => setNewTotalTickets(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={ticket.totalTickets - ticket.availableTickets}
                placeholder="Enter new total tickets"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: {ticket.totalTickets - ticket.availableTickets} (tickets already sold)
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-1 btn-primary flex items-center justify-center space-x-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Reset</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowResetForm(false);
                  setNewTotalTickets(ticket.totalTickets);
                }}
                className="flex-1 btn-outline"
                disabled={isResetting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketQuantityManager;

