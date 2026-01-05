// ============================================================================
// E&T MANAGER - DASHBOARD PAGE
// Role-based dashboard with real stats, quick actions, and coaching overview
// ============================================================================

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Users,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Building2,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Plus,
  Network,
  MessageSquare,
  Calendar,
  User,
  ChevronRight,
  ChevronDown,
  X,
  Send,
  Loader2,
  TrendingUp,
  Award,
  Rocket,
  Lightbulb,
  BookOpen,
  FileText,
  FileCheck,
  FileClock,
  // Layout icons
  LayoutDashboard,
  LayoutGrid,
  Boxes,
  Grip,
  Check,
  Palette,
  RefreshCw,
  Zap,
  Activity,
  Trophy,
  Flame,
  Heart,
  Coffee,
  Briefcase,
  Layout,
  AlertTriangle,
  Play,
  UserPlus,
  Crown,
  UserCog,
  GitBranch,
  ChevronUp,
  MapPin
} from 'lucide-react';

// Import Competency Maturity Dashboard component
import CompetencyMaturityDashboard from '../components/CompetencyMaturityDashboard';

// ============================================================================
// LAYOUT DEFINITIONS
// ============================================================================

const dashboardLayouts = {
  classic: {
    name: 'Classic',
    icon: LayoutDashboard,
    description: 'Traditional with sidebar KPIs',
    preview: '📊'
  },
  magazine: {
    name: 'Magazine',
    icon: LayoutGrid,
    description: 'Visual card-based',
    preview: '📰'
  },
  command: {
    name: 'Command Center',
    icon: Boxes,
    description: 'Dense monitoring',
    preview: '🖥️'
  },
  focus: {
    name: 'Focus',
    icon: Target,
    description: 'Minimal, priority-first',
    preview: '🎯'
  },
  custom: {
    name: 'Custom',
    icon: Grip,
    description: 'Build your own',
    preview: '🛠️'
  }
};

// Available widgets for custom layout
const availableWidgets = {
  welcome: { name: 'Welcome Card', icon: Heart, category: 'Overview', size: 'large' },
  kpiStrip: { name: 'KPI Strip', icon: BarChart3, category: 'Metrics', size: 'full' },
  teamStatus: { name: 'Team Status', icon: Users, category: 'People', size: 'medium' },
  quickActions: { name: 'Quick Actions', icon: Zap, category: 'Actions', size: 'medium' },
  trainingProgress: { name: 'Training Progress', icon: TrendingUp, category: 'Training', size: 'medium' },
  recentActivity: { name: 'Recent Activity', icon: Activity, category: 'Activity', size: 'medium' },
  competencyRing: { name: 'Competency Ring', icon: Target, category: 'Competencies', size: 'medium' },
  coachingOverview: { name: 'Coaching Overview', icon: MessageSquare, category: 'Coaching', size: 'medium' },
  leaderboard: { name: 'Leaderboard', icon: Trophy, category: 'Engagement', size: 'medium' },
};

// ============================================================================
// LAYOUT SELECTOR COMPONENT
// ============================================================================

