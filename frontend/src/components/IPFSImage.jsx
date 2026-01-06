import React, { useState, useEffect } from 'react';
import { getAllIPFSUrls, testIPFSUrl } from '../utils/ipfs';
import { Loader2, AlertCircle } from 'lucide-react';

const IPFSImage = ({ 
  cid, 
  alt = 'IPFS Image', 
  className = '', 
  fallbackSrc = null,
  onError = null,
  onLoad = null,
  ...props 
}) => {
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [allUrls, setAllUrls] = useState([]);

  useEffect(() => {
    if (!cid) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const urls = getAllIPFSUrls(cid);
    setAllUrls(urls);
    setCurrentUrlIndex(0);
    setHasError(false);
    setIsLoading(true);
  }, [cid]);

  const handleImageError = async () => {
    const nextIndex = currentUrlIndex + 1;
    
    if (nextIndex < allUrls.length) {
      // Try next gateway
      setCurrentUrlIndex(nextIndex);
      setIsLoading(true);
    } else {
      // All gateways failed
      setHasError(true);
      setIsLoading(false);
      if (onError) {
        onError();
      }
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
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
          <p className="text-xs text-gray-500">Image unavailable</p>
        </div>
      </div>
    );
  }

  const currentUrl = allUrls[currentUrlIndex];

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      
      <img
        src={currentUrl}
        alt={alt}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        {...props}
      />
      
      {fallbackSrc && hasError && (
        <img
          src={fallbackSrc}
          alt={alt}
          className={className}
          {...props}
        />
      )}
    </div>
  );
};

export default IPFSImage;







