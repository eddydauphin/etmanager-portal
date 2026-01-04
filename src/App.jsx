// ============================================================================
// E&T MANAGER - MAIN APPLICATION
// Routes and authentication wrapper with capability-based access control
// ============================================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import TraineesPage from './pages/TraineesPage';
import TraineeDetailPage from './pages/TraineeDetailPage';
import CompetenciesPage from './pages/CompetenciesPage';
import CompetencyProfilesPage from './pages/CompetencyProfilesPage';
import TrainingModulesPage from './pages/TrainingModulesPage';
import DevelopmentActivitiesPage from './pages/DevelopmentActivitiesPage';
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
import Layout, { hasCapability } from './components/shared/Layout';

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

// Protected route wrapper with capability check
function ProtectedRoute({ children, allowedRoles = [], requiredCapability = null }) {
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

  // Check capability first (more granular)
  if (requiredCapability && !hasCapability(profile, requiredCapability)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fallback to role check if no capability specified
  if (!requiredCapability && allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
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
        
        {/* Dashboard - everyone with capability */}
        <Route path="dashboard" element={
          <ProtectedRoute requiredCapability="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        } />
        
        {/* Settings - everyone with capability */}
        <Route path="settings" element={
          <ProtectedRoute requiredCapability="settings">
            <SettingsPage />
          </ProtectedRoute>
        } />

        {/* Clients - requires clients capability (typically super_admin only) */}
        <Route path="clients" element={
          <ProtectedRoute requiredCapability="clients">
            <ClientsPage />
          </ProtectedRoute>
        } />

        {/* Users - requires users capability */}
        <Route path="users" element={
          <ProtectedRoute requiredCapability="users">
            <UsersPage />
          </ProtectedRoute>
        } />

        {/* Expert Network - requires expert_network capability */}
        <Route path="expert-network" element={
          <ProtectedRoute requiredCapability="expert_network">
            <ExpertNetworkPage />
          </ProtectedRoute>
        } />

        {/* Competencies - requires competencies capability */}
        <Route path="competencies" element={
          <ProtectedRoute requiredCapability="competencies">
            <CompetenciesPage />
          </ProtectedRoute>
        } />

        {/* Competency Profiles - requires profiles capability */}
        <Route path="profiles" element={
          <ProtectedRoute requiredCapability="profiles">
            <CompetencyProfilesPage />
          </ProtectedRoute>
        } />

        {/* Development Activities - requires development capability */}
        <Route path="development" element={
          <ProtectedRoute requiredCapability="development">
            <DevelopmentActivitiesPage />
          </ProtectedRoute>
        } />

        {/* Training - requires training capability */}
        <Route path="training" element={
          <ProtectedRoute requiredCapability="training">
            <TrainingModulesPage />
          </ProtectedRoute>
        } />

        {/* Reports - requires reports capability */}
        <Route path="reports" element={
          <ProtectedRoute requiredCapability="reports">
            <ReportsPage />
          </ProtectedRoute>
        } />

        {/* Legacy Trainees routes */}
        <Route path="trainees" element={
          <ProtectedRoute requiredCapability="users">
            <TraineesPage />
          </ProtectedRoute>
        } />
        <Route path="trainees/:id" element={
          <ProtectedRoute requiredCapability="users">
            <TraineeDetailPage />
          </ProtectedRoute>
        } />
        
        {/* Trainee-specific routes */}
        <Route path="my-progress" element={
          <ProtectedRoute requiredCapability="my_progress">
            <MyProgressPage />
          </ProtectedRoute>
        } />
        <Route path="my-plan" element={
          <ProtectedRoute requiredCapability="my_plan">
            <MyPlanPage />
          </ProtectedRoute>
        } />
        <Route path="my-training" element={
          <ProtectedRoute requiredCapability="my_training">
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
