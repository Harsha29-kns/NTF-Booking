import { ethers } from 'ethers';

// Contract ABI and address
import contractInfo from '../contracts/TicketSale.json';

const CONTRACT_ADDRESS = contractInfo.address;
const CONTRACT_ABI = typeof contractInfo.abi === 'string'
  ? JSON.parse(contractInfo.abi)
  : contractInfo.abi;

// Debug: Log contract address to ensure it's correct
console.log('Contract address from JSON:', CONTRACT_ADDRESS);
console.log('Contract version:', contractInfo.version || 'No version');

// Network configurations
const NETWORKS = {
  sepolia: {
    chainId: '0xaa36a7', // 11155111
    chainName: 'Sepolia Test Network',
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  localhost: {
    chainId: '0x7a69', // 31337 (Hardhat default). We also accept 1337 in helpers below
    chainName: 'Localhost',
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

/**
 * Check if MetaMask is installed
 * @returns {boolean} - Whether MetaMask is available
 */
export function isMetaMaskInstalled() {
  return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
}

/**
 * Request account access from MetaMask
 * @returns {Promise<string>} - Connected wallet address
 */
export async function connectWallet() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });
    
    return accounts[0];
  } catch (error) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request.');
    }
    throw new Error('Failed to connect wallet: ' + error.message);
  }
}

/**
 * Get current connected account
 * @returns {Promise<string|null>} - Current wallet address or null
 */
export async function getCurrentAccount() {
  if (!isMetaMaskInstalled()) {
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: 'eth_accounts',
    });
    
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('Error getting current account:', error);
    return null;
  }
}

/**
 * Get current network chain ID
 * @returns {Promise<string>} - Current chain ID
 */
export async function getCurrentChainId() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    const chainId = await window.ethereum.request({
      method: 'eth_chainId',
    });
    
    return chainId;
  } catch (error) {
    throw new Error('Failed to get chain ID: ' + error.message);
  }
}

/**
 * Switch to a specific network
 * @param {string} networkName - Name of the network to switch to
 * @returns {Promise<void>}
 */
export async function switchNetwork(networkName) {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const network = NETWORKS[networkName];
  if (!network) {
    throw new Error(`Network ${networkName} not supported`);
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: network.chainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      // Network doesn't exist, add it
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [network],
        });
      } catch (addError) {
        throw new Error('Failed to add network: ' + addError.message);
      }
    } else {
      throw new Error('Failed to switch network: ' + error.message);
    }
  }
}

/**
 * Get contract instance
 * @returns {ethers.Contract} - Contract instance
 */
export async function getContract() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    // Test the connection first
    await provider.getBlockNumber();
    
    const signer = await provider.getSigner();
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    
    return contract;
  } catch (error) {
    if (error.message.includes('circuit breaker') || error.message.includes('Execution prevented')) {
      throw new Error('MetaMask circuit breaker is open. Please wait a moment and try again, or refresh the page.');
    }
    throw error;
  }
}

/**
 * Get contract instance with provider only (read-only)
 * @returns {ethers.Contract} - Contract instance
 */
export function getContractReadOnly() {
  // Choose RPC based on saved deployment network and env keys
  const isPlaceholder = (val) => !val || /your_.*_key/i.test(String(val));
  const infuraKey = import.meta.env.VITE_INFURA_KEY;
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;

  // If contract was deployed to localhost, use local RPC explicitly
  const deployedNetwork = contractInfo.network;
  if (deployedNetwork === 'localhost' || deployedNetwork === 'hardhat') {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }

  // Otherwise prefer Alchemy (if provided), then Infura; ignore placeholder keys
  const sepoliaAlchemy = !isPlaceholder(alchemyKey)
    ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
    : null;
  const sepoliaInfura = !isPlaceholder(infuraKey)
    ? `${NETWORKS.sepolia.rpcUrls[0]}${infuraKey}`
    : null;
  const rpcUrl = sepoliaAlchemy || sepoliaInfura || 'http://127.0.0.1:8545';

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Get provider instance for direct blockchain access
 * @returns {ethers.Provider} - Provider instance
 */
export function getProvider() {
  // Choose RPC based on saved deployment network and env keys
  const isPlaceholder = (val) => !val || /your_.*_key/i.test(String(val));
  const infuraKey = import.meta.env.VITE_INFURA_KEY;
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY;

  // If contract was deployed to localhost, use local RPC explicitly
  const deployedNetwork = contractInfo.network;
  if (deployedNetwork === 'localhost' || deployedNetwork === 'hardhat') {
    return new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  }

  // Otherwise prefer Alchemy (if provided), then Infura; ignore placeholder keys
  if (alchemyKey && !isPlaceholder(alchemyKey)) {
    return new ethers.AlchemyProvider('sepolia', alchemyKey);
  } else if (infuraKey && !isPlaceholder(infuraKey)) {
    return new ethers.InfuraProvider('sepolia', infuraKey);
  } else {
    // Fallback to public RPC
    return new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/');
  }
}

/**
 * Format Ethereum address for display
 * @param {string} address - Ethereum address
 * @returns {string} - Formatted address
 */
export function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format ETH amount for display
 * @param {string|BigInt} amount - Amount in wei
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted amount
 */
export function formatETH(amount, decimals = 4) {
  if (!amount) return '0';
  return parseFloat(ethers.formatEther(amount)).toFixed(decimals);
}

/**
 * Parse ETH amount to wei
 * @param {string} amount - Amount in ETH
 * @returns {BigInt} - Amount in wei
 */
export function parseETH(amount) {
  return ethers.parseEther(amount);
}

/**
 * Wait for transaction confirmation
 * @param {string} txHash - Transaction hash
 * @param {number} confirmations - Number of confirmations to wait for
 * @returns {Promise<ethers.TransactionReceipt>} - Transaction receipt
 */
export async function waitForTransaction(txHash, confirmations = 1) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return await provider.waitForTransaction(txHash, confirmations);
}

