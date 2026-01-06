import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Web3Provider } from './contexts/Web3Context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CreateSalePage from './pages/CreateSalePage';
import TicketListPage from './pages/TicketListPage';
import TicketDetailPage from './pages/TicketDetailPage';
import VerifyTicketPage from './pages/VerifyTicketPage';
import AdminVerifyPage from './pages/AdminVerifyPage'; // New Page for Salesmen
import MyTicketsPage from './pages/MyTicketsPage';
import PrintTicketPage from './pages/PrintTicketPage';
import TestCreatePage from './pages/TestCreatePage';
import './index.css';

// Component to protect routes based on role
const ProtectedRoute = ({ children, requireOrganizer = false }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // If not logged in, redirect to home
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If organizer role is required but user is not organizer
  if (requireOrganizer && !user.isOrganizer) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Web3Provider>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-gray-50">
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                
                {/* Public / Customer Routes */}
                <Route path="/tickets" element={<TicketListPage />} />
                <Route path="/ticket/:id" element={<TicketDetailPage />} />
                <Route path="/ticket/:id/print" element={<PrintTicketPage />} />
                <Route path="/verify" element={<VerifyTicketPage />} />
                <Route path="/my-tickets" element={<MyTicketsPage />} />
                
                {/* Protected Organizer Routes */}
                <Route 
                  path="/create-sale" 
                  element={
                    <ProtectedRoute requireOrganizer={true}>
                      <CreateSalePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/verify" 
                  element={
                    <ProtectedRoute requireOrganizer={true}>
                      <AdminVerifyPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Test Route */}
                <Route path="/test-create" element={<TestCreatePage />} />
              </Routes>
            </Layout>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </Web3Provider>
  );
}

export default App;
