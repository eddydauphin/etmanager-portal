import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Target,
  GraduationCap,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  FileText,
  ChevronRight,
  Award,
  BookOpen,
  ClipboardCheck,
  AlertTriangle,
  Eye,
  Check,
  X,
  MessageSquare
} from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    clients: 0,
    competencies: 0,
    trainingModules: 0,
    completionRate: 0,
    activeTrainees: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Approval modal
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [profile]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadPendingApprovals(),
        loadNotifications(),
        loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load counts based on role
      const isSuper = profile?.role === 'super_admin';
      const clientFilter = !isSuper && profile?.client_id ? `&client_id=eq.${profile.client_id}` : '';
      
      const [usersData, clientsData, compData, modulesData] = await Promise.all([
        dbFetch(`profiles?select=id&role=eq.trainee${clientFilter}`),
        isSuper ? dbFetch('clients?select=id&is_active=eq.true') : Promise.resolve([{ id: profile?.client_id }]),
        dbFetch(`competencies?select=id&is_active=eq.true${clientFilter}`),
        dbFetch(`training_modules?select=id,status${clientFilter}`)
      ]);

      // Calculate completion rate from user_training
      let completionRate = 0;
      try {
        const trainingData = await dbFetch(`user_training?select=status${clientFilter}`);
        if (trainingData?.length > 0) {
          const completed = trainingData.filter(t => t.status === 'passed').length;
          completionRate = Math.round((completed / trainingData.length) * 100);
        }
      } catch (e) {
        console.log('No training data yet');
      }

      setStats({
        users: usersData?.length || 0,
        clients: clientsData?.length || 0,
        competencies: compData?.length || 0,
        trainingModules: modulesData?.filter(m => m.status === 'published').length || 0,
        completionRate,
        activeTrainees: usersData?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      // Only load for department leads and client admins
      if (!['department_lead', 'client_admin', 'super_admin'].includes(profile?.role)) {
        setPendingApprovals([]);
        return;
      }

      let url = 'training_modules?select=*,profiles!training_modules_submitted_by_fkey(full_name,email,department)&status=eq.submitted&order=submitted_at.desc';
      
      if (profile?.role === 'client_admin') {
        url += `&client_id=eq.${profile.client_id}`;
      } else if (profile?.role === 'department_lead') {
        url += `&client_id=eq.${profile.client_id}&created_by_department=eq.${profile.department}`;
      }

      const data = await dbFetch(url);
      setPendingApprovals(data || []);
    } catch (error) {
      console.error('Error loading pending approvals:', error);
      setPendingApprovals([]);
    }
  };

  const loadNotifications = async () => {
    try {
      let url = 'approval_notifications?select=*&is_read=eq.false&order=created_at.desc&limit=5';
      
      // Filter by target
      if (profile?.role === 'department_lead') {
        url = `approval_notifications?select=*&is_read=eq.false&or=(target_user_id.eq.${profile.id},and(target_role.eq.department_lead,target_department.eq.${profile.department},target_client_id.eq.${profile.client_id}))&order=created_at.desc&limit=5`;
      } else if (profile?.role === 'client_admin') {
        url = `approval_notifications?select=*&is_read=eq.false&or=(target_user_id.eq.${profile.id},and(target_role.eq.client_admin,target_client_id.eq.${profile.client_id}))&order=created_at.desc&limit=5`;
      } else if (profile?.role === 'trainee') {
        url = `approval_notifications?select=*&target_user_id=eq.${profile.id}&is_read=eq.false&order=created_at.desc&limit=5`;
      }

      const data = await dbFetch(url);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    }
  };

  const loadRecentActivity = async () => {
    try {
      // Get recent training completions
      let url = 'user_training?select=*,profiles(full_name),training_modules(title)&order=updated_at.desc&limit=5';
      
      if (profile?.role === 'client_admin' && profile?.client_id) {
        // Need to filter by client through profiles
        url = `user_training?select=*,profiles!inner(full_name,client_id),training_modules(title)&profiles.client_id=eq.${profile.client_id}&order=updated_at.desc&limit=5`;
      }

      const data = await dbFetch(url);
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;
    setSubmitting(true);
    
    try {
      await dbFetch(`training_modules?id=eq.${selectedApproval.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'published',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
      });

      setShowApprovalModal(false);
      setSelectedApproval(null);
      setReviewNotes('');
      loadPendingApprovals();
      loadNotifications();
    } catch (error) {
      console.error('Error approving module:', error);
      alert('Failed to approve module');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;
    if (!reviewNotes.trim()) {
      alert('Please provide feedback for the rejection');
      return;
    }
    setSubmitting(true);
    
    try {
      await dbFetch(`training_modules?id=eq.${selectedApproval.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'returned',
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes
        })
      });

      setShowApprovalModal(false);
      setSelectedApproval(null);
      setReviewNotes('');
      loadPendingApprovals();
      loadNotifications();
    } catch (error) {
      console.error('Error rejecting module:', error);
      alert('Failed to return module');
    } finally {
      setSubmitting(false);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await dbFetch(`approval_notifications?id=eq.${notificationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() })
      });
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleBadge = (role) => {
    const roles = {
      super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
      client_admin: { label: 'Client Admin', color: 'bg-blue-100 text-blue-700' },
      department_lead: { label: 'Department Lead', color: 'bg-orange-100 text-orange-700' },
      trainee: { label: 'Trainee', color: 'bg-green-100 text-green-700' }
    };
    return roles[role] || roles.trainee;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profile?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge.color}`}>
              {roleBadge.label}
            </span>
            {profile?.department && (
              <span className="text-sm text-gray-500">• {profile.department}</span>
            )}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Pending Approvals Alert - For Department Leads and Client Admins */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">
                {pendingApprovals.length} Training Module{pendingApprovals.length > 1 ? 's' : ''} Pending Approval
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Review and approve training materials submitted by your team
              </p>
              <div className="mt-3 space-y-2">
                {pendingApprovals.slice(0, 3).map(approval => (
                  <div 
                    key={approval.id} 
                    className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-gray-900">{approval.title}</p>
                        <p className="text-xs text-gray-500">
                          by {approval.profiles?.full_name || 'Unknown'} 
                          {approval.profiles?.department && ` • ${approval.profiles.department}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApproval(approval);
                        setShowApprovalModal(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Review
                    </button>
                  </div>
                ))}
                {pendingApprovals.length > 3 && (
                  <Link 
                    to="/training"
                    className="block text-center text-sm text-amber-700 hover:text-amber-800 font-medium"
                  >
                    View all {pendingApprovals.length} pending →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications for Trainees (when their submission is approved/returned) */}
      {notifications.length > 0 && profile?.role === 'trainee' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">Notifications</h3>
              <div className="mt-2 space-y-2">
                {notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`flex items-start justify-between p-3 rounded-lg ${
                      notif.notification_type === 'training_approved' 
                        ? 'bg-green-50 border border-green-200' 
                        : notif.notification_type === 'training_returned'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-white border border-blue-100'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {notif.notification_type === 'training_approved' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : notif.notification_type === 'training_returned' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      ) : (
                        <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{notif.title}</p>
                        <p className="text-sm text-gray-600">{notif.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {profile?.role === 'super_admin' && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.clients}</p>
                <p className="text-sm text-gray-500">Client Organizations</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.users}</p>
              <p className="text-sm text-gray-500">Active Trainees</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.competencies}</p>
              <p className="text-sm text-gray-500">Competencies</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.trainingModules}</p>
              <p className="text-sm text-gray-500">Training Modules</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
              <p className="text-sm text-gray-500">Completion Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {['super_admin', 'client_admin'].includes(profile?.role) && (
              <>
                <Link
                  to="/users"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700">Manage Users</span>
                </Link>
                <Link
                  to="/training"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <GraduationCap className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-gray-700">Training Modules</span>
                </Link>
              </>
            )}
            {profile?.role === 'department_lead' && (
              <>
                <Link
                  to="/users"
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700">My Team</span>
                </Link>
                {profile?.permissions?.includes('training_creator') && (
                  <Link
                    to="/training"
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <GraduationCap className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-gray-700">Create Training</span>
                  </Link>
                )}
              </>
            )}
            <Link
              to="/competencies"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Target className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-gray-700">Competencies</span>
            </Link>
            <Link
              to="/reports"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-700">View Reports</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${
                    activity.status === 'passed' ? 'bg-green-100' :
                    activity.status === 'failed' ? 'bg-red-100' :
                    activity.status === 'in_progress' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {activity.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : activity.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.profiles?.full_name || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {activity.status === 'passed' ? 'Completed' : activity.status === 'in_progress' ? 'Started' : activity.status} "{activity.training_modules?.title}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <ClipboardCheck className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Review Training Module</h2>
              </div>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedApproval(null);
                  setReviewNotes('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Module Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">{selectedApproval.title}</h3>
                {selectedApproval.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedApproval.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>By: {selectedApproval.profiles?.full_name || 'Unknown'}</span>
                  {selectedApproval.profiles?.department && (
                    <span>• {selectedApproval.profiles.department}</span>
                  )}
                </div>
              </div>

              {/* Preview Button */}
              <Link
                to={`/training?preview=${selectedApproval.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                Preview Training Content
              </Link>

              {/* Review Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes <span className="text-gray-400">(required for rejection)</span>
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add feedback for the creator..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Return for Revision
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