/**
 * Listen for account changes
 * @param {function} callback - Callback function for account changes
 * @returns {function} - Unsubscribe function
 */
export function onAccountsChanged(callback) {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  window.ethereum.on('accountsChanged', callback);
  
  return () => {
    window.ethereum.removeListener('accountsChanged', callback);
  };
}

/**
 * Listen for network changes
 * @param {function} callback - Callback function for network changes
 * @returns {function} - Unsubscribe function
 */
export function onChainChanged(callback) {
  if (!isMetaMaskInstalled()) {
    return () => {};
  }

  window.ethereum.on('chainChanged', callback);
  
  return () => {
    window.ethereum.removeListener('chainChanged', callback);
  };
}

/**
 * Get network name from chain ID
 * @param {string} chainId - Chain ID
 * @returns {string} - Network name
 */
export function getNetworkName(chainId) {
  switch (chainId) {
    case '0xaa36a7': // 11155111
      return 'Sepolia';
    case '0x539': // 1337 (Ganache/older MetaMask Localhost)
      return 'Localhost';
    case '0x7a69': // 31337 (Hardhat default)
      return 'Localhost';
    case '0x1': // 1
      return 'Mainnet';
    default:
      return 'Unknown';
  }
}

/**
 * Check if current network is supported
 * @param {string} chainId - Chain ID
 * @returns {boolean} - Whether network is supported
 */
export function isSupportedNetwork(chainId) {
  const supportedChains = ['0xaa36a7', '0x539', '0x7a69']; // Sepolia and Localhost (1337 & 31337)
  return supportedChains.includes(chainId);
}

/**
 * Reset MetaMask connection to clear circuit breaker
 * @returns {Promise<void>}
 */
export async function resetMetaMaskConnection() {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Wait a bit to avoid conflicts with pending requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try to disconnect and reconnect
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
  } catch (error) {
    console.warn('Could not reset MetaMask connection:', error);
    // If reset fails, suggest manual refresh
    throw new Error('Please manually refresh the page and reconnect your wallet');
  }
}

// Request debouncing to prevent multiple simultaneous requests
let pendingRequests = new Set();
const REQUEST_TIMEOUT = 5000; // 5 seconds

/**
 * Check if MetaMask circuit breaker is open
 * @returns {Promise<boolean>} - Whether circuit breaker is open
 */
export async function isCircuitBreakerOpen() {
  if (!isMetaMaskInstalled()) {
    return false;
  }

  const requestId = 'circuit_breaker_check_' + Date.now();
  
  // Prevent multiple simultaneous requests
  if (pendingRequests.has('circuit_breaker_check')) {
    return false; // Assume not open if request is pending
  }
  
  pendingRequests.add('circuit_breaker_check');

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    );
    
    const requestPromise = window.ethereum.request({
      method: 'eth_blockNumber'
    });
    
    await Promise.race([requestPromise, timeoutPromise]);
    return false;
  } catch (error) {
    return error.message.includes('circuit breaker') || error.message.includes('Execution prevented');
  } finally {
    pendingRequests.delete('circuit_breaker_check');
  }
}

