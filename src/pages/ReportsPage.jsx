import { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  User,
  ChevronDown,
  X,
  Search,
  Loader2
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
  
  // User selection for individual reports
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [reportMode, setReportMode] = useState('organization'); // 'organization' or 'individual'
  
  // PDF generation
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const reportRef = useRef(null);
  
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
  
  // Individual user report data
  const [individualReport, setIndividualReport] = useState(null);
  const [competencyDetails, setCompetencyDetails] = useState([]);
  const [coachingDetails, setCoachingDetails] = useState([]);
  const [trainingDetails, setTrainingDetails] = useState([]);

  useEffect(() => {
    loadClients();
    loadUsers();
  }, [profile]);

  useEffect(() => {
    if (profile) {
      if (reportMode === 'organization') {
        loadAnalytics();
      } else if (selectedUsers.length > 0) {
        loadIndividualReport();
      }
    }
  }, [profile, selectedClient, dateRange, reportMode, selectedUsers]);

  const loadClients = async () => {
    try {
      let url = 'clients?select=id,name,code&order=name.asc';
      
      if (profile?.role === 'client_admin' || profile?.role === 'team_lead' ||
          profile?.role === 'site_admin' || profile?.role === 'category_admin') {
        url += `&id=eq.${clientId}`;
      }
      
      const data = await dbFetch(url);
      setClients(data || []);
      
      // Set default client for non-super_admin
      if ((profile?.role !== 'super_admin') && data?.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role,department,reports_to_id,client_id&is_active=eq.true&order=full_name.asc';
      
      // Filter based on role permissions
      if (profile?.role === 'trainee') {
        // Trainees can only see themselves
        url += `&id=eq.${profile.id}`;
      } else if (profile?.role === 'team_lead') {
        // Team leads see themselves + direct reports
        url += `&or=(id.eq.${profile.id},reports_to_id.eq.${profile.id})`;
      } else if (profile?.role === 'site_admin' || profile?.role === 'category_admin' || profile?.role === 'client_admin') {
        // Admins see their organization
        url += `&client_id=eq.${clientId}`;
      }
      // Super admin sees all
      
      const data = await dbFetch(url);
      setUsers(data || []);
      
      // For trainees, auto-select themselves
      if (profile?.role === 'trainee' && data?.length > 0) {
        setSelectedUsers([data[0].id]);
        setReportMode('individual');
      }
    } catch (err) {
      console.error('Error loading users:', err);
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

  const loadIndividualReport = async () => {
    if (selectedUsers.length === 0) return;
    
    setLoading(true);
    try {
      const userIds = selectedUsers;
      
      // Load user details
      const usersData = await dbFetch(
        `profiles?select=*&id=in.(${userIds.join(',')})`
      );
      
      // Load competencies for selected users
      const competencies = await dbFetch(
        `user_competencies?select=*,competencies(id,name,description)&user_id=in.(${userIds.join(',')})`
      );
      
      // Load coaching activities
      const coaching = await dbFetch(
        `development_activities?select=*,coach:coach_id(full_name),competencies(name)&trainee_id=in.(${userIds.join(',')})&order=created_at.desc`
      );
      
      // Load training
      const training = await dbFetch(
        `user_training?select=*,training_modules(title,pass_score)&user_id=in.(${userIds.join(',')})&order=created_at.desc`
      );
      
      // Calculate stats for selected users
      const totalCompetencies = competencies?.length || 0;
      const achievedCompetencies = competencies?.filter(c => c.status === 'achieved' || (c.current_level >= c.target_level)).length || 0;
      
      const totalCoaching = coaching?.length || 0;
      const activeCoaching = coaching?.filter(c => !['validated', 'cancelled'].includes(c.status)).length || 0;
      const completedCoaching = coaching?.filter(c => c.status === 'validated').length || 0;
      
      const totalTraining = training?.length || 0;
      const passedTraining = training?.filter(t => t.status === 'passed').length || 0;
      const scoresArray = training?.filter(t => t.best_score != null) || [];
      const avgScore = scoresArray.length > 0 
        ? scoresArray.reduce((sum, t) => sum + t.best_score, 0) / scoresArray.length
        : 0;
      
      setIndividualReport({
        users: usersData || [],
        stats: {
          totalCompetencies,
          achievedCompetencies,
          competencyRate: totalCompetencies > 0 ? Math.round((achievedCompetencies / totalCompetencies) * 100) : 0,
          totalCoaching,
          activeCoaching,
          completedCoaching,
          totalTraining,
          passedTraining,
          trainingRate: totalTraining > 0 ? Math.round((passedTraining / totalTraining) * 100) : 0,
          avgScore: Math.round(avgScore) || 0
        }
      });
      
      setCompetencyDetails(competencies || []);
      setCoachingDetails(coaching || []);
      setTrainingDetails(training || []);
      
    } catch (err) {
      console.error('Error loading individual report:', err);
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
    if (reportMode === 'organization') {
      await loadAnalytics();
    } else {
      await loadIndividualReport();
    }
    setRefreshing(false);
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const generatePDF = async () => {
    setGeneratingPdf(true);
    try {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Training & Development Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
            h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
            h2 { color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
            .stat-card { padding: 16px; background: #f9fafb; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: bold; color: #111827; }
            .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: 600; font-size: 12px; text-transform: uppercase; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
            .badge-green { background: #d1fae5; color: #065f46; }
            .badge-yellow { background: #fef3c7; color: #92400e; }
            .badge-red { background: #fee2e2; color: #991b1b; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; border-radius: 4px; }
            .text-green { color: #059669; }
            .text-yellow { color: #d97706; }
            .text-red { color: #dc2626; }
            @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h1>📊 Training & Development Report</h1>
          <p style="color: #6b7280;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          ${reportMode === 'individual' && individualReport ? `
            <h2>👤 Individual Report: ${individualReport.users.map(u => u.full_name).join(', ')}</h2>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-value text-green">${individualReport.stats.competencyRate}%</div><div class="stat-label">Competency Achievement</div></div>
              <div class="stat-card"><div class="stat-value text-green">${individualReport.stats.trainingRate}%</div><div class="stat-label">Training Completion</div></div>
              <div class="stat-card"><div class="stat-value">${individualReport.stats.avgScore}%</div><div class="stat-label">Average Score</div></div>
              <div class="stat-card"><div class="stat-value">${individualReport.stats.activeCoaching}</div><div class="stat-label">Active Coaching</div></div>
            </div>
            <h2>🎯 Competency Maturity (${competencyDetails.length})</h2>
            <table><thead><tr><th>Competency</th><th>Current</th><th>Target</th><th>Status</th></tr></thead><tbody>
            ${competencyDetails.map(c => `<tr><td>${c.competencies?.name || 'Unknown'}</td><td>${c.current_level || 0}</td><td>${c.target_level || 3}</td><td><span class="badge ${c.status === 'achieved' ? 'badge-green' : 'badge-yellow'}">${c.status}</span></td></tr>`).join('')}
            </tbody></table>
            <h2>👥 Coaching Activities (${coachingDetails.length})</h2>
            <table><thead><tr><th>Activity</th><th>Coach</th><th>Status</th></tr></thead><tbody>
            ${coachingDetails.map(c => `<tr><td>${c.title}</td><td>${c.coach?.full_name || '-'}</td><td><span class="badge ${c.status === 'validated' ? 'badge-green' : 'badge-yellow'}">${c.status}</span></td></tr>`).join('')}
            </tbody></table>
            <h2>📚 Training Progress (${trainingDetails.length})</h2>
            <table><thead><tr><th>Module</th><th>Score</th><th>Status</th></tr></thead><tbody>
            ${trainingDetails.map(t => `<tr><td>${t.training_modules?.title || 'Unknown'}</td><td>${t.best_score != null ? t.best_score + '%' : '-'}</td><td><span class="badge ${t.status === 'passed' ? 'badge-green' : t.status === 'failed' ? 'badge-red' : 'badge-yellow'}">${t.status}</span></td></tr>`).join('')}
            </tbody></table>
          ` : `
            <h2>📈 Organization Overview</h2>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-value">${stats.totalTrainees}</div><div class="stat-label">Total Trainees</div></div>
              <div class="stat-card"><div class="stat-value">${stats.publishedModules}</div><div class="stat-label">Published Modules</div></div>
              <div class="stat-card"><div class="stat-value">${competencyStats.achieved}/${competencyStats.total}</div><div class="stat-label">Competencies Achieved</div></div>
              <div class="stat-card"><div class="stat-value">${coachingStats.active}</div><div class="stat-label">Active Coaching</div></div>
            </div>
            <div class="stats-grid">
              <div class="stat-card"><div class="stat-value text-green">${completionRate}%</div><div class="stat-label">Training Completion</div></div>
              <div class="stat-card"><div class="stat-value">${stats.passRate}%</div><div class="stat-label">Pass Rate</div></div>
              <div class="stat-card"><div class="stat-value">${stats.avgScore}%</div><div class="stat-label">Average Score</div></div>
              <div class="stat-card"><div class="stat-value ${stats.overdueCount > 0 ? 'text-red' : ''}">${stats.overdueCount}</div><div class="stat-label">Overdue Items</div></div>
            </div>
            <h2>📚 Training Module Performance</h2>
            <table><thead><tr><th>Module</th><th>Assigned</th><th>Completed</th><th>Pass Rate</th><th>Avg Score</th></tr></thead><tbody>
            ${moduleStats.map(m => `<tr><td>${m.title}</td><td>${m.assigned}</td><td>${m.completed}</td><td>${m.passRate}%</td><td>${m.avgScore}%</td></tr>`).join('')}
            </tbody></table>
            <h2>👥 Trainee Progress</h2>
            <table><thead><tr><th>Name</th><th>Total</th><th>Completed</th><th>Overdue</th><th>Avg Score</th></tr></thead><tbody>
            ${traineeProgress.slice(0, 20).map(t => `<tr><td>${t.name}</td><td>${t.total}</td><td>${t.completed}</td><td style="color: ${t.overdue > 0 ? '#dc2626' : '#111827'}">${t.overdue}</td><td>${t.avgScore}%</td></tr>`).join('')}
            </tbody></table>
          `}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 250);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
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

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': case 'passed': case 'validated': return 'bg-green-100 text-green-700';
      case 'in_progress': case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

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
          <button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Mode & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Report Mode Toggle */}
          {profile?.role !== 'trainee' && (
            <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => setReportMode('organization')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reportMode === 'organization' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Organization
              </button>
              <button
                onClick={() => setReportMode('individual')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  reportMode === 'individual' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="w-4 h-4 inline mr-2" />
                Individual
              </button>
            </div>
          )}

          {/* User Selector (for individual mode) */}
          {reportMode === 'individual' && profile?.role !== 'trainee' && (
            <div className="relative">
              <button
                onClick={() => setShowUserSelector(!showUserSelector)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm">
                  {selectedUsers.length === 0 
                    ? 'Select Users' 
                    : `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showUserSelector && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        placeholder="Search users..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={handleSelectAll}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2">
                    {filteredUsers.map(user => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleUserToggle(user.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded capitalize">
                          {user.role?.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowUserSelector(false)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                    >
                      Apply Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Client Filter (for organization mode & super_admin) */}
          {reportMode === 'organization' && profile?.role === 'super_admin' && (
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
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
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
        </div>

        {/* Selected Users Tags */}
        {reportMode === 'individual' && selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {selectedUsers.map(userId => {
              const user = users.find(u => u.id === userId);
              return (
                <span
                  key={userId}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
                >
                  {user?.full_name}
                  <button onClick={() => handleUserToggle(userId)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reportMode === 'individual' ? (
        // Individual Report
        selectedUsers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Users</h3>
            <p className="text-gray-500">Choose one or more users to generate their individual report</p>
          </div>
        ) : individualReport ? (
          <div className="space-y-6">
            {/* Individual Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Target className="w-5 h-5" />
                  <span className="text-sm font-medium">Competency Achievement</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{individualReport.stats.competencyRate}%</p>
                <p className="text-sm text-gray-500 mt-1">{individualReport.stats.achievedCompetencies} of {individualReport.stats.totalCompetencies}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-sm font-medium">Training Completion</span>
                </div>
                <p className="text-3xl font-bold text-green-600">{individualReport.stats.trainingRate}%</p>
                <p className="text-sm text-gray-500 mt-1">{individualReport.stats.passedTraining} of {individualReport.stats.totalTraining}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-sm font-medium">Average Score</span>
                </div>
                <p className="text-3xl font-bold text-amber-600">{individualReport.stats.avgScore}%</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-medium">Active Coaching</span>
                </div>
                <p className="text-3xl font-bold text-purple-600">{individualReport.stats.activeCoaching}</p>
                <p className="text-sm text-gray-500 mt-1">{individualReport.stats.completedCoaching} completed</p>
              </div>
            </div>

            {/* Competency Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Competency Maturity ({competencyDetails.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Competency</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Current</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Target</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Gap</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {competencyDetails.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No competencies assigned</td></tr>
                    ) : competencyDetails.map(comp => {
                      const gap = (comp.target_level || 3) - (comp.current_level || 0);
                      return (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{comp.competencies?.name || 'Unknown'}</td>
                          <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold">{comp.current_level || 0}</span></td>
                          <td className="py-3 px-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold">{comp.target_level || 3}</span></td>
                          <td className="py-3 px-4 text-center"><span className={`font-medium ${gap > 0 ? 'text-amber-600' : 'text-green-600'}`}>{gap > 0 ? `-${gap}` : '✓'}</span></td>
                          <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comp.status)}`}>{comp.status || 'assigned'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Coaching Activities */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Coaching Activities ({coachingDetails.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Activity</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Coach</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Competency</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Due Date</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coachingDetails.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No coaching activities</td></tr>
                    ) : coachingDetails.map(coaching => (
                      <tr key={coaching.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{coaching.title}</td>
                        <td className="py-3 px-4 text-gray-600">{coaching.coach?.full_name || 'Not assigned'}</td>
                        <td className="py-3 px-4 text-gray-600">{coaching.competencies?.name || '-'}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{coaching.due_date ? new Date(coaching.due_date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coaching.status)}`}>{coaching.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Training Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Training Progress ({trainingDetails.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Module</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Best Score</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Attempts</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Due Date</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {trainingDetails.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-gray-500">No training assigned</td></tr>
                    ) : trainingDetails.map(training => (
                      <tr key={training.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{training.training_modules?.title || 'Unknown'}</td>
                        <td className="py-3 px-4 text-center"><span className={`font-medium ${training.best_score >= 80 ? 'text-green-600' : training.best_score >= 60 ? 'text-amber-600' : 'text-gray-600'}`}>{training.best_score != null ? `${training.best_score}%` : '-'}</span></td>
                        <td className="py-3 px-4 text-center text-gray-600">{training.attempts_count || 0}</td>
                        <td className="py-3 px-4 text-center text-gray-600">{training.due_date ? new Date(training.due_date).toLocaleDateString() : '-'}</td>
                        <td className="py-3 px-4 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(training.status)}`}>{training.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null
      ) : (
        // Organization Report
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
