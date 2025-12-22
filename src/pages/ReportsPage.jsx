import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  BarChart3,
  Users,
  BookOpen,
  Trophy,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  RefreshCw
} from 'lucide-react';

export default function ReportsPage() {
  const { profile, clientId: authClientId } = useAuth();
  // Use clientId from auth context, fallback to profile.client_id
  const clientId = authClientId || profile?.client_id;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClient, setSelectedClient] = useState('all');
  const [dateRange, setDateRange] = useState('30'); // days
  const [clients, setClients] = useState([]);
  
  // Analytics data
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
  
  const [moduleStats, setModuleStats] = useState([]);
  const [traineeProgress, setTraineeProgress] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [competencyStats, setCompetencyStats] = useState({
    total: 0,
    achieved: 0,
    inProgress: 0
  });
  const [coachingStats, setCoachingStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    overdue: 0
  });

  useEffect(() => {
    loadClients();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      loadAnalytics();
    }
  }, [profile, selectedClient, dateRange]);

  const loadClients = async () => {
    try {
      let url = 'clients?select=id,name,code&order=name.asc';
      
      if (profile?.role === 'client_admin' || profile?.role === 'team_lead') {
        url += `&id=eq.${clientId}`;
      }
      
      const data = await dbFetch(url);
      setClients(data || []);
      
      // Set default client for client_admin/team_lead
      if ((profile?.role === 'client_admin' || profile?.role === 'team_lead') && data?.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // CRITICAL: Non-super_admin users MUST always use their client_id
      let clientFilter;
      if (profile?.role === 'super_admin') {
        clientFilter = selectedClient !== 'all' ? selectedClient : null;
      } else {
        // For all other roles, always use their client_id regardless of selection
        clientFilter = clientId || profile?.client_id;
      }
      
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(dateRange));

      // Load all data in parallel
      await Promise.all([
        loadOverviewStats(clientFilter),
        loadModuleStats(clientFilter),
        loadTraineeProgress(clientFilter),
        loadRecentActivity(clientFilter, dateLimit),
        loadCompetencyStats(clientFilter),
        loadCoachingStats(clientFilter)
      ]);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async (clientFilter) => {
    try {
      // Get trainees count
      let traineeUrl = 'profiles?select=id&role=eq.trainee';
      if (clientFilter) {
        traineeUrl += `&client_id=eq.${clientFilter}`;
      }
      const trainees = await dbFetch(traineeUrl);
      const totalTrainees = trainees?.length || 0;

      // Get modules count
      let moduleUrl = 'training_modules?select=id,status';
      if (clientFilter) {
        moduleUrl += `&client_id=eq.${clientFilter}`;
      }
      const modules = await dbFetch(moduleUrl);
      const totalModules = modules?.length || 0;
      const publishedModules = modules?.filter(m => m.status === 'published').length || 0;

      // Get training assignments - need to get trainees first, then their training
      let assignmentUrl = 'user_training?select=id,status,best_score,due_date,user_id';
      const assignments = await dbFetch(assignmentUrl);
      
      // Filter by client if needed
      let filteredAssignments = assignments || [];
      if (clientFilter && trainees) {
        const traineeIds = trainees.map(t => t.id);
        filteredAssignments = assignments?.filter(a => traineeIds.includes(a.user_id)) || [];
      }
      
      const totalAssignments = filteredAssignments.length;
      // FIXED: Use 'passed' instead of 'completed'
      const completedAssignments = filteredAssignments.filter(a => a.status === 'passed').length;
      const inProgressCount = filteredAssignments.filter(a => a.status === 'in_progress' || a.status === 'pending').length;
      
      // Calculate overdue
      const today = new Date();
      const overdueCount = filteredAssignments.filter(a => 
        a.due_date && 
        new Date(a.due_date) < today && 
        a.status !== 'passed'
      ).length;

      // Calculate pass rate and avg score from completed (passed)
      const completedWithScores = filteredAssignments.filter(a => a.status === 'passed' && a.best_score !== null);
      const passRate = completedWithScores.length > 0 
        ? (completedWithScores.filter(a => a.best_score >= 80).length / completedWithScores.length) * 100 
        : 0;
      const avgScore = completedWithScores.length > 0
        ? completedWithScores.reduce((sum, a) => sum + a.best_score, 0) / completedWithScores.length
        : 0;

      // Active trainees (with at least one assignment)
      const activeTraineeIds = new Set(filteredAssignments.map(a => a.user_id));

      setStats({
        totalTrainees,
        activeTrainees: activeTraineeIds.size,
        totalModules,
        publishedModules,
        totalAssignments,
        completedAssignments,
        passRate: Math.round(passRate),
        avgScore: Math.round(avgScore),
        overdueCount,
        inProgressCount
      });
    } catch (err) {
      console.error('Error loading overview stats:', err);
    }
  };

  const loadModuleStats = async (clientFilter) => {
    try {
      // Get all published modules
      let moduleUrl = 'training_modules?select=id,title,status,pass_score';
      if (clientFilter) {
        moduleUrl += `&client_id=eq.${clientFilter}`;
      }
      moduleUrl += '&status=eq.published';
      
      const modules = await dbFetch(moduleUrl);
      
      // Get all training assignments
      const allTraining = await dbFetch('user_training?select=id,status,best_score,attempts_count,module_id');
      
      const moduleData = modules?.map(module => {
        const assignments = allTraining?.filter(t => t.module_id === module.id) || [];
        // FIXED: Use 'passed' instead of 'completed'
        const completed = assignments.filter(a => a.status === 'passed');
        const passed = completed.filter(a => a.best_score >= (module.pass_score || 80));
        const avgScore = completed.length > 0
          ? completed.reduce((sum, a) => sum + (a.best_score || 0), 0) / completed.length
          : 0;
        const avgAttempts = completed.length > 0
          ? completed.reduce((sum, a) => sum + (a.attempts_count || 1), 0) / completed.length
          : 0;

        return {
          id: module.id,
          title: module.title,
          assigned: assignments.length,
          completed: completed.length,
          passed: passed.length,
          passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
          avgScore: Math.round(avgScore),
          avgAttempts: avgAttempts.toFixed(1),
          completionRate: assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0
        };
      }) || [];

      // Sort by assigned count descending
      moduleData.sort((a, b) => b.assigned - a.assigned);
      setModuleStats(moduleData.slice(0, 10)); // Top 10 modules
    } catch (err) {
      console.error('Error loading module stats:', err);
    }
  };

  const loadTraineeProgress = async (clientFilter) => {
    try {
      // Get trainees
      let traineeUrl = 'profiles?select=id,full_name,email,department,client_id&role=eq.trainee';
      if (clientFilter) {
        traineeUrl += `&client_id=eq.${clientFilter}`;
      }
      traineeUrl += '&limit=50';
      
      const trainees = await dbFetch(traineeUrl);
      
      // Get all training
      const allTraining = await dbFetch('user_training?select=id,status,best_score,due_date,user_id');
      
      // Get client names
      const clientsData = await dbFetch('clients?select=id,name');
      const clientMap = {};
      clientsData?.forEach(c => clientMap[c.id] = c.name);
      
      const today = new Date();
      const traineeData = trainees?.map(trainee => {
        const assignments = allTraining?.filter(t => t.user_id === trainee.id) || [];
        // FIXED: Use 'passed' instead of 'completed'
        const completed = assignments.filter(a => a.status === 'passed').length;
        const overdue = assignments.filter(a => 
          a.due_date && 
          new Date(a.due_date) < today && 
          a.status !== 'passed'
        ).length;
        const scoresArray = assignments.filter(a => a.best_score !== null);
        const avgScore = scoresArray.length > 0
          ? scoresArray.reduce((sum, a) => sum + a.best_score, 0) / scoresArray.length
          : 0;

        return {
          id: trainee.id,
          name: trainee.full_name || trainee.email,
          email: trainee.email,
          department: trainee.department,
          client: clientMap[trainee.client_id],
          total: assignments.length,
          completed,
          overdue,
          avgScore: Math.round(avgScore),
          completionRate: assignments.length > 0 ? Math.round((completed / assignments.length) * 100) : 0
        };
      }) || [];

      // Sort by completion rate ascending (show those needing attention first)
      traineeData.sort((a, b) => {
        if (a.overdue !== b.overdue) return b.overdue - a.overdue; // Most overdue first
        return a.completionRate - b.completionRate;
      });
      
      setTraineeProgress(traineeData);
    } catch (err) {
      console.error('Error loading trainee progress:', err);
    }
  };

  const loadRecentActivity = async (clientFilter, dateLimit) => {
    try {
      // Use user_training_attempts instead of quiz_attempts
      const attempts = await dbFetch(
        `user_training_attempts?select=id,score,passed,completed_at,user_training_id&order=completed_at.desc&limit=20`
      );
      
      if (!attempts || attempts.length === 0) {
        setRecentActivity([]);
        return;
      }
      
      // Get user_training to link to users and modules
      const trainingIds = [...new Set(attempts.map(a => a.user_training_id))];
      const trainingData = await dbFetch(
        `user_training?select=id,user_id,module_id&id=in.(${trainingIds.join(',')})`
      );
      
      // Get user names
      const userIds = [...new Set(trainingData?.map(t => t.user_id) || [])];
      const users = userIds.length > 0 
        ? await dbFetch(`profiles?select=id,full_name,email,client_id&id=in.(${userIds.join(',')})`)
        : [];
      
      // Get module names
      const moduleIds = [...new Set(trainingData?.map(t => t.module_id) || [])];
      const modules = moduleIds.length > 0
        ? await dbFetch(`training_modules?select=id,title&id=in.(${moduleIds.join(',')})`)
        : [];
      
      // Build lookup maps
      const trainingMap = {};
      trainingData?.forEach(t => trainingMap[t.id] = t);
      const userMap = {};
      users?.forEach(u => userMap[u.id] = u);
      const moduleMap = {};
      modules?.forEach(m => moduleMap[m.id] = m);
      
      // Filter by client if needed
      let filteredAttempts = attempts;
      if (clientFilter) {
        filteredAttempts = attempts.filter(a => {
          const training = trainingMap[a.user_training_id];
          const user = training ? userMap[training.user_id] : null;
          return user?.client_id === clientFilter;
        });
      }
      
      // Filter by date
      filteredAttempts = filteredAttempts.filter(a => 
        a.completed_at && new Date(a.completed_at) >= dateLimit
      );
      
      const activity = filteredAttempts.slice(0, 20).map(attempt => {
        const training = trainingMap[attempt.user_training_id];
        const user = training ? userMap[training.user_id] : null;
        const module = training ? moduleMap[training.module_id] : null;
        
        return {
          id: attempt.id,
          trainee: user?.full_name || user?.email || 'Unknown',
          module: module?.title || 'Unknown',
          score: attempt.score,
          passed: attempt.passed,
          date: attempt.completed_at
        };
      });
      
      setRecentActivity(activity);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    }
  };

  const loadCompetencyStats = async (clientFilter) => {
    try {
      // If we have a client filter, only get competencies for trainees in that client
      if (clientFilter) {
        const trainees = await dbFetch(`profiles?select=id&role=eq.trainee&client_id=eq.${clientFilter}`);
        const traineeIds = trainees?.map(t => t.id) || [];
        
        // If no trainees in this client, return empty stats
        if (traineeIds.length === 0) {
          setCompetencyStats({ total: 0, achieved: 0, inProgress: 0 });
          return;
        }
        
        // Get competencies only for these trainees
        const competencies = await dbFetch(
          `user_competencies?select=id,status,user_id&user_id=in.(${traineeIds.join(',')})`
        );
        
        const filtered = competencies || [];
        setCompetencyStats({
          total: filtered.length,
          achieved: filtered.filter(c => c.status === 'achieved').length,
          inProgress: filtered.filter(c => c.status === 'in_progress' || c.status === 'not_started' || c.status === 'assigned').length
        });
      } else {
        // Super admin with no filter - get all
        const competencies = await dbFetch('user_competencies?select=id,status,user_id');
        const filtered = competencies || [];
        setCompetencyStats({
          total: filtered.length,
          achieved: filtered.filter(c => c.status === 'achieved').length,
          inProgress: filtered.filter(c => c.status === 'in_progress' || c.status === 'not_started' || c.status === 'assigned').length
        });
      }
    } catch (err) {
      console.error('Error loading competency stats:', err);
    }
  };

  const loadCoachingStats = async (clientFilter) => {
    try {
      let coachingUrl = 'development_activities?select=id,status,due_date,client_id&type=eq.coaching';
      if (clientFilter) {
        coachingUrl += `&client_id=eq.${clientFilter}`;
      }
      
      const coaching = await dbFetch(coachingUrl);
      
      const today = new Date();
      const overdue = coaching?.filter(c => {
        if (!c.due_date || c.status === 'validated') return false;
        return new Date(c.due_date) < today;
      }).length || 0;
      
      setCoachingStats({
        total: coaching?.length || 0,
        active: coaching?.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length || 0,
        completed: coaching?.filter(c => c.status === 'validated').length || 0,
        overdue
      });
    } catch (err) {
      console.error('Error loading coaching stats:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const completionRate = stats.totalAssignments > 0 
    ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100) 
    : 0;

  const competencyRate = competencyStats.total > 0
    ? Math.round((competencyStats.achieved / competencyStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            Training & Development Reports
          </h1>
          <p className="text-gray-500 mt-1">Analytics and performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filters:</span>
        </div>
        
        {profile?.role === 'super_admin' && (
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Clients</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        )}
        
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Trainees</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrainees}</p>
              <p className="text-xs text-gray-500">{stats.activeTrainees} with training</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-medium">Modules</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalModules}</p>
              <p className="text-xs text-gray-500">{stats.publishedModules} published</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">Competencies</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{competencyStats.total}</p>
              <p className="text-xs text-green-600">{competencyStats.achieved} achieved ({competencyRate}%)</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium">Coaching</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{coachingStats.total}</p>
              <p className="text-xs text-gray-500">{coachingStats.active} active, {coachingStats.completed} done</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-medium">Training</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
              <p className="text-xs text-gray-500">{stats.inProgressCount} pending</p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs font-medium">Overdue</span>
              </div>
              <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.overdueCount}
              </p>
              <p className="text-xs text-gray-500">training items</p>
            </div>
          </div>

          {/* Training Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Completion Rate */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Training Completion
              </h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray={`${completionRate * 3.52} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{completionRate}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  {stats.completedAssignments} of {stats.totalAssignments} completed
                </p>
              </div>
            </div>

            {/* Pass Rate */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Pass Rate
              </h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="12"
                      strokeDasharray={`${stats.passRate * 3.52} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{stats.passRate}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Average Score: {stats.avgScore}%
                </p>
              </div>
            </div>

            {/* Competency Progress */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-500" />
                Competency Achievement
              </h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64" cy="64" r="56"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="12"
                      strokeDasharray={`${competencyRate * 3.52} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">{competencyRate}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  {competencyStats.achieved} of {competencyStats.total} achieved
                </p>
              </div>
            </div>
          </div>

          {/* Module Performance */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Training Module Performance
            </h3>
            <div className="space-y-3">
              {moduleStats.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No module data available</p>
              ) : (
                moduleStats.slice(0, 5).map(module => (
                  <div key={module.id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{module.title}</p>
                      <p className="text-sm text-gray-500">
                        {module.completed}/{module.assigned} completed • {module.passRate}% pass rate
                      </p>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${module.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trainee Progress Table */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-500" />
                Trainee Progress
                {traineeProgress.filter(t => t.overdue > 0).length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                    {traineeProgress.filter(t => t.overdue > 0).length} need attention
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto max-h-80">
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
                    {traineeProgress.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-8 text-gray-500">
                          No trainee data available
                        </td>
                      </tr>
                    ) : (
                      traineeProgress.slice(0, 10).map(trainee => (
                        <tr key={trainee.id} className="hover:bg-gray-50">
                          <td className="py-2 px-3">
                            <p className="font-medium text-gray-900 truncate max-w-[150px]">{trainee.name}</p>
                            <p className="text-xs text-gray-500">{trainee.department || trainee.client}</p>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-gray-900">{trainee.completed}/{trainee.total}</span>
                              <span className="text-xs text-gray-500">({trainee.completionRate}%)</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`font-medium ${trainee.avgScore >= 80 ? 'text-green-600' : trainee.avgScore >= 60 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {trainee.avgScore > 0 ? `${trainee.avgScore}%` : '-'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {trainee.overdue > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                {trainee.overdue} overdue
                              </span>
                            ) : trainee.completionRate === 100 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                <Clock className="w-3 h-3" />
                                In Progress
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Recent Quiz Attempts
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent activity</p>
                ) : (
                  recentActivity.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{activity.trainee}</p>
                        <p className="text-sm text-gray-500 truncate">{activity.module}</p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className={`font-bold ${activity.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {activity.score}%
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                        </div>
                        {activity.passed ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Module Details Table */}
          <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              Module Performance Details
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
                    <th className="text-center py-3 px-4 font-medium text-gray-600">Avg Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moduleStats.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-500">
                        No published modules with assignments
                      </td>
                    </tr>
                  ) : (
                    moduleStats.map(module => (
                      <tr key={module.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900">{module.title}</p>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">{module.assigned}</td>
                        <td className="py-3 px-4 text-center text-gray-700">{module.completed}</td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${module.completionRate >= 80 ? 'bg-green-500' : module.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${module.completionRate}%` }}
                              />
                            </div>
                            <span className="text-gray-700">{module.completionRate}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${module.passRate >= 80 ? 'text-green-600' : module.passRate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                            {module.passRate}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-medium ${module.avgScore >= 80 ? 'text-green-600' : module.avgScore >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                            {module.avgScore}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-700">{module.avgAttempts}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
