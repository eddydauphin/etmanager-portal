// ============================================================================
// E&T MANAGER - MAIN APPLICATION
// Routes and authentication wrapper
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import CompetenciesPage from './pages/CompetenciesPage';
import CompetencyProfilesPage from './pages/CompetencyProfilesPage';
import TrainingPage from './pages/TrainingPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import ClientsPage from './pages/ClientsPage';
import ExpertNetworkPage from './pages/ExpertNetworkPage';

// My Pages (Trainee view)
import MyProgressPage from './pages/MyProgressPage';
import MyPlanPage from './pages/MyPlanPage';
import MyTrainingPage from './pages/MyTrainingPage';

// Layout
import Layout from './components/shared/Layout';

// Loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, profile, loading, mustChangePassword } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Force password change if required
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  // Check role if specified
  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public route (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { user, loading, mustChangePassword } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user && !mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// App routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      
      {/* Password change (semi-protected) */}
      <Route path="/change-password" element={<ChangePasswordPage />} />
      
      {/* Protected routes with Layout */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Default redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Common routes */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Super Admin only routes */}
        <Route path="clients" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <ClientsPage />
          </ProtectedRoute>
        } />
        
        {/* Super Admin & Client Admin routes */}
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        
        <Route path="expert-network" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <ExpertNetworkPage />
          </ProtectedRoute>
        } />
        
        <Route path="competencies" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <CompetenciesPage />
          </ProtectedRoute>
        } />
        
        <Route path="profiles" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <CompetencyProfilesPage />
          </ProtectedRoute>
        } />
        
        <Route path="training" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <TrainingPage />
          </ProtectedRoute>
        } />
        
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['super_admin', 'client_admin']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        
        {/* Trainee routes */}
        <Route path="my-progress" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <MyProgressPage />
          </ProtectedRoute>
        } />
        <Route path="my-plan" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <MyPlanPage />
          </ProtectedRoute>
        } />
        <Route path="my-training" element={
          <ProtectedRoute allowedRoles={['trainee']}>
            <MyTrainingPage />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Catch all - redirect to dashboard or login */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Main App component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
