import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3 } from './Web3Context';
import apiService from '../services/api';
import { ethers } from 'ethers';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { account, isConnected } = useWeb3();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // New state for handling registration flow
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && account && !isAuthenticated && !pendingAuth) {
      handleWalletLogin();
    } else if (!isConnected && isAuthenticated) {
      logout();
    }
  }, [isConnected, account]);

  const verifyToken = async (token) => {
    try {
      setIsLoading(true);
      const response = await apiService.verifyToken(token);
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        apiService.setToken(token);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const signMessage = async (message) => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signature = await signer.signMessage(message);
    
    return signature;
  };

  const handleWalletLogin = async () => {
    if (!account) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check if user exists in backend
      const message = `Sign this message to authenticate with NFT Ticketing System.\n\nWallet: ${account}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      // Try to login first
      try {
        const response = await apiService.login(account, signature, message);
        
        if (response.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          apiService.setToken(response.data.token);
          // Clear any pending auth
          setPendingAuth(null);
          setShowRegisterModal(false);
        }
      } catch (loginError) {
        // If login fails (User not found), TRIGGER REGISTRATION MODAL
        console.log('User not found, prompting registration...');
        
        // Save auth details so we don't need to ask user to sign again
        setPendingAuth({
          address: account,
          signature,
          message
        });
        
        // Show the modal to ask: "Organizer or Customer?"
        setShowRegisterModal(true);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setError(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (walletAddress, signature, message) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(walletAddress, signature, message);
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        apiService.setToken(response.data.token);
        return response.data;
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData = {}) => {
    // We need pending auth data to register
    if (!pendingAuth) {
      throw new Error("No pending authentication found. Please connect wallet first.");
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.register(
        pendingAuth.address, 
        pendingAuth.signature, 
        pendingAuth.message, 
        userData // Now contains isOrganizer choice
      );
      
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        apiService.setToken(response.data.token);
        
        // Cleanup
        setPendingAuth(null);
        setShowRegisterModal(false);
        
        return response.data;
      }
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    setPendingAuth(null);
    setShowRegisterModal(false);
    apiService.setToken(null);
  };

  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.updateProfile(userData);
      
      if (response.success) {
        setUser(response.data.user);
        return response.data;
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      setError(error.message || 'Profile update failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const becomeOrganizer = async (organizerData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.becomeOrganizer(organizerData);
      
      if (response.success) {
        setUser(response.data.user);
        return response.data;
      }
    } catch (error) {
      console.error('Become organizer failed:', error);
      setError(error.message || 'Failed to become organizer');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiService.getProfile();
      
      if (response.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const cancelRegistration = () => {
    setPendingAuth(null);
    setShowRegisterModal(false);
    // Optionally disconnect wallet here if needed
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    becomeOrganizer,
    refreshUser,
    handleWalletLogin,
    signMessage,
    // New values for registration flow
    showRegisterModal,
    setShowRegisterModal,
    cancelRegistration
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
