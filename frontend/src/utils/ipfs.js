import axios from 'axios';

// IPFS Configuration
// Optional direct overrides (avoid hardcoding public keys; prefer .env)
const OVERRIDE_PINATA_API_KEY = '';
const OVERRIDE_PINATA_SECRET_KEY = '';
const OVERRIDE_NFT_STORAGE_TOKEN = '';

const PINATA_API_KEY = OVERRIDE_PINATA_API_KEY || import.meta.env.VITE_PINATA_API_KEY;
const PINATA_SECRET_KEY = OVERRIDE_PINATA_SECRET_KEY || import.meta.env.VITE_PINATA_SECRET_KEY;
// Multiple IPFS gateways for fallback - use reliable gateways first
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',               // IPFS.io (most reliable)
  'https://dweb.link/ipfs/',             // Protocol Labs gateway
  'https://ipfs.fleek.co/ipfs/',         // Fleek gateway
  'https://nftstorage.link/ipfs/',       // NFT.Storage gateway
  'https://ipfs.filebase.io/ipfs/',      // Filebase gateway
  'https://gateway.pinata.cloud/ipfs/',  // Pinata gateway (rate limited)
  'https://cloudflare-ipfs.com/ipfs/',   // Cloudflare (currently down)
];

const DEFAULT_PUBLIC_GATEWAY = IPFS_GATEWAYS[0]; // Start with Pinata
const CLOUDFLARE_GATEWAY = 'https://cloudflare-ipfs.com/ipfs/';
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || DEFAULT_PUBLIC_GATEWAY;

// Alternative: NFT.Storage configuration
const NFT_STORAGE_TOKEN = OVERRIDE_NFT_STORAGE_TOKEN || import.meta.env.VITE_NFT_STORAGE_TOKEN;

// Treat placeholder env values as unset
const isPlaceholder = (val) => !val || /your_.*_key/i.test(String(val)) || /your_.*_token/i.test(String(val));
const hasValidPinata = !isPlaceholder(PINATA_API_KEY) && !isPlaceholder(PINATA_SECRET_KEY);
const hasValidNftStorage = !isPlaceholder(NFT_STORAGE_TOKEN);

/**
 * Upload image to IPFS using Pinata
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadImageToPinata(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        type: 'ticket-image'
      }
    });
    formData.append('pinataMetadata', metadata);
    
    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading image to Pinata:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}

/**
 * Upload image to IPFS using NFT.Storage
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadImageToNFTStorage(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
      'https://api.nft.storage/upload',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${NFT_STORAGE_TOKEN}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.value.cid;
  } catch (error) {
    console.error('Error uploading image to NFT.Storage:', error);
    throw new Error('Failed to upload image to IPFS');
  }
}

/**
 * Upload image to IPFS (tries Pinata first, then NFT.Storage)
 * @param {File} file - The image file to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadImage(file) {
  // Prefer Pinata when available; otherwise use NFT.Storage; ignore placeholders
  if (hasValidPinata) {
    return await uploadImageToPinata(file);
  }
  if (hasValidNftStorage) {
    return await uploadImageToNFTStorage(file);
  }
  
  // For development/testing: return a mock CID if no IPFS service is configured
  console.warn('No IPFS service configured. Using mock CID for development.');
  const mockCID = `QmMock${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  return mockCID;
}

/**
 * Upload metadata to IPFS using Pinata
 * @param {Object} metadata - The metadata object to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadMetadataToPinata(metadata) {
  try {
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'pinata_api_key': PINATA_API_KEY,
          'pinata_secret_api_key': PINATA_SECRET_KEY,
        },
      }
    );

    return response.data.IpfsHash;
  } catch (error) {
    console.error('Error uploading metadata to Pinata:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Upload metadata to IPFS using NFT.Storage
 * @param {Object} metadata - The metadata object to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadMetadataToNFTStorage(metadata) {
  try {
    const response = await axios.post(
      'https://api.nft.storage/upload',
      JSON.stringify(metadata),
      {
        headers: {
          'Authorization': `Bearer ${NFT_STORAGE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.value.cid;
  } catch (error) {
    console.error('Error uploading metadata to NFT.Storage:', error);
    throw new Error('Failed to upload metadata to IPFS');
  }
}

/**
 * Upload metadata to IPFS (tries Pinata first, then NFT.Storage)
 * @param {Object} metadata - The metadata object to upload
 * @returns {Promise<string>} - IPFS CID
 */
