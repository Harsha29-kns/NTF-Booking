import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useWeb3 } from '../contexts/Web3Context';
import apiService from '../services/api';
import toast from 'react-hot-toast';
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Award, 
  Settings,
  Edit3,
  Save,
  X,
  Loader2,
  Building2,
  Globe,
  FileText,
  CheckCircle,
  Star
} from 'lucide-react';

const ProfilePage = () => {
  const { user, isAuthenticated, updateProfile, becomeOrganizer, isLoading } = useAuth();
  const { account } = useWeb3();
  const [isEditing, setIsEditing] = useState(false);
  const [isBecomingOrganizer, setIsBecomingOrganizer] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    profileImage: ''
  });
  const [organizerData, setOrganizerData] = useState({
    companyName: '',
    website: '',
    description: ''
  });
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        profileImage: user.profileImage || ''
      });
      
      if (user.organizerInfo) {
        setOrganizerData({
          companyName: user.organizerInfo.companyName || '',
          website: user.organizerInfo.website || '',
          description: user.organizerInfo.description || ''
        });
      }
      
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const response = await apiService.getUserStats(user.walletAddress);
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOrganizerInputChange = (e) => {
    const { name, value } = e.target;
    setOrganizerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleBecomeOrganizer = async () => {
    try {
      await becomeOrganizer(organizerData);
      setIsBecomingOrganizer(false);
      toast.success('Successfully became an organizer!');
    } catch (error) {
      toast.error(error.message || 'Failed to become organizer');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-outline flex items-center space-x-2"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-primary flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save</span>
              </button>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Avatar and Basic Info */}
          <div className="md:col-span-1">
            <div className="text-center">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary-600" />
                )}
              </div>
              
              {isEditing ? (
                <input
                  type="url"
                  name="profileImage"
                  value={formData.profileImage}
                  onChange={handleInputChange}
                  className="input-field mb-4"
                  placeholder="Profile image URL"
                />
              ) : (
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {user.displayName}
                </h2>
              )}
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-mono">{user.walletAddress}</span>
              </div>
              
              {user.isOrganizer && (
                <div className="mt-2 flex items-center justify-center space-x-1 text-primary-600">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-medium">Organizer</span>
                  {user.organizerInfo?.verified && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Username</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter username"
                  />
                ) : (
                  <p className="text-gray-900">{user.username || 'Not set'}</p>
                )}
              </div>
              
              <div>
                <label className="label">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter email"
                  />
                ) : (
                  <p className="text-gray-900">{user.email || 'Not set'}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="label">Bio</label>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="input-field"
                  rows="3"
                  placeholder="Tell us about yourself"
                />
              ) : (
                <p className="text-gray-900">{user.bio || 'No bio provided'}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Last login {formatDate(user.lastLogin)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Organizer Section */}
      {user.isOrganizer ? (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Organizer Information</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <p className="text-gray-900">{user.organizerInfo?.companyName || 'Not set'}</p>
            </div>
            <div>
              <label className="label">Website</label>
              <p className="text-gray-900">
                {user.organizerInfo?.website ? (
                  <a 
                    href={user.organizerInfo.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    {user.organizerInfo.website}
                  </a>
                ) : 'Not set'}
              </p>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="label">Description</label>
            <p className="text-gray-900">{user.organizerInfo?.description || 'No description provided'}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Award className="w-5 h-5" />
            <span>Become an Organizer</span>
          </h3>
          
          <p className="text-gray-600 mb-4">
            Create and manage your own events by becoming an organizer.
          </p>
          
          {!isBecomingOrganizer ? (
            <button
              onClick={() => setIsBecomingOrganizer(true)}
              className="btn-primary"
            >
              Become Organizer
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={organizerData.companyName}
                  onChange={handleOrganizerInputChange}
                  className="input-field"
                  placeholder="Enter company name"
                />
              </div>
              
              <div>
                <label className="label">Website</label>
                <input
                  type="url"
                  name="website"
                  value={organizerData.website}
                  onChange={handleOrganizerInputChange}
                  className="input-field"
                  placeholder="https://your-website.com"
                />
              </div>
              
              <div>
                <label className="label">Description</label>
                <textarea
                  name="description"
                  value={organizerData.description}
                  onChange={handleOrganizerInputChange}
                  className="input-field"
                  rows="3"
                  placeholder="Describe your organization"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsBecomingOrganizer(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBecomeOrganizer}
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                  <span>Become Organizer</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="card">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5" />
            <span>Statistics</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.ticketsPurchased}
              </div>
              <div className="text-sm text-gray-600">Tickets Purchased</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.eventsCreated}
              </div>
              <div className="text-sm text-gray-600">Events Created</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.totalSpent.toFixed(4)} ETH
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">
                {stats.totalEarned.toFixed(4)} ETH
              </div>
              <div className="text-sm text-gray-600">Total Earned</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;











