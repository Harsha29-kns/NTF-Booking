import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Briefcase, 
  X, 
  Check, 
  Loader2, 
  Mail, 
  Building,
  Phone // <--- ADDED: Import Phone icon
} from 'lucide-react';
import toast from 'react-hot-toast';

const RegisterModal = () => {
  const { 
    showRegisterModal, 
    register, 
    cancelRegistration, 
    isLoading 
  } = useAuth();
  
  const [role, setRole] = useState('customer'); // 'customer' or 'organizer'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '', // <--- ADDED: Phone state
    companyName: '', // Only for organizers
  });

  if (!showRegisterModal) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    if (role === 'organizer' && !formData.companyName.trim()) {
      toast.error('Organizers must provide a Company/Organization name');
      return;
    }

    try {
      const isOrganizer = role === 'organizer';
      
      // Construct the data payload expected by backend
      const registrationData = {
        username: formData.username,
        email: formData.email,
        phone: formData.phone, // <--- ADDED: Include phone in payload
        isOrganizer: isOrganizer,
        organizerInfo: isOrganizer ? {
          companyName: formData.companyName,
          verified: false 
        } : undefined
      };

      await register(registrationData);
      toast.success(`Welcome! You are registered as a ${isOrganizer ? 'Organizer' : 'Customer'}`);
      
      // Reset form
      setRole('customer');
      setFormData({ username: '', email: '', phone: '', companyName: '' });
      
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Complete Registration</h2>
          <button 
            onClick={cancelRegistration}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6 text-sm text-center">
            Your wallet is connected! Please set up your profile to continue.
          </p>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                role === 'customer' 
                  ? 'border-primary-600 bg-primary-50 text-primary-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <User className={`w-8 h-8 ${role === 'customer' ? 'text-primary-600' : 'text-gray-400'}`} />
              <span className="font-semibold">Customer</span>
              <span className="text-xs text-center opacity-80">I want to buy tickets</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('organizer')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${
                role === 'organizer' 
                  ? 'border-purple-600 bg-purple-50 text-purple-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Briefcase className={`w-8 h-8 ${role === 'organizer' ? 'text-purple-600' : 'text-gray-400'}`} />
              <span className="font-semibold">Organizer</span>
              <span className="text-xs text-center opacity-80">I want to sell tickets</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="How should we call you?"
                  required
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Phone Number (ADDED) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="+1 234 567 8900"
                />
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input-field pl-10"
                  placeholder="For ticket receipts"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Organizer Specific Fields */}
            {role === 'organizer' && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization / Company Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="input-field pl-10 border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Event Company Ltd."
                    required={role === 'organizer'}
                  />
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  * Organizers have access to the Event Creation Dashboard.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={cancelRegistration}
                className="flex-1 btn-outline"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`flex-1 flex items-center justify-center space-x-2 text-white font-medium py-2 px-4 rounded-lg transition-colors ${
                  role === 'organizer' 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Complete Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;