export async function uploadMetadata(metadata) {
  // Prefer Pinata when available; otherwise use NFT.Storage; ignore placeholders
  if (hasValidPinata) {
    return await uploadMetadataToPinata(metadata);
  }
  if (hasValidNftStorage) {
    return await uploadMetadataToNFTStorage(metadata);
  }
  
  // For development/testing: return a mock CID if no IPFS service is configured
  console.warn('No IPFS service configured. Using mock CID for development.');
  const mockCID = `QmMockMetadata${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
  return mockCID;
}

/**
 * Get IPFS URL from CID with fallback logic
 * @param {string} cid - IPFS CID
 * @param {number} gatewayIndex - Index of gateway to try (default: 0)
 * @returns {string} - Full IPFS URL
 */
export function getIPFSUrl(cid, gatewayIndex = 0) {
  // Clean CID (remove ipfs:// prefix if present)
  const cleanCid = cid.replace('ipfs://', '');
  
  // Use the specified gateway index, fallback to first if invalid
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  return `${gateway}${cleanCid}`;
}

/**
 * Get all possible IPFS URLs for a CID
 * @param {string} cid - IPFS CID
 * @returns {string[]} - Array of all possible IPFS URLs
 */
export function getAllIPFSUrls(cid) {
  const cleanCid = cid.replace('ipfs://', '');
  return IPFS_GATEWAYS.map(gateway => `${gateway}${cleanCid}`);
}

/**
 * Test if an IPFS URL is accessible
 * @param {string} url - IPFS URL to test
 * @returns {Promise<boolean>} - Whether URL is accessible
 */
export async function testIPFSUrl(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.log(`Gateway test failed for ${url}:`, error.message);
    return false;
  }
}

/**
 * Get the best available IPFS gateway for a CID
 * @param {string} cid - IPFS CID
 * @returns {Promise<string>} - Best available gateway URL
 */
export async function getBestIPFSGateway(cid) {
  const cleanCid = cid.replace('ipfs://', '');
  
  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}${cleanCid}`;
    const isAccessible = await testIPFSUrl(url);
    if (isAccessible) {
      console.log(`Using gateway: ${gateway}`);
      return url;
    }
  }
  
  // If all gateways fail, return the first one as fallback
  console.warn('All IPFS gateways failed, using fallback');
  return `${IPFS_GATEWAYS[0]}${cleanCid}`;
}

/**
 * Get the best available IPFS URL for a CID
 * @param {string} cid - IPFS CID
 * @returns {Promise<string>} - Best available IPFS URL
 */
export async function getBestIPFSUrl(cid) {
  const urls = getAllIPFSUrls(cid);
  
  // Test each URL in parallel
  const tests = urls.map(async (url, index) => {
    const isAccessible = await testIPFSUrl(url);
    return { url, index, isAccessible };
  });
  
  const results = await Promise.all(tests);
  
  // Return the first accessible URL, or fallback to first URL
  const accessible = results.find(result => result.isAccessible);
  return accessible ? accessible.url : urls[0];
}

// Legacy function for backward compatibility
export function getAlternateIPFSGatewayUrls(cid) {
  return getAllIPFSUrls(cid);
}

/**
 * Validate file type and size
 * @param {File} file - File to validate
 * @param {number} maxSize - Maximum file size in MB
 * @returns {boolean} - Whether file is valid
 */
export function validateFile(file, maxSize = 10) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const maxSizeBytes = maxSize * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
  }

  if (file.size > maxSizeBytes) {
    throw new Error(`File size too large. Maximum size is ${maxSize}MB.`);
  }

  return true;
}

/**
 * Convert file to base64 for preview
 * @param {File} file - File to convert
 * @returns {Promise<string>} - Base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

