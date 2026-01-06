import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, Shield, Zap, Globe } from 'lucide-react';

const HomePage = () => {
  const { user, isConnected } = useAuth();

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          The Future of <span className="text-primary-600">Event Ticketing</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Secure, transparent, and resale-proof tickets powered by Blockchain technology. 
          Buy, sell, and verify tickets instantly with zero fraud.
        </p>
        
        <div className="flex justify-center gap-4">
          {/* Dynamic Buttons based on Role */}
          {isConnected && user?.isOrganizer ? (
            <Link to="/create-sale" className="btn-primary text-lg px-8 py-3">
              Create New Event
            </Link>
          ) : (
            <Link to="/tickets" className="btn-primary text-lg px-8 py-3">
              Browse Events
            </Link>
          )}
          
          <Link to="/verify" className="btn-outline text-lg px-8 py-3 bg-white">
            Verify Ticket
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <div className="card text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">100% Secure</h3>
          <p className="text-gray-600">
            Eliminate fake tickets forever. Every ticket is a unique NFT verified on the blockchain.
          </p>
        </div>

        <div className="card text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Instant Transfers</h3>
          <p className="text-gray-600">
            Buy and resell tickets instantly without middlemen or hidden processing fees.
          </p>
        </div>

        <div className="card text-center p-6 hover:shadow-lg transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Global Access</h3>
          <p className="text-gray-600">
            Connect your wallet and access events worldwide. No account creation barriers.
          </p>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
