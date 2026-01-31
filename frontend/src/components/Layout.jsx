import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useAuth } from '../contexts/AuthContext';
import { formatAddress } from '../utils/web3';
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
  Coins,
  UserCircle,
  Menu,
  X,
  ArrowRightLeft // <--- Added Icon for Transfers
} from 'lucide-react';
import contractInfo from '../contracts/TicketSale.json';

const Layout = ({ children }) => {
  const { account, isConnected, connect, isSupportedNetwork } = useWeb3();
  const { user } = useAuth();
  const location = useLocation();
  const [balance, setBalance] = useState('0.00');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle Scroll Effect for Sticky Header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch ETH Balance periodically
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
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isConnected, account]);

  // Dynamic navigation based on auth state
  const getNavigation = () => {
    const navItems = [
      { name: 'Home', href: '/', icon: Home },
      { name: 'Browse Tickets', href: '/tickets', icon: Ticket },
    ];

    if (isConnected) {
      navItems.push({ name: 'My Tickets', href: '/my-tickets', icon: Ticket });
      navItems.push({ name: 'Profile', href: '/profile', icon: UserCircle });

      if (user?.isOrganizer) {
        navItems.push({ name: 'Create Sale', href: '/create-sale', icon: Plus });

        // --- NEW LINK ADDED HERE ---
        navItems.push({ name: 'Manage Transfers', href: '/organizer/transfers', icon: ArrowRightLeft });

        navItems.push({ name: 'Verify Ticket', href: '/organizer/verify', icon: Shield });
        navItems.push({ name: 'Gatekeepers', href: '/organizer/gatekeepers', icon: User }); // NEW LINK


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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Registration Modal Component */}
      <RegisterModal />

      {/* --- Sticky Header --- */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md border-b border-gray-200/50 py-2'
          : 'bg-white border-b border-gray-200 py-4'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">

            {/* Logo Section */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-primary-500/30 transition-all duration-300">
                  <Ticket className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-gray-900 leading-none tracking-tight">NFT Tickets</span>
                  <span className="text-[10px] font-semibold text-primary-600 tracking-wider uppercase">Blockchain Event Access</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 bg-gray-100/50 p-1 rounded-full border border-gray-200/50">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${active
                      ? 'bg-white text-primary-700 shadow-sm ring-1 ring-black/5'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Side: Wallet & Mobile Toggle */}
            <div className="flex items-center space-x-4">

              {/* Wallet Status (Desktop) */}
              <div className="hidden md:flex items-center">
                {isConnected ? (
                  <div className="flex items-center space-x-3">
                    {/* Network Warning */}
                    {!isSupportedNetwork && (
                      <div className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-xs font-medium rounded-full border border-red-100">
                        <AlertCircle className="w-3 h-3 mr-1.5" />
                        Wrong Network
                      </div>
                    )}

                    {/* Wallet Badge */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-full pl-3 pr-1 py-1 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center mr-3 border-r border-gray-200 pr-3">
                        <div className="bg-yellow-100 p-1 rounded-full mr-2">
                          <Coins className="w-3 h-3 text-yellow-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-800">{balance} ETH</span>
                      </div>

                      <Link to="/profile" className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors">
                        <div className="w-5 h-5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                          {/* FIXED: User name display */}
                          {user?.username ? user.username.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-medium text-gray-600 font-mono">
                          {formatAddress(account)}
                        </span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={connect}
                    className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* --- Mobile Menu Dropdown --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-200 shadow-xl py-4 px-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            {/* Mobile Nav Links */}
            <div className="flex flex-col space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Wallet Action */}
            <div className="pt-4 border-t border-gray-100">
              {isConnected ? (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Balance</span>
                    <span className="font-bold text-gray-900">{balance} ETH</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Account</span>
                    <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-gray-200">
                      {formatAddress(account)}
                    </span>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 mt-2"
                  >
                    View Profile
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => {
                    connect();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex justify-center items-center space-x-2 bg-primary-600 text-white px-4 py-3 rounded-xl font-medium"
                >
                  <Wallet className="w-5 h-5" />
                  <span>Connect Wallet</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* --- Main Content --- */}
      <main className="flex-grow pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* --- Modern Footer --- */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">NFT Tickets</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                The future of event ticketing. Secure, transparent, and verifiable on the Ethereum blockchain.
              </p>
            </div>

            <div className="flex flex-col space-y-3">
              <h4 className="font-bold text-gray-900">Quick Links</h4>
              <Link to="/tickets" className="text-gray-500 hover:text-primary-600 text-sm">Browse Events</Link>
              <Link to="/verify" className="text-gray-500 hover:text-primary-600 text-sm">Verify Ticket</Link>
              <Link to="/profile" className="text-gray-500 hover:text-primary-600 text-sm">My Profile</Link>
            </div>

            <div className="flex flex-col space-y-3">
              <h4 className="font-bold text-gray-900">Smart Contract</h4>
              <p className="text-xs text-gray-400 font-mono bg-gray-50 p-3 rounded-lg border border-gray-100 break-all">
                {contractInfo?.address || "Contract not loaded"}
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">System Operational</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} NFT Ticketing System. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Powered by Ethereum & IPFS</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;