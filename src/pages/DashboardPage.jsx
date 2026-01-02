// ============================================================================
// E&T MANAGER - UNIFIED DASHBOARD
// Combined Dashboard + Reports with layouts, KPIs, actions, and scope filtering
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
  Filter,
  Download,
  Eye,
  Settings,
  XCircle,
  UserCheck,
  Search
} from 'lucide-react';

// ============================================================================
// LAYOUT DEFINITIONS
// ============================================================================

const dashboardLayouts = {
  executive: {
    name: 'Executive',
    icon: Briefcase,
    description: 'High-level KPIs & actions',
    preview: '📊'
  },
  operational: {
    name: 'Operational',
    icon: LayoutDashboard,
    description: 'Team management focus',
    preview: '👥'
  },
  analytics: {
    name: 'Analytics',
    icon: BarChart3,
    description: 'Detailed metrics & charts',
    preview: '📈'
  },
  command: {
    name: 'Command Center',
    icon: Boxes,
    description: 'Dense monitoring view',
    preview: '🖥️'
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
  welcome: { name: 'Welcome Banner', icon: Heart, category: 'Overview', size: 'large' },
  quickActions: { name: 'Quick Actions', icon: Zap, category: 'Actions', size: 'medium' },
  kpiStrip: { name: 'KPI Overview', icon: BarChart3, category: 'Metrics', size: 'full' },
  teamStatus: { name: 'Team Status', icon: Users, category: 'People', size: 'medium' },
  trainingProgress: { name: 'Training Progress', icon: TrendingUp, category: 'Training', size: 'medium' },
  competencyRing: { name: 'Competency Chart', icon: Target, category: 'Competencies', size: 'medium' },
  modulePerformance: { name: 'Module Performance', icon: BookOpen, category: 'Training', size: 'large' },
  recentActivity: { name: 'Recent Activity', icon: Activity, category: 'Activity', size: 'medium' },
  coachingOverview: { name: 'Coaching Overview', icon: MessageSquare, category: 'Coaching', size: 'medium' },
  overdueAlerts: { name: 'Overdue Alerts', icon: AlertTriangle, category: 'Alerts', size: 'small' },
  traineeTable: { name: 'Trainee Progress Table', icon: Users, category: 'Reports', size: 'large' },
};

// ============================================================================
// LAYOUT PREFERENCE HOOKS
// ============================================================================

function useLayoutPreferences(userId) {
  const [currentLayout, setCurrentLayout] = useState('executive');
  const [activeWidgets, setActiveWidgets] = useState([
    'welcome', 'quickActions', 'kpiStrip', 'teamStatus', 
    'trainingProgress', 'competencyRing', 'recentActivity'
  ]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  useEffect(() => {
    if (userId) loadPreferences();
  }, [userId]);

  const loadPreferences = () => {
    try {
      const savedLayout = localStorage.getItem(`unified_dashboard_layout_${userId}`);
      const savedWidgets = localStorage.getItem(`unified_dashboard_widgets_${userId}`);
      if (savedLayout) setCurrentLayout(savedLayout);
      if (savedWidgets) setActiveWidgets(JSON.parse(savedWidgets));
    } catch (error) {
      console.log('Using default layout preferences');
    }
    setPrefsLoaded(true);
  };

  const savePreferences = (layout, widgets) => {
    if (!userId) return;
    localStorage.setItem(`unified_dashboard_layout_${userId}`, layout);
    localStorage.setItem(`unified_dashboard_widgets_${userId}`, JSON.stringify(widgets));
  };

  const handleLayoutChange = (newLayout) => {
    setCurrentLayout(newLayout);
    savePreferences(newLayout, activeWidgets);
  };

  const handleWidgetsChange = (newWidgets) => {
    setActiveWidgets(newWidgets);
    savePreferences(currentLayout, newWidgets);
  };

  return { currentLayout, activeWidgets, prefsLoaded, handleLayoutChange, handleWidgetsChange };
}

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
// SCOPE SELECTOR COMPONENT
// ============================================================================

function ScopeSelector({ scope, setScope, clients, users, teamLeads, profile }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScopeLabel = () => {
    if (scope.type === 'organization') return scope.clientId === 'all' ? 'All Organizations' : clients.find(c => c.id === scope.clientId)?.name || 'Organization';
    if (scope.type === 'team_lead') return `Team: ${teamLeads.find(t => t.id === scope.userId)?.full_name || 'Team Lead'}`;
    if (scope.type === 'user') return users.find(u => u.id === scope.userId)?.full_name || 'User';
    return 'Select Scope';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="font-medium text-gray-700 text-sm">{getScopeLabel()}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>

      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
          <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-72">
              {/* Organization Section */}
              {profile?.role === 'super_admin' && (
                <div className="p-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Organization</p>
                  <button
                    onClick={() => { setScope({ type: 'organization', clientId: 'all' }); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${scope.type === 'organization' && scope.clientId === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'}`}
                  >
                    <Building2 className="w-4 h-4" />
                    All Organizations
                  </button>
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => { setScope({ type: 'organization', clientId: client.id }); setShowDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${scope.type === 'organization' && scope.clientId === client.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'}`}
                    >
                      <Building2 className="w-4 h-4" />
                      {client.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Team Leads Section */}
              {teamLeads.length > 0 && (
                <div className="p-2 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Team Leads</p>
                  {teamLeads.filter(t => t.full_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => { setScope({ type: 'team_lead', userId: lead.id }); setShowDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${scope.type === 'team_lead' && scope.userId === lead.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'}`}
                    >
                      <UserCheck className="w-4 h-4" />
                      {lead.full_name}
                    </button>
                  ))}
                </div>
              )}

              {/* Individual Users Section */}
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">Individual Users</p>
                {filteredUsers.slice(0, 20).map(user => (
                  <button
                    key={user.id}
                    onClick={() => { setScope({ type: 'user', userId: user.id }); setShowDropdown(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${scope.type === 'user' && scope.userId === user.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'}`}
                  >
                    <User className="w-4 h-4" />
                    <span className="truncate">{user.full_name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{user.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// PROGRESS RING COMPONENT
// ============================================================================

function ProgressRing({ percentage, size = 120, strokeWidth = 10, color = '#8B5CF6' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
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

// ============================================================================
// QUICK ACTION BUTTON
// ============================================================================

function QuickActionCard({ icon: Icon, label, description, onClick, primary = false, color = 'purple' }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl text-left transition-all hover:scale-[1.02] hover:shadow-md ${
        primary 
          ? `bg-gradient-to-br from-${color}-500 to-${color}-600 text-white` 
          : 'bg-white border border-gray-200 hover:border-gray-300'
      }`}
    >
      <Icon className={`w-6 h-6 mb-2 ${primary ? 'text-white/80' : 'text-gray-400'}`} />
      <p className={`font-medium ${primary ? 'text-white' : 'text-gray-900'}`}>{label}</p>
      {description && <p className={`text-xs mt-1 ${primary ? 'text-white/70' : 'text-gray-500'}`}>{description}</p>}
    </button>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function DashboardPage() {
  const { profile, isSuperAdmin, isClientAdmin, clientId: authClientId } = useAuth();
  const navigate = useNavigate();
  const clientId = authClientId || profile?.client_id;

  // Layout state
  const { currentLayout, activeWidgets, handleLayoutChange, handleWidgetsChange } = useLayoutPreferences(profile?.id);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  // Scope state
  const [scope, setScope] = useState({ type: 'organization', clientId: clientId || 'all' });
  const [clients, setClients] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [teamLeads, setTeamLeads] = useState([]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('30');

  // KPI Stats
  const [stats, setStats] = useState({
    totalTrainees: 0,
    activeTrainees: 0,
    totalModules: 0,
    publishedModules: 0,
    totalAssignments: 0,
    completedAssignments: 0,
    passRate: 0,
    avgScore: 0,
    overdueCount: 0,
    inProgressCount: 0
  });

  // Additional data
  const [competencyStats, setCompetencyStats] = useState({ total: 0, achieved: 0, inProgress: 0 });
  const [coachingStats, setCoachingStats] = useState({ total: 0, active: 0, completed: 0, overdue: 0 });
  const [traineeProgress, setTraineeProgress] = useState([]);
  const [moduleStats, setModuleStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Modal states
  const [showDevModal, setShowDevModal] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (profile) {
      loadInitialData();
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadScopedData();
    }
  }, [scope, dateRange, profile]);

  const loadInitialData = async () => {
    try {
      // Load clients
      let clientsData = [];
      if (isSuperAdmin) {
        clientsData = await dbFetch('clients?select=id,name,code&order=name.asc') || [];
      } else if (clientId) {
        clientsData = await dbFetch(`clients?select=id,name,code&id=eq.${clientId}`) || [];
      }
      setClients(clientsData);

      // Load all users for scope selector
      let usersUrl = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      if (!isSuperAdmin && clientId) {
        usersUrl += `&client_id=eq.${clientId}`;
      }
      const usersData = await dbFetch(usersUrl) || [];
      setAllUsers(usersData);
      setTeamLeads(usersData.filter(u => u.role === 'team_lead'));

      // Set initial scope based on role
      if (profile?.role === 'team_lead') {
        setScope({ type: 'team_lead', userId: profile.id });
      } else if (!isSuperAdmin && clientId) {
        setScope({ type: 'organization', clientId: clientId });
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadScopedData = async () => {
    setLoading(true);
    try {
      // Determine which users to include based on scope
      let targetUserIds = [];
      let targetClientId = null;

      if (scope.type === 'organization') {
        targetClientId = scope.clientId === 'all' ? null : scope.clientId;
      } else if (scope.type === 'team_lead') {
        // Get team members for this team lead
        const teamData = await dbFetch(`profiles?select=id&reports_to_id=eq.${scope.userId}&is_active=eq.true`);
        targetUserIds = teamData?.map(t => t.id) || [];
      } else if (scope.type === 'user') {
        targetUserIds = [scope.userId];
      }

      await Promise.all([
        loadOverviewStats(targetClientId, targetUserIds),
        loadTraineeProgress(targetClientId, targetUserIds),
        loadModuleStats(targetClientId),
        loadRecentActivity(targetClientId, targetUserIds),
        loadCompetencyStats(targetClientId, targetUserIds),
        loadCoachingStats(targetClientId, targetUserIds),
        loadTeamMembers(targetClientId, targetUserIds)
      ]);
    } catch (error) {
      console.error('Error loading scoped data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async (targetClientId, targetUserIds) => {
    try {
      // Get trainees
      let traineeUrl = 'profiles?select=id&role=eq.trainee&is_active=eq.true';
      if (targetClientId) traineeUrl += `&client_id=eq.${targetClientId}`;
      const trainees = await dbFetch(traineeUrl) || [];
      
      let relevantTraineeIds = trainees.map(t => t.id);
      if (targetUserIds.length > 0) {
        relevantTraineeIds = relevantTraineeIds.filter(id => targetUserIds.includes(id));
      }

      // Get modules
      let moduleUrl = 'training_modules?select=id,status';
      if (targetClientId) moduleUrl += `&client_id=eq.${targetClientId}`;
      const modules = await dbFetch(moduleUrl) || [];

      // Get training assignments
      const allTraining = await dbFetch('user_training?select=id,status,best_score,due_date,user_id') || [];
      let filteredTraining = allTraining;
      if (relevantTraineeIds.length > 0) {
        filteredTraining = allTraining.filter(t => relevantTraineeIds.includes(t.user_id));
      } else if (targetClientId) {
        filteredTraining = allTraining.filter(t => relevantTraineeIds.includes(t.user_id));
      }

      const completed = filteredTraining.filter(a => a.status === 'passed');
      const inProgress = filteredTraining.filter(a => a.status === 'in_progress' || a.status === 'pending');
      const overdue = filteredTraining.filter(a => 
        a.due_date && new Date(a.due_date) < new Date() && a.status !== 'passed'
      );

      const completedWithScores = completed.filter(a => a.best_score !== null);
      const passRate = completedWithScores.length > 0
        ? (completedWithScores.filter(a => a.best_score >= 80).length / completedWithScores.length) * 100
        : 0;
      const avgScore = completedWithScores.length > 0
        ? completedWithScores.reduce((sum, a) => sum + a.best_score, 0) / completedWithScores.length
        : 0;

      setStats({
        totalTrainees: relevantTraineeIds.length,
        activeTrainees: new Set(filteredTraining.map(t => t.user_id)).size,
        totalModules: modules.length,
        publishedModules: modules.filter(m => m.status === 'published').length,
        totalAssignments: filteredTraining.length,
        completedAssignments: completed.length,
        passRate: Math.round(passRate),
        avgScore: Math.round(avgScore),
        overdueCount: overdue.length,
        inProgressCount: inProgress.length
      });
    } catch (error) {
      console.error('Error loading overview stats:', error);
    }
  };

  const loadTraineeProgress = async (targetClientId, targetUserIds) => {
    try {
      let traineeUrl = 'profiles?select=id,full_name,email,department&role=eq.trainee&is_active=eq.true';
      if (targetClientId) traineeUrl += `&client_id=eq.${targetClientId}`;
      let trainees = await dbFetch(traineeUrl) || [];
      
      if (targetUserIds.length > 0) {
        trainees = trainees.filter(t => targetUserIds.includes(t.id));
      }

      const allTraining = await dbFetch('user_training?select=id,status,best_score,due_date,user_id') || [];

      const progressData = trainees.map(trainee => {
        const training = allTraining.filter(t => t.user_id === trainee.id);
        const completed = training.filter(t => t.status === 'passed');
        const overdue = training.filter(t => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'passed'
        );
        const scores = completed.filter(t => t.best_score).map(t => t.best_score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
          id: trainee.id,
          name: trainee.full_name,
          department: trainee.department,
          total: training.length,
          completed: completed.length,
          completionRate: training.length > 0 ? Math.round((completed.length / training.length) * 100) : 0,
          avgScore,
          overdue: overdue.length
        };
      });

      progressData.sort((a, b) => b.overdue - a.overdue || a.completionRate - b.completionRate);
      setTraineeProgress(progressData.slice(0, 20));
    } catch (error) {
      console.error('Error loading trainee progress:', error);
    }
  };

  const loadModuleStats = async (targetClientId) => {
    try {
      let moduleUrl = 'training_modules?select=id,title,status,pass_score&status=eq.published';
      if (targetClientId) moduleUrl += `&client_id=eq.${targetClientId}`;
      const modules = await dbFetch(moduleUrl) || [];

      const allTraining = await dbFetch('user_training?select=id,status,best_score,attempts_count,module_id') || [];

      const moduleData = modules.map(module => {
        const assignments = allTraining.filter(t => t.module_id === module.id);
        const completed = assignments.filter(a => a.status === 'passed');
        const passed = completed.filter(a => a.best_score >= (module.pass_score || 80));
        const avgScore = completed.length > 0
          ? Math.round(completed.reduce((sum, a) => sum + (a.best_score || 0), 0) / completed.length)
          : 0;

        return {
          id: module.id,
          title: module.title,
          assigned: assignments.length,
          completed: completed.length,
          passed: passed.length,
          passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
          avgScore,
          completionRate: assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0
        };
      });

      moduleData.sort((a, b) => b.assigned - a.assigned);
      setModuleStats(moduleData.slice(0, 10));
    } catch (error) {
      console.error('Error loading module stats:', error);
    }
  };

  const loadRecentActivity = async (targetClientId, targetUserIds) => {
    try {
      let activities = await dbFetch('user_training?select=id,status,completed_at,best_score,user_id,module_id&status=eq.passed&order=completed_at.desc&limit=20') || [];
      
      if (targetUserIds.length > 0) {
        activities = activities.filter(a => targetUserIds.includes(a.user_id));
      }

      const enriched = await Promise.all(activities.slice(0, 10).map(async (a) => {
        const [userInfo, moduleInfo] = await Promise.all([
          dbFetch(`profiles?select=full_name&id=eq.${a.user_id}`),
          dbFetch(`training_modules?select=title&id=eq.${a.module_id}`)
        ]);
        return {
          id: a.id,
          trainee: userInfo?.[0]?.full_name || 'Unknown',
          module: moduleInfo?.[0]?.title || 'Unknown',
          score: a.best_score || 0,
          passed: (a.best_score || 0) >= 80,
          date: a.completed_at
        };
      }));

      setRecentActivity(enriched);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadCompetencyStats = async (targetClientId, targetUserIds) => {
    try {
      let competencies = await dbFetch('user_competencies?select=id,status,user_id') || [];
      
      if (targetUserIds.length > 0) {
        competencies = competencies.filter(c => targetUserIds.includes(c.user_id));
      }

      setCompetencyStats({
        total: competencies.length,
        achieved: competencies.filter(c => c.status === 'achieved').length,
        inProgress: competencies.filter(c => c.status !== 'achieved').length
      });
    } catch (error) {
      console.error('Error loading competency stats:', error);
    }
  };

  const loadCoachingStats = async (targetClientId, targetUserIds) => {
    try {
      let coachingUrl = 'development_activities?select=id,status,due_date,trainee_id&type=eq.coaching';
      if (targetClientId) coachingUrl += `&client_id=eq.${targetClientId}`;
      let coaching = await dbFetch(coachingUrl) || [];

      if (targetUserIds.length > 0) {
        coaching = coaching.filter(c => targetUserIds.includes(c.trainee_id));
      }

      const overdue = coaching.filter(c => {
        if (!c.due_date || c.status === 'validated') return false;
        return new Date(c.due_date) < new Date();
      }).length;

      setCoachingStats({
        total: coaching.length,
        active: coaching.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length,
        completed: coaching.filter(c => c.status === 'validated').length,
        overdue
      });
    } catch (error) {
      console.error('Error loading coaching stats:', error);
    }
  };

  const loadTeamMembers = async (targetClientId, targetUserIds) => {
    try {
      if (targetUserIds.length > 0) {
        const members = await dbFetch(`profiles?select=id,full_name,email,role&id=in.(${targetUserIds.join(',')})&is_active=eq.true`) || [];
        setTeamMembers(members);
      } else {
        let url = 'profiles?select=id,full_name,email,role&role=eq.trainee&is_active=eq.true&limit=10';
        if (targetClientId) url += `&client_id=eq.${targetClientId}`;
        const members = await dbFetch(url) || [];
        setTeamMembers(members);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadScopedData();
    setRefreshing(false);
  };

  // ============================================================================
  // CALCULATED VALUES
  // ============================================================================

  const completionRate = stats.totalAssignments > 0 
    ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100) 
    : 0;

  const competencyRate = competencyStats.total > 0
    ? Math.round((competencyStats.achieved / competencyStats.total) * 100)
    : 0;

  // ============================================================================
  // LAYOUT RENDERERS
  // ============================================================================

  // EXECUTIVE LAYOUT - High-level KPIs & actions
  const ExecutiveLayout = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <p className="text-white/70 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="text-3xl font-bold mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h2>
          <p className="text-white/80 mt-2">
            {stats.overdueCount > 0 
              ? `${stats.overdueCount} training item${stats.overdueCount > 1 ? 's' : ''} need attention.`
              : 'All training is on track!'}
          </p>
          <div className="flex gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div><p className="text-2xl font-bold">{stats.totalTrainees}</p><p className="text-xs text-white/70">Trainees</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div><p className="text-2xl font-bold">{stats.completedAssignments}</p><p className="text-xs text-white/70">Completed</p></div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div><p className="text-2xl font-bold">{stats.avgScore}%</p><p className="text-xs text-white/70">Avg Score</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <QuickActionCard icon={UserPlus} label="Add User" description="New trainee" onClick={() => navigate('/users?action=add')} primary />
          <QuickActionCard icon={GraduationCap} label="Assign Training" description="Create assignment" onClick={() => navigate('/training')} />
          <QuickActionCard icon={MessageSquare} label="Coaching" description="Development activity" onClick={() => navigate('/development')} />
          <QuickActionCard icon={BookOpen} label="Create Module" description="New training" onClick={() => navigate('/training?action=create')} />
          <QuickActionCard icon={BarChart3} label="Export Report" description="Download data" onClick={() => {}} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, label: 'Trainees', value: stats.totalTrainees, sub: `${stats.activeTrainees} active`, color: 'blue' },
          { icon: BookOpen, label: 'Modules', value: stats.totalModules, sub: `${stats.publishedModules} published`, color: 'indigo' },
          { icon: Target, label: 'Competencies', value: competencyStats.total, sub: `${competencyStats.achieved} achieved`, color: 'green' },
          { icon: MessageSquare, label: 'Coaching', value: coachingStats.total, sub: `${coachingStats.active} active`, color: 'purple' },
          { icon: Clock, label: 'Training', value: stats.totalAssignments, sub: `${stats.inProgressCount} pending`, color: 'amber' },
          { icon: AlertTriangle, label: 'Overdue', value: stats.overdueCount, sub: 'items', color: stats.overdueCount > 0 ? 'red' : 'green' },
        ].map((kpi, i) => (
          <div key={i} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100`}>
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <kpi.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.color === 'red' && stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{kpi.value}</p>
            <p className="text-xs text-gray-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Training Completion</h3>
          <ProgressRing percentage={completionRate} color="#10B981" />
          <p className="text-sm text-gray-600 mt-4">{stats.completedAssignments} of {stats.totalAssignments}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Pass Rate</h3>
          <ProgressRing percentage={stats.passRate} color="#F59E0B" />
          <p className="text-sm text-gray-600 mt-4">Avg Score: {stats.avgScore}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Competency Achievement</h3>
          <ProgressRing percentage={competencyRate} color="#3B82F6" />
          <p className="text-sm text-gray-600 mt-4">{competencyStats.achieved} of {competencyStats.total}</p>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trainee Progress */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-500" /> Trainee Progress
          </h3>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Trainee</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Progress</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {traineeProgress.slice(0, 8).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-900 truncate max-w-[150px]">{t.name}</td>
                    <td className="py-2 px-3 text-center">{t.completed}/{t.total} ({t.completionRate}%)</td>
                    <td className="py-2 px-3 text-center">
                      {t.overdue > 0 ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{t.overdue} overdue</span>
                      ) : t.completionRate === 100 ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Complete</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" /> Recent Completions
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">{a.trainee}</p>
                  <p className="text-sm text-gray-500 truncate">{a.module}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`font-bold ${a.passed ? 'text-green-600' : 'text-red-600'}`}>{a.score}%</span>
                  {a.passed ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Performance */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" /> Module Performance
        </h3>
        <div className="space-y-3">
          {moduleStats.slice(0, 5).map(m => (
            <div key={m.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{m.title}</p>
                <p className="text-sm text-gray-500">{m.completed}/{m.assigned} completed • {m.passRate}% pass rate</p>
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${m.completionRate}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // OPERATIONAL LAYOUT - Team management focus
  const OperationalLayout = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600">Manage your team and track progress</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/users?action=add')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700">
            <UserPlus className="w-4 h-4" /> Add User
          </button>
          <button onClick={() => navigate('/training')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <GraduationCap className="w-4 h-4" /> Assign Training
          </button>
          <button onClick={() => navigate('/development')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            <MessageSquare className="w-4 h-4" /> Coaching
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-xl border-2 ${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
            <span className="font-medium text-gray-700">Overdue</span>
          </div>
          <p className={`text-3xl font-bold mt-2 ${stats.overdueCount > 0 ? 'text-red-700' : 'text-green-700'}`}>{stats.overdueCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-gray-700">In Progress</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-blue-700">{stats.inProgressCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-gray-700">Completed</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-emerald-700">{stats.completedAssignments}</p>
        </div>
        <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-700">Coaching</span>
          </div>
          <p className="text-3xl font-bold mt-2 text-purple-700">{coachingStats.active}</p>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Team Members ({stats.totalTrainees})
          </h3>
          <button onClick={() => navigate('/users')} className="text-sm text-purple-600 hover:underline">View All →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.slice(0, 9).map(member => {
            const progress = traineeProgress.find(t => t.id === member.id);
            return (
              <div key={member.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => navigate(`/users`)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                    {member.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-gray-500">{progress ? `${progress.completionRate}% complete` : 'No training'}</p>
                  </div>
                  {progress?.overdue > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">{progress.overdue}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Overall Completion</span>
                <span className="font-semibold">{completionRate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{ width: `${completionRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Competency Achievement</span>
                <span className="font-semibold">{competencyRate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${competencyRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Pass Rate</span>
                <span className="font-semibold">{stats.passRate}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${stats.passRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.trainee}</p>
                  <p className="text-xs text-gray-500 truncate">{a.module}</p>
                </div>
                <span className="text-sm font-semibold text-green-600">{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ANALYTICS LAYOUT - Detailed metrics
  const AnalyticsLayout = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-500">Detailed metrics and performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { icon: Users, label: 'Trainees', value: stats.totalTrainees, sub: `${stats.activeTrainees} with training` },
          { icon: BookOpen, label: 'Modules', value: stats.totalModules, sub: `${stats.publishedModules} published` },
          { icon: Target, label: 'Competencies', value: competencyStats.total, sub: `${competencyStats.achieved} achieved (${competencyRate}%)` },
          { icon: MessageSquare, label: 'Coaching', value: coachingStats.total, sub: `${coachingStats.active} active, ${coachingStats.completed} done` },
          { icon: Clock, label: 'Training', value: stats.totalAssignments, sub: `${stats.inProgressCount} pending` },
          { icon: AlertTriangle, label: 'Overdue', value: stats.overdueCount, sub: 'training items', danger: stats.overdueCount > 0 },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <kpi.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold ${kpi.danger ? 'text-red-600' : 'text-gray-900'}`}>{kpi.value}</p>
            <p className="text-xs text-gray-500">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> Training Completion
          </h3>
          <ProgressRing percentage={completionRate} color="#10B981" />
          <p className="text-sm text-gray-600 mt-4">{stats.completedAssignments} of {stats.totalAssignments} completed</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Pass Rate
          </h3>
          <ProgressRing percentage={stats.passRate} color="#F59E0B" />
          <p className="text-sm text-gray-600 mt-4">Average Score: {stats.avgScore}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" /> Competency Achievement
          </h3>
          <ProgressRing percentage={competencyRate} color="#3B82F6" />
          <p className="text-sm text-gray-600 mt-4">{competencyStats.achieved} of {competencyStats.total} achieved</p>
        </div>
      </div>

      {/* Module Performance Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" /> Module Performance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Module</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Assigned</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Completed</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Completion %</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Pass Rate</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {moduleStats.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{m.title}</td>
                  <td className="py-3 px-4 text-center">{m.assigned}</td>
                  <td className="py-3 px-4 text-center">{m.completed}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${m.completionRate >= 80 ? 'bg-green-500' : m.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${m.completionRate}%` }} />
                      </div>
                      <span>{m.completionRate}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-medium ${m.passRate >= 80 ? 'text-green-600' : m.passRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>{m.passRate}%</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`font-medium ${m.avgScore >= 80 ? 'text-green-600' : m.avgScore >= 60 ? 'text-orange-600' : 'text-red-600'}`}>{m.avgScore}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainee Progress Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-500" /> Trainee Progress
          {traineeProgress.filter(t => t.overdue > 0).length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              {traineeProgress.filter(t => t.overdue > 0).length} need attention
            </span>
          )}
        </h3>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Trainee</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Progress</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Score</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {traineeProgress.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.department}</p>
                  </td>
                  <td className="py-2 px-3 text-center">{t.completed}/{t.total} ({t.completionRate}%)</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`font-medium ${t.avgScore >= 80 ? 'text-green-600' : t.avgScore >= 60 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {t.avgScore > 0 ? `${t.avgScore}%` : '-'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {t.overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {t.overdue} overdue
                      </span>
                    ) : t.completionRate === 100 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        <CheckCircle className="w-3 h-3" /> Complete
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // COMMAND CENTER LAYOUT - Dense monitoring
  const CommandLayout = () => (
    <div className="space-y-4 bg-slate-900 -m-6 p-6 min-h-screen">
      {/* Status Bar */}
      <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${stats.overdueCount === 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm">System Status: {stats.overdueCount === 0 ? 'All Clear' : 'Attention Needed'}</span>
          </div>
          <div className="text-sm text-slate-400">User: {profile?.full_name}</div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{new Date().toLocaleTimeString()}</span>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2 hover:bg-slate-700 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'TRAINEES', value: stats.totalTrainees },
          { label: 'ACTIVE', value: stats.activeTrainees },
          { label: 'MODULES', value: stats.publishedModules },
          { label: 'COMPLETED', value: stats.completedAssignments },
          { label: 'PENDING', value: stats.inProgressCount },
          { label: 'OVERDUE', value: stats.overdueCount, danger: stats.overdueCount > 0 },
          { label: 'PASS RATE', value: `${stats.passRate}%` },
          { label: 'AVG SCORE', value: `${stats.avgScore}%` },
        ].map((m, i) => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">{m.label}</p>
            <p className={`text-xl font-bold font-mono mt-1 ${m.danger ? 'text-red-400' : 'text-slate-200'}`}>{m.value}</p>
          </div>
        ))}
      </div>
      
      {/* Main Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">TRAINEE STATUS</h3>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            {traineeProgress.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${t.overdue > 0 ? 'bg-red-500' : t.completionRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-sm text-slate-300 truncate max-w-[150px]">{t.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-slate-500">{t.completed}/{t.total}</span>
                  <span className="text-xs font-mono text-slate-400">{t.completionRate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">RECENT EVENTS</h3>
          </div>
          <div className="p-4 max-h-72 overflow-y-auto">
            {recentActivity.map(a => (
              <div key={a.id} className="flex items-center gap-2 py-2 border-b border-slate-700 last:border-0">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-slate-300 truncate flex-1">{a.trainee}</span>
                <span className="text-xs font-mono text-emerald-400">{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2 border-b border-slate-600">
            <h3 className="text-sm font-semibold text-slate-300 font-mono">QUICK ACTIONS</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Add User', path: '/users?action=add' },
              { label: 'Assign Training', path: '/training' },
              { label: 'Development', path: '/development' },
              { label: 'View Reports', path: '/reports' },
              { label: 'Manage Modules', path: '/training' },
            ].map((a, i) => (
              <button key={i} onClick={() => navigate(a.path)} className="w-full p-2 rounded bg-slate-700 hover:bg-slate-600 text-left text-sm text-slate-300">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // CUSTOM LAYOUT
  const CustomLayout = () => {
    const widgetComponents = {
      welcome: (
        <div className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white md:col-span-2">
          <p className="text-white/70 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h2 className="text-2xl font-bold mt-1">Welcome back, {profile?.full_name?.split(' ')[0]}! 👋</h2>
        </div>
      ),
      quickActions: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => navigate('/users?action=add')} className="p-2 bg-purple-50 rounded-lg text-sm text-purple-700">Add User</button>
            <button onClick={() => navigate('/training')} className="p-2 bg-gray-50 rounded-lg text-sm text-gray-700">Training</button>
          </div>
        </div>
      ),
      kpiStrip: (
        <div className="grid grid-cols-4 gap-3 md:col-span-2">
          {[
            { icon: Users, value: stats.totalTrainees, label: 'Trainees' },
            { icon: CheckCircle, value: stats.completedAssignments, label: 'Completed' },
            { icon: AlertTriangle, value: stats.overdueCount, label: 'Overdue', danger: stats.overdueCount > 0 },
            { icon: Target, value: `${stats.avgScore}%`, label: 'Avg Score' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-2">
              <k.icon className={`w-5 h-5 ${k.danger ? 'text-red-600' : 'text-gray-400'}`} />
              <div><p className={`text-xl font-bold ${k.danger ? 'text-red-700' : 'text-gray-900'}`}>{k.value}</p><p className="text-xs text-gray-500">{k.label}</p></div>
            </div>
          ))}
        </div>
      ),
      teamStatus: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Team</h3>
          <div className="space-y-2">
            {teamMembers.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-2 text-sm"><span className="w-2 h-2 rounded-full bg-emerald-500" />{m.full_name}</div>
            ))}
          </div>
        </div>
      ),
      trainingProgress: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3"><TrendingUp className="w-4 h-4 text-blue-600 inline mr-2" />Progress</h3>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-2">{completionRate}% training completed</p>
        </div>
      ),
      competencyRing: (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center">
          <ProgressRing percentage={competencyRate} color="#3B82F6" size={80} />
          <p className="text-sm text-gray-600 mt-2">{competencyStats.achieved}/{competencyStats.total} competencies</p>
        </div>
      ),
      recentActivity: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3"><Activity className="w-4 h-4 text-green-600 inline mr-2" />Recent</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="truncate">{a.trainee}</span>
              </div>
            ))}
          </div>
        </div>
      ),
      coachingOverview: (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3"><MessageSquare className="w-4 h-4 text-purple-600 inline mr-2" />Coaching</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-purple-50 rounded-lg p-2"><p className="text-xl font-bold text-purple-700">{coachingStats.active}</p><p className="text-xs text-gray-500">Active</p></div>
            <div className={`${coachingStats.overdue > 0 ? 'bg-red-50' : 'bg-emerald-50'} rounded-lg p-2`}><p className={`text-xl font-bold ${coachingStats.overdue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{coachingStats.overdue}</p><p className="text-xs text-gray-500">Overdue</p></div>
          </div>
        </div>
      ),
      overdueAlerts: (
        <div className={`rounded-xl border p-4 ${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <AlertTriangle className={`w-6 h-6 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'} mb-2`} />
          <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{stats.overdueCount}</p>
          <p className="text-xs text-gray-600">Overdue Items</p>
        </div>
      ),
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Custom Dashboard</h2>
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
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
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

  if (loading && !stats.totalTrainees) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Scope Selector */}
        <ScopeSelector
          scope={scope}
          setScope={setScope}
          clients={clients}
          users={allUsers}
          teamLeads={teamLeads}
          profile={profile}
        />

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm shadow-sm"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Layout Selector */}
          <LayoutSelector
            currentLayout={currentLayout}
            onLayoutChange={handleLayoutChange}
            showSelector={showLayoutSelector}
            setShowSelector={setShowLayoutSelector}
          />
        </div>
      </div>

      {/* Render selected layout */}
      <div className={currentLayout === 'command' ? '' : ''}>
        {currentLayout === 'executive' && <ExecutiveLayout />}
        {currentLayout === 'operational' && <OperationalLayout />}
        {currentLayout === 'analytics' && <AnalyticsLayout />}
        {currentLayout === 'command' && <CommandLayout />}
        {currentLayout === 'custom' && <CustomLayout />}
      </div>
    </div>
  );
}
