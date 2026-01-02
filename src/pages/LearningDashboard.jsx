// ============================================================================
// E&T MANAGER - LEARNING DASHBOARD V2
// Multiple layout styles + fully customizable widget dashboard
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  BookOpen, Users, UserPlus, Award, Target, Clock, CheckCircle,
  AlertTriangle, TrendingUp, Calendar, ArrowRight, Sparkles,
  BarChart3, GraduationCap, Star, Zap, Coffee, Briefcase, Layout,
  ChevronRight, Activity, PieChart, Bell, Settings, Play, FileText,
  Shield, Grid3X3, Layers, Maximize2, Minimize2, Plus, X, Move,
  Eye, EyeOff, RefreshCw, ChevronDown, MessageSquare, Trophy,
  Flame, Heart, Compass, Building2, Palette, LayoutDashboard,
  LayoutGrid, LayoutList, Boxes, Grip, Check
} from 'lucide-react';

// ============================================================================
// LAYOUT DEFINITIONS
// ============================================================================

const layouts = {
  classic: {
    name: 'Classic',
    icon: LayoutDashboard,
    description: 'Traditional dashboard with sidebar KPIs',
    preview: '📊'
  },
  magazine: {
    name: 'Magazine',
    icon: LayoutGrid,
    description: 'Card-based, visual storytelling',
    preview: '📰'
  },
  command: {
    name: 'Command Center',
    icon: Boxes,
    description: 'Dense data, monitoring style',
    preview: '🖥️'
  },
  focus: {
    name: 'Focus',
    icon: Target,
    description: 'Minimal, single-task oriented',
    preview: '🎯'
  },
  custom: {
    name: 'Custom',
    icon: Grip,
    description: 'Build your own dashboard',
    preview: '🛠️'
  }
};

// ============================================================================
// AVAILABLE WIDGETS FOR CUSTOM DASHBOARD
// ============================================================================

