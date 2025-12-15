import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Plus,
  Search,
  Filter,
  BookOpen,
  Users,
  Target,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  MessageSquare,
  UserCheck,
  Briefcase,
  TrendingUp,
  X,
  Send,
  Loader2,
  Eye
} from 'lucide-react';

export default function DevelopmentActivitiesPage() {
  const { profile } = useAuth();
  
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'coaching',
    title: '',
    description: '',
    objectives: '',
    success_criteria: '',
    trainee_id: '',
    coach_id: '',
    competency_id: '',
    target_level: 3,
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    template_id: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Feedback state
  const [feedback, setFeedback] = useState([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('progress');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivities(),
        loadUsers(),
        loadCompetencies(),
        loadTemplates()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      let url = 'development_activities?select=*&order=created_at.desc';
      
      // Filter by client for non-super admins
      if (profile?.role === 'client_admin' && profile?.client_id) {
        url += `&client_id=eq.${profile.client_id}`;
      } else if (profile?.role === 'team_lead') {
        // Team leads see activities they assigned or where they're the coach
        url += `&or=(assigned_by.eq.${profile.id},coach_id.eq.${profile.id})`;
      }
      
      const data = await dbFetch(url);
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      
      if (profile?.role === 'client_admin' && profile?.client_id) {
        url += `&client_id=eq.${profile.client_id}`;
      } else if (profile?.role === 'team_lead') {
        url += `&or=(reports_to_id.eq.${profile.id},id.eq.${profile.id})`;
      }
      
      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCompetencies = async () => {
    try {
      let url = 'competencies?select=id,name,category&is_active=eq.true&order=name.asc';
      const data = await dbFetch(url);
      setCompetencies(data || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await dbFetch('activity_templates?is_active=eq.true&order=name.asc');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadFeedback = async (activityId) => {
    try {
      const data = await dbFetch(
        `activity_feedback?activity_id=eq.${activityId}&order=created_at.desc`
      );
      setFeedback(data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || activity.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesAssignee = assigneeFilter === 'all' || activity.trainee_id === assigneeFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesAssignee;
  });

  // Stats
  const stats = {
    total: activities.length,
    pending: activities.filter(a => a.status === 'pending').length,
    inProgress: activities.filter(a => a.status === 'in_progress').length,
    completed: activities.filter(a => a.status === 'completed' || a.status === 'validated').length,
    overdue: activities.filter(a => a.status === 'overdue' || 
      (a.due_date && new Date(a.due_date) < new Date() && !['completed', 'validated', 'cancelled'].includes(a.status))
    ).length
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (template.default_duration_days || 30));
      
      setFormData({
        ...formData,
        template_id: templateId,
        type: template.type,
        title: template.name,
        description: template.description || '',
        objectives: template.objectives || '',
        success_criteria: template.success_criteria || '',
        competency_id: template.competency_id || '',
        target_level: template.target_level || 3,
        due_date: dueDate.toISOString().split('T')[0]
      });
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!formData.trainee_id) {
        throw new Error('Please select a trainee');
      }
      if (!formData.title) {
        throw new Error('Please enter a title');
      }
      if (formData.type === 'coaching' && !formData.coach_id) {
        throw new Error('Please select a coach for coaching activities');
      }

      const activityData = {
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        objectives: formData.objectives || null,
        success_criteria: formData.success_criteria || null,
        trainee_id: formData.trainee_id,
        assigned_by: profile.id,
        coach_id: formData.coach_id || null,
        competency_id: formData.competency_id || null,
        target_level: formData.competency_id ? formData.target_level : null,
        start_date: formData.start_date || null,
        due_date: formData.due_date || null,
        status: 'pending',
        client_id: profile.client_id || users.find(u => u.id === formData.trainee_id)?.client_id
      };

      await dbFetch('development_activities', {
        method: 'POST',
        body: JSON.stringify(activityData)
      });

      // Reset form and close modal
      setFormData({
        type: 'coaching',
        title: '',
        description: '',
        objectives: '',
        success_criteria: '',
        trainee_id: '',
        coach_id: '',
        competency_id: '',
        target_level: 3,
        start_date: new Date().toISOString().split('T')[0],
        due_date: '',
        template_id: ''
      });
      setShowCreateModal(false);
      loadActivities();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (activityId, newStatus) => {
    try {
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'validated') {
        updateData.validated_at = new Date().toISOString();
        updateData.validated_by = profile.id;
        
        // Also update competency if linked
        const activity = activities.find(a => a.id === activityId);
        if (activity?.competency_id && activity?.trainee_id) {
          // Check if user has this competency
          const existingComp = await dbFetch(
            `user_competencies?user_id=eq.${activity.trainee_id}&competency_id=eq.${activity.competency_id}`
          );
          
          if (existingComp && existingComp.length > 0) {
            // Update level if higher
            if (activity.target_level > (existingComp[0].current_level || 0)) {
              await dbFetch(`user_competencies?id=eq.${existingComp[0].id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  current_level: activity.target_level,
                  status: 'achieved',
                  updated_at: new Date().toISOString()
                })
              });
            }
          } else {
            // Create new
            await dbFetch('user_competencies', {
              method: 'POST',
              body: JSON.stringify({
                user_id: activity.trainee_id,
                competency_id: activity.competency_id,
                current_level: activity.target_level,
                target_level: activity.target_level,
                status: 'achieved'
              })
            });
          }
        }
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      await dbFetch(`development_activities?id=eq.${activityId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      loadActivities();
      if (selectedActivity?.id === activityId) {
        setSelectedActivity({ ...selectedActivity, ...updateData });
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.trim() || !selectedActivity) return;
    
    setSubmittingFeedback(true);
    try {
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: profile.role === 'trainee' ? 'coachee' : 
                       selectedActivity.coach_id === profile.id ? 'coach' : 'manager',
          feedback_type: feedbackType,
          content: newFeedback
        })
      });
      
      setNewFeedback('');
      loadFeedback(selectedActivity.id);
    } catch (error) {
      console.error('Error adding feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openActivityDetail = async (activity) => {
    setSelectedActivity(activity);
    await loadFeedback(activity.id);
    setShowDetailModal(true);
  };

  const getStatusColor = (status, dueDate) => {
    // Check if overdue
    if (dueDate && new Date(dueDate) < new Date() && !['completed', 'validated', 'cancelled'].includes(status)) {
      return 'bg-red-100 text-red-700';
    }
    
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-purple-100 text-purple-700';
      case 'validated': return 'bg-green-100 text-green-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'training': return BookOpen;
      case 'coaching': return Users;
      case 'task': return Briefcase;
      default: return Target;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'training': return 'bg-blue-100 text-blue-700';
      case 'coaching': return 'bg-purple-100 text-purple-700';
      case 'task': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  const getCompetencyName = (competencyId) => {
    const comp = competencies.find(c => c.id === competencyId);
    return comp?.name || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Development Activities</h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign and track coaching, mentoring, and task-based learning
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Assign Activity
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Target className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
              <p className="text-sm text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Types</option>
            <option value="training">Training</option>
            <option value="coaching">Coaching</option>
            <option value="task">Task</option>
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="validated">Validated</option>
            <option value="overdue">Overdue</option>
          </select>
          
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Assignees</option>
            {users.filter(u => u.role === 'trainee').map(user => (
              <option key={user.id} value={user.id}>{user.full_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
          <p className="text-gray-500 mb-4">
            {activities.length === 0 
              ? "Start by assigning development activities to your team"
              : "No activities match your current filters"}
          </p>
          {activities.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Assign First Activity
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map(activity => {
            const TypeIcon = getTypeIcon(activity.type);
            const isOverdue = activity.due_date && new Date(activity.due_date) < new Date() && 
              !['completed', 'validated', 'cancelled'].includes(activity.status);
            
            return (
              <div 
                key={activity.id} 
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openActivityDetail(activity)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${getTypeColor(activity.type)}`}>
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activity.status, activity.due_date)}`}>
                        {isOverdue ? 'Overdue' : activity.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {activity.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{activity.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-4 h-4" />
                        <span>Trainee: {getUserName(activity.trainee_id)}</span>
                      </div>
                      
                      {activity.coach_id && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>Coach: {getUserName(activity.coach_id)}</span>
                        </div>
                      )}
                      
                      {activity.due_date && (
                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(activity.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      {activity.competency_id && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>{getCompetencyName(activity.competency_id)} → Level {activity.target_level}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4 flex items-center gap-2">
                    {activity.status === 'completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(activity.id, 'validated');
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Validate
                      </button>
                    )}
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Activity Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Assign Development Activity</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateActivity} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}
              
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Template (Optional)
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">-- Select a template --</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.type})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Activity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type *
                </label>
                <div className="flex gap-4">
                  {[
                    { value: 'coaching', label: 'Coaching', icon: Users, desc: 'Learn from others' },
                    { value: 'task', label: 'Task', icon: Briefcase, desc: 'Learn by doing' },
                    { value: 'training', label: 'Training', icon: BookOpen, desc: 'Formal learning' }
                  ].map(type => {
                    const Icon = type.icon;
                    return (
                      <label
                        key={type.value}
                        className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                          formData.type === type.value 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                          className="sr-only"
                        />
                        <Icon className={`w-5 h-5 mb-1 ${formData.type === type.value ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="font-medium text-sm">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.desc}</div>
                      </label>
                    );
                  })}
                </div>
              </div>
              
              {/* Trainee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To (Trainee) *
                </label>
                <select
                  value={formData.trainee_id}
                  onChange={(e) => setFormData({ ...formData, trainee_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  required
                >
                  <option value="">-- Select trainee --</option>
                  {users.filter(u => u.role === 'trainee' || u.role === 'team_lead').map(user => (
                    <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                  ))}
                </select>
              </div>
              
              {/* Coach Selection (for coaching type) */}
              {formData.type === 'coaching' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coach/Mentor *
                  </label>
                  <select
                    value={formData.coach_id}
                    onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    required
                  >
                    <option value="">-- Select coach --</option>
                    {users.filter(u => u.id !== formData.trainee_id).map(user => (
                      <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="e.g., Safety Observation Coaching"
                  required
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                  placeholder="What is this activity about?"
                />
              </div>
              
              {/* Objectives */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objectives
                </label>
                <textarea
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                  placeholder="What should the trainee achieve?"
                />
              </div>
              
              {/* Success Criteria */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Success Criteria
                </label>
                <textarea
                  value={formData.success_criteria}
                  onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  rows={2}
                  placeholder="How will success be measured?"
                />
              </div>
              
              {/* Linked Competency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Linked Competency (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.competency_id}
                    onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">-- No linked competency --</option>
                    {competencies.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name} {comp.category && `(${comp.category})`}
                      </option>
                    ))}
                  </select>
                  {formData.competency_id && (
                    <select
                      value={formData.target_level}
                      onChange={(e) => setFormData({ ...formData, target_level: parseInt(e.target.value) })}
                      className="w-32 px-4 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value={1}>Level 1</option>
                      <option value={2}>Level 2</option>
                      <option value={3}>Level 3</option>
                      <option value={4}>Level 4</option>
                      <option value={5}>Level 5</option>
                    </select>
                  )}
                </div>
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              
              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Assign Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {showDetailModal && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeColor(selectedActivity.type)}`}>
                  {(() => { const Icon = getTypeIcon(selectedActivity.type); return <Icon className="w-5 h-5" />; })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedActivity.title}</h2>
                  <p className="text-sm text-gray-500">{selectedActivity.type} activity</p>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedActivity.status, selectedActivity.due_date)}`}>
                    {selectedActivity.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedActivity.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(selectedActivity.id, 'in_progress')}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      Start
                    </button>
                  )}
                  {selectedActivity.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(selectedActivity.id, 'completed')}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                    >
                      Mark Complete
                    </button>
                  )}
                  {selectedActivity.status === 'completed' && (
                    <button
                      onClick={() => handleStatusChange(selectedActivity.id, 'validated')}
                      className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                    >
                      Validate & Close
                    </button>
                  )}
                </div>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Trainee</p>
                  <p className="font-medium">{getUserName(selectedActivity.trainee_id)}</p>
                </div>
                {selectedActivity.coach_id && (
                  <div>
                    <p className="text-sm text-gray-500">Coach</p>
                    <p className="font-medium">{getUserName(selectedActivity.coach_id)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Assigned By</p>
                  <p className="font-medium">{getUserName(selectedActivity.assigned_by)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">
                    {selectedActivity.due_date 
                      ? new Date(selectedActivity.due_date).toLocaleDateString() 
                      : 'No due date'}
                  </p>
                </div>
                {selectedActivity.competency_id && (
                  <div>
                    <p className="text-sm text-gray-500">Linked Competency</p>
                    <p className="font-medium">
                      {getCompetencyName(selectedActivity.competency_id)} → Level {selectedActivity.target_level}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedActivity.description && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{selectedActivity.description}</p>
                </div>
              )}
              
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
              
              {/* Feedback Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Feedback & Progress ({feedback.length})
                </h3>
                
                {/* Add Feedback */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={feedbackType}
                      onChange={(e) => setFeedbackType(e.target.value)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value="progress">Progress Update</option>
                      <option value="milestone">Milestone</option>
                      <option value="challenge">Challenge</option>
                      <option value="support">Need Support</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeedback}
                      onChange={(e) => setNewFeedback(e.target.value)}
                      placeholder="Add a comment or update..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFeedback()}
                    />
                    <button
                      onClick={handleAddFeedback}
                      disabled={!newFeedback.trim() || submittingFeedback}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                {/* Feedback List */}
                {feedback.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No feedback yet</p>
                ) : (
                  <div className="space-y-3">
                    {feedback.map(fb => (
                      <div key={fb.id} className="p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{getUserName(fb.author_id)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              fb.feedback_type === 'milestone' ? 'bg-green-100 text-green-700' :
                              fb.feedback_type === 'challenge' ? 'bg-red-100 text-red-700' :
                              fb.feedback_type === 'support' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {fb.feedback_type}
                            </span>
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
