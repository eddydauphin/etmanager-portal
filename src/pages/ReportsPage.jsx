import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
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
  const { profile } = useAuth();
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
  const [completionTrend, setCompletionTrend] = useState([]);

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
      let query = supabase.from('clients').select('id, name, code');
      
      if (profile?.role === 'client_admin') {
        query = query.eq('id', profile.client_id);
      }
      
      const { data } = await query.order('name');
      setClients(data || []);
      
      // Set default client for client_admin
      if (profile?.role === 'client_admin' && data?.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const clientFilter = selectedClient !== 'all' ? selectedClient : null;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(dateRange));

      // Load all data in parallel
      await Promise.all([
        loadOverviewStats(clientFilter),
        loadModuleStats(clientFilter),
        loadTraineeProgress(clientFilter),
        loadRecentActivity(clientFilter, dateLimit),
        loadCompletionTrend(clientFilter)
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
      let traineeQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'trainee');
      
      if (clientFilter) {
        traineeQuery = traineeQuery.eq('client_id', clientFilter);
      }
      
      const { count: totalTrainees } = await traineeQuery;

      // Get modules count
      let moduleQuery = supabase
        .from('training_modules')
        .select('id, status', { count: 'exact' });
      
      if (clientFilter) {
        moduleQuery = moduleQuery.eq('client_id', clientFilter);
      }
      
      const { data: modules, count: totalModules } = await moduleQuery;
      const publishedModules = modules?.filter(m => m.status === 'published').length || 0;

      // Get training assignments
      let assignmentQuery = supabase
        .from('user_training')
        .select(`
          id,
          status,
          best_score,
          due_date,
          user_id,
          profiles!inner(client_id)
        `);
      
      if (clientFilter) {
        assignmentQuery = assignmentQuery.eq('profiles.client_id', clientFilter);
      }
      
      const { data: assignments } = await assignmentQuery;
      
      const totalAssignments = assignments?.length || 0;
      const completedAssignments = assignments?.filter(a => a.status === 'completed').length || 0;
      const inProgressCount = assignments?.filter(a => a.status === 'in_progress').length || 0;
      
      // Calculate overdue
      const today = new Date();
      const overdueCount = assignments?.filter(a => 
        a.due_date && 
        new Date(a.due_date) < today && 
        a.status !== 'completed'
      ).length || 0;

      // Calculate pass rate and avg score from completed
      const completedWithScores = assignments?.filter(a => a.status === 'completed' && a.best_score !== null) || [];
      const passRate = completedWithScores.length > 0 
        ? (completedWithScores.filter(a => a.best_score >= 80).length / completedWithScores.length) * 100 
        : 0;
      const avgScore = completedWithScores.length > 0
        ? completedWithScores.reduce((sum, a) => sum + a.best_score, 0) / completedWithScores.length
        : 0;

      // Active trainees (with at least one assignment)
      const activeTraineeIds = new Set(assignments?.map(a => a.user_id) || []);

      setStats({
        totalTrainees: totalTrainees || 0,
        activeTrainees: activeTraineeIds.size,
        totalModules: totalModules || 0,
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
      let query = supabase
        .from('training_modules')
        .select(`
          id,
          title,
          status,
          pass_score,
          user_training(
            id,
            status,
            best_score,
            attempts_count
          )
        `)
        .eq('status', 'published');
      
      if (clientFilter) {
        query = query.eq('client_id', clientFilter);
      }
      
      const { data: modules } = await query;
      
      const moduleData = modules?.map(module => {
        const assignments = module.user_training || [];
        const completed = assignments.filter(a => a.status === 'completed');
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
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          department,
          client_id,
          clients(name),
          user_training(
            id,
            status,
            best_score,
            due_date
          )
        `)
        .eq('role', 'trainee');
      
      if (clientFilter) {
        query = query.eq('client_id', clientFilter);
      }
      
      const { data: trainees } = await query.limit(50);
      
      const today = new Date();
      const traineeData = trainees?.map(trainee => {
        const assignments = trainee.user_training || [];
        const completed = assignments.filter(a => a.status === 'completed').length;
        const overdue = assignments.filter(a => 
          a.due_date && 
          new Date(a.due_date) < today && 
          a.status !== 'completed'
        ).length;
        const avgScore = assignments.filter(a => a.best_score !== null).length > 0
          ? assignments.filter(a => a.best_score !== null).reduce((sum, a) => sum + a.best_score, 0) / 
            assignments.filter(a => a.best_score !== null).length
          : 0;

        return {
          id: trainee.id,
          name: trainee.full_name || trainee.email,
          email: trainee.email,
          department: trainee.department,
          client: trainee.clients?.name,
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
      let query = supabase
        .from('quiz_attempts')
        .select(`
          id,
          score,
          passed,
          completed_at,
          user_id,
          module_id,
          profiles!inner(full_name, email, client_id),
          training_modules(title)
        `)
        .not('completed_at', 'is', null)
        .gte('completed_at', dateLimit.toISOString())
        .order('completed_at', { ascending: false });
      
      if (clientFilter) {
        query = query.eq('profiles.client_id', clientFilter);
      }
      
      const { data: attempts } = await query.limit(20);
      
      const activity = attempts?.map(attempt => ({
        id: attempt.id,
        trainee: attempt.profiles?.full_name || attempt.profiles?.email,
        module: attempt.training_modules?.title,
        score: attempt.score,
        passed: attempt.passed,
        date: attempt.completed_at
      })) || [];
      
      setRecentActivity(activity);
    } catch (err) {
      console.error('Error loading recent activity:', err);
    }
  };

  const loadCompletionTrend = async (clientFilter) => {
    try {
      // Get completions grouped by week for last 8 weeks
      const weeks = [];
      const today = new Date();
      
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        weeks.push({
          start: weekStart,
          end: weekEnd,
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
        });
      }

      let query = supabase
        .from('user_training')
        .select(`
          id,
          completed_at,
          status,
          profiles!inner(client_id)
        `)
        .eq('status', 'completed')
        .not('completed_at', 'is', null);
      
      if (clientFilter) {
        query = query.eq('profiles.client_id', clientFilter);
      }
      
      const { data: completions } = await query;
      
      const trendData = weeks.map(week => {
        const count = completions?.filter(c => {
          const completedDate = new Date(c.completed_at);
          return completedDate >= week.start && completedDate <= week.end;
        }).length || 0;
        
        return {
          week: week.label,
          completions: count
        };
      });
      
      setCompletionTrend(trendData);
    } catch (err) {
      console.error('Error loading completion trend:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const exportToCSV = () => {
    // Export trainee progress data
    const headers = ['Name', 'Email', 'Department', 'Client', 'Assigned', 'Completed', 'Overdue', 'Avg Score', 'Completion %'];
    const rows = traineeProgress.map(t => [
      t.name,
      t.email,
      t.department || '',
      t.client || '',
      t.total,
      t.completed,
      t.overdue,
      t.avgScore,
      t.completionRate
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Find max for trend chart
  const maxCompletions = Math.max(...completionTrend.map(t => t.completions), 1);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Analytics</h1>
          <p className="text-gray-600">Monitor training progress and performance</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Client Filter */}
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
          
          {/* Date Range Filter */}
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
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-500">Active: {stats.activeTrainees}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTrainees}</p>
              <p className="text-sm text-gray-600">Total Trainees</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-gray-500">Published: {stats.publishedModules}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalModules}</p>
              <p className="text-sm text-gray-600">Training Modules</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-xs text-gray-500">{stats.completedAssignments} of {stats.totalAssignments}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalAssignments > 0 
                  ? Math.round((stats.completedAssignments / stats.totalAssignments) * 100) 
                  : 0}%
              </p>
              <p className="text-sm text-gray-600">Completion Rate</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-xs text-gray-500">Avg: {stats.avgScore}%</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.passRate}%</p>
              <p className="text-sm text-gray-600">Pass Rate</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-xs text-gray-500">In Progress: {stats.inProgressCount}</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
              <p className="text-sm text-gray-600">Overdue</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Completion Trend Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Completion Trend (8 Weeks)
              </h3>
              <div className="h-48 flex items-end justify-between gap-2">
                {completionTrend.map((week, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t-md transition-all duration-300 hover:bg-blue-600"
                      style={{ 
                        height: `${(week.completions / maxCompletions) * 100}%`,
                        minHeight: week.completions > 0 ? '8px' : '2px'
                      }}
                      title={`${week.completions} completions`}
                    />
                    <span className="text-xs text-gray-500 mt-2">{week.week}</span>
                    <span className="text-xs font-medium text-gray-700">{week.completions}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Module Performance */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Top Modules by Assignment
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {moduleStats.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No module data available</p>
                ) : (
                  moduleStats.slice(0, 5).map((module, index) => (
                    <div key={module.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400 w-4">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{module.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{module.assigned} assigned</span>
                          <span>•</span>
                          <span>{module.completionRate}% complete</span>
                          <span>•</span>
                          <span className={module.passRate >= 80 ? 'text-green-600' : 'text-orange-600'}>
                            {module.passRate}% pass
                          </span>
                        </div>
                      </div>
                      <div className="w-16 bg-gray-100 rounded-full h-2">
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
