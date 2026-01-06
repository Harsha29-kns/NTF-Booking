import React, { useState, useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { formatAddress, formatETH } from '../utils/web3';
import { 
  User, 
  Ticket, 
  CreditCard, 
  Calendar, 
  MapPin,
  Loader2,
  Wallet,
  UserCircle
} from 'lucide-react';

const ProfilePage = () => {
  const { account, isConnected } = useWeb3();
  const { user } = useAuth(); 
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalSpent: '0',
    recentActivity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // DEBUG: Check what user data is actually loaded
  useEffect(() => {
    console.log("Current User Data:", user);
  }, [user]);

  useEffect(() => {
    if (account) {
      fetchUserStats();
    }
  }, [account]);

  const fetchUserStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/purchases/user/${account}`);
      const data = await response.json();

      if (data.success) {
        const purchases = data.data.purchases;
        
        const totalWei = purchases.reduce((acc, curr) => {
          return acc + BigInt(curr.price);
        }, 0n);

        const totalEth = formatETH(totalWei);

        setStats({
          totalTickets: purchases.length,
          totalSpent: totalEth,
          recentActivity: purchases.slice(0, 5) 
        });
      }
    } catch (error) {
      console.error("Failed to load profile stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to safely get the display name
  const getDisplayName = () => {
    if (!user) return "Anonymous User";
    // Checks for various common name fields
    return user.name || user.username || user.nickname || "User";
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Wallet className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Wallet Not Connected</h2>
        <p className="text-gray-500 mt-2">Please connect your wallet to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      
      {/* 1. Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 h-32 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg">
              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-primary-600 overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="w-16 h-16" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-16 pb-6 px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getDisplayName()}
              </h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
                  <Wallet className="w-3 h-3 mr-1.5 text-gray-400" />
                  <span className="font-mono text-xs">{formatAddress(account)}</span>
                </div>
                {user?.email && (
                  <div className="flex items-center">
                     <span className="w-1 h-1 bg-gray-300 rounded-full mr-4" />
                     {user.email}
                  </div>
                )}
              </div>
            </div>
            
            {/* Optional Edit Button (Placeholder) */}
            {/* <button className="btn-secondary text-sm px-4 py-2">Edit Profile</button> */}
          </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tickets Bought</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : stats.totalTickets}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Ticket className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Spent</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : `${stats.totalSpent} ETH`}
              </h3>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <CreditCard className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading activity...</div>
          ) : stats.recentActivity.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No recent purchases found.</p>
            </div>
          ) : (
            stats.recentActivity.map((purchase) => (
              <div key={purchase.purchaseId} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-50 p-2.5 rounded-lg border border-primary-100">
                    <Ticket className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{purchase.eventName}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="font-mono">#{purchase.ticketId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-medium text-gray-900">
                    {formatETH(purchase.price)} ETH
                  </span>
                  <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${
                    purchase.status === 'purchased' ? 'bg-green-100 text-green-700' :
                    purchase.status === 'refunded' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {purchase.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;