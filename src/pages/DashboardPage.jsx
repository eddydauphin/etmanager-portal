// ============================================================================
// E&T MANAGER - DASHBOARD PAGE
// Role-based dashboard with real stats, quick actions, and coaching overview
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
  Loader2,
  TrendingUp,
  Award,
  Rocket,
  Lightbulb,
  BookOpen,
  FileText,
  FileCheck,
  FileClock
} from 'lucide-react';

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend, onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && trend !== null && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}% from last month
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

// Quick Action Button (onClick instead of navigation)
function QuickActionButton({ title, description, onClick, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="p-3 bg-blue-50 rounded-lg">
        <Icon className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-400" />
    </button>
  );
}

// Training Materials KPI Section
function TrainingMaterialsSection({ clientId = null }) {
  const [stats, setStats] = useState({
    total: 0,
    released: 0,
    inDevelopment: 0
  });
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainingMaterialsData();
  }, [clientId]);

  const loadTrainingMaterialsData = async () => {
    try {
      // Load competencies with training developer info
      let url = 'competencies?select=id,name,training_developer_id,is_active,training_developer:training_developer_id(id,full_name,email)';
      const competencies = await dbFetch(url);
      console.log('TrainingMaterials: Competencies loaded:', competencies?.length);
      
      // Load training modules - try with competency_id first
      let modules = [];
      try {
        let modulesUrl = 'training_modules?select=id,status,title,competency_id';
        if (clientId) {
          modulesUrl += `&client_id=eq.${clientId}`;
        }
        modules = await dbFetch(modulesUrl) || [];
        console.log('TrainingMaterials: Modules with competency_id:', modules);
      } catch (e) {
        // If competency_id doesn't exist, try without it
        console.log('TrainingMaterials: competency_id query failed, trying without');
        try {
          let modulesUrl = 'training_modules?select=id,status,title';
          if (clientId) {
            modulesUrl += `&client_id=eq.${clientId}`;
          }
          modules = await dbFetch(modulesUrl) || [];
          console.log('TrainingMaterials: Modules without competency_id:', modules);
        } catch (e2) {
          console.log('TrainingMaterials: Module query failed completely');
          modules = [];
        }
      }
      
      // Calculate stats
      const releasedModules = modules.filter(m => 
        m.status === 'published' || m.status === 'content_approved'
      );
      const inDevModules = modules.filter(m => 
        m.status === 'draft' || m.status === 'pending'
      );
      
      console.log('TrainingMaterials: Released modules:', releasedModules);
      console.log('TrainingMaterials: In-dev modules:', inDevModules);
      
      setStats({
        total: modules.length,
        released: releasedModules.length,
        inDevelopment: inDevModules.length
      });

      // Create a set of competency IDs that have released training
      const competenciesWithReleasedTraining = new Set(
        releasedModules
          .filter(m => m.competency_id)
          .map(m => m.competency_id)
      );
      console.log('TrainingMaterials: Competencies with released training (by ID):', competenciesWithReleasedTraining);

      // Group competencies by training developer
      const developerMap = {};
      competencies?.forEach(comp => {
        if (comp.training_developer_id && comp.training_developer) {
          if (!developerMap[comp.training_developer_id]) {
            developerMap[comp.training_developer_id] = {
              user: comp.training_developer,
              assigned: [],
              completed: 0,
              pending: 0
            };
          }
          developerMap[comp.training_developer_id].assigned.push(comp);
          
          // Check if this competency has released training by ID
          const hasReleasedById = competenciesWithReleasedTraining.has(comp.id);
          
          // Check if any released module title contains the competency name
          const compNameLower = comp.name?.toLowerCase() || '';
          const hasReleasedByName = releasedModules.some(m => {
            const titleLower = m.title?.toLowerCase() || '';
            return titleLower.includes(compNameLower) || compNameLower.includes(titleLower);
          });
          
          console.log(`TrainingMaterials: Competency "${comp.name}" - hasReleasedById: ${hasReleasedById}, hasReleasedByName: ${hasReleasedByName}`);
          
          if (hasReleasedById || hasReleasedByName) {
            developerMap[comp.training_developer_id].completed++;
          } else {
            developerMap[comp.training_developer_id].pending++;
          }
        }
      });

      console.log('TrainingMaterials: Developer map:', developerMap);
      setDevelopers(Object.values(developerMap));
    } catch (error) {
      console.error('Error loading training materials data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Training Materials
        </h2>
        <Link to="/training" className="text-sm text-blue-600 hover:text-blue-700">
          Manage →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Modules</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileCheck className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.released}</p>
          <p className="text-xs text-gray-500">Released</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <FileClock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.inDevelopment}</p>
          <p className="text-xs text-gray-500">In Development</p>
        </div>
      </div>

      {/* Developers with assigned materials */}
      {developers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Training Developers</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {developers.map(dev => (
              <div key={dev.user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dev.user.full_name}</p>
                    <p className="text-xs text-gray-500">{dev.assigned.length} competencies assigned</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{dev.completed} done</p>
                  </div>
                  {dev.pending > 0 && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                      {dev.pending} pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {developers.length === 0 && stats.total === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">
          No training materials yet. Assign training developers to competencies.
        </p>
      )}
    </div>
  );
}

// My Training Development Section - Shows user's assigned training to develop
function MyTrainingDevelopmentSection({ profile }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadMyAssignments();
    }
  }, [profile]);

  const loadMyAssignments = async () => {
    try {
      console.log('MyTrainingDev: Loading for profile:', profile.id);
      
      // Get competencies where current user is the training developer
      const competencies = await dbFetch(
        `competencies?training_developer_id=eq.${profile.id}&select=id,name,description,competency_categories(name,color)&is_active=eq.true`
      );
      
      console.log('MyTrainingDev: Competencies found:', competencies);
      
      if (!competencies || competencies.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Check which have training modules
      const modules = await dbFetch('training_modules?select=id,title,status,competency_id');
      console.log('MyTrainingDev: Modules found:', modules);
      
      // Enrich competencies with module status
      const enriched = competencies.map(comp => {
        const relatedModules = modules?.filter(m => m.competency_id === comp.id) || [];
        const hasPublished = relatedModules.some(m => 
          m.status === 'published' || m.status === 'content_approved'
        );
        const hasDraft = relatedModules.some(m => 
          m.status === 'draft' || m.status === 'pending'
        );
        
        return {
          ...comp,
          modules: relatedModules,
          status: hasPublished ? 'published' : hasDraft ? 'in_progress' : 'not_started'
        };
      });

      console.log('MyTrainingDev: Enriched assignments:', enriched);
      setAssignments(enriched);
    } catch (error) {
      console.error('Error loading training development assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null; // Don't show loading state, just hide
  }

  if (assignments.length === 0) {
    return null; // Don't show if no assignments
  }

  const pending = assignments.filter(a => a.status !== 'published');
  const completed = assignments.filter(a => a.status === 'published');

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-500" />
          My Training Development
        </h2>
        <Link to="/training" className="text-sm text-blue-600 hover:text-blue-700">
          Develop Materials →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-xl font-bold text-gray-900">{assignments.length}</p>
          <p className="text-xs text-gray-500">Assigned</p>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <p className="text-xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-xl font-bold text-green-600">{completed.length}</p>
          <p className="text-xs text-gray-500">Released</p>
        </div>
      </div>

      {/* Pending Items */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Pending Development:</p>
          {pending.slice(0, 5).map(item => (
            <Link
              key={item.id}
              to="/training"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <div className="flex items-center gap-2">
                {item.competency_categories?.color && (
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.competency_categories.color }}
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.competency_categories?.name || 'Uncategorized'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.status === 'in_progress' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
          {pending.length > 5 && (
            <p className="text-xs text-gray-500 text-center">
              +{pending.length - 5} more pending
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Create Development Activity Modal
function CreateDevelopmentModal({ isOpen, onClose, profile, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    trainee_ids: [],
    coach_id: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load trainees
      let usersUrl = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      if (profile?.role === 'client_admin' && profile?.client_id) {
        usersUrl += `&client_id=eq.${profile.client_id}`;
      } else if (profile?.role === 'team_lead') {
        usersUrl += `&reports_to_id=eq.${profile.id}`;
      }
      const usersData = await dbFetch(usersUrl);
      setUsers(usersData || []);

      // Load coaches (non-trainees)
      let coachesUrl = 'profiles?select=id,full_name,email,role&is_active=eq.true&role=neq.trainee&order=full_name.asc';
      if (profile?.role === 'client_admin' && profile?.client_id) {
        coachesUrl += `&client_id=eq.${profile.client_id}`;
      }
      const coachesData = await dbFetch(coachesUrl);
      setCoaches(coachesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    
    if (!formData.type) {
      setError('Please select an activity type');
      return;
    }
    if (formData.trainee_ids.length === 0) {
      setError('Please select at least one user');
      return;
    }
    if (!formData.coach_id) {
      setError('Please select a coach');
      return;
    }

    setSubmitting(true);
    try {
      const clientId = profile?.client_id || users.find(u => formData.trainee_ids.includes(u.id))?.client_id;

      for (const traineeId of formData.trainee_ids) {
        await dbFetch('development_activities', {
          method: 'POST',
          body: JSON.stringify({
            type: 'coaching',
            title: formData.title || (formData.type === 'grow_doing' ? 'Grow through doing' : 'Learn through others'),
            description: formData.description || (formData.type === 'grow_doing' 
              ? 'Development through initiatives, projects, and hands-on experience'
              : 'Development through feedback, coaching, and mentoring'),
            trainee_id: traineeId,
            assigned_by: profile.id,
            coach_id: formData.coach_id,
            start_date: formData.start_date,
            due_date: formData.due_date || null,
            status: 'pending',
            client_id: clientId
          })
        });
      }

      // Reset and close
      setFormData({
        type: '',
        title: '',
        description: '',
        trainee_ids: [],
        coach_id: '',
        start_date: new Date().toISOString().split('T')[0],
        due_date: ''
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err.message || 'Failed to create activity');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Development Activity</h2>
              <p className="text-sm text-gray-500">Assign coaching or development task</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* Activity Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activity Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'grow_doing' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.type === 'grow_doing'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Rocket className={`w-6 h-6 mb-2 ${formData.type === 'grow_doing' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="font-medium text-gray-900">Grow through doing</p>
                    <p className="text-xs text-gray-500 mt-1">Initiatives, projects, hands-on</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'learn_others' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.type === 'learn_others'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Lightbulb className={`w-6 h-6 mb-2 ${formData.type === 'learn_others' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <p className="font-medium text-gray-900">Learn through others</p>
                    <p className="text-xs text-gray-500 mt-1">Feedback, coaching, mentoring</p>
                  </button>
                </div>
              </div>

              {/* Title (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Q1 Project Leadership"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  placeholder="Brief description of the activity..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Select Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users *
                </label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                  {users.filter(u => u.role === 'trainee' || u.role === 'team_lead').length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No users available</p>
                  ) : (
                    users.filter(u => u.role === 'trainee' || u.role === 'team_lead').map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                          formData.trainee_ids.includes(user.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.trainee_ids.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, trainee_ids: [...formData.trainee_ids, user.id] });
                            } else {
                              setFormData({ ...formData, trainee_ids: formData.trainee_ids.filter(id => id !== user.id) });
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-gray-300"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                {formData.trainee_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{formData.trainee_ids.length} user(s) selected</p>
                )}
              </div>

              {/* Select Coach */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coach *
                </label>
                <select
                  value={formData.coach_id}
                  onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a coach...</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>{coach.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Activity
          </button>
        </div>
      </div>
    </div>
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
function MyCoacheesSection({ profile, showAll = false, clientId = null }) {
  const [coachingActivities, setCoachingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showTraineeModal, setShowTraineeModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedTrainee, setSelectedTrainee] = useState(null);
  const [traineeCompetencies, setTraineeCompetencies] = useState([]);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loadingCompetencies, setLoadingCompetencies] = useState(false);
  
  // Validation form state
  const [validateForm, setValidateForm] = useState({
    achieved_level: 3,
    notes: ''
  });

  useEffect(() => {
    loadCoachingActivities();
  }, [profile, showAll, clientId]);

  const loadCoachingActivities = async () => {
    try {
      let url = `development_activities?type=eq.coaching&select=*,trainee:trainee_id(id,full_name,email),coach:coach_id(id,full_name),competencies(id,name)&order=created_at.desc`;
      
      if (showAll && clientId) {
        url += `&client_id=eq.${clientId}`;
      } else if (showAll) {
        // Super Admin - see all
      } else {
        url += `&coach_id=eq.${profile.id}`;
      }
      
      const data = await dbFetch(url);
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

  const loadTraineeCompetencies = async (traineeId) => {
    setLoadingCompetencies(true);
    try {
      const data = await dbFetch(
        `user_competencies?user_id=eq.${traineeId}&select=*,competencies(id,name,competency_categories(name,color))&order=created_at.desc`
      );
      setTraineeCompetencies(data || []);
    } catch (error) {
      console.error('Error loading trainee competencies:', error);
    } finally {
      setLoadingCompetencies(false);
    }
  };

  const openActivityModal = async (activity) => {
    setSelectedActivity(activity);
    await loadFeedback(activity.id);
    setShowActivityModal(true);
  };

  const openTraineeModal = async (trainee) => {
    setSelectedTrainee(trainee);
    await loadTraineeCompetencies(trainee.id);
    setShowTraineeModal(true);
  };

  const openValidateModal = (activity = null, competency = null) => {
    if (activity) {
      setSelectedActivity(activity);
      setSelectedCompetency(null);
      setValidateForm({
        achieved_level: activity.target_level || 3,
        notes: ''
      });
    } else if (competency) {
      setSelectedActivity(null);
      setSelectedCompetency(competency);
      setValidateForm({
        achieved_level: competency.target_level || competency.current_level + 1 || 3,
        notes: ''
      });
    }
    setShowValidateModal(true);
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
          author_role: showAll ? 'manager' : 'coach',
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

  const handleValidateActivity = async () => {
    if (!selectedActivity) return;
    
    setUpdatingStatus(true);
    try {
      // Update activity status
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
              current_level: validateForm.achieved_level,
              status: validateForm.achieved_level >= existingComp[0].target_level ? 'achieved' : 'in_progress',
              updated_at: new Date().toISOString()
            })
          });
        }
      }
      
      // Add validation feedback
      await dbFetch('activity_feedback', {
        method: 'POST',
        body: JSON.stringify({
          activity_id: selectedActivity.id,
          author_id: profile.id,
          author_role: showAll ? 'manager' : 'coach',
          feedback_type: 'validation',
          content: validateForm.notes || `Validated at Level ${validateForm.achieved_level}`
        })
      });
      
      setShowValidateModal(false);
      setShowActivityModal(false);
      await loadCoachingActivities();
    } catch (error) {
      console.error('Error validating:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleValidateCompetency = async () => {
    if (!selectedCompetency || !selectedTrainee) return;
    
    setUpdatingStatus(true);
    try {
      // Update competency level directly
      await dbFetch(`user_competencies?id=eq.${selectedCompetency.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_level: validateForm.achieved_level,
          status: validateForm.achieved_level >= selectedCompetency.target_level ? 'achieved' : 'in_progress',
          validated_at: new Date().toISOString(),
          validated_by: profile.id,
          updated_at: new Date().toISOString()
        })
      });

      // Create a validation record in development_activities for tracking
      await dbFetch('development_activities', {
        method: 'POST',
        body: JSON.stringify({
          type: 'coaching',
          title: `Direct Validation: ${selectedCompetency.competencies?.name || 'Competency'}`,
          description: validateForm.notes || `Competency validated at Level ${validateForm.achieved_level}`,
          trainee_id: selectedTrainee.id,
          assigned_by: profile.id,
          coach_id: profile.id,
          competency_id: selectedCompetency.competency_id,
          target_level: validateForm.achieved_level,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: profile.id,
          client_id: clientId || profile.client_id
        })
      });
      
      setShowValidateModal(false);
      await loadTraineeCompetencies(selectedTrainee.id);
      await loadCoachingActivities();
    } catch (error) {
      console.error('Error validating competency:', error);
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

  const getLevelColor = (current, target) => {
    if (current >= target) return 'text-green-600';
    if (current >= target - 1) return 'text-amber-600';
    return 'text-gray-600';
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
    return null;
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
            {showAll ? 'All Coaching Activities' : 'My Coachees'}
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
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                    onClick={() => openTraineeModal(trainee)}
                  >
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{trainee.full_name}</p>
                      <p className="text-xs text-gray-500">{trainee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTraineeModal(trainee)}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                    >
                      View All Competencies
                    </button>
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
                          {activity.target_level && (
                            <span className="text-xs text-gray-400">→ L{activity.target_level}</span>
                          )}
                          {showAll && activity.coach && (
                            <span className="text-xs text-gray-400">• Coach: {activity.coach.full_name}</span>
                          )}
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
                {selectedActivity.status !== 'validated' && (
                  <button
                    onClick={() => openValidateModal(selectedActivity)}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    ✓ Validate Competency
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
                    placeholder="Add feedback..."
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

      {/* Trainee Competencies Modal */}
      {showTraineeModal && selectedTrainee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTrainee.full_name}</h2>
                  <p className="text-sm text-gray-500">All Competencies</p>
                </div>
              </div>
              <button
                onClick={() => setShowTraineeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingCompetencies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : traineeCompetencies.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No competencies assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {traineeCompetencies.map(comp => (
                    <div key={comp.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        {comp.competencies?.competency_categories?.color && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: comp.competencies.competency_categories.color }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{comp.competencies?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">
                            {comp.competencies?.competency_categories?.name || 'Uncategorized'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`font-bold ${getLevelColor(comp.current_level, comp.target_level)}`}>
                            L{comp.current_level || 0} → L{comp.target_level}
                          </p>
                          <p className="text-xs text-gray-500">
                            {comp.status === 'achieved' ? '✅ Achieved' : 'In progress'}
                          </p>
                        </div>
                        {comp.current_level < comp.target_level && (
                          <button
                            onClick={() => openValidateModal(null, comp)}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Validate
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidateModal && (selectedActivity || selectedCompetency) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Validate Competency</h2>
                  <p className="text-sm text-gray-500">
                    {selectedActivity?.competencies?.name || selectedCompetency?.competencies?.name || 'Competency'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowValidateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Trainee Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Trainee</p>
                <p className="font-medium">
                  {selectedActivity?.trainee?.full_name || selectedTrainee?.full_name}
                </p>
              </div>

              {/* Achieved Level Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Achieved Level
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setValidateForm({ ...validateForm, achieved_level: level })}
                      className={`flex-1 py-3 rounded-lg border-2 font-bold transition-all ${
                        validateForm.achieved_level === level
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      L{level}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Target: Level {selectedActivity?.target_level || selectedCompetency?.target_level || '?'}
                </p>
              </div>

              {/* Validation Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validation Notes (Optional)
                </label>
                <textarea
                  value={validateForm.notes}
                  onChange={(e) => setValidateForm({ ...validateForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Add notes about this validation..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowValidateModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={selectedActivity ? handleValidateActivity : handleValidateCompetency}
                disabled={updatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Validation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Team Lead Dashboard - sees all team coaching and training
function TeamLeadDashboard() {
  const { profile, clientId } = useAuth();
  const [stats, setStats] = useState({
    teamMembers: 0,
    competenciesAssigned: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    coachingActive: 0,
    coachingOverdue: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile, clientId]);

  async function loadData() {
    try {
      console.log('TeamLeadDashboard: Loading data for profile:', profile.id);
      
      // Get team members who report to this team lead
      const teamMembers = await dbFetch(
        `profiles?select=id,full_name,email&reports_to_id=eq.${profile.id}&is_active=eq.true`
      );
      console.log('TeamLeadDashboard: Team members found:', teamMembers);
      
      const teamIds = teamMembers?.map(m => m.id) || [];
      console.log('TeamLeadDashboard: Team IDs:', teamIds);

      if (teamIds.length > 0) {
        const teamIdList = teamIds.join(',');
        console.log('TeamLeadDashboard: Team ID list:', teamIdList);

        // Get competencies stats
        const competencies = await dbFetch(
          `user_competencies?select=id,status&user_id=in.(${teamIdList})`
        );
        console.log('TeamLeadDashboard: Competencies:', competencies);
        const compAssigned = competencies?.length || 0;
        const compAchieved = competencies?.filter(c => c.status === 'achieved').length || 0;

        // Get training stats
        const training = await dbFetch(
          `user_training?select=id,status&user_id=in.(${teamIdList})`
        );
        console.log('TeamLeadDashboard: Training:', training);
        const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;
        const trainingCompleted = training?.filter(t => t.status === 'passed').length || 0;
        console.log('TeamLeadDashboard: Training pending:', trainingPending, 'completed:', trainingCompleted);

        // Get coaching stats
        const coaching = await dbFetch(
          `development_activities?select=id,status,due_date&trainee_id=in.(${teamIdList})&type=eq.coaching`
        );
        const coachingActive = coaching?.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length || 0;
        const coachingOverdue = coaching?.filter(c => {
          if (!c.due_date || c.status === 'validated') return false;
          return new Date(c.due_date) < new Date();
        }).length || 0;

        setStats({
          teamMembers: teamIds.length,
          competenciesAssigned: compAssigned,
          competenciesAchieved: compAchieved,
          trainingPending,
          trainingCompleted,
          coachingActive,
          coachingOverdue
        });

        // Get recent training completions - fetch separately and join manually
        const recentTraining = await dbFetch(
          `user_training?select=id,status,completed_at,user_id,module_id&user_id=in.(${teamIdList})&status=eq.passed&order=completed_at.desc&limit=5`
        );
        console.log('TeamLeadDashboard: Recent training:', recentTraining);
        
        // Enrich with user and module names
        if (recentTraining && recentTraining.length > 0) {
          const enrichedTraining = await Promise.all(recentTraining.map(async (t) => {
            const [userInfo, moduleInfo] = await Promise.all([
              dbFetch(`profiles?select=full_name&id=eq.${t.user_id}`),
              dbFetch(`training_modules?select=title&id=eq.${t.module_id}`)
            ]);
            return {
              ...t,
              trainee_name: userInfo?.[0]?.full_name || 'Unknown',
              module_title: moduleInfo?.[0]?.title || 'Unknown'
            };
          }));
          setRecentActivity(enrichedTraining);
        } else {
          setRecentActivity([]);
        }
      }
    } catch (error) {
      console.error('Error loading team lead data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const competencyProgress = stats.competenciesAssigned > 0 
    ? Math.round((stats.competenciesAchieved / stats.competenciesAssigned) * 100) 
    : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Lead Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Team Members" 
          value={stats.teamMembers}
          subtitle="Active trainees"
          icon={Users}
          color="blue"
        />
        <StatCard 
          title="Competencies" 
          value={`${stats.competenciesAchieved}/${stats.competenciesAssigned}`}
          subtitle={`${competencyProgress}% achieved`}
          icon={Target}
          color="green"
        />
        <StatCard 
          title="Training" 
          value={stats.trainingPending}
          subtitle={`Pending (${stats.trainingCompleted} completed)`}
          icon={GraduationCap}
          color="amber"
        />
        <StatCard 
          title="Coaching" 
          value={stats.coachingActive}
          subtitle={stats.coachingOverdue > 0 ? `${stats.coachingOverdue} overdue` : 'Active sessions'}
          icon={Users}
          color={stats.coachingOverdue > 0 ? 'red' : 'purple'}
        />
      </div>

      {/* Team Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Team Competency Progress</h3>
          <ProgressRing percentage={competencyProgress} color="#10B981" />
          <p className="text-sm text-gray-600 mt-4">
            {stats.competenciesAchieved} of {stats.competenciesAssigned} competencies achieved
          </p>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Recent Training Completions</h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-400 text-sm">No recent completions</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium text-gray-900">{item.trainee_name}</p>
                      <p className="text-sm text-gray-500">{item.module_title}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Team Coaching Activities */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection clientId={clientId} />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickAction
            title="View My Team"
            description="See team members and progress"
            href="/my-team"
            icon={Users}
          />
          <QuickActionButton
            title="Development Activities"
            description="Assign coaching & development"
            onClick={() => setShowDevModal(true)}
            icon={ClipboardList}
          />
          <QuickAction
            title="Assign Training"
            description="Schedule training for team"
            href="/training"
            icon={GraduationCap}
          />
          <QuickAction
            title="View Reports"
            description="Team analytics"
            href="/reports"
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => {}}
      />
    </div>
  );
}

// Super Admin Dashboard
function SuperAdminDashboard() {
  const { profile } = useAuth();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({
    userCount: 0,
    networkCount: 0,
    coachingActive: 0,
    trainingPending: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

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
      
      // Count networks
      const networks = await dbFetch('expert_networks?select=id&is_active=eq.true');

      // Count active coaching
      const coaching = await dbFetch('development_activities?select=id&type=eq.coaching&status=neq.validated&status=neq.cancelled');

      // Count pending training
      const training = await dbFetch('user_training?select=id&status=in.(pending,in_progress)');

      setStats({
        userCount: users?.length || 0,
        networkCount: networks?.length || 0,
        coachingActive: coaching?.length || 0,
        trainingPending: training?.length || 0
      });

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
          value={stats.userCount}
          subtitle="Across all clients"
          icon={Users}
          color="green"
        />
        <StatCard 
          title="Active Coaching" 
          value={stats.coachingActive}
          subtitle="Sessions in progress"
          icon={Target}
          color="purple"
        />
        <StatCard 
          title="Training Pending" 
          value={stats.trainingPending}
          subtitle="Awaiting completion"
          icon={GraduationCap}
          color="amber"
        />
      </div>

      {/* My Coachees Section - Show if user is a coach */}
      <MyCoacheesSection profile={profile} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

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
          <QuickActionButton
            title="Development Activities"
            description="Assign coaching & development"
            onClick={() => setShowDevModal(true)}
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

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => {}}
      />

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
  const [stats, setStats] = useState({
    networkCount: 0,
    competenciesAssigned: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    coachingActive: 0
  });
  const [loading, setLoading] = useState(true);
  const [showDevModal, setShowDevModal] = useState(false);

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

      const traineeIds = usersData?.filter(u => u.role === 'trainee').map(u => u.id) || [];

      // Count networks
      const networks = await dbFetch(`expert_networks?select=id&client_id=eq.${clientId}&is_active=eq.true`);

      if (traineeIds.length > 0) {
        const idList = traineeIds.join(',');

        // Competencies
        const competencies = await dbFetch(`user_competencies?select=id,status&user_id=in.(${idList})`);
        const compAssigned = competencies?.length || 0;
        const compAchieved = competencies?.filter(c => c.status === 'achieved').length || 0;

        // Training
        const training = await dbFetch(`user_training?select=id,status&user_id=in.(${idList})`);
        const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress').length || 0;

        // Coaching
        const coaching = await dbFetch(`development_activities?select=id&client_id=eq.${clientId}&type=eq.coaching&status=neq.validated&status=neq.cancelled`);

        setStats({
          networkCount: networks?.length || 0,
          competenciesAssigned: compAssigned,
          competenciesAchieved: compAchieved,
          trainingPending,
          coachingActive: coaching?.length || 0
        });
      } else {
        setStats({
          networkCount: networks?.length || 0,
          competenciesAssigned: 0,
          competenciesAchieved: 0,
          trainingPending: 0,
          coachingActive: 0
        });
      }

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
          title="Competencies" 
          value={`${stats.competenciesAchieved}/${stats.competenciesAssigned}`}
          subtitle="Achieved / Assigned"
          icon={Target}
          color="green"
        />
        <StatCard 
          title="Training Pending" 
          value={stats.trainingPending}
          subtitle="Awaiting completion"
          icon={GraduationCap}
          color="amber"
        />
        <StatCard 
          title="Active Coaching" 
          value={stats.coachingActive}
          subtitle="Sessions in progress"
          icon={Users}
          color="purple"
        />
      </div>

      {/* My Coachees Section */}
      <MyCoacheesSection profile={profile} showAll={true} clientId={clientId} />

      {/* Training Materials KPI */}
      <TrainingMaterialsSection clientId={clientId} />

      {/* My Training Development Tasks */}
      <MyTrainingDevelopmentSection profile={profile} />

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
          <QuickActionButton
            title="Development Activities"
            description="Assign coaching & development"
            onClick={() => setShowDevModal(true)}
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

      {/* Create Development Modal */}
      <CreateDevelopmentModal
        isOpen={showDevModal}
        onClose={() => setShowDevModal(false)}
        profile={profile}
        onSuccess={() => {}}
      />

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
  const [stats, setStats] = useState({
    competenciesTotal: 0,
    competenciesAchieved: 0,
    trainingPending: 0,
    trainingCompleted: 0,
    coachingActive: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    try {
      console.log('TraineeDashboard: Loading data for user:', profile.id);
      
      // Competencies
      const competencies = await dbFetch(`user_competencies?select=id,status,current_level,target_level&user_id=eq.${profile.id}`);
      console.log('TraineeDashboard: Competencies:', competencies);
      const compTotal = competencies?.length || 0;
      const compAchieved = competencies?.filter(c => c.status === 'achieved' || c.current_level >= c.target_level).length || 0;
      const compInProgress = competencies?.filter(c => c.status !== 'achieved' && c.current_level < c.target_level).length || 0;

      // Training
      const training = await dbFetch(`user_training?select=*&user_id=eq.${profile.id}`);
      console.log('TraineeDashboard: Training assignments:', training);
      const trainingPending = training?.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'assigned').length || 0;
      const trainingCompleted = training?.filter(t => t.status === 'passed' || t.status === 'completed').length || 0;

      // Coaching
      const coaching = await dbFetch(`development_activities?select=id,status,title&trainee_id=eq.${profile.id}&type=eq.coaching`);
      console.log('TraineeDashboard: Coaching activities:', coaching);
      const activeCoaching = coaching?.filter(c => c.status !== 'validated' && c.status !== 'cancelled').length || 0;

      setStats({
        competenciesTotal: compTotal,
        competenciesAchieved: compAchieved,
        competenciesToDevelop: compInProgress,
        trainingPending,
        trainingCompleted,
        coachingActive: activeCoaching
      });
    } catch (error) {
      console.error('Error loading trainee data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const overallProgress = stats.competenciesTotal > 0 
    ? Math.round((stats.competenciesAchieved / stats.competenciesTotal) * 100) 
    : 0;

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
            {stats.competenciesAchieved} of {stats.competenciesTotal} competencies achieved
          </p>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <StatCard 
            title="Skills to Develop" 
            value={stats.competenciesTotal - stats.competenciesAchieved}
            subtitle="In progress"
            icon={Target}
            color="blue"
          />
          <StatCard 
            title="Training Pending" 
            value={stats.trainingPending}
            subtitle={`${stats.trainingCompleted} completed`}
            icon={GraduationCap}
            color="amber"
          />
          <StatCard 
            title="Active Coaching" 
            value={stats.coachingActive}
            subtitle="Sessions in progress"
            icon={Users}
            color="purple"
          />
          <StatCard 
            title="Skills Achieved" 
            value={stats.competenciesAchieved}
            subtitle={`of ${stats.competenciesTotal} total`}
            icon={CheckCircle}
            color="green"
          />
        </div>
      </div>

      {/* My Training Development Tasks (if assigned as training developer) */}
      <MyTrainingDevelopmentSection profile={profile} />

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
            description="View your IDP & coaching"
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

  // Team Lead gets their own dashboard
  if (profile?.role === 'team_lead') {
    return <TeamLeadDashboard />;
  }
  
  if (isTrainee) {
    return <TraineeDashboard />;
  }

  return <DashboardSkeleton />;
}

export default DashboardPage;
