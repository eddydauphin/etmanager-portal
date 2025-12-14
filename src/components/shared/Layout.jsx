import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  GraduationCap,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  FileText,
  BookOpen,
  Network
} from 'lucide-react';

function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Menu items based on role
  const getMenuItems = () => {
    const role = profile?.role;

    if (role === 'super_admin') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/clients', icon: Building2, label: 'Clients' },
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/expert-network', icon: Network, label: 'Expert Network' },
        { to: '/competencies', icon: Target, label: 'Competencies' },
        { to: '/training', icon: GraduationCap, label: 'Training' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];
    }

    if (role === 'client_admin') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/users', icon: Users, label: 'Team' },
        { to: '/expert-network', icon: Network, label: 'Expert Network' },
        { to: '/competencies', icon: Target, label: 'Competencies' },
        { to: '/training', icon: GraduationCap, label: 'Training' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];
    }

    if (role === 'team_lead') {
      return [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/users', icon: Users, label: 'My Team' },
        { to: '/competencies', icon: Target, label: 'Competencies' },
        { to: '/training', icon: GraduationCap, label: 'Training' },
        { to: '/reports', icon: BarChart3, label: 'Reports' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];
    }

    // trainee
    return [
      { to: '/my-progress', icon: TrendingUp, label: 'My Progress' },
      { to: '/my-plan', icon: FileText, label: 'My Plan' },
      { to: '/my-training', icon: BookOpen, label: 'My Training' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            E&T
          </div>
          {sidebarOpen && (
            <div className="ml-3">
              <p className="font-semibold text-gray-900">E&T Manager</p>
              <p className="text-xs text-gray-500">Foodek Consulting</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {profile?.role === 'super_admin' && 'Super Admin Dashboard'}
              {profile?.role === 'client_admin' && 'Client Admin Dashboard'}
              {profile?.role === 'trainee' && 'Trainee Portal'}
            </h1>
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{profile?.role?.replace('_', ' ')}</p>
              </div>
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500">{profile?.email}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