const availableWidgets = {
  welcome: { name: 'Welcome Card', icon: Heart, category: 'Overview', size: 'large' },
  kpiStrip: { name: 'KPI Strip', icon: BarChart3, category: 'Metrics', size: 'full' },
  teamStatus: { name: 'Team Status', icon: Users, category: 'People', size: 'medium' },
  quickActions: { name: 'Quick Actions', icon: Zap, category: 'Actions', size: 'medium' },
  trainingProgress: { name: 'Training Progress', icon: TrendingUp, category: 'Training', size: 'medium' },
  recentActivity: { name: 'Recent Activity', icon: Activity, category: 'Activity', size: 'medium' },
  overdueAlerts: { name: 'Overdue Alerts', icon: AlertTriangle, category: 'Alerts', size: 'small' },
  quizScores: { name: 'Quiz Scores', icon: Award, category: 'Metrics', size: 'small' },
  moduleLibrary: { name: 'Module Library', icon: BookOpen, category: 'Training', size: 'medium' },
  calendar: { name: 'Upcoming Deadlines', icon: Calendar, category: 'Planning', size: 'medium' },
  leaderboard: { name: 'Leaderboard', icon: Trophy, category: 'Engagement', size: 'medium' },
  competencyMap: { name: 'Competency Coverage', icon: Target, category: 'Competencies', size: 'large' },
  coachingQueue: { name: 'Coaching Queue', icon: MessageSquare, category: 'Coaching', size: 'small' },
  streaks: { name: 'Learning Streaks', icon: Flame, category: 'Engagement', size: 'small' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LearningDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [currentLayout, setCurrentLayout] = useState('classic');
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Custom dashboard state
  const [activeWidgets, setActiveWidgets] = useState(['welcome', 'kpiStrip', 'quickActions', 'teamStatus', 'trainingProgress', 'recentActivity']);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  
  // Data state
  const [stats, setStats] = useState({
    totalTrainees: 0,
    activeTrainees: 0,
    trainingCompleted: 0,
    trainingPending: 0,
    overdueCount: 0,
    avgQuizScore: 0,
    publishedModules: 0,
    totalModules: 0,
    completionRate: 0
  });
  const [traineeStatuses, setTraineeStatuses] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.client_id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const trainees = await dbFetch(
        `profiles?client_id=eq.${profile.client_id}&role=eq.trainee&is_active=eq.true&select=id,full_name,email`
      );

      const userTraining = await dbFetch(
        `user_training?select=*,profiles!user_id(full_name,client_id),training_modules(title)&profiles.client_id=eq.${profile.client_id}`
      );

      const modules = await dbFetch(
        `training_modules?client_id=eq.${profile.client_id}&select=id,title,status`
      );

      const completed = userTraining?.filter(t => t.status === 'passed') || [];
      const pending = userTraining?.filter(t => t.status === 'pending' || t.status === 'in_progress') || [];
      const overdue = userTraining?.filter(t => 
        t.due_date && new Date(t.due_date) < new Date() && t.status !== 'passed'
      ) || [];
      
      const scores = completed.filter(t => t.best_score).map(t => t.best_score);
      const avgScore = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

      const traineeStatusList = (trainees || []).map(trainee => {
        const traineeTraining = userTraining?.filter(t => t.user_id === trainee.id) || [];
        const completedCount = traineeTraining.filter(t => t.status === 'passed').length;
        const overdueCount = traineeTraining.filter(t => 
          t.due_date && new Date(t.due_date) < new Date() && t.status !== 'passed'
        ).length;
        const totalAssigned = traineeTraining.length;

        let status = 'green';
        if (overdueCount > 0) status = 'red';
        else if (totalAssigned > 0 && completedCount < totalAssigned * 0.5) status = 'yellow';

        return { ...trainee, status, completed: completedCount, total: totalAssigned, overdue: overdueCount };
      });

      const total = completed.length + pending.length;
      
      setStats({
        totalTrainees: trainees?.length || 0,
        activeTrainees: traineeStatusList.filter(t => t.total > 0).length,
        trainingCompleted: completed.length,
        trainingPending: pending.length,
        overdueCount: overdue.length,
        avgQuizScore: avgScore,
        publishedModules: modules?.filter(m => m.status === 'published').length || 0,
        totalModules: modules?.length || 0,
        completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0
      });

      setTraineeStatuses(traineeStatusList);
      
      // Upcoming deadlines
      const upcoming = userTraining
        ?.filter(t => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'passed')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5) || [];
      setUpcomingDeadlines(upcoming);

      setRecentActivity([
        { type: 'completion', user: 'Jean Martin', action: 'completed', item: 'Hand Washing', time: '2h ago', icon: CheckCircle },
        { type: 'assigned', user: 'Marie Dupont', action: 'was assigned', item: 'Food Safety', time: '4h ago', icon: BookOpen },
        { type: 'quiz', user: 'Pierre Bernard', action: 'scored 95% on', item: 'Safety Quiz', time: '1d ago', icon: Award },
        { type: 'started', user: 'Sophie Leroy', action: 'started', item: 'Hygiene Basics', time: '1d ago', icon: Play },
      ]);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // WIDGET COMPONENTS
  // ============================================================================

  const WelcomeWidget = ({ compact = false }) => (
    <div className={`bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl ${compact ? 'p-4' : 'p-6 lg:p-8'} text-white relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="relative z-10">
        <p className="text-white/70 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h2 className={`${compact ? 'text-xl' : 'text-2xl lg:text-3xl'} font-bold mt-1`}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
        </h2>
        {!compact && (
          <p className="text-white/80 mt-2 max-w-md">
            {stats.overdueCount > 0 
              ? `${stats.overdueCount} training${stats.overdueCount > 1 ? 's' : ''} need attention.`
              : 'All training is on track!'}
          </p>
        )}
      </div>
    </div>
  );

  const KPIStripWidget = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Completed', value: stats.trainingCompleted, icon: CheckCircle, color: 'emerald' },
        { label: 'Overdue', value: stats.overdueCount, icon: AlertTriangle, color: stats.overdueCount > 0 ? 'red' : 'emerald' },
        { label: 'Avg Score', value: `${stats.avgQuizScore}%`, icon: Target, color: stats.avgQuizScore >= 80 ? 'emerald' : 'amber' },
        { label: 'Trainees', value: stats.totalTrainees, icon: Users, color: 'blue' },
      ].map((kpi, i) => (
        <div key={i} className={`bg-${kpi.color}-50 border border-${kpi.color}-200 rounded-xl p-4 flex items-center gap-3`}>
          <div className={`p-2 bg-${kpi.color}-100 rounded-lg`}>
            <kpi.icon className={`w-5 h-5 text-${kpi.color}-600`} />
          </div>
          <div>
            <p className={`text-xl font-bold text-${kpi.color}-700`}>{kpi.value}</p>
            <p className="text-xs text-gray-500">{kpi.label}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const TeamStatusWidget = ({ compact = false }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          Team Status
        </h3>
        <div className="flex gap-1">
          {['🟢', '🟡', '🔴'].map((dot, i) => <span key={i} className="text-xs">{dot}</span>)}
        </div>
      </div>
      <div className="space-y-2">
        {traineeStatuses.slice(0, compact ? 4 : 6).map(trainee => (
          <div key={trainee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/users`)}>
            <span className={`w-2.5 h-2.5 rounded-full ${trainee.status === 'green' ? 'bg-emerald-500' : trainee.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{trainee.full_name}</p>
              <p className="text-xs text-gray-500">{trainee.completed}/{trainee.total}</p>
            </div>
            {trainee.overdue > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{trainee.overdue}</span>}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/users')} className="w-full mt-3 text-sm text-purple-600 hover:underline">View all →</button>
    </div>
  );

  const QuickActionsWidget = ({ variant = 'grid' }) => {
    const actions = [
      { icon: UserPlus, label: 'Add Team Lead', path: '/users?action=add&role=team_lead', primary: true },
      { icon: Users, label: 'Add User', path: '/users?action=add' },
      { icon: BookOpen, label: 'Create Training', path: '/training?action=create' },
      { icon: BarChart3, label: 'View Reports', path: '/reports' },
    ];
    
    if (variant === 'list') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
          </h3>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-left">
                <action.icon className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-700">{action.label}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
              </button>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action, i) => (
            <button key={i} onClick={() => navigate(action.path)} className={`p-3 rounded-xl text-left transition-all hover:scale-[1.02] ${action.primary ? 'bg-purple-600 text-white' : 'bg-gray-50 hover:bg-gray-100'}`}>
              <action.icon className={`w-5 h-5 mb-2 ${action.primary ? 'text-purple-200' : 'text-gray-400'}`} />
              <p className={`text-sm font-medium ${action.primary ? '' : 'text-gray-700'}`}>{action.label}</p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const TrainingProgressWidget = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-blue-600" /> Training Progress
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Completion Rate</span>
            <span className="font-semibold">{stats.completionRate}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Published Modules</span>
            <span className="font-semibold">{stats.publishedModules}/{stats.totalModules}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" style={{ width: `${stats.totalModules > 0 ? (stats.publishedModules / stats.totalModules) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );

  const RecentActivityWidget = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-green-600" /> Recent Activity
      </h3>
      <div className="space-y-3">
        {recentActivity.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <item.icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 truncate">
                <span className="font-medium">{item.user}</span> {item.action} <span className="font-medium">{item.item}</span>
              </p>
            </div>
            <span className="text-xs text-gray-400">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const OverdueAlertsWidget = () => (
    <div className={`rounded-xl border p-4 ${stats.overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${stats.overdueCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
          <AlertTriangle className={`w-5 h-5 ${stats.overdueCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
        </div>
        <div>
          <p className={`text-2xl font-bold ${stats.overdueCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{stats.overdueCount}</p>
          <p className="text-xs text-gray-600">Overdue Training</p>
        </div>
      </div>
    </div>
  );

  const QuizScoresWidget = () => (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Award className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-amber-700">{stats.avgQuizScore}%</p>
          <p className="text-xs text-gray-600">Avg Quiz Score</p>
        </div>
      </div>
    </div>
  );

  const ModuleLibraryWidget = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-indigo-600" /> Training Library
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-4 bg-indigo-50 rounded-xl">
          <p className="text-3xl font-bold text-indigo-600">{stats.publishedModules}</p>
          <p className="text-xs text-gray-500">Published</p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-xl">
          <p className="text-3xl font-bold text-gray-600">{stats.totalModules - stats.publishedModules}</p>
          <p className="text-xs text-gray-500">In Dev</p>
        </div>
      </div>
      <button onClick={() => navigate('/training')} className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors">
        Manage Training
      </button>
    </div>
  );

  const CalendarWidget = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-rose-600" /> Upcoming Deadlines
      </h3>
      <div className="space-y-2">
        {upcomingDeadlines.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No upcoming deadlines</p>
        ) : (
          upcomingDeadlines.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500">{new Date(item.due_date).toLocaleDateString('en-US', { month: 'short' })}</p>
                <p className="text-lg font-bold text-gray-900">{new Date(item.due_date).getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{item.training_modules?.title}</p>
                <p className="text-xs text-gray-500">{item.profiles?.full_name}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const LeaderboardWidget = () => {
    const topTrainees = traineeStatuses.filter(t => t.total > 0).sort((a, b) => b.completed - a.completed).slice(0, 5);
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /> Leaderboard
        </h3>
        <div className="space-y-2">
          {topTrainees.map((trainee, i) => (
            <div key={trainee.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{trainee.full_name}</p>
              </div>
              <span className="text-sm font-semibold text-purple-600">{trainee.completed}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const StreaksWidget = () => (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Flame className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-700">12</p>
          <p className="text-xs text-gray-600">Day Streak</p>
        </div>
      </div>
    </div>
  );

  const CoachingQueueWidget = () => (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-100 rounded-lg">
          <MessageSquare className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <p className="text-2xl font-bold text-cyan-700">3</p>
          <p className="text-xs text-gray-600">Coaching Pending</p>
        </div>
      </div>
    </div>
  );

  // Widget renderer
  const renderWidget = (widgetId) => {
    const widgets = {
      welcome: <WelcomeWidget />,
      kpiStrip: <KPIStripWidget />,
      teamStatus: <TeamStatusWidget />,
      quickActions: <QuickActionsWidget />,
      trainingProgress: <TrainingProgressWidget />,
      recentActivity: <RecentActivityWidget />,
      overdueAlerts: <OverdueAlertsWidget />,
      quizScores: <QuizScoresWidget />,
      moduleLibrary: <ModuleLibraryWidget />,
      calendar: <CalendarWidget />,
      leaderboard: <LeaderboardWidget />,
      streaks: <StreaksWidget />,
      coachingQueue: <CoachingQueueWidget />,
    };
    return widgets[widgetId] || null;
  };

  // ============================================================================
  // LAYOUT RENDERERS
  // ============================================================================

  // CLASSIC LAYOUT
  const ClassicLayout = () => (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <WelcomeWidget />
        <QuickActionsWidget />
        <TrainingProgressWidget />
        <RecentActivityWidget />
      </div>
      <div className="col-span-12 lg:col-span-4 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Key Metrics</h3>
          <div className="space-y-3">
            <OverdueAlertsWidget />
            <QuizScoresWidget />
            <StreaksWidget />
            <CoachingQueueWidget />
          </div>
        </div>
        <TeamStatusWidget />
      </div>
    </div>
  );

  // MAGAZINE LAYOUT - Visual cards, storytelling
  const MagazineLayout = () => (
    <div className="space-y-6">
      <WelcomeWidget />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/reports')}>
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mb-3">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.trainingCompleted}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-all cursor-pointer">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3 ${stats.overdueCount > 0 ? 'bg-gradient-to-br from-red-400 to-rose-500' : 'bg-gradient-to-br from-emerald-400 to-green-500'}`}>
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.overdueCount}</p>
          <p className="text-sm text-gray-500">Overdue</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-all cursor-pointer">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-3">
            <Award className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.avgQuizScore}%</p>
          <p className="text-sm text-gray-500">Avg Score</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/users')}>
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-3">
            <Users className="w-8 h-8 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalTrainees}</p>
          <p className="text-sm text-gray-500">Trainees</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RecentActivityWidget />
        </div>
        <LeaderboardWidget />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActionsWidget variant="list" />
        <CalendarWidget />
      </div>
    </div>
  );

  // COMMAND CENTER - Dense data, monitoring
  const CommandLayout = () => (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${stats.overdueCount === 0 ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm">System Status</span>
          </div>
          <div className="text-sm text-slate-400">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
        <button onClick={loadDashboardData} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {/* Main metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'TOTAL TRAINEES', value: stats.totalTrainees, color: 'blue' },
          { label: 'ACTIVE NOW', value: stats.activeTrainees, color: 'green' },
          { label: 'COMPLETED', value: stats.trainingCompleted, color: 'emerald' },
          { label: 'IN PROGRESS', value: stats.trainingPending, color: 'amber' },
          { label: 'OVERDUE', value: stats.overdueCount, color: stats.overdueCount > 0 ? 'red' : 'emerald' },
          { label: 'AVG SCORE', value: `${stats.avgQuizScore}%`, color: 'purple' },
        ].map((metric, i) => (
          <div key={i} className={`bg-${metric.color}-900/20 border border-${metric.color}-800/30 rounded-lg p-4`}>
            <p className={`text-xs text-${metric.color}-400 font-mono uppercase tracking-wider`}>{metric.label}</p>
            <p className={`text-2xl font-bold text-${metric.color}-300 font-mono mt-1`}>{metric.value}</p>
          </div>
        ))}
      </div>
      
      {/* Three column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 font-mono">TEAM STATUS</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {traineeStatuses.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${t.status === 'green' ? 'bg-emerald-500' : t.status === 'yellow' ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-gray-700 truncate max-w-[120px]">{t.full_name}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{t.completed}/{t.total}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 font-mono">RECENT EVENTS</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700 truncate">{item.user}: {item.item}</span>
                <span className="text-xs text-gray-400 ml-auto">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 font-mono">QUICK ACTIONS</h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { label: 'Add User', icon: UserPlus, path: '/users?action=add' },
              { label: 'Create Training', icon: BookOpen, path: '/training?action=create' },
              { label: 'View Reports', icon: BarChart3, path: '/reports' },
              { label: 'Manage Modules', icon: Layers, path: '/training' },
            ].map((action, i) => (
              <button key={i} onClick={() => navigate(action.path)} className="w-full flex items-center gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 text-left transition-colors">
                <action.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // FOCUS LAYOUT - Minimal, single focus
  const FocusLayout = () => {
    const priority = stats.overdueCount > 0 ? 'overdue' : stats.trainingPending > 0 ? 'pending' : 'complete';
    
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mb-2">Welcome back</p>
          <h1 className="text-4xl font-bold text-gray-900">{profile?.full_name?.split(' ')[0] || 'there'}</h1>
        </div>
        
        {/* Main focus card */}
        <div className={`rounded-3xl p-8 text-center ${
          priority === 'overdue' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
          priority === 'pending' ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
          'bg-gradient-to-br from-emerald-500 to-green-600'
        } text-white`}>
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            {priority === 'overdue' ? <AlertTriangle className="w-10 h-10" /> :
             priority === 'pending' ? <Clock className="w-10 h-10" /> :
             <CheckCircle className="w-10 h-10" />}
          </div>
          <p className="text-6xl font-bold mb-2">
            {priority === 'overdue' ? stats.overdueCount :
             priority === 'pending' ? stats.trainingPending :
             stats.trainingCompleted}
          </p>
          <p className="text-xl text-white/90">
            {priority === 'overdue' ? 'Trainings Overdue' :
             priority === 'pending' ? 'Trainings In Progress' :
             'Trainings Completed'}
          </p>
          <p className="text-white/70 mt-4 max-w-sm mx-auto">
            {priority === 'overdue' ? 'Focus on these first to get your team back on track.' :
             priority === 'pending' ? 'Your team is making progress. Keep encouraging them!' :
             'Excellent work! Your team is fully trained.'}
          </p>
        </div>
        
        {/* Simple stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.totalTrainees}</p>
            <p className="text-sm text-gray-500">Team Size</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.avgQuizScore}%</p>
            <p className="text-sm text-gray-500">Avg Score</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.publishedModules}</p>
            <p className="text-sm text-gray-500">Modules</p>
          </div>
        </div>
        
        {/* Simple actions */}
        <div className="flex justify-center gap-4">
          <button onClick={() => navigate('/users')} className="px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
            Manage Team
          </button>
          <button onClick={() => navigate('/training')} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
            View Training
          </button>
        </div>
      </div>
    );
  };

  // CUSTOM LAYOUT - User configurable
  const CustomLayout = () => (
    <div className="space-y-6">
      {/* Widget picker toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Your Dashboard</h2>
        <button
          onClick={() => setShowWidgetPicker(!showWidgetPicker)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </button>
      </div>
      
      {/* Widget picker modal */}
      {showWidgetPicker && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Available Widgets</h3>
            <button onClick={() => setShowWidgetPicker(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(availableWidgets).map(([id, widget]) => {
              const isActive = activeWidgets.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (isActive) {
                      setActiveWidgets(activeWidgets.filter(w => w !== id));
                    } else {
                      setActiveWidgets([...activeWidgets, id]);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isActive 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <widget.icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
                    {isActive && <Check className="w-4 h-4 text-purple-600 ml-auto" />}
                  </div>
                  <p className={`text-sm font-medium ${isActive ? 'text-purple-700' : 'text-gray-700'}`}>{widget.name}</p>
                  <p className="text-xs text-gray-500">{widget.category}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Active widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeWidgets.map(widgetId => {
          const widget = availableWidgets[widgetId];
          if (!widget) return null;
          
          const sizeClass = widget.size === 'large' ? 'md:col-span-2' : 
                           widget.size === 'full' ? 'md:col-span-2 lg:col-span-3' : '';
          
          return (
            <div key={widgetId} className={`relative group ${sizeClass}`}>
              {renderWidget(widgetId)}
              <button
                onClick={() => setActiveWidgets(activeWidgets.filter(w => w !== widgetId))}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      
      {activeWidgets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Layout className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Click "Add Widget" to build your dashboard</p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500 animate-pulse" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1600px] mx-auto p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{profile?.clients?.name || 'Learning Hub'}</h1>
              <p className="text-sm text-gray-500">Training & Development</p>
            </div>
          </div>
          
          {/* Layout selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLayoutSelector(!showLayoutSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {(() => { const L = layouts[currentLayout]; return <L.icon className="w-5 h-5 text-purple-600" />; })()}
              <span className="font-medium text-gray-700">{layouts[currentLayout].name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showLayoutSelector && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50">
                {Object.entries(layouts).map(([key, layout]) => (
                  <button
                    key={key}
                    onClick={() => { setCurrentLayout(key); setShowLayoutSelector(false); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                      currentLayout === key ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{layout.preview}</span>
                    <div className="text-left">
                      <p className="font-medium">{layout.name}</p>
                      <p className="text-xs text-gray-500">{layout.description}</p>
                    </div>
                    {currentLayout === key && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Render selected layout */}
        {currentLayout === 'classic' && <ClassicLayout />}
        {currentLayout === 'magazine' && <MagazineLayout />}
        {currentLayout === 'command' && <CommandLayout />}
        {currentLayout === 'focus' && <FocusLayout />}
        {currentLayout === 'custom' && <CustomLayout />}
      </div>
      
      {/* Click outside handler */}
      {showLayoutSelector && <div className="fixed inset-0 z-40" onClick={() => setShowLayoutSelector(false)} />}
    </div>
  );
}
