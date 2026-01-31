import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { getContract, formatAddress } from '../utils/web3';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  XCircle,
  Loader2,
  User,
  ArrowRight,
  Clock,
  ShieldAlert
} from 'lucide-react';

const OrganizerTransferRequests = () => {
  const { account, isConnected } = useWeb3();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null); // Track which request is being processed

  // Fetch pending requests from backend
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      // Assuming GET /transfers/pending returns an array of requests
      // Populated with event details if possible, or just IDs
      const { data } = await api.get('/transfers/pending');
      setRequests(data);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load transfer requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadRequests();
    }
  }, [isConnected, loadRequests]);

  // Handle Approval (Blockchain Transaction + DB Update)
  const handleApprove = async (request) => {
    if (!window.confirm(`Are you sure you want to approve this transfer for Ticket #${request.ticketId}?`)) return;

    try {
      setProcessingId(request._id);
      const loadingToast = toast.loading('Processing Transfer on Blockchain...');

      // 1. Execute Blockchain Transaction
      const contract = await getContract();

      console.log(`Transferring Ticket ${request.ticketId} from ${request.senderAddress} to ${request.receiverAddress}`);

      // Call the new admin function we added to the smart contract
      const tx = await contract.organizerTransferTicket(
        request.senderAddress,
        request.receiverAddress,
        request.ticketId
      );

      toast.loading('Transaction submitted. Waiting for confirmation...', { id: loadingToast });

      // Wait for transaction to be mined
      await tx.wait();

      // 2. Update Backend Status
      toast.loading('Updating database...', { id: loadingToast });

      await api.post('/transfers/approve', {
        requestId: request._id,
        txHash: tx.hash
      });

      toast.success('Transfer Successful!', { id: loadingToast });

      // Remove from list
      setRequests(prev => prev.filter(r => r._id !== request._id));

    } catch (error) {
      console.error('Transfer failed:', error);

      // Extract readable error message from Metamask/Contract
      let errorMessage = "Transfer failed";
      if (error.reason) errorMessage = error.reason;
      else if (error.data?.message) errorMessage = error.data.message;
      else if (error.message) errorMessage = error.message;

      toast.error(`Error: ${errorMessage}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Rejection (DB Update only)
  const handleReject = async (request) => {
    if (!window.confirm('Reject this transfer request?')) return;

    try {
      setProcessingId(request._id);

      await api.post('/transfers/reject', {
        requestId: request._id
      });

      toast.success('Request Rejected');
      setRequests(prev => prev.filter(r => r._id !== request._id));

    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <ShieldAlert className="w-12 h-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Organizer Access Required</h2>
        <p className="text-gray-500">Please connect your wallet to manage transfers.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Requests</h1>
          <p className="text-gray-500 mt-1">Manage ticket transfer requests from users</p>
        </div>
        <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Pending: {requests.length}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
          <p className="text-gray-500 mt-2">There are no pending transfer requests at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:shadow-md"
            >
              {/* Request Info */}
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mb-2">
                      Ticket #{req.ticketId}
                    </span>
                    {/* Assuming backend populates 'eventName' or we fetch it. 
                        If not, just show Ticket ID */}
                    <h3 className="text-lg font-bold text-gray-900">
                      {req.eventName || `Ticket ID: ${req.ticketId}`}
                    </h3>
                    <p className="text-sm text-gray-500">Requested on {new Date(req.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Transfer Details */}
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                      <User className="w-3 h-3" /> From (Sender)
                    </div>
                    <div className="font-mono text-sm text-gray-700 truncate" title={req.senderAddress}>
                      {formatAddress(req.senderAddress)}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="flex-1 text-right">
                    <div className="flex items-center justify-end gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                      To (Receiver) <User className="w-3 h-3" />
                    </div>
                    <div className="font-mono text-sm text-gray-700 truncate" title={req.receiverAddress}>
                      {formatAddress(req.receiverAddress)}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Reason:</h4>
                  <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
                    "{req.reason}"
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex lg:flex-col gap-3 min-w-[140px]">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={!!processingId}
                  className="flex-1 btn-primary bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === req._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve
                </button>

                <button
                  onClick={() => handleReject(req)}
                  disabled={!!processingId}
                  className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizerTransferRequests;