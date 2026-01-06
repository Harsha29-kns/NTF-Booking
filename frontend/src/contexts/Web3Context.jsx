import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  connectWallet, 
  getCurrentAccount, 
  getCurrentChainId, 
  isMetaMaskInstalled,
  onAccountsChanged,
  onChainChanged,
  isSupportedNetwork,
  getNetworkName,
  switchNetwork
} from '../utils/web3';
import toast from 'react-hot-toast';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [networkName, setNetworkName] = useState('');

  // Check initial connection status
  useEffect(() => {
    const checkConnection = async () => {
      if (!isMetaMaskInstalled()) {
        return;
      }

      try {
        const currentAccount = await getCurrentAccount();
        const currentChainId = await getCurrentChainId();
        
        if (currentAccount) {
          setAccount(currentAccount);
          setChainId(currentChainId);
          setIsConnected(true);
          setNetworkName(getNetworkName(currentChainId));

          // Auto-switch to localhost if unsupported
          if (!isSupportedNetwork(currentChainId)) {
            try {
              await switchNetwork('localhost');
              const switchedChainId = await getCurrentChainId();
              setChainId(switchedChainId);
              setNetworkName(getNetworkName(switchedChainId));
              toast.success('Switched to Localhost network');
            } catch (switchErr) {
              toast.error('Please switch to Localhost or Sepolia in MetaMask');
            }
          }
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled()) {
      return;
    }

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected
        setAccount(null);
        setIsConnected(false);
        toast.error('Wallet disconnected');
      } else {
        setAccount(accounts[0]);
        setIsConnected(true);
        toast.success('Wallet connected');
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      setNetworkName(getNetworkName(newChainId));
      
      if (isSupportedNetwork(newChainId)) {
        toast.success(`Switched to ${getNetworkName(newChainId)}`);
      } else {
        toast.error('Unsupported network. Please switch to Sepolia or Localhost.');
      }
    };

    const unsubscribeAccounts = onAccountsChanged(handleAccountsChanged);
    const unsubscribeChain = onChainChanged(handleChainChanged);

    return () => {
      unsubscribeAccounts();
      unsubscribeChain();
    };
  }, []);

  const connect = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const walletAccount = await connectWallet();
      const walletChainId = await getCurrentChainId();
      
      setAccount(walletAccount);
      setChainId(walletChainId);
      setIsConnected(true);
      setNetworkName(getNetworkName(walletChainId));
      
      if (!isSupportedNetwork(walletChainId)) {
        // Try auto-switch to localhost
        try {
          await switchNetwork('localhost');
          const switchedChainId = await getCurrentChainId();
          setChainId(switchedChainId);
          setNetworkName(getNetworkName(switchedChainId));
          toast.success('Switched to Localhost network');
        } catch (switchErr) {
          toast.error('Please switch to Sepolia or Localhost network');
        }
      } else {
        toast.success('Wallet connected successfully');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setNetworkName('');
    toast.success('Wallet disconnected');
  };

  const value = {
    account,
    chainId,
    isConnected,
    isLoading,
    networkName,
    connect,
    disconnect,
    isSupportedNetwork: isSupportedNetwork(chainId),
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};

