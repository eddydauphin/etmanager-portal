// ============================================================================
// E&T MANAGER - DASHBOARD PAGE
// Role-based dashboard with stats and quick actions
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  getTeamStats, 
  getAllClients, 
  getTrainees,
  getTraineeWithCompetencies,
  getDevelopmentPlans,
  getTrainingRecords 
} from '../lib/supabase';
import {
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Building2,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Plus
} from 'lucide-react';

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
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

// Super Admin Dashboard
function SuperAdminDashboard() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const clientsData = await getAllClients();
      setClients(clientsData || []);
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
          value="-"
          subtitle="Across all clients"
          icon={Users}
          color="green"
        />
        <StatCard 
          title="Active Plans" 
          value="-"
          subtitle="Development plans"
          icon={ClipboardList}
          color="purple"
        />
        <StatCard 
          title="Assessments" 
          value="-"
          subtitle="This month"
          icon={Target}
          color="yellow"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="Add New Client"
            description="Create a new organization"
            href="/admin/clients"
            icon={Plus}
          />
          <QuickAction
            title="Manage Users"
            description="Add admins and trainees"
            href="/admin/users"
            icon={Users}
          />
          <QuickAction
            title="View Reports"
            description="Cross-client analytics"
            href="/reports"
            icon={BarChart3}
          />
          <QuickAction
            title="System Settings"
            description="Configure system options"
            href="/settings"
            icon={Target}
          />
        </div>
      </div>

      {/* Client List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Clients</h2>
          <Link to="/admin/clients" className="text-sm text-blue-600 hover:text-blue-700">
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
                    No clients yet. <Link to="/admin/clients" className="text-blue-600">Add your first client</Link>
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

// Client Admin Dashboard
function ClientAdminDashboard() {
  const { clientId, clientName } = useAuth();
  const [stats, setStats] = useState(null);
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    if (!clientId) return;
    
    try {
      const [statsData, traineesData] = await Promise.all([
        getTeamStats(clientId),
        getTrainees(clientId)
      ]);
      setStats(statsData);
      setTrainees(traineesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's an overview of {clientName}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Members" 
          value={stats?.traineeCount || 0}
          subtitle="Active trainees"
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="On Track" 
          value={`${stats?.onTrackPercentage || 0}%`}
          subtitle={`${stats?.onTrack || 0} competencies`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard 
          title="Gaps Identified" 
          value={stats?.totalGaps || 0}
          subtitle="Need attention"
          icon={Target}
          color="yellow"
        />
        <StatCard 
          title="Critical Gaps" 
          value={stats?.criticalGaps || 0}
          subtitle="High priority"
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="Add Team Member"
            description="Register a new trainee"
            href="/trainees"
            icon={Plus}
          />
          <QuickAction
            title="View Team Matrix"
            description="See competency overview"
            href="/competencies"
            icon={Target}
          />
          <QuickAction
            title="Assign Training"
            description="Schedule training activities"
            href="/training"
            icon={GraduationCap}
          />
          <QuickAction
            title="Generate Report"
            description="Export team analytics"
            href="/reports"
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Recent Team Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <Link to="/trainees" className="text-sm text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trainees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No team members yet. <Link to="/trainees" className="text-blue-600">Add your first trainee</Link>
                  </td>
                </tr>
              ) : (
                trainees.slice(0, 5).map((trainee) => (
                  <tr key={trainee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link to={`/trainees/${trainee.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {trainee.first_name} {trainee.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{trainee.job_title || '-'}</td>
                    <td className="px-6 py-4 text-gray-500">{trainee.department || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
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

// Trainee Dashboard
function TraineeDashboard() {
  const { user, profile } = useAuth();
  const [traineeData, setTraineeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    // In a real app, we'd get the trainee ID from the profile
    // For now, showing placeholder data
    setLoading(false);
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  // Placeholder data - would come from actual trainee data
  const overallProgress = 67;
  const competenciesOnTrack = 8;
  const competenciesTotal = 12;
  const upcomingTraining = 3;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.full_name?.split(' ')[0]}!</h1>
        <p className="text-gray-600 mt-1">Track your progress and development</p>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Ring */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Overall Progress</h3>
          <ProgressRing percentage={overallProgress} />
          <p className="text-sm text-gray-600 mt-4">
            {competenciesOnTrack} of {competenciesTotal} competencies on track
          </p>
        </div>

        {/* Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard 
            title="Competencies" 
            value={competenciesTotal}
            subtitle="Total assigned"
            icon={Target}
            color="blue"
          />
          <StatCard 
            title="On Track" 
            value={competenciesOnTrack}
            subtitle="Meeting targets"
            icon={CheckCircle}
            color="green"
          />
          <StatCard 
            title="Training Due" 
            value={upcomingTraining}
            subtitle="This month"
            icon={Clock}
            color="yellow"
          />
          <StatCard 
            title="Certifications" 
            value={2}
            subtitle="Active"
            icon={GraduationCap}
            color="purple"
          />
        </div>
      </div>

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
            description="View your IDP"
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

      {/* Upcoming Training */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Training</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Spray Dryer Operations - Level 2</p>
                <p className="text-sm text-gray-500">Due in 5 days</p>
              </div>
            </div>
            <Link to="/my-training" className="text-sm text-blue-600 hover:text-blue-700">
              Start →
            </Link>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">TPM Fundamentals</p>
                <p className="text-sm text-gray-500">Due in 12 days</p>
              </div>
            </div>
            <Link to="/my-training" className="text-sm text-blue-600 hover:text-blue-700">
              View →
            </Link>
          </div>
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

// Main Dashboard component - routes to role-specific dashboard
function DashboardPage() {
  const { isSuperAdmin, isClientAdmin, isTrainee } = useAuth();

  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }
  
  if (isClientAdmin) {
    return <ClientAdminDashboard />;
  }
  
  if (isTrainee) {
    return <TraineeDashboard />;
  }

  return <DashboardSkeleton />;
}

export default DashboardPage;
