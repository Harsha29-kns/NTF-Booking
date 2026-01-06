import React, { useState, useEffect } from 'react';
import { getIPFSUrl, getBestIPFSGateway } from '../utils/ipfs';
import { AlertCircle } from 'lucide-react';

const SafeIPFSImage = ({ 
  cid, 
  alt = 'IPFS Image', 
  className = '', 
  fallbackText = 'Image unavailable',
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (cid) {
      // Try to get the best gateway for this CID
      getBestIPFSGateway(cid).then(url => {
        setImageUrl(url);
        setIsLoading(false);
      }).catch(error => {
        console.log('Failed to get best gateway, using fallback:', error);
        setImageUrl(getIPFSUrl(cid.replace('ipfs://', '')));
        setIsLoading(false);
      });
    }
  }, [cid]);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (!cid) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <AlertCircle className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">{fallbackText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      
      <img
        src={imageUrl}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        {...props}
      />
    </div>
  );
};

export default SafeIPFSImage;