function LayoutSelector({ currentLayout, onLayoutChange, showSelector, setShowSelector }) {
  return (
    <div className="relative">
      <button 
        onClick={() => setShowSelector(!showSelector)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
      >
        <span className="text-lg">{dashboardLayouts[currentLayout]?.preview}</span>
        <span className="font-medium text-gray-700 text-sm hidden sm:inline">{dashboardLayouts[currentLayout]?.name}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {showSelector && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">Dashboard Style</p>
            {Object.entries(dashboardLayouts).map(([key, layout]) => (
              <button
                key={key}
                onClick={() => { onLayoutChange(key); setShowSelector(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                  currentLayout === key ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{layout.preview}</span>
                <div className="text-left flex-1">
                  <p className="font-medium text-sm">{layout.name}</p>
                  <p className="text-xs text-gray-500">{layout.description}</p>
                </div>
                {currentLayout === key && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// LAYOUT PREFERENCE HOOKS
// ============================================================================

function useLayoutPreferences(userId) {
  const [currentLayout, setCurrentLayout] = useState('classic');
  const [activeWidgets, setActiveWidgets] = useState(['welcome', 'kpiStrip', 'quickActions', 'teamStatus', 'trainingProgress', 'recentActivity']);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  const loadPreferences = async () => {
    try {
      // Try localStorage first (faster)
      const savedLayout = localStorage.getItem(`dashboard_layout_${userId}`);
      const savedWidgets = localStorage.getItem(`dashboard_widgets_${userId}`);
      
      if (savedLayout) setCurrentLayout(savedLayout);
      if (savedWidgets) {
        try {
          setActiveWidgets(JSON.parse(savedWidgets));
        } catch (e) {}
      }
    } catch (error) {
      console.log('Using default layout preferences');
    }
    setPrefsLoaded(true);
  };

  const savePreferences = (layout, widgets) => {
    if (!userId) return;
    
    // Save to localStorage
    localStorage.setItem(`dashboard_layout_${userId}`, layout);
    localStorage.setItem(`dashboard_widgets_${userId}`, JSON.stringify(widgets));
  };

  const handleLayoutChange = (newLayout) => {
    setCurrentLayout(newLayout);
    savePreferences(newLayout, activeWidgets);
  };

  const handleWidgetsChange = (newWidgets) => {
    setActiveWidgets(newWidgets);
    savePreferences(currentLayout, newWidgets);
  };

  return {
    currentLayout,
    activeWidgets,
    prefsLoaded,
    handleLayoutChange,
    handleWidgetsChange
  };
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

// Quick Action Card
function QuickAction({ title, description, href, icon: Icon }) {
  return (
    <Link
      to={href}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}

// Quick Action Button (onClick instead of navigation)
function QuickActionButton({ title, description, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}

// Training Materials KPI Section
// Training Modules KPI Section - Admin view of all training modules
function TrainingMaterialsSection({ clientId = null }) {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pendingApproval: 0,
    inDevelopment: 0
  });
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainingMaterialsData();
  }, [clientId]);

  const loadTrainingMaterialsData = async () => {
    try {
      // Load competencies with training developer info and client associations
      let competenciesUrl = 'competencies?select=id,name,training_developer_id,is_active,client_id,competency_clients(client_id),training_developer:training_developer_id(id,full_name,email)';
      let competencies = await dbFetch(competenciesUrl);
      
      // Transform to include client_ids from junction table
      competencies = (competencies || []).map(comp => ({
        ...comp,
        client_ids: comp.competency_clients?.map(cc => cc.client_id).filter(Boolean) || []
      }));
      
      // Filter by client if specified (using junction table for multi-client support)
      if (clientId) {
        competencies = competencies.filter(comp => 
          comp.client_ids?.includes(clientId)
        );
      }
      
      // Load training modules
      let modulesUrl = 'training_modules?select=id,status,title';
      if (clientId) {
        modulesUrl += `&client_id=eq.${clientId}`;
      }
      const modules = await dbFetch(modulesUrl) || [];
      
      // Load competency_modules junction table to get module-competency links
      // Filter by competency IDs from the filtered competencies
      const competencyIds = competencies?.map(c => c.id) || [];
      let competencyModules = [];
      if (competencyIds.length > 0) {
        competencyModules = await dbFetch(`competency_modules?select=module_id,competency_id&competency_id=in.(${competencyIds.join(',')})`) || [];
      }
      
      // Calculate stats by status
      const published = modules.filter(m => m.status === 'published').length;
      const pendingApproval = modules.filter(m => m.status === 'pending' || m.status === 'content_approved').length;
      const inDevelopment = modules.filter(m => m.status === 'draft').length;
      
      setStats({
        total: modules.length,
        published,
        pendingApproval,
        inDevelopment
      });

      // Get published module IDs
      const publishedModuleIds = new Set(
        modules.filter(m => m.status === 'published').map(m => m.id)
      );

      // Create a set of competency IDs that have published training
      const competenciesWithPublishedTraining = new Set(
        competencyModules
          .filter(cm => publishedModuleIds.has(cm.module_id))
          .map(cm => cm.competency_id)
      );

      // Group competencies by training developer
      const developerMap = {};
      competencies?.forEach(comp => {
        if (comp.training_developer_id && comp.training_developer) {
          if (!developerMap[comp.training_developer_id]) {
            developerMap[comp.training_developer_id] = {
              user: comp.training_developer,
              competencies: [],
              completed: 0,
              pending: 0
            };
          }
          developerMap[comp.training_developer_id].competencies.push(comp);
          
          if (competenciesWithPublishedTraining.has(comp.id)) {
            developerMap[comp.training_developer_id].completed++;
          } else {
            developerMap[comp.training_developer_id].pending++;
          }
        }
      });

      setDevelopers(Object.values(developerMap));
    } catch (error) {
      console.error('Error loading training materials data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total pending across all developers
  const totalPending = developers.reduce((sum, d) => sum + d.pending, 0);
  const totalCompleted = developers.reduce((sum, d) => sum + d.completed, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Training Modules
        </h2>
        <Link to="/training" className="text-sm text-blue-600 hover:text-blue-700">
          Manage →
        </Link>
      </div>

      {/* Module Status KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Link to="/training" className="text-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
          <p className="text-2xl font-bold text-green-600">{stats.published}</p>
          <p className="text-xs text-gray-600">Published</p>
        </Link>
        <Link to="/training" className="text-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
          <p className="text-2xl font-bold text-amber-600">{stats.pendingApproval}</p>
          <p className="text-xs text-gray-600">Pending Approval</p>
        </Link>
        <Link to="/training" className="text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
          <p className="text-2xl font-bold text-blue-600">{stats.inDevelopment}</p>
          <p className="text-xs text-gray-600">In Development</p>
        </Link>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-gray-700">{stats.total}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>

      {/* Development Assignments Summary */}
      {developers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Development Assignments</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-600 font-medium">{totalCompleted} completed</span>
              <span className="text-amber-600 font-medium">{totalPending} pending</span>
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {developers.map((dev) => (
              <div key={dev.user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dev.user.full_name || dev.user.email}</p>
                    <p className="text-xs text-gray-500">{dev.competencies.length} competencies assigned</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-green-600 font-medium">{dev.completed} done</span>
                  {dev.pending > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      {dev.pending} pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {developers.length === 0 && stats.total === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No training modules yet. Create modules and assign developers.
        </p>
      )}
    </div>
  );
}

// My Development Tasks - Competencies where user is assigned to CREATE training materials
function MyTrainingDevelopmentSection({ profile }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadMyAssignments();
    }
  }, [profile]);

  const loadMyAssignments = async () => {
    try {
      // Get competencies where current user is the training developer
      const competencies = await dbFetch(
        `competencies?training_developer_id=eq.${profile.id}&select=id,name,description,competency_categories(name,color)&is_active=eq.true`
      );
      
      if (!competencies || competencies.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get competency_modules to check which competencies have modules
      const competencyModules = await dbFetch('competency_modules?select=competency_id,module_id');
      
      // Get all modules to check their status
      const modules = await dbFetch('training_modules?select=id,title,status');
      
      // Create a map of module status by id
      const moduleStatusMap = {};
      modules?.forEach(m => {
        moduleStatusMap[m.id] = m.status;
      });
      
      // Enrich competencies with module status
      const enriched = competencies.map(comp => {
        // Find modules linked to this competency
        const linkedModuleIds = competencyModules
          ?.filter(cm => cm.competency_id === comp.id)
          .map(cm => cm.module_id) || [];
        
        const relatedModules = linkedModuleIds.map(id => ({
          id,
          status: moduleStatusMap[id]
        })).filter(m => m.status);
        
        const hasPublished = relatedModules.some(m => 
          m.status === 'published' || m.status === 'content_approved'
        );
        const hasDraft = relatedModules.some(m => 
          m.status === 'draft' || m.status === 'pending'
        );
        
        return {
          ...comp,
          modules: relatedModules,
          status: hasPublished ? 'published' : hasDraft ? 'in_progress' : 'not_started'
        };
      });

      setAssignments(enriched);
    } catch (error) {
      console.error('Error loading training development assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (assignments.length === 0) {
    return null;
  }

  const pending = assignments.filter(a => a.status !== 'published');
  const completed = assignments.filter(a => a.status === 'published');

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-500" />
            My Development Tasks
          </h2>
          <p className="text-xs text-gray-500 mt-1">Competencies you're assigned to create training materials for</p>
        </div>
        <Link to="/training" className="text-sm text-blue-600 hover:text-blue-700">
          Create Materials →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xl font-bold text-gray-900">{assignments.length}</p>
          <p className="text-xs text-gray-500">Assigned</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <p className="text-xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-gray-500">To Create</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xl font-bold text-green-600">{completed.length}</p>
          <p className="text-xs text-gray-500">Published</p>
        </div>
      </div>

      {/* Pending Items */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Competencies needing training materials:</p>
          {pending.slice(0, 5).map(item => (
            <Link
              key={item.id}
              to="/training"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                {item.competency_categories?.color && (
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.competency_categories.color }}
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.competency_categories?.name || 'Uncategorized'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'in_progress' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
          {pending.length > 5 && (
            <p className="text-xs text-gray-500 text-center">
              +{pending.length - 5} more pending
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Create Development Activity Modal
function CreateDevelopmentModal({ isOpen, onClose, profile, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    trainee_ids: [],
    coach_id: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load trainees
      let usersUrl = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      if (profile?.role === 'client_admin' && profile?.client_id) {
        usersUrl += `&client_id=eq.${profile.client_id}`;
      } else if (profile?.role === 'team_lead') {
        usersUrl += `&reports_to_id=eq.${profile.id}`;
      }
      const usersData = await dbFetch(usersUrl);
      setUsers(usersData || []);

      // Load coaches (non-trainees) - MUST FILTER BY CLIENT
      let coachesUrl = 'profiles?select=id,full_name,email,role&is_active=eq.true&role=neq.trainee&order=full_name.asc';
      // All non-super_admin roles should only see coaches from their organization
      if (profile?.role !== 'super_admin' && profile?.client_id) {
        coachesUrl += `&client_id=eq.${profile.client_id}`;
      }
      const coachesData = await dbFetch(coachesUrl);
      setCoaches(coachesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!formData.type) {
      setError('Please select an activity type');
      return;
    }
    if (formData.trainee_ids.length === 0) {
      setError('Please select at least one user');
      return;
    }
    if (!formData.coach_id) {
      setError('Please select a coach');
      return;
    }

    setSubmitting(true);
    try {
      const clientId = profile?.client_id || users.find(u => formData.trainee_ids.includes(u.id))?.client_id;

      for (const traineeId of formData.trainee_ids) {
        await dbFetch('development_activities', {
          method: 'POST',
          body: JSON.stringify({
            type: 'coaching',
            title: formData.title || (formData.type === 'grow_doing' ? 'Grow through doing' : 'Learn through others'),
            description: formData.description || (formData.type === 'grow_doing' 
              ? 'Development through initiatives, projects, and hands-on experience'
              : 'Development through feedback, coaching, and mentoring'),
            trainee_id: traineeId,
            assigned_by: profile.id,
            coach_id: formData.coach_id,
            start_date: formData.start_date,
            due_date: formData.due_date || null,
            status: 'pending',
            client_id: clientId
          })
        });
      }

      // Reset and close
      setFormData({
        type: '',
        title: '',
        description: '',
        trainee_ids: [],
        coach_id: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: ''
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err.message || 'Failed to create activity');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Development Activity</h2>
              <p className="text-sm text-gray-500">Assign coaching or development task</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Activity Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'grow_doing' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.type === 'grow_doing'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Rocket className={`w-6 h-6 mb-2 ${formData.type === 'grow_doing' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="font-medium text-gray-900">Grow through doing</p>
                    <p className="text-xs text-gray-500 mt-1">Initiatives, projects, hands-on</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'learn_others' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.type === 'learn_others'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Lightbulb className={`w-6 h-6 mb-2 ${formData.type === 'learn_others' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <p className="font-medium text-gray-900">Learn through others</p>
                    <p className="text-xs text-gray-500 mt-1">Feedback, coaching, mentoring</p>
                  </button>
                </div>
              </div>

              {/* Title (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q1 Project Leadership"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of the activity..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Select Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users *
                </label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {users.filter(u => u.role === 'trainee' || u.role === 'team_lead').length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No users available</p>
                  ) : (
                    users.filter(u => u.role === 'trainee' || u.role === 'team_lead').map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                          formData.trainee_ids.includes(user.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.trainee_ids.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, trainee_ids: [...formData.trainee_ids, user.id] });
                            } else {
                              setFormData({ ...formData, trainee_ids: formData.trainee_ids.filter(id => id !== user.id) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {formData.trainee_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{formData.trainee_ids.length} user(s) selected</p>
                )}
              </div>

              {/* Select Coach */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coach *
                </label>
                <select
                  value={formData.coach_id}
                  onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a coach...</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Activity
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress Ring Component
function ProgressRing({ percentage, size = 120, strokeWidth = 10, color = '#3B82F6' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
      </div>
    </div>
  );
}

// My Coachees Component - For coaches to see their assigned trainees
function MyCoacheesSection({ profile, showAll = false, clientId = null }) {
  const [coachingActivities, setCoachingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showTraineeModal, setShowTraineeModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [traineeCompetencies, setTraineeCompetencies] = useState([]);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingCompetencies, setLoadingCompetencies] = useState(false);
  
  // Validation form state
  const [validateForm, setValidateForm] = useState({
    achieved_level: 3,
    notes: ''
  });

  useEffect(() => {
    loadCoachingActivities();
  }, [profile, showAll, clientId]);

  const loadCoachingActivities = async () => {
    try {
      let url = `development_activities?type=eq.coaching&select=*,trainee:trainee_id(id,full_name,email),coach:coach_id(id,full_name),competencies(id,name)&order=created_at.desc`;
      
      if (showAll && clientId) {
        url += `&client_id=eq.${clientId}`;
      } else if (showAll) {
        // Super Admin - see all
      } else {
        url += `&coach_id=eq.${profile.id}`;
      }
      
      const data = await dbFetch(url);
      setCoachingActivities(data || []);
    } catch (error) {
      console.error('Error loading coaching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeedback = async (activityId) => {
    try {
      const data = await dbFetch(
        `activity_feedback?activity_id=eq.${activityId}&select=*,author:author_id(full_name,role)&order=created_at.desc`
      );
      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const loadTraineeCompetencies = async (traineeId) => {
    setLoadingCompetencies(true);
    try {
      const data = await dbFetch(
        `user_competencies?user_id=eq.${traineeId}&select=*,competencies(id,name,competency_categories(name,color))&order=created_at.desc`
      );
      setTraineeCompetencies(data || []);
    } catch (error) {
      console.error('Error loading trainee competencies:', error);
    } finally {
      setLoadingCompetencies(false);
    }
  };

  const openActivityModal = async (activity) => {
    setSelectedActivity(activity);
    await loadFeedback(activity.id);
    setShowActivityModal(true);
  };

  const openTraineeModal = async (trainee) => {
    setSelectedTrainee(trainee);
    await loadTraineeCompetencies(trainee.id);
    setShowTraineeModal(true);
  };

  const openValidateModal = (activity = null, competency = null) => {
    if (activity) {
      setSelectedActivity(activity);
      setSelectedCompetency(null);
      setValidateForm({
        achieved_level: activity.target_level || 3,
        notes: ''
      });
    } else if (competency) {
      setSelectedActivity(null);
      setSelectedCompetency(competency);
      setValidateForm({
        achieved_level: competency.target_level || competency.current_level + 1 || 3,
        notes: ''
      });
    }
    setShowValidateModal(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedActivity) return;
    
    setSubmittingComment(true);
    try {
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: showAll ? 'manager' : 'coach',
          feedback_type: 'progress',
          content: newComment
        })
      });
      
      setNewComment('');
      await loadFeedback(selectedActivity.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleValidateActivity = async () => {
    if (!selectedActivity) return;
    
    setUpdatingStatus(true);
    try {
      // Update activity status
      await dbFetch(`development_activities?id=eq.${selectedActivity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: profile.id
        })
      });
      
      // Update competency level if linked
      if (selectedActivity.competency_id && selectedActivity.trainee?.id) {
        const existingComp = await dbFetch(
          `user_competencies?user_id=eq.${selectedActivity.trainee.id}&competency_id=eq.${selectedActivity.competency_id}`
        );
        
        if (existingComp && existingComp.length > 0) {
          await dbFetch(`user_competencies?id=eq.${existingComp[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              current_level: validateForm.achieved_level,
              status: validateForm.achieved_level >= existingComp[0].target_level ? 'achieved' : 'in_progress',
              updated_at: new Date().toISOString()
            })
          });
        }
      }
      
      // Add validation feedback
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: showAll ? 'manager' : 'coach',
          feedback_type: 'validation',
          content: validateForm.notes || `Validated at Level ${validateForm.achieved_level}`
        })
      });
      
      setShowValidateModal(false);
      setShowActivityModal(false);
      await loadCoachingActivities();
    } catch (error) {
      console.error('Error validating:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleValidateCompetency = async () => {
    if (!selectedCompetency || !selectedTrainee) return;
    
    setUpdatingStatus(true);
    try {
      // Update competency level directly
      await dbFetch(`user_competencies?id=eq.${selectedCompetency.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_level: validateForm.achieved_level,
          status: validateForm.achieved_level >= selectedCompetency.target_level ? 'achieved' : 'in_progress',
          validated_at: new Date().toISOString(),
          validated_by: profile.id,
          updated_at: new Date().toISOString()
        })
      });

      // Create a validation record in development_activities for tracking
      await dbFetch('development_activities', {
        method: 'POST',
        body: JSON.stringify({
          type: 'coaching',
          title: `Direct Validation: ${selectedCompetency.competencies?.name || 'Competency'}`,
          description: validateForm.notes || `Competency validated at Level ${validateForm.achieved_level}`,
          trainee_id: selectedTrainee.id,
          assigned_by: profile.id,
          coach_id: profile.id,
          competency_id: selectedCompetency.competency_id,
          target_level: validateForm.achieved_level,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: profile.id,
          client_id: clientId || profile.client_id
        })
      });
      
      setShowValidateModal(false);
      await loadTraineeCompetencies(selectedTrainee.id);
      await loadCoachingActivities();
    } catch (error) {
      console.error('Error validating competency:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusInfo = (activity) => {
    const today = new Date();
    const dueDate = activity.due_date ? new Date(activity.due_date) : null;
    const daysLeft = dueDate ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
    
    if (activity.status === 'validated') {
      return { color: 'bg-green-100 text-green-700', label: 'Completed', icon: '✅' };
    }
    if (activity.status === 'completed') {
      return { color: 'bg-purple-100 text-purple-700', label: 'Ready to Review', icon: '🔍' };
    }
    if (dueDate && daysLeft < 0) {
      return { color: 'bg-red-100 text-red-700', label: 'Overdue', icon: '🔴' };
    }
    if (dueDate && daysLeft <= 7) {
      return { color: 'bg-amber-100 text-amber-700', label: 'Due Soon', icon: '🟡' };
    }
    if (activity.status === 'in_progress') {
      return { color: 'bg-blue-100 text-blue-700', label: 'In Progress', icon: '🔵' };
    }
    return { color: 'bg-gray-100 text-gray-600', label: 'Pending', icon: '⚪' };
  };

  const getLevelColor = (current, target) => {
    if (current >= target) return 'text-green-600';
    if (current >= target - 1) return 'text-amber-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (coachingActivities.length === 0) {
    return null;
  }

  // Group by trainee
  const traineeMap = {};
  coachingActivities.forEach(activity => {
    const traineeId = activity.trainee?.id;
    if (traineeId) {
      if (!traineeMap[traineeId]) {
        traineeMap[traineeId] = {
          trainee: activity.trainee,
          activities: []
        };
      }
      traineeMap[traineeId].activities.push(activity);
    }
  });

  const stats = {
    total: coachingActivities.length,
    pending: coachingActivities.filter(a => a.status === 'pending' || a.status === 'in_progress').length,
    readyToReview: coachingActivities.filter(a => a.status === 'completed').length,
    completed: coachingActivities.filter(a => a.status === 'validated').length,
    overdue: coachingActivities.filter(a => {
      if (!a.due_date || a.status === 'validated') return false;
      return new Date(a.due_date) < new Date();
    }).length
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            {showAll ? 'All Coaching Activities' : 'My Coachees'}
          </h2>
          <Link to="/development" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <p className="text-xl font-bold text-purple-600">{stats.readyToReview}</p>
            <p className="text-xs text-gray-500">To Review</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{stats.completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>

        {stats.overdue > 0 && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700">
              <strong>{stats.overdue}</strong> coaching {stats.overdue === 1 ? 'activity is' : 'activities are'} overdue
            </span>
          </div>
        )}

        {/* Coachee List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {Object.values(traineeMap).map(({ trainee, activities }) => {
            const pendingCount = activities.filter(a => a.status !== 'validated').length;
            const readyCount = activities.filter(a => a.status === 'completed').length;
            
            return (
              <div key={trainee.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                    onClick={() => openTraineeModal(trainee)}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{trainee.full_name}</p>
                      <p className="text-xs text-gray-500">{trainee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTraineeModal(trainee)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      View All Competencies
                    </button>
                    {readyCount > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {readyCount} to review
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{pendingCount} active</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {activities.filter(a => a.status !== 'validated').slice(0, 3).map(activity => {
                    const statusInfo = getStatusInfo(activity);
                    return (
                      <div 
                        key={activity.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                        onClick={() => openActivityModal(activity)}
                      >
                        <div className="flex items-center gap-2">
                          <span>{statusInfo.icon}</span>
                          <span className="text-sm text-gray-700">{activity.competencies?.name || activity.title}</span>
                          {activity.target_level && (
                            <span className="text-xs text-gray-400">→ L{activity.target_level}</span>
                          )}
                          {showAll && activity.coach && (
                            <span className="text-xs text-gray-400">• Coach: {activity.coach.full_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Detail Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedActivity.title}</h2>
                <p className="text-sm text-gray-500">Trainee: {selectedActivity.trainee?.full_name}</p>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status & Actions */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusInfo(selectedActivity).color}`}>
                    {getStatusInfo(selectedActivity).label}
                  </span>
                </div>
                {selectedActivity.status !== 'validated' && (
                  <button
                    onClick={() => openValidateModal(selectedActivity)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    ✓ Validate Competency
                  </button>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trainee</p>
                  <p className="font-medium">{selectedActivity.trainee?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Coach</p>
                  <p className="font-medium">{selectedActivity.coach?.full_name || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">
                    {selectedActivity.due_date 
                      ? new Date(selectedActivity.due_date).toLocaleDateString() 
                      : 'No due date'}
                  </p>
                </div>
                {selectedActivity.competencies?.name && (
                  <div>
                    <p className="text-sm text-gray-500">Competency</p>
                    <p className="font-medium">{selectedActivity.competencies.name}</p>
                  </div>
                )}
                {selectedActivity.target_level && (
                  <div>
                    <p className="text-sm text-gray-500">Target Level</p>
                    <p className="font-medium">Level {selectedActivity.target_level}</p>
                  </div>
                )}
              </div>

              {selectedActivity.objectives && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Objectives</p>
                  <p className="text-gray-700">{selectedActivity.objectives}</p>
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comments & Progress ({feedback.length})
                </h3>

                {/* Add Comment */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add feedback..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>

                {/* Comments List */}
                {feedback.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {feedback.map(fb => (
                      <div key={fb.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{fb.author?.full_name || 'Unknown'}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              fb.author_role === 'coach' ? 'bg-purple-100 text-purple-700' :
                              fb.author_role === 'coachee' ? 'bg-blue-100 text-blue-700' :
                              fb.author_role === 'manager' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {fb.author_role}
                            </span>
                            {fb.feedback_type === 'validation' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                validated
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(fb.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{fb.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trainee Competencies Modal */}
      {showTraineeModal && selectedTrainee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTrainee.full_name}</h2>
                  <p className="text-sm text-gray-500">All Competencies</p>
                </div>
              </div>
              <button
                onClick={() => setShowTraineeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCompetencies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : traineeCompetencies.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No competencies assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {traineeCompetencies.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {comp.competencies?.competency_categories?.color && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: comp.competencies.competency_categories.color }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{comp.competencies?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            {comp.competencies?.competency_categories?.name || 'Uncategorized'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${getLevelColor(comp.current_level, comp.target_level)}`}>
                            L{comp.current_level || 0} → L{comp.target_level}
                          </p>
                          <p className="text-xs text-gray-500">
                            {comp.status === 'achieved' ? '✅ Achieved' : 'In progress'}
                          </p>
                        </div>
                        {comp.current_level < comp.target_level && (
                          <button
                            onClick={() => openValidateModal(null, comp)}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Validate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidateModal && (selectedActivity || selectedCompetency) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Validate Competency</h2>
                  <p className="text-sm text-gray-500">
                    {selectedActivity?.competencies?.name || selectedCompetency?.competencies?.name || 'Competency'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowValidateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Trainee Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Trainee</p>
                <p className="font-medium">
                  {selectedActivity?.trainee?.full_name || selectedTrainee?.full_name}
                </p>
              </div>

              {/* Achieved Level Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Achieved Level
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setValidateForm({ ...validateForm, achieved_level: level })}
                      className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${
                        validateForm.achieved_level === level
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      L{level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Target: Level {selectedActivity?.target_level || selectedCompetency?.target_level || '?'}
                </p>
              </div>

              {/* Validation Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validation Notes (Optional)
                </label>
                <textarea
                  value={validateForm.notes}
                  onChange={(e) => setValidateForm({ ...validateForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Add notes about this validation..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowValidateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={selectedActivity ? handleValidateActivity : handleValidateCompetency}
                disabled={updatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Validation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Team Lead Dashboard - sees all team coaching and training
function TeamLeadDashboard() {
  const { profile, clientId: authClientId } = useAuth();
  const navigate = useNavigate();
  const clientId = authClientId || profile?.client_id;
  
  // Layout preferences
  const { currentLayout, activeWidgets, handleLayoutChange, handleWidgetsChange } = useLayoutPreferences(profile?.id);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  
  const [stats, setStats] = useState({
    teamMembers: 0,
    competenciesAssigned: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    coachingActive: 0,
    coachingOverdue: 0
  });
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile, clientId]);

  async function loadData() {
    try {
      console.log('TeamLeadDashboard: Loading data for profile:', profile.id);
      
      // Get team members who report to this user
      const teamMembers = await dbFetch(
        `profiles?select=id,full_name,email,role&reports_to_id=eq.${profile.id}&is_active=eq.true`
      );
      console.log('TeamLeadDashboard: Team members found:', teamMembers);
      setTeamMembersList(teamMembers || []);
      
      // Include the team lead themselves + all team members for stats
      const allUserIds = [profile.id, ...(teamMembers?.map(m => m.id) || [])];
      const teamIds = teamMembers?.map(m => m.id) || [];
      console.log('TeamLeadDashboard: All user IDs (including self):', allUserIds);

      if (allUserIds.length > 0) {
        const allIdList = allUserIds.join(',');
        const teamIdList = teamIds.join(',');

        // Competencies for ALL users including team lead
        const competencies = await dbFetch(
          `user_competencies?select=id,status&user_id=in.(${allIdList})`
        );
        console.log('TeamLeadDashboard: Competencies (all):', competencies);
        const compAssigned = competencies?.length || 0;
        const compAchieved = competencies?.filter(c => c.status === 'achieved').length || 0;

        // Training for ALL users including team lead
        const training = await dbFetch(
          `user_training?select=id,status&user_id=in.(${allIdList})`
        );
        console.log('TeamLeadDashboard: Training (all):', training);
        const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
        const trainingCompleted = training?.filter(t => t.status === 'passed').length || 0;

        // Coaching - where team lead is coach OR coachee
        let coachingQuery = `development_activities?select=id,status,due_date&type=eq.coaching`;
        if (teamIds.length > 0) {
          coachingQuery += `&or=(trainee_id.in.(${teamIdList}),coach_id.eq.${profile.id},trainee_id.eq.${profile.id})`;
        } else {
          coachingQuery += `&or=(coach_id.eq.${profile.id},trainee_id.eq.${profile.id})`;
        }
        const coaching = await dbFetch(coachingQuery);
        const coachingActive = coaching?.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length || 0;
        const coachingOverdue = coaching?.filter(c => {
          if (!c.due_date || c.status === 'validated') return false;
          return new Date(c.due_date) < new Date();
        }).length || 0;

        setStats({
          teamMembers: allUserIds.length, // Total including self
          competenciesAssigned: compAssigned,
          competenciesAchieved: compAchieved,
          trainingPending,
          trainingCompleted,
          coachingActive,
          coachingOverdue
        });

        // Recent training completions (team members only for this view)
        if (teamIds.length > 0) {
          const recentTraining = await dbFetch(
            `user_training?select=id,status,completed_at,user_id,module_id&user_id=in.(${teamIdList})&status=eq.passed&order=completed_at.desc&limit=5`
          );
          console.log('TeamLeadDashboard: Recent training:', recentTraining);
        
          if (recentTraining && recentTraining.length > 0) {
            const enrichedTraining = await Promise.all(recentTraining.map(async (t) => {
              const [userInfo, moduleInfo] = await Promise.all([
                dbFetch(`profiles?select=full_name&id=eq.${t.user_id}`),
                dbFetch(`training_modules?select=title&id=eq.${t.module_id}`)
              ]);
              return {
                ...t,
                trainee_name: userInfo?.[0]?.full_name || 'Unknown',
                module_title: moduleInfo?.[0]?.title || 'Unknown'
              };
            }));
            setRecentActivity(enrichedTraining);
          } else {
            setRecentActivity([]);
          }
        } else {
          // No team members, but still set empty recent activity
          setRecentActivity([]);
        }
      }
    } catch (error) {
      console.error('Error loading team lead data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const competencyProgress = stats.competenciesAssigned > 0 
    ? Math.round((stats.competenciesAchieved / stats.competenciesAssigned) * 100) 
    : 0;

  // ============================================================================
  // LAYOUT RENDERERS
  // ============================================================================

  // CLASSIC LAYOUT
  const ClassicLayout = () => (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Lead Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Size" 
          value={stats.teamMembers}
          subtitle="Including you"
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="Competencies" 
          value={`${stats.competenciesAchieved}/${stats.competenciesAssigned}`}
          subtitle={`${competencyProgress}% achieved`}
          icon={Target}
          color="green"
        />
        <StatCard 
          title="Training" 
          value={stats.trainingPending}
          subtitle={`Pending (${stats.trainingCompleted} completed)`}
          icon={GraduationCap}
          color="amber"
        />
        <StatCard 
          title="Coaching" 
          value={stats.coachingActive}
          subtitle={stats.coachingOverdue > 0 ? `${stats.coachingOverdue} overdue` : 'Active sessions'}
          icon={Users}
          color={stats.coachingOverdue > 0 ? 'red' : 'purple'}
        />
      </div>

      {/* Team Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Team Competency Progress</h3>
          <ProgressRing percentage={competencyProgress} color="#10B981" />
          <p className="text-sm text-gray-600 mt-4">
            {stats.competenciesAchieved} of {stats.competenciesAssigned} competencies achieved
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Training Completions</h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent completions</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">{item.trainee_name}</p>
                      <p className="text-sm text-gray-500">{item.module_title}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Competency Maturity Dashboard */}
      <CompetencyMaturityDashboard 
        profile={profile}
        clientId={clientId}
        users={teamMembersList}
        initialScope="team"
      />

      {/* All Team Coaching Activities */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection clientId={clientId} />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="View My Team"
            description="See team members and progress"
            href="/users"
            icon={Users}
          />
          <QuickActionButton
            title="Development Activities"
            description="Assign coaching & development"
            onClick={() => setShowDevModal(true)}
            icon={ClipboardList}
          />
          <QuickAction
            title="Assign Training"
            description="Schedule training for team"
            href="/training"
            icon={GraduationCap}
          />
          <QuickAction
            title="View Reports"
            description="Team analytics"
            href="/reports"
            icon={BarChart3}
          />
        </div>
      </div>
    </div>
  );

  // MAGAZINE LAYOUT - Visual, card-based
  const MagazineLayout = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-white/70 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="text-3xl font-bold mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h2>
          <p className="text-white/80 mt-2">
            {stats.coachingOverdue > 0 
              ? `${stats.coachingOverdue} coaching session${stats.coachingOverdue > 1 ? 's' : ''} need attention.`
              : 'Your team is doing great!'}
          </p>
        </div>
      </div>

      {/* Big Visual KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, value: stats.teamMembers, label: 'Team Members', color: 'blue' },
          { icon: Target, value: `${competencyProgress}%`, label: 'Competency Progress', color: 'emerald' },
          { icon: GraduationCap, value: stats.trainingCompleted, label: 'Training Done', color: 'amber' },
          { icon: MessageSquare, value: stats.coachingActive, label: 'Active Coaching', color: stats.coachingOverdue > 0 ? 'red' : 'purple' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-all cursor-pointer">
            <div className={`w-16 h-16 mx-auto bg-gradient-to-br from-${card.color}-400 to-${card.color}-600 rounded-2xl flex items-center justify-center mb-3`}>
              <card.icon className="w-8 h-8 text-white" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" /> Recent Activity
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm"><span className="font-medium">{item.trainee_name}</span> completed <span className="font-medium">{item.module_title}</span></p>
                  </div>
                  <span className="text-xs text-gray-400">{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Team Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Team Members
          </h3>
          <div className="space-y-2">
            {teamMembersList.slice(0, 5).map(member => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {member.full_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm text-gray-700 truncate">{member.full_name}</span>
              </div>
            ))}
            {teamMembersList.length > 5 && (
              <button onClick={() => navigate('/users')} className="w-full text-sm text-purple-600 hover:underline py-2">
                View all {teamMembersList.length} members →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions as Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: UserPlus, label: 'Add Member', path: '/users?action=add' },
          { icon: GraduationCap, label: 'Assign Training', path: '/training' },
          { icon: ClipboardList, label: 'Development', onClick: () => setShowDevModal(true) },
          { icon: BarChart3, label: 'Reports', path: '/reports' },
        ].map((action, i) => (
          <button 
            key={i}
            onClick={action.onClick || (() => navigate(action.path))}
            className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all text-center"
          >
            <action.icon className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium text-gray-700">{action.label}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // COMMAND CENTER LAYOUT - Dense, monitoring style
  const CommandLayout = () => (
    <div className="space-y-4 bg-slate-900 -m-6 p-6 min-h-screen">
      {/* Status Bar */}
      <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${stats.coachingOverdue === 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm">System Status: {stats.coachingOverdue === 0 ? 'All Clear' : 'Attention Needed'}</span>
          </div>
          <div className="text-sm text-slate-400">Team Lead: {profile?.full_name}</div>
        </div>
        <div className="text-sm text-slate-400">{new Date().toLocaleTimeString()}</div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'TEAM', value: stats.teamMembers, color: 'blue' },
          { label: 'COMP DONE', value: stats.competenciesAchieved, color: 'emerald' },
          { label: 'COMP TOTAL', value: stats.competenciesAssigned, color: 'slate' },
          { label: 'TRAINING', value: stats.trainingCompleted, color: 'amber' },
          { label: 'PENDING', value: stats.trainingPending, color: 'orange' },
          { label: 'OVERDUE', value: stats.coachingOverdue, color: stats.coachingOverdue > 0 ? 'red' : 'emerald' },
        ].map((m, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">{m.label}</p>
            <p className={`text-2xl font-bold text-${m.color}-400 font-mono mt-1`}>{m.value}</p>
          </div>
        ))}
      </div>
      
      {/* Three Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">TEAM ROSTER</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {teamMembersList.map(m => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <span className="text-sm text-slate-300">{m.full_name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">RECENT COMPLETIONS</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {recentActivity.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-slate-700 last:border-0">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300 truncate flex-1">{item.trainee_name}</span>
                <span className="text-xs text-slate-500">{item.completed_at ? new Date(item.completed_at).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">ACTIONS</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Add Team Member', path: '/users?action=add' },
              { label: 'Assign Training', path: '/training' },
              { label: 'View Reports', path: '/reports' },
              { label: 'Development', onClick: () => setShowDevModal(true) },
            ].map((a, i) => (
              <button key={i} onClick={a.onClick || (() => navigate(a.path))} className="w-full p-2 rounded bg-slate-700 hover:bg-slate-600 text-left text-sm text-slate-300">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // FOCUS LAYOUT - Minimal, priority-first
  const FocusLayout = () => {
    const priority = stats.coachingOverdue > 0 ? 'overdue' : stats.trainingPending > 0 ? 'pending' : 'complete';
    
    return (
      <div className="max-w-2xl mx-auto space-y-8 py-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Welcome back</p>
          <h1 className="text-4xl font-bold text-gray-900">{profile?.full_name?.split(' ')[0]}</h1>
        </div>
        
        {/* Main Focus Card */}
        <div className={`rounded-3xl p-8 text-center text-white ${
          priority === 'overdue' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
          priority === 'pending' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
          'bg-gradient-to-br from-emerald-500 to-green-600'
        }`}>
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            {priority === 'overdue' ? <AlertTriangle className="w-10 h-10" /> :
             priority === 'pending' ? <Clock className="w-10 h-10" /> :
             <CheckCircle className="w-10 h-10" />}
          </div>
          <p className="text-6xl font-bold mb-2">
            {priority === 'overdue' ? stats.coachingOverdue :
             priority === 'pending' ? stats.trainingPending :
             stats.trainingCompleted}
          </p>
          <p className="text-xl text-white/90">
            {priority === 'overdue' ? 'Coaching Overdue' :
             priority === 'pending' ? 'Training Pending' :
             'Training Completed'}
          </p>
          <p className="text-white/70 mt-4 max-w-sm mx-auto">
            {priority === 'overdue' ? 'Address these coaching sessions first.' :
             priority === 'pending' ? 'Your team has training in progress.' :
             'Excellent! Your team is making great progress.'}
          </p>
        </div>
        
        {/* Simple Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.teamMembers}</p>
            <p className="text-sm text-gray-500">Team Size</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{competencyProgress}%</p>
            <p className="text-sm text-gray-500">Competency</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.coachingActive}</p>
            <p className="text-sm text-gray-500">Coaching</p>
          </div>
        </div>
        
        {/* Simple Actions */}
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/users')} className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800">
            View Team
          </button>
          <button onClick={() => navigate('/training')} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">
            Training
          </button>
        </div>
      </div>
    );
  };

  // CUSTOM LAYOUT - User configurable widgets
  const CustomLayout = () => {
    const widgetComponents = {
      welcome: (
        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white col-span-2">
          <p className="text-white/70 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="text-2xl font-bold mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h2>
        </div>
      ),
      kpiStrip: (
        <div className="grid grid-cols-4 gap-3 col-span-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div><p className="text-xl font-bold text-blue-700">{stats.teamMembers}</p><p className="text-xs text-gray-500">Team</p></div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <div><p className="text-xl font-bold text-emerald-700">{competencyProgress}%</p><p className="text-xs text-gray-500">Progress</p></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            <div><p className="text-xl font-bold text-amber-700">{stats.trainingCompleted}</p><p className="text-xs text-gray-500">Done</p></div>
          </div>
          <div className={`${stats.coachingOverdue > 0 ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'} border rounded-xl p-3 flex items-center gap-2`}>
            <MessageSquare className={`w-5 h-5 ${stats.coachingOverdue > 0 ? 'text-red-600' : 'text-purple-600'}`} />
            <div><p className={`text-xl font-bold ${stats.coachingOverdue > 0 ? 'text-red-700' : 'text-purple-700'}`}>{stats.coachingActive}</p><p className="text-xs text-gray-500">Coaching</p></div>
          </div>
        </div>
      ),
      teamStatus: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Team</h3>
          <div className="space-y-2">
            {teamMembersList.slice(0, 4).map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-500" />{m.full_name}</div>
            ))}
          </div>
        </div>
      ),
      quickActions: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Actions</h3>
          <div className="space-y-2">
            <button onClick={() => navigate('/users?action=add')} className="w-full p-2 bg-gray-50 rounded-lg text-sm text-left hover:bg-gray-100">Add Member</button>
            <button onClick={() => navigate('/training')} className="w-full p-2 bg-gray-50 rounded-lg text-sm text-left hover:bg-gray-100">Training</button>
          </div>
        </div>
      ),
      trainingProgress: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Progress</h3>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{ width: `${competencyProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{competencyProgress}% competency achieved</p>
        </div>
      ),
      recentActivity: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-green-600" /> Recent</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="truncate">{item.trainee_name}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      competencyRing: (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
          <ProgressRing percentage={competencyProgress} color="#10B981" size={80} />
          <p className="text-sm text-gray-600 mt-2">{stats.competenciesAchieved}/{stats.competenciesAssigned}</p>
        </div>
      ),
      coachingOverview: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-purple-600" /> Coaching</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-purple-50 rounded-lg p-2"><p className="text-xl font-bold text-purple-700">{stats.coachingActive}</p><p className="text-xs text-gray-500">Active</p></div>
            <div className={`${stats.coachingOverdue > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-lg p-2`}><p className={`text-xl font-bold ${stats.coachingOverdue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{stats.coachingOverdue}</p><p className="text-xs text-gray-500">Overdue</p></div>
          </div>
        </div>
      ),
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Dashboard</h2>
          <button onClick={() => setShowWidgetPicker(!showWidgetPicker)} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
            <Plus className="w-4 h-4" /> Add Widget
          </button>
        </div>
        
        {showWidgetPicker && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Available Widgets</h3>
              <button onClick={() => setShowWidgetPicker(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(availableWidgets).map(([id, widget]) => {
                const isActive = activeWidgets.includes(id);
                return (
                  <button key={id} onClick={() => {
                    if (isActive) handleWidgetsChange(activeWidgets.filter(w => w !== id));
                    else handleWidgetsChange([...activeWidgets, id]);
                  }} className={`p-3 rounded-xl border-2 text-left ${isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <widget.icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                      {isActive && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
                    </div>
                    <p className={`text-sm font-medium mt-1 ${isActive ? 'text-purple-700' : 'text-gray-700'}`}>{widget.name}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeWidgets.map(widgetId => {
            const widget = widgetComponents[widgetId];
            if (!widget) return null;
            const size = availableWidgets[widgetId]?.size;
            return (
              <div key={widgetId} className={`relative group ${size === 'large' || size === 'full' ? 'md:col-span-2' : ''}`}>
                {widget}
                <button onClick={() => handleWidgetsChange(activeWidgets.filter(w => w !== widgetId))} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="relative">
      {/* Layout Selector - Top Right */}
      <div className="absolute top-0 right-0 z-10">
        <LayoutSelector 
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
          showSelector={showLayoutSelector}
          setShowSelector={setShowLayoutSelector}
        />
      </div>

      {/* Render selected layout */}
      <div className={currentLayout === 'command' ? '' : 'pt-2'}>
        {currentLayout === 'classic' && <ClassicLayout />}
        {currentLayout === 'magazine' && <MagazineLayout />}
        {currentLayout === 'command' && <CommandLayout />}
        {currentLayout === 'focus' && <FocusLayout />}
        {currentLayout === 'custom' && <CustomLayout />}
      </div>

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => {}}
      />
    </div>
  );
}

// Super Admin Dashboard
function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({
    userCount: 0,
    networkCount: 0,
    coachingActive: 0,
    trainingPending: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Load clients
      const clientsData = await dbFetch('clients?select=*&order=name.asc');
      setClients(clientsData || []);

      // Count users (trainees)
      const users = await dbFetch('profiles?select=id&role=eq.trainee');
      
      // Count networks
      const networks = await dbFetch('expert_networks?select=id&is_active=eq.true');

      // Count active coaching
      const coaching = await dbFetch('development_activities?select=id&type=eq.coaching&status=neq.validated&status=neq.cancelled');

      // Count pending training
      const training = await dbFetch('user_training?select=id&status=in.(pending,in_progress)');

      setStats({
        userCount: users?.length || 0,
        networkCount: networks?.length || 0,
        coachingActive: coaching?.length || 0,
        trainingPending: training?.length || 0
      });

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const activeClients = clients.filter(c => c.is_active).length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage all clients and system settings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Clients" 
          value={activeClients}
          subtitle="Organizations"
          icon={Building2}
          color="blue"
        />
        <StatCard 
          title="Total Trainees" 
          value={stats.userCount}
          subtitle="Across all clients"
          icon={Users}
          color="green"
        />
        <StatCard 
          title="Active Coaching" 
          value={stats.coachingActive}
          subtitle="Sessions in progress"
          icon={Target}
          color="purple"
        />
        <StatCard 
          title="Training Pending" 
          value={stats.trainingPending}
          subtitle="Awaiting completion"
          icon={GraduationCap}
          color="amber"
        />
      </div>

      {/* My Coachees Section - Show if user is a coach */}
      <MyCoacheesSection profile={profile} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="Add New Client"
            description="Create a new organization"
            href="/clients"
            icon={Plus}
          />
          <QuickAction
            title="Manage Users"
            description="Add admins and trainees"
            href="/users"
            icon={Users}
          />
          <QuickActionButton
            title="Development Activities"
            description="Assign coaching & development"
            onClick={() => setShowDevModal(true)}
            icon={ClipboardList}
          />
          <QuickAction
            title="View Reports"
            description="Cross-client analytics"
            href="/reports"
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => {}}
      />

      {/* Client List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <Link to="/clients" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No clients yet. <Link to="/clients" className="text-blue-600">Add your first client</Link>
                  </td>
                </tr>
              ) : (
                clients.slice(0, 5).map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{client.name}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{client.code}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(client.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ORGANIZATION HIERARCHY COMPONENT
// Shows pyramid structure: Client Admin → Team Leads → Trainees
// Collapsible - click to expand
// ============================================================================

function OrganizationHierarchy({ users, profile, clientName, hierarchySettings }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Separate users by role
  const clientAdmins = users.filter(u => u.role === 'client_admin');
  const categoryAdmins = users.filter(u => u.role === 'category_admin');
  const siteAdmins = users.filter(u => u.role === 'site_admin');
  const teamLeads = users.filter(u => u.role === 'team_lead');
  const trainees = users.filter(u => u.role === 'trainee');

  // Build hierarchy: for each team lead, count their trainees
  const teamLeadHierarchy = teamLeads.map(lead => {
    const teamTrainees = trainees.filter(t => t.reports_to_id === lead.id);
    return {
      ...lead,
      traineeCount: teamTrainees.length,
      trainees: teamTrainees
    };
  });

  // Trainees without a team lead
  const unassignedTrainees = trainees.filter(t => !t.reports_to_id || !teamLeads.find(tl => tl.id === t.reports_to_id));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <GitBranch className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900">My Organization</h2>
            <p className="text-sm text-gray-500">{clientName || 'Organization Structure'} • {users.length} members</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick Summary when collapsed */}
          {!isExpanded && (
            <div className="hidden sm:flex items-center gap-3 text-sm text-gray-500">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {clientAdmins.length} Admin{clientAdmins.length !== 1 ? 's' : ''}
              </span>
              {categoryAdmins.length > 0 && (
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  {categoryAdmins.length} Category
                </span>
              )}
              {siteAdmins.length > 0 && (
                <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">
                  {siteAdmins.length} Site
                </span>
              )}
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {teamLeads.length} Lead{teamLeads.length !== 1 ? 's' : ''}
              </span>
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                {trainees.length} Trainee{trainees.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          {/* Pyramid Structure */}
          <div className="flex flex-col items-center space-y-4">
            
            {/* Level 1: Client Admin(s) */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Administration</div>
              <div className="flex flex-wrap justify-center gap-3">
                {clientAdmins.map(admin => (
                  <div 
                    key={admin.id}
                    className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-lg"
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{admin.full_name}</p>
                      <p className="text-xs text-purple-200">Client Admin</p>
                    </div>
                  </div>
                ))}
                {clientAdmins.length === 0 && (
                  <div className="px-4 py-3 bg-gray-100 text-gray-500 rounded-xl text-sm">
                    No client admin assigned
                  </div>
                )}
              </div>
            </div>

            {/* Connector Line to Category Admins */}
            {categoryAdmins.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <ChevronDown className="w-4 h-4 text-gray-400 -mt-1" />
              </div>
            )}

            {/* Level 2: Category Admin(s) */}
            {categoryAdmins.length > 0 && (
              <div className="flex flex-col items-center">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {hierarchySettings?.category_admin_label || 'Category Management'}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {categoryAdmins.map(catAdmin => (
                    <div 
                      key={catAdmin.id}
                      className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-md"
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{catAdmin.full_name}</p>
                        <p className="text-xs text-indigo-200">
                          {hierarchySettings?.category_admin_label || 'Category Admin'}
                          {catAdmin.category ? ` • ${catAdmin.category}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connector Line to Site Admins */}
        {siteAdmins.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
            <ChevronDown className="w-4 h-4 text-gray-400 -mt-1" />
          </div>
        )}

        {/* Level 2: Site Admin(s) */}
        {siteAdmins.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Site Management</div>
            <div className="flex flex-wrap justify-center gap-3">
              {siteAdmins.map(siteAdmin => (
                <div 
                  key={siteAdmin.id}
                  className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl shadow-md"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{siteAdmin.full_name}</p>
                    <p className="text-xs text-cyan-200">
                      Site Admin{siteAdmin.site ? ` • ${siteAdmin.site}` : ''}
                      {siteAdmin.has_global_access && ' 🌐'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connector Line to Team Leads */}
        {teamLeads.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
            <ChevronDown className="w-4 h-4 text-gray-400 -mt-1" />
          </div>
        )}

        {/* Level 2: Team Leads with Trainee Counts */}
        {teamLeads.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Team Leads</div>
            <div className="flex flex-wrap justify-center gap-4">
              {teamLeadHierarchy.map(lead => (
                <div 
                  key={lead.id}
                  className="flex flex-col items-center"
                >
                  {/* Team Lead Card */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-md">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{lead.full_name}</p>
                      <p className="text-xs text-blue-200">Team Lead</p>
                    </div>
                  </div>
                  
                  {/* Connector to Trainees */}
                  {lead.traineeCount > 0 && (
                    <>
                      <div className="w-0.5 h-4 bg-gray-300 mt-2"></div>
                      <ChevronDown className="w-3 h-3 text-gray-400 -mt-0.5" />
                      
                      {/* Trainee Count Badge */}
                      <div className="mt-1 px-4 py-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-bold text-emerald-700">{lead.traineeCount}</span>
                          <span className="text-sm text-emerald-600">Trainee{lead.traineeCount !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Trainee names preview */}
                        {lead.trainees.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-emerald-200">
                            <div className="text-xs text-emerald-600 space-y-0.5">
                              {lead.trainees.slice(0, 3).map(t => (
                                <div key={t.id} className="truncate">{t.full_name}</div>
                              ))}
                              {lead.trainees.length > 3 && (
                                <div className="text-emerald-500">+{lead.trainees.length - 3} more</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {lead.traineeCount === 0 && (
                    <div className="mt-2 text-xs text-gray-400">No trainees</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Trainees */}
        {unassignedTrainees.length > 0 && (
          <div className="flex flex-col items-center w-full mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-2">
              Unassigned Trainees
            </div>
            <div className="px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-lg font-bold text-amber-700">{unassignedTrainees.length}</span>
                <span className="text-sm text-amber-600">trainee{unassignedTrainees.length !== 1 ? 's' : ''} without team lead</span>
              </div>
              <div className="mt-2 text-xs text-amber-600">
                {unassignedTrainees.slice(0, 3).map(t => t.full_name).join(', ')}
                {unassignedTrainees.length > 3 && ` +${unassignedTrainees.length - 3} more`}
              </div>
            </div>
          </div>
        )}

        {/* No Team Leads - Show trainees directly under admin */}
        {teamLeads.length === 0 && trainees.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="w-0.5 h-6 bg-gray-300"></div>
            <ChevronDown className="w-4 h-4 text-gray-400 -mt-1" />
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-2">Trainees</div>
            <div className="px-4 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-lg font-bold text-emerald-700">{trainees.length}</span>
                <span className="text-sm text-emerald-600">Trainee{trainees.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {users.length <= 1 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No team structure yet</p>
            <p className="text-sm mt-1">Add team leads and trainees to see your organization</p>
          </div>
        )}
      </div>

          {/* Summary Footer */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center gap-6 text-sm flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{clientAdmins.length}</div>
              <div className="text-gray-500">Client Admin{clientAdmins.length !== 1 ? 's' : ''}</div>
            </div>
            {categoryAdmins.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{categoryAdmins.length}</div>
                <div className="text-gray-500">{hierarchySettings?.category_admin_label || 'Category Admin'}{categoryAdmins.length !== 1 ? 's' : ''}</div>
              </div>
            )}
            {siteAdmins.length > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">{siteAdmins.length}</div>
                <div className="text-gray-500">{hierarchySettings?.site_admin_label || 'Site Admin'}{siteAdmins.length !== 1 ? 's' : ''}</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{teamLeads.length}</div>
              <div className="text-gray-500">{hierarchySettings?.team_lead_label || 'Team Lead'}{teamLeads.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{trainees.length}</div>
              <div className="text-gray-500">{hierarchySettings?.trainee_label || 'Trainee'}{trainees.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Client Admin Dashboard
function ClientAdminDashboard() {
  const { profile, clientId: authClientId } = useAuth();
  const navigate = useNavigate();
  // Use clientId from auth context, fallback to profile.client_id
  const clientId = authClientId || profile?.client_id;
  
  // Layout preferences
  const { currentLayout, activeWidgets, handleLayoutChange, handleWidgetsChange } = useLayoutPreferences(profile?.id);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [clientName, setClientName] = useState('');
  const [hierarchySettings, setHierarchySettings] = useState(null);
  const [stats, setStats] = useState({
    networkCount: 0,
    competenciesAssigned: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    coachingActive: 0,
    modulesCount: 0,
    overdueCount: 0,
    traineeCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [clientId]);

  async function loadData() {
    try {
      // Load client name and hierarchy settings
      const clientData = await dbFetch(`clients?select=name,hierarchy_settings&id=eq.${clientId}`);
      if (clientData && clientData[0]) {
        setClientName(clientData[0].name);
        setHierarchySettings(clientData[0].hierarchy_settings || {});
      }

      // Load team members
      const usersData = await dbFetch(`profiles?select=*&client_id=eq.${clientId}&is_active=eq.true&order=full_name.asc`);
      setUsers(usersData || []);

      // Get ALL user IDs for stats (not just trainees - everyone can have competencies)
      const allUserIds = usersData?.map(u => u.id) || [];
      const traineeCount = usersData?.filter(u => u.role === 'trainee').length || 0;

      // Count networks
      const networks = await dbFetch(`expert_networks?select=id&client_id=eq.${clientId}&is_active=eq.true`);
      
      // Count modules
      const modules = await dbFetch(`training_modules?select=id&client_id=eq.${clientId}&status=eq.published`);

      if (allUserIds.length > 0) {
        const idList = allUserIds.join(',');

        // Competencies - for ALL users
        const competencies = await dbFetch(`user_competencies?select=id,status&user_id=in.(${idList})`);
        const compAssigned = competencies?.length || 0;
        const compAchieved = competencies?.filter(c => c.status === 'achieved').length || 0;

        // Training - for ALL users
        const training = await dbFetch(`user_training?select=id,status,due_date&user_id=in.(${idList})`);
        const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
        const trainingCompleted = training?.filter(t => t.status === 'passed').length || 0;
        const overdueCount = training?.filter(t => {
          if (!t.due_date || t.status === 'passed') return false;
          return new Date(t.due_date) < new Date();
        }).length || 0;

        // Coaching
        const coaching = await dbFetch(`development_activities?select=id&client_id=eq.${clientId}&type=eq.coaching&status=neq.validated&status=neq.cancelled`);

        setStats({
          networkCount: networks?.length || 0,
          competenciesAssigned: compAssigned,
          competenciesAchieved: compAchieved,
          trainingPending,
          trainingCompleted,
          coachingActive: coaching?.length || 0,
          modulesCount: modules?.length || 0,
          overdueCount,
          traineeCount // Keep track of trainee count separately
        });
      } else {
        setStats({
          networkCount: networks?.length || 0,
          competenciesAssigned: 0,
          competenciesAchieved: 0,
          trainingPending: 0,
          trainingCompleted: 0,
          coachingActive: 0,
          modulesCount: modules?.length || 0,
          overdueCount: 0,
          traineeCount: 0
        });
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Team counts - show everyone, not just trainees
  const teamCount = users.length;
  const traineeCount = users.filter(u => u.role === 'trainee').length;
  const avgScore = stats.competenciesAssigned > 0 
    ? Math.round((stats.competenciesAchieved / stats.competenciesAssigned) * 100) 
    : 0;

  // Quick action handlers
  const handleAddUser = () => navigate('/users?action=add');
  const handleAssignTraining = () => navigate('/training');
  const handleCoaching = () => setShowDevModal(true);
  const handleCreateModule = () => navigate('/training?action=create');

  // ============================================================================
  // LAYOUT COMPONENTS
  // ============================================================================

  // CLASSIC LAYOUT - Traditional with cards
  const ClassicLayout = () => (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Client Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Team Size" value={teamCount} subtitle={`${traineeCount} trainees`} icon={Users} color="blue" />
        <StatCard title="Competencies" value={`${stats.competenciesAchieved}/${stats.competenciesAssigned}`} subtitle={`${avgScore}% achieved`} icon={Target} color="green" />
        <StatCard title="Training Pending" value={stats.trainingPending} subtitle={`${stats.trainingCompleted} completed`} icon={GraduationCap} color="amber" />
        <StatCard title="Active Coaching" value={stats.coachingActive} subtitle="Sessions in progress" icon={MessageSquare} color="purple" />
      </div>

      {/* Competency Maturity Dashboard */}
      <CompetencyMaturityDashboard 
        profile={profile}
        clientId={clientId}
        users={users}
        initialScope="organization"
      />

      {/* Organization Hierarchy */}
      <OrganizationHierarchy users={users} profile={profile} clientName={clientName} hierarchySettings={hierarchySettings} />

      {/* My Coachees Section */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection clientId={clientId} />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction title="Add Team Member" description="Register a new trainee" href="/users" icon={Plus} />
          <QuickActionButton title="Development Activities" description="Assign coaching & development" onClick={handleCoaching} icon={ClipboardList} />
          <QuickAction title="View Competencies" description="See competency overview" href="/competencies" icon={Target} />
          <QuickAction title="Assign Training" description="Schedule training activities" href="/training" icon={GraduationCap} />
        </div>
      </div>
    </div>
  );

  // MAGAZINE LAYOUT - Visual card-based
  const MagazineLayout = () => (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-purple-200 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="text-3xl font-bold mt-1">Welcome back, {profile?.full_name}! 👋</h1>
            <p className="text-purple-200 mt-2">{stats.overdueCount === 0 ? 'All training is on track!' : `${stats.overdueCount} items need attention`}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center"><div className="flex items-center gap-2"><Users className="w-5 h-5" /><span className="text-2xl font-bold">{teamCount}</span></div><p className="text-xs text-purple-200">Team Size</p></div>
            <div className="text-center"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /><span className="text-2xl font-bold">{stats.trainingCompleted}</span></div><p className="text-xs text-purple-200">Completed</p></div>
            <div className="text-center"><div className="flex items-center gap-2"><Target className="w-5 h-5" /><span className="text-2xl font-bold">{avgScore}%</span></div><p className="text-xs text-purple-200">Avg Score</p></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button onClick={handleAddUser} className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm">
          <UserPlus className="w-5 h-5" /><div className="text-left"><div className="font-medium text-sm">Add User</div><div className="text-xs text-blue-200">New trainee</div></div>
        </button>
        <button onClick={handleAssignTraining} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <GraduationCap className="w-5 h-5 text-emerald-600" /><div className="text-left"><div className="font-medium text-sm text-gray-900">Assign Training</div><div className="text-xs text-gray-500">Create assignment</div></div>
        </button>
        <button onClick={handleCoaching} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <MessageSquare className="w-5 h-5 text-purple-600" /><div className="text-left"><div className="font-medium text-sm text-gray-900">Coaching</div><div className="text-xs text-gray-500">Development activity</div></div>
        </button>
        <button onClick={handleCreateModule} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <BookOpen className="w-5 h-5 text-amber-600" /><div className="text-left"><div className="font-medium text-sm text-gray-900">Create Module</div><div className="text-xs text-gray-500">New training</div></div>
        </button>
        <button onClick={() => navigate('/reports')} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
          <BarChart3 className="w-5 h-5 text-cyan-600" /><div className="text-left"><div className="font-medium text-sm text-gray-900">Export Report</div><div className="text-xs text-gray-500">Download data</div></div>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Users className="w-4 h-4" />Team Size</div><div className="text-2xl font-bold text-gray-900">{teamCount}</div><div className="text-xs text-gray-500">{traineeCount} trainees</div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><BookOpen className="w-4 h-4" />Modules</div><div className="text-2xl font-bold text-gray-900">{stats.modulesCount}</div><div className="text-xs text-gray-500">{stats.modulesCount} published</div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Target className="w-4 h-4" />Competencies</div><div className="text-2xl font-bold text-gray-900">{stats.competenciesAchieved}/{stats.competenciesAssigned}</div><div className="text-xs text-gray-500">{avgScore}% achieved</div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><ClipboardList className="w-4 h-4" />Coaching</div><div className="text-2xl font-bold text-gray-900">{stats.coachingActive}</div><div className="text-xs text-gray-500">{stats.coachingActive === 0 ? 'none active' : 'active'}</div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><Clock className="w-4 h-4" />Training</div><div className="text-2xl font-bold text-gray-900">{stats.trainingCompleted}</div><div className="text-xs text-gray-500">{stats.trainingPending} pending</div></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="flex items-center gap-2 text-gray-500 text-sm mb-1"><AlertTriangle className="w-4 h-4" />Overdue</div><div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.overdueCount}</div><div className="text-xs text-gray-500">{stats.overdueCount === 0 ? 'all on track' : 'items'}</div></div>
      </div>

      {/* Competency Maturity Dashboard */}
      <CompetencyMaturityDashboard 
        profile={profile}
        clientId={clientId}
        users={users}
        initialScope="organization"
      />

      {/* Organization Hierarchy */}
      <OrganizationHierarchy users={users} profile={profile} clientName={clientName} hierarchySettings={hierarchySettings} />

      {/* My Coachees Section */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />

      {/* Training Materials */}
      <TrainingMaterialsSection clientId={clientId} />
    </div>
  );

  // COMMAND CENTER LAYOUT - Dense monitoring
  const CommandLayout = () => (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Command Center</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
          <button onClick={loadData} className="text-blue-600 hover:text-blue-700"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Dense KPI Grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-blue-700">{teamCount}</div><div className="text-xs text-blue-600">Team Size</div></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-green-700">{avgScore}%</div><div className="text-xs text-green-600">Competency</div></div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-purple-700">{stats.coachingActive}</div><div className="text-xs text-purple-600">Coaching</div></div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-amber-700">{stats.trainingPending}</div><div className="text-xs text-amber-600">Pending</div></div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center"><div className="text-2xl font-bold text-emerald-700">{stats.trainingCompleted}</div><div className="text-xs text-emerald-600">Completed</div></div>
        <div className={`${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'} border rounded-lg p-3 text-center`}><div className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>{stats.overdueCount}</div><div className={`text-xs ${stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>Overdue</div></div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Organization + Coaching */}
        <div className="space-y-4">
          <OrganizationHierarchy users={users} profile={profile} clientName={clientName} hierarchySettings={hierarchySettings} />
          <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />
        </div>
        {/* Right: Training + Tasks */}
        <div className="space-y-4">
          <TrainingMaterialsSection clientId={clientId} />
          <MyTrainingDevelopmentSection profile={profile} />
        </div>
      </div>
    </div>
  );

  // FOCUS LAYOUT - Minimal, priority-first
  const FocusLayout = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Simple Welcome */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900">Hello, {profile?.full_name}</h1>
        <p className="text-gray-500 mt-2">{stats.overdueCount === 0 ? '✅ Everything is on track' : `⚠️ ${stats.overdueCount} items need attention`}</p>
      </div>

      {/* Priority Metrics */}
      <div className="grid grid-cols-3 gap-8 text-center">
        <div><div className="text-4xl font-bold text-gray-900">{teamCount}</div><div className="text-sm text-gray-500 mt-1">Team Size</div></div>
        <div><div className="text-4xl font-bold text-gray-900">{avgScore}%</div><div className="text-sm text-gray-500 mt-1">Competency Rate</div></div>
        <div><div className={`text-4xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>{stats.overdueCount}</div><div className="text-sm text-gray-500 mt-1">Overdue Items</div></div>
      </div>

      {/* Key Sections */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />
      <OrganizationHierarchy users={users} profile={profile} clientName={clientName} hierarchySettings={hierarchySettings} />

      {/* Simple Actions */}
      <div className="flex justify-center gap-4">
        <button onClick={handleAddUser} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Add User</button>
        <button onClick={handleCoaching} className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">New Coaching</button>
        <button onClick={handleAssignTraining} className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">Assign Training</button>
      </div>
    </div>
  );

  // CUSTOM LAYOUT - Configurable with widget picker
  const CustomLayout = () => {
    const widgetComponents = {
      welcome: (
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white col-span-2">
          <p className="text-purple-200 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="text-2xl font-bold mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h2>
          <p className="text-purple-200 mt-2">{stats.overdueCount === 0 ? 'All training is on track!' : `${stats.overdueCount} items need attention`}</p>
        </div>
      ),
      kpiStrip: (
        <div className="grid grid-cols-4 gap-3 col-span-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <div><p className="text-xl font-bold text-blue-700">{teamCount}</p><p className="text-xs text-gray-500">Team Size</p></div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <div><p className="text-xl font-bold text-emerald-700">{avgScore}%</p><p className="text-xs text-gray-500">Progress</p></div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-amber-600" />
            <div><p className="text-xl font-bold text-amber-700">{stats.trainingCompleted}</p><p className="text-xs text-gray-500">Completed</p></div>
          </div>
          <div className={`${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'} border rounded-xl p-3 flex items-center gap-2`}>
            <MessageSquare className={`w-5 h-5 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-purple-600'}`} />
            <div><p className={`text-xl font-bold ${stats.overdueCount > 0 ? 'text-red-700' : 'text-purple-700'}`}>{stats.coachingActive}</p><p className="text-xs text-gray-500">Coaching</p></div>
          </div>
        </div>
      ),
      teamStatus: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Team Members ({teamCount})</h3>
          <div className="space-y-2">
            {users.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${m.role === 'trainee' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span>{m.full_name}</span>
                <span className="text-xs text-gray-400 capitalize">({m.role?.replace('_', ' ')})</span>
              </div>
            ))}
            {teamCount === 0 && <p className="text-sm text-gray-400">No team members yet</p>}
          </div>
        </div>
      ),
      quickActions: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Quick Actions</h3>
          <div className="space-y-2">
            <button onClick={handleAddUser} className="w-full p-2 bg-blue-50 text-blue-700 rounded-lg text-sm text-left hover:bg-blue-100 font-medium">+ Add User</button>
            <button onClick={handleAssignTraining} className="w-full p-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm text-left hover:bg-emerald-100 font-medium">Assign Training</button>
            <button onClick={handleCoaching} className="w-full p-2 bg-purple-50 text-purple-700 rounded-lg text-sm text-left hover:bg-purple-100 font-medium">New Coaching</button>
          </div>
        </div>
      ),
      trainingProgress: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Training Progress</h3>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{ width: `${avgScore}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{avgScore}% competency achieved</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
            <div className="bg-emerald-50 rounded-lg p-2"><span className="font-bold text-emerald-700">{stats.trainingCompleted}</span><span className="text-gray-500 ml-1">done</span></div>
            <div className="bg-amber-50 rounded-lg p-2"><span className="font-bold text-amber-700">{stats.trainingPending}</span><span className="text-gray-500 ml-1">pending</span></div>
          </div>
        </div>
      ),
      recentActivity: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-green-600" /> Organization</h3>
          <OrganizationHierarchy users={users} profile={profile} clientName={clientName} hierarchySettings={hierarchySettings} />
        </div>
      ),
      competencyRing: (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
          <h3 className="font-semibold text-gray-900 mb-3">Competency Progress</h3>
          <ProgressRing percentage={avgScore} color="#10B981" size={80} />
          <p className="text-sm text-gray-600 mt-2">{stats.competenciesAchieved}/{stats.competenciesAssigned} achieved</p>
        </div>
      ),
      coachingOverview: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-purple-600" /> Coaching Overview</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-purple-50 rounded-lg p-2"><p className="text-xl font-bold text-purple-700">{stats.coachingActive}</p><p className="text-xs text-gray-500">Active</p></div>
            <div className={`${stats.overdueCount > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-lg p-2`}><p className={`text-xl font-bold ${stats.overdueCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{stats.overdueCount}</p><p className="text-xs text-gray-500">Overdue</p></div>
          </div>
        </div>
      ),
      leaderboard: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Modules</span>
              <span className="font-bold text-gray-900">{stats.modulesCount}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Networks</span>
              <span className="font-bold text-gray-900">{stats.networkCount}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Total Users</span>
              <span className="font-bold text-gray-900">{users.length}</span>
            </div>
          </div>
        </div>
      ),
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custom Dashboard</h1>
            <p className="text-gray-600 mt-1">Build your own view, {profile?.full_name}</p>
          </div>
          <button onClick={() => setShowWidgetPicker(!showWidgetPicker)} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium">
            <Plus className="w-4 h-4" /> {showWidgetPicker ? 'Close' : 'Add Widget'}
          </button>
        </div>
        
        {showWidgetPicker && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Available Widgets</h3>
              <button onClick={() => setShowWidgetPicker(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(availableWidgets).map(([id, widget]) => {
                const isActive = activeWidgets.includes(id);
                return (
                  <button key={id} onClick={() => {
                    if (isActive) handleWidgetsChange(activeWidgets.filter(w => w !== id));
                    else handleWidgetsChange([...activeWidgets, id]);
                  }} className={`p-3 rounded-xl border-2 text-left transition-all ${isActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <widget.icon className={`w-5 h-5 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                      {isActive && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
                    </div>
                    <p className={`text-sm font-medium mt-2 ${isActive ? 'text-purple-700' : 'text-gray-700'}`}>{widget.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{widget.category}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {activeWidgets.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Grip className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No widgets added yet</h3>
            <p className="text-gray-500 mt-1">Click "Add Widget" to customize your dashboard</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeWidgets.map(widgetId => {
              const widget = widgetComponents[widgetId];
              if (!widget) return null;
              const size = availableWidgets[widgetId]?.size;
              return (
                <div key={widgetId} className={`relative group ${size === 'large' || size === 'full' ? 'md:col-span-2' : ''}`}>
                  {widget}
                  <button 
                    onClick={() => handleWidgetsChange(activeWidgets.filter(w => w !== widgetId))} 
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Remove widget"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="relative">
      {/* Layout Selector - Top Right */}
      <div className="absolute top-0 right-0 z-10">
        <LayoutSelector 
          currentLayout={currentLayout}
          onLayoutChange={handleLayoutChange}
          showSelector={showLayoutSelector}
          setShowSelector={setShowLayoutSelector}
        />
      </div>

      {/* Render selected layout */}
      <div className={currentLayout === 'command' ? '' : 'pt-2'}>
        {currentLayout === 'classic' && <ClassicLayout />}
        {currentLayout === 'magazine' && <MagazineLayout />}
        {currentLayout === 'command' && <CommandLayout />}
        {currentLayout === 'focus' && <FocusLayout />}
        {currentLayout === 'custom' && <CustomLayout />}
      </div>

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

// Trainee Dashboard
function TraineeDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    competenciesTotal: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    coachingActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    try {
      console.log('TraineeDashboard: Loading data for user:', profile.id);
      
      // Competencies
      const competencies = await dbFetch(`user_competencies?select=id,status,current_level,target_level&user_id=eq.${profile.id}`);
      console.log('TraineeDashboard: Competencies:', competencies);
      const compTotal = competencies?.length || 0;
      const compAchieved = competencies?.filter(c => c.status === 'achieved' || c.current_level >= c.target_level).length || 0;
      const compInProgress = competencies?.filter(c => c.status !== 'achieved' && c.current_level < c.target_level).length || 0;

      // Training
      const training = await dbFetch(`user_training?select=*&user_id=eq.${profile.id}`);
      console.log('TraineeDashboard: Training assignments:', training);
      const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'assigned').length || 0;
      const trainingCompleted = training?.filter(t => t.status === 'passed' || t.status === 'completed').length || 0;

      // Coaching
      const coaching = await dbFetch(`development_activities?select=id,status,title&trainee_id=eq.${profile.id}&type=eq.coaching`);
      console.log('TraineeDashboard: Coaching activities:', coaching);
      const activeCoaching = coaching?.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length || 0;

      setStats({
        competenciesTotal: compTotal,
        competenciesAchieved: compAchieved,
        competenciesToDevelop: compInProgress,
        trainingPending,
        trainingCompleted,
        coachingActive: activeCoaching
      });
    } catch (error) {
      console.error('Error loading trainee data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const overallProgress = stats.competenciesTotal > 0 
    ? Math.round((stats.competenciesAchieved / stats.competenciesTotal) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.full_name?.split(' ')[0] || 'Trainee'}!</h1>
        <p className="text-gray-600 mt-1">Track your progress and development</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Overall Progress</h3>
          <ProgressRing percentage={overallProgress} />
          <p className="text-sm text-gray-600 mt-4">
            {stats.competenciesAchieved} of {stats.competenciesTotal} competencies achieved
          </p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard 
            title="Skills to Develop" 
            value={stats.competenciesTotal - stats.competenciesAchieved}
            subtitle="In progress"
            icon={Target}
            color="blue"
            onClick={() => navigate('/my-progress')}
          />
          <StatCard 
            title="Training Pending" 
            value={stats.trainingPending}
            subtitle={`${stats.trainingCompleted} completed`}
            icon={GraduationCap}
            color="amber"
            onClick={() => navigate('/my-training')}
          />
          <StatCard 
            title="Active Coaching" 
            value={stats.coachingActive}
            subtitle="Sessions in progress"
            icon={Users}
            color="purple"
            onClick={() => navigate('/my-plan')}
          />
          <StatCard 
            title="Skills Achieved" 
            value={stats.competenciesAchieved}
            subtitle={`of ${stats.competenciesTotal} total`}
            icon={CheckCircle}
            color="green"
            onClick={() => navigate('/my-progress')}
          />
        </div>
      </div>

      {/* Competency Maturity Dashboard - Individual view for trainee */}
      <CompetencyMaturityDashboard 
        profile={profile}
        clientId={profile?.client_id}
        users={[]}
        initialScope="individual"
      />

      {/* My Training Development Tasks (if assigned as training developer) */}
      <MyTrainingDevelopmentSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="View My Matrix"
            description="See all competency levels"
            href="/my-progress"
            icon={Target}
          />
          <QuickAction
            title="My Development Plan"
            description="View your IDP & coaching"
            href="/my-plan"
            icon={ClipboardList}
          />
          <QuickAction
            title="Start Training"
            description="Continue learning"
            href="/my-training"
            icon={GraduationCap}
          />
        </div>
      </div>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-64 mt-2"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-32"></div>
        ))}
      </div>
    </div>
  );
}

// Main Dashboard component
function DashboardPage() {
  const { profile, isSuperAdmin, isClientAdmin, isTrainee, loading } = useAuth();

  if (loading || !profile) {
    return <DashboardSkeleton />;
  }

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }
  
  if (isClientAdmin) {
    return <ClientAdminDashboard />;
  }

  // Site Admin gets the same dashboard as Client Admin
  if (profile?.role === 'site_admin') {
    return <ClientAdminDashboard />;
  }

  // Team Lead gets their own dashboard
  if (profile?.role === 'team_lead') {
    return <TeamLeadDashboard />;
  }
  
  if (isTrainee) {
    return <TraineeDashboard />;
  }

  return <DashboardSkeleton />;
}

export default DashboardPage;
