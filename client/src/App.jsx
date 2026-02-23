import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';
import Toast from './components/Toast';

// Pages - Enhanced versions
import HomePage from './pages/HomePage';
import EnhancedSubmitComplaintPage from './pages/EnhancedSubmitComplaintPage';
import EnhancedTrackComplaintPage from './pages/EnhancedTrackComplaintPage';
import AdminLoginPage from './pages/AdminLoginPage';
import EnhancedAdminDashboardPage from './pages/EnhancedAdminDashboardPage';
import ComplaintDetailPage from './pages/ComplaintDetailPage';

// New Feature Pages
import CommunityFeedPage from './pages/CommunityFeedPage';
import CitizenPortalPage from './pages/CitizenPortalPage';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
}

// Register Service Worker for PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('ServiceWorker registered:', registration.scope);
      } catch (error) {
        console.log('ServiceWorker registration failed:', error);
      }
    });
  }
}

function App() {
  useEffect(() => {
    // Register service worker on mount
    registerServiceWorker();
  }, []);

  return (
    <BrowserRouter>
      {/* Global Components */}
      <Toast />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/submit" element={<EnhancedSubmitComplaintPage />} />
        <Route path="/submit/:sessionId" element={<EnhancedSubmitComplaintPage />} />
        <Route path="/track" element={<EnhancedTrackComplaintPage />} />
        <Route path="/track/:complaintId" element={<EnhancedTrackComplaintPage />} />
        
        {/* New Feature Routes */}
        <Route path="/community" element={<CommunityFeedPage />} />
        <Route path="/citizen" element={<CitizenPortalPage />} />
        
        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <EnhancedAdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/complaints/:id"
          element={
            <ProtectedRoute>
              <ComplaintDetailPage />
            </ProtectedRoute>
          }
        />
        
        {/* Redirect admin root to dashboard */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        
        {/* 404 Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
