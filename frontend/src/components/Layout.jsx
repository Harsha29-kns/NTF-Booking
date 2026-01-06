import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { formatAddress, formatETH } from '../utils/web3';
import { ethers } from 'ethers';
import RegisterModal from './RegisterModal';
import { 
  Home, 
  Plus, 
  Ticket, 
  Shield, 
  User,
  Wallet,
  AlertCircle,
  Coins
} from 'lucide-react';
import contractInfo from '../contracts/TicketSale.json';

const Layout = ({ children }) => {
  const { account, isConnected, connect, networkName, isSupportedNetwork } = useWeb3();
  const { user } = useAuth();
  const location = useLocation();
  const [balance, setBalance] = useState('0.00');

  // New: Fetch ETH Balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (isConnected && account && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const bal = await provider.getBalance(account);
          setBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
        } catch (err) {
          console.error("Error fetching balance:", err);
        }
      }
    };

    fetchBalance();
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000); 
    return () => clearInterval(interval);
  }, [isConnected, account]);

  // Dynamic navigation based on user role
  const getNavigation = () => {
    const navItems = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Browse Tickets', href: '/tickets', icon: Ticket },
    ];

    if (isConnected) {
      navItems.push({ name: 'My Tickets', href: '/my-tickets', icon: User });

      if (user?.isOrganizer) {
        navItems.push({ name: 'Create Sale', href: '/create-sale', icon: Plus });
        navItems.push({ name: 'Verify Ticket', href: '/admin/verify', icon: Shield }); 
      } else {
        navItems.push({ name: 'Verify Ticket', href: '/verify', icon: Shield }); 
      }
    } else {
      navItems.push({ name: 'Verify Ticket', href: '/verify', icon: Shield });
    }

    return navItems;
  };

  const navigation = getNavigation();
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      <RegisterModal />

      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  NFT Tickets
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-4">
              {/* Role Badge */}
              {isConnected && user && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.isOrganizer ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.isOrganizer ? 'Organizer' : 'Customer'}
                </span>
              )}

              {!isSupportedNetwork && isConnected && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Wrong Network</span>
                </div>
              )}
              
              {isConnected ? (
                <div className="flex items-center space-x-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                  {/* Balance Display */}
                  <div className="flex items-center border-r border-gray-300 pr-3 mr-3">
                    <Coins className="w-4 h-4 text-yellow-500 mr-1.5" />
                    <span className="font-bold text-gray-700 text-sm">{balance} ETH</span>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatAddress(account)}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>NFT Concert Ticketing System</p>
            <p className="mt-2 text-xs">Contract: {contractInfo?.address}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
