// ============================================================================
// E&T MANAGER - DASHBOARD PAGE
// Role-based dashboard with stats, quick actions, and coaching overview
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  X,
  Send,
  Loader2
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

// My Coachees Component - For coaches to see their assigned trainees
function MyCoacheesSection({ profile }) {
  const [coachingActivities, setCoachingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadCoachingActivities();
  }, [profile]);

  const loadCoachingActivities = async () => {
    try {
      const data = await dbFetch(
        `development_activities?coach_id=eq.${profile.id}&type=eq.coaching&select=*,trainee:trainee_id(id,full_name,email),competencies(name)&order=created_at.desc`
      );
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

  const openActivityModal = async (activity) => {
    setSelectedActivity(activity);
    await loadFeedback(activity.id);
    setShowActivityModal(true);
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
          author_role: 'coach',
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

  const handleValidate = async () => {
    if (!selectedActivity) return;
    
    setUpdatingStatus(true);
    try {
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
              current_level: selectedActivity.target_level,
              status: 'achieved',
              updated_at: new Date().toISOString()
            })
          });
        }
      }
      
      // Add feedback entry
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: 'coach',
          feedback_type: 'validation',
          content: 'Coaching completed and validated'
        })
      });
      
      setSelectedActivity({ ...selectedActivity, status: 'validated' });
      await loadFeedback(selectedActivity.id);
      await loadCoachingActivities();
    } catch (error) {
      console.error('Error validating:', error);
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
    return null; // Don't show section if no coachees
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
            My Coachees
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{trainee.full_name}</p>
                      <p className="text-xs text-gray-500">{trainee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
                {selectedActivity.status === 'completed' && (
                  <button
                    onClick={handleValidate}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {updatingStatus ? 'Validating...' : '✓ Validate & Close'}
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
                    placeholder="Add coaching feedback..."
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
                            {fb.feedback_type === 'milestone' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                milestone
                              </span>
                            )}
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
    </>
  );
}

// Super Admin Dashboard
function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [clients, setClients] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [networkCount, setNetworkCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
      setUserCount(users?.length || 0);

      // Count networks
      const networks = await dbFetch('expert_networks?select=id&is_active=eq.true');
      setNetworkCount(networks?.length || 0);

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
          value={userCount}
          subtitle="Across all clients"
          icon={Users}
          color="green"
        />
        <StatCard 
          title="Expert Networks" 
          value={networkCount}
          subtitle="Active networks"
          icon={Network}
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

      {/* My Coachees Section - Show if user is a coach */}
      <MyCoacheesSection profile={profile} />

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
          <QuickAction
            title="Development Activities"
            description="Manage coaching & tasks"
            href="/development"
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

// Client Admin Dashboard
function ClientAdminDashboard() {
  const { profile, clientId } = useAuth();
  const [users, setUsers] = useState([]);
  const [networkCount, setNetworkCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [clientId]);

  async function loadData() {
    try {
      // Load team members
      const usersData = await dbFetch(`profiles?select=*&client_id=eq.${clientId}&is_active=eq.true&order=full_name.asc`);
      setUsers(usersData || []);

      // Count networks
      const networks = await dbFetch(`expert_networks?select=id&client_id=eq.${clientId}&is_active=eq.true`);
      setNetworkCount(networks?.length || 0);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const traineeCount = users.filter(u => u.role === 'trainee').length;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Members" 
          value={traineeCount}
          subtitle="Active trainees"
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="Expert Networks" 
          value={networkCount}
          subtitle="Active networks"
          icon={Network}
          color="purple"
        />
        <StatCard 
          title="Competencies" 
          value="-"
          subtitle="Assigned"
          icon={Target}
          color="green"
        />
        <StatCard 
          title="Training Due" 
          value="-"
          subtitle="This month"
          icon={Clock}
          color="yellow"
        />
      </div>

      {/* My Coachees Section */}
      <MyCoacheesSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="Add Team Member"
            description="Register a new trainee"
            href="/users"
            icon={Plus}
          />
          <QuickAction
            title="Development Activities"
            description="Manage coaching & tasks"
            href="/development"
            icon={ClipboardList}
          />
          <QuickAction
            title="View Competencies"
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
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          <Link to="/users" className="text-sm text-blue-600 hover:text-blue-700">
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No team members yet. <Link to="/users" className="text-blue-600">Add your first team member</Link>
                  </td>
                </tr>
              ) : (
                users.filter(u => u.role === 'trainee').slice(0, 5).map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500 capitalize">{user.role?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-gray-500">{user.department || '-'}</td>
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
  const { profile } = useAuth();

  const overallProgress = 67;
  const competenciesOnTrack = 8;
  const competenciesTotal = 12;
  const upcomingTraining = 3;

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
            {competenciesOnTrack} of {competenciesTotal} competencies on track
          </p>
        </div>

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
  
  if (isTrainee) {
    return <TraineeDashboard />;
  }

  // Team Lead uses Client Admin dashboard with coaching
  return <ClientAdminDashboard />;
}

export default DashboardPage;
