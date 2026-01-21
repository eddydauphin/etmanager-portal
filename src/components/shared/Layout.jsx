import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import { dbFetch } from '../../lib/db';
import NotificationBell from '../NotificationBell';
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
  Network,
  ClipboardList,
  Rocket,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';

// ============================================================================
// CAPABILITY DEFINITIONS
// ============================================================================

const ALL_CAPABILITIES = {
  dashboard: { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', description: 'View dashboard and KPIs' },
  chat: { icon: MessageSquare, label: 'Chat', path: '/chat', description: 'AI Assistant and messaging' },
  clients: { icon: Building2, label: 'Clients', path: '/clients', description: 'Manage client organizations', superAdminOnly: true },
  users: { icon: Users, label: 'Users', path: '/users', description: 'Manage users and team members' },
  expert_network: { icon: Network, label: 'Expert Network', path: '/expert-network', description: 'Manage knowledge networks and experts' },
  development_center: { icon: Rocket, label: 'Development Center', path: '/development-center', description: 'Create competencies and assign development' },
  competencies: { icon: Target, label: 'Competencies', path: '/competencies', description: 'Manage competency framework' },
  profiles: { icon: FileText, label: 'Profiles', path: '/profiles', description: 'Manage competency profiles' },
  development: { icon: ClipboardList, label: 'Development Center', path: '/development', description: 'Manage development activities' },
  training: { icon: GraduationCap, label: 'Training', path: '/training', description: 'Manage training modules' },
  sops: { icon: ClipboardCheck, label: 'SOPs', path: '/sops', description: 'Standard Operating Procedures' },
  reports: { icon: BarChart3, label: 'Reports', path: '/reports', description: 'View analytics and reports' },
  settings: { icon: Settings, label: 'Settings', path: '/settings', description: 'Account settings' },
  // Trainee-specific
  my_progress: { icon: TrendingUp, label: 'My Progress', path: '/my-progress', description: 'View your progress', traineeOnly: true },
  my_training: { icon: BookOpen, label: 'My Training', path: '/my-training', description: 'Access your training', traineeOnly: true },
};

// Helper to check if user has capability
export function hasCapability(profile, capability) {
  if (!profile) return false;
  
  // Super admin always has all capabilities
  if (profile.role === 'super_admin') return true;
  
  // Chat is available to everyone
  if (capability === 'chat') return true;
  
  // Check capabilities object if it exists and has the specific capability key
  if (profile.capabilities && typeof profile.capabilities === 'object') {
    // If the capability key exists in the object, use that value
    if (capability in profile.capabilities) {
      return profile.capabilities[capability] === true;
    }
    // If capability key doesn't exist, fall through to defaults
  }
  
  // Fallback to role-based defaults if no capabilities set or key not found
  return getDefaultCapabilities(profile.role)[capability] || false;
}

// Default capabilities by role (fallback)
export function getDefaultCapabilities(role) {
  switch (role) {
    case 'super_admin':
      return {
        dashboard: true, chat: true, clients: true, users: true, expert_network: true,
        development_center: true, competencies: true, profiles: true, development: true, training: true,
        sops: true, reports: true, settings: true, hierarchy_settings: true
      };
    case 'client_admin':
      return {
        dashboard: true, chat: true, clients: false, users: true, expert_network: true,
        development_center: true, competencies: true, profiles: true, development: true, training: true,
        sops: true, reports: true, settings: true, hierarchy_settings: true
      };
    case 'category_admin':
      return {
        dashboard: true, chat: true, clients: false, users: true, expert_network: false,
        development_center: true, competencies: true, profiles: true, development: true, training: true,
        sops: true, reports: true, settings: true, hierarchy_settings: false
      };
    case 'site_admin':
      return {
        dashboard: true, chat: true, clients: false, users: true, expert_network: false,
        development_center: true, competencies: true, profiles: true, development: true, training: true,
        sops: true, reports: true, settings: true, hierarchy_settings: false
      };
    case 'team_lead':
      return {
        dashboard: true, chat: true, clients: false, users: true, expert_network: false,
        development_center: true, competencies: true, profiles: true, development: true, training: true,
        sops: true, reports: true, settings: true
      };
    case 'trainee':
      return {
        dashboard: true, chat: true, clients: false, users: false, expert_network: false,
        competencies: false, profiles: false, development: false, training: true,
        sops: false, reports: false, settings: true, my_progress: true, my_training: true
      };
    default:
      return { dashboard: true, chat: true, settings: true };
  }
}

// Get all available capabilities for a role (for the edit form)
export function getAvailableCapabilitiesForRole(role) {
  const capabilities = [];
  
  Object.entries(ALL_CAPABILITIES).forEach(([key, config]) => {
    // Skip super admin only items for non-super admins
    if (config.superAdminOnly && role !== 'super_admin') return;
    // Skip trainee only items for non-trainees
    if (config.traineeOnly && role !== 'trainee') return;
    // Include trainee items only for trainees
    if (!config.traineeOnly || role === 'trainee') {
      if (!config.superAdminOnly || role === 'super_admin') {
        capabilities.push({ key, ...config });
      }
    }
  });
  
  return capabilities;
}

function Layout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Fetch unread messages count
  useEffect(() => {
    if (!profile?.id) return;

    const fetchUnreadCount = async () => {
      try {
        // Get all channels where user is participant
        const participants = await dbFetch(
          `chat_participants?select=channel_id,last_read_at&user_id=eq.${profile.id}`
        );
        
        if (!participants || participants.length === 0) {
          setUnreadMessages(0);
          return;
        }

        let totalUnread = 0;
        
        for (const part of participants) {
          // Count messages after last_read_at
          let query = `chat_messages?select=id&channel_id=eq.${part.channel_id}&sender_id=neq.${profile.id}&is_deleted=eq.false`;
          if (part.last_read_at) {
            // URL encode the timestamp to handle + sign
            const encodedTimestamp = encodeURIComponent(part.last_read_at);
            query += `&created_at=gt.${encodedTimestamp}`;
          }
          
          const messages = await dbFetch(query);
          totalUnread += messages?.length || 0;
        }
        
        setUnreadMessages(totalUnread);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    fetchUnreadCount();
    
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // Build menu items based on capabilities
  const getMenuItems = () => {
    const role = profile?.role;
    const items = [];

    // Define menu order - Chat added after dashboard for all roles
    // SOPs added between training and reports
    const menuOrder = role === 'trainee' 
      ? ['dashboard', 'chat', 'my_progress', 'my_training', 'sops', 'settings']
      : ['dashboard', 'chat', 'users', 'expert_network', 'development_center', 'profiles', 'training', 'sops', 'reports', 'settings'];

    // Super admin also gets clients
    if (role === 'super_admin') {
      menuOrder.splice(2, 0, 'clients'); // Insert after chat
    }

    menuOrder.forEach(capKey => {
      const config = ALL_CAPABILITIES[capKey];
      if (!config) return;

      // Check if user has this capability
      if (hasCapability(profile, capKey)) {
        // Apply role-specific label changes
        let label = config.label;
        if (capKey === 'users') {
          if (role === 'client_admin' || role === 'site_admin') label = 'Team';
          else if (role === 'team_lead') label = 'My Team';
        }

        items.push({
          to: config.path,
          icon: config.icon,
          label: label,
          badge: capKey === 'chat' ? unreadMessages : 0
        });
      }
    });

    return items;
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
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold text-white bg-red-500 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <span className="flex-1 flex items-center justify-between">
                  {item.label}
                  {item.badge > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </span>
              )}
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
              {profile?.role === 'site_admin' && 'Site Admin Dashboard'}
              {profile?.role === 'team_lead' && 'Team Lead Dashboard'}
              {profile?.role === 'trainee' && 'Trainee Portal'}
            </h1>
          </div>

          {/* Notification Bell & User menu */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell userId={profile?.id} />
            
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
