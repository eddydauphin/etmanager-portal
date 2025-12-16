import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Target,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Award,
  Users,
  MessageSquare,
  Send,
  X,
  ChevronRight,
  User,
  Loader2
} from 'lucide-react';

export default function MyPlanPage() {
  const { profile } = useAuth();
  
  const [competencies, setCompetencies] = useState([]);
  const [training, setTraining] = useState([]);
  const [coachingActivities, setCoachingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load competencies with gaps
      const compData = await dbFetch(
        `user_competencies?user_id=eq.${profile.id}&select=*,competencies(id,name,competency_categories(name,color))&order=created_at.desc`
      );
      setCompetencies(compData || []);

      // Load assigned training
      const trainingData = await dbFetch(
        `user_training?user_id=eq.${profile.id}&select=*,training_modules(title,pass_score)&order=due_date.asc`
      );
      setTraining(trainingData || []);

      // Load coaching activities assigned to me
      const coachingData = await dbFetch(
        `development_activities?trainee_id=eq.${profile.id}&type=eq.coaching&select=*,coach:coach_id(id,full_name,email),competencies(name),assigned_by_user:assigned_by(full_name)&order=created_at.desc`
      );
      setCoachingActivities(coachingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
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
          author_role: 'coachee',
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

  const handleMarkReady = async () => {
    if (!selectedActivity) return;
    
    setUpdatingStatus(true);
    try {
      await dbFetch(`development_activities?id=eq.${selectedActivity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
      });
      
      // Add feedback entry
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: 'coachee',
          feedback_type: 'milestone',
          content: 'Marked as ready for review'
        })
      });
      
      setSelectedActivity({ ...selectedActivity, status: 'completed' });
      await loadFeedback(selectedActivity.id);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
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
      return { color: 'bg-purple-100 text-purple-700', label: 'Awaiting Review', icon: '🔍' };
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': 
      case 'passed': 
        return 'bg-green-100 text-green-700';
      case 'in_progress': 
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default: 
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Stats
  const competencyGaps = competencies.filter(c => 
    (c.target_level || 3) > (c.current_level || 1) && c.status !== 'achieved'
  );

  const pendingTraining = training.filter(t => 
    t.status === 'pending' || t.status === 'in_progress'
  );

  const activeCoaching = coachingActivities.filter(c => 
    c.status !== 'validated' && c.status !== 'cancelled'
  );

  const upcomingDeadlines = training
    .filter(t => t.due_date && t.status !== 'passed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Development Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Your learning roadmap and upcoming tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{competencyGaps.length}</p>
              <p className="text-sm text-gray-500">Skills to Develop</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingTraining.length}</p>
              <p className="text-sm text-gray-500">Training Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCoaching.length}</p>
              <p className="text-sm text-gray-500">Active Coaching</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {competencies.filter(c => c.status === 'achieved').length}
              </p>
              <p className="text-sm text-gray-500">Skills Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coaching Activities Section */}
      {coachingActivities.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            My Coaching Program
          </h2>

          <div className="space-y-3">
            {coachingActivities.map(activity => {
              const statusInfo = getStatusInfo(activity);
              const dueDate = activity.due_date ? new Date(activity.due_date) : null;
              
              return (
                <div 
                  key={activity.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => openActivityModal(activity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{statusInfo.icon}</span>
                        <h3 className="font-medium text-gray-900">{activity.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">{activity.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>Coach: <span className="text-gray-700 font-medium">{activity.coach?.full_name || 'Not assigned'}</span></span>
                        </div>
                        
                        {activity.competencies?.name && (
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            <span>{activity.competencies.name} → Level {activity.target_level}</span>
                          </div>
                        )}
                        
                        {dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Due: {dueDate.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Gaps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Skills to Develop
          </h2>

          {competencyGaps.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No skill gaps!</p>
              <p className="text-sm text-gray-400">You've achieved all your targets.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {competencyGaps.map(comp => {
                const gap = (comp.target_level || 3) - (comp.current_level || 1);
                
                return (
                  <div key={comp.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{comp.competencies?.name}</h3>
                      <span className="text-xs text-amber-600 font-medium">
                        +{gap} level{gap > 1 ? 's' : ''} needed
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Level {comp.current_level || 1}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${((comp.current_level || 1) / (comp.target_level || 3)) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500">Level {comp.target_level || 3}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Deadlines
          </h2>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming deadlines</p>
              <p className="text-sm text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {upcomingDeadlines.map(item => {
                const dueDate = new Date(item.due_date);
                const today = new Date();
                const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isUrgent = daysLeft <= 3 && daysLeft >= 0;

                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-lg p-3 ${
                      isOverdue ? 'border-red-300 bg-red-50' :
                      isUrgent ? 'border-amber-300 bg-amber-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.training_modules?.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          {isOverdue && (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          isOverdue ? 'text-red-600' :
                          isUrgent ? 'text-amber-600' :
                          'text-gray-600'
                        }`}>
                          {dueDate.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` :
                           daysLeft === 0 ? 'Due today' :
                           daysLeft === 1 ? 'Due tomorrow' :
                           `${daysLeft} days left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending Training */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Pending Training
        </h2>

        {pendingTraining.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending training</p>
            <p className="text-sm text-gray-400">All training modules completed!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTraining.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{item.training_modules?.title}</h3>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                  {item.due_date && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coaching Activity Modal */}
      {showActivityModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedActivity.title}</h2>
                <p className="text-sm text-gray-500">Coaching Activity</p>
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
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusInfo(selectedActivity).color}`}>
                    {getStatusInfo(selectedActivity).label}
                  </span>
                </div>
                {selectedActivity.status === 'pending' || selectedActivity.status === 'in_progress' ? (
                  <button
                    onClick={handleMarkReady}
                    disabled={updatingStatus}
                    className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {updatingStatus ? 'Updating...' : 'Mark Ready for Review'}
                  </button>
                ) : null}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
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

              {selectedActivity.success_criteria && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Success Criteria</p>
                  <p className="text-gray-700">{selectedActivity.success_criteria}</p>
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
                    placeholder="Add a comment or update..."
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
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet. Add your first update!</p>
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
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {fb.author_role}
                            </span>
                            {fb.feedback_type === 'milestone' && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                milestone
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
    </div>
  );
}
