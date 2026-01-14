// ============================================================================
// E&T MANAGER - TRAINING PAGE
// Training modules management with Development and Assignment tabs
// ============================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import { supabase } from '../lib/supabase';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  GraduationCap,
  FileText,
  Upload,
  Eye,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  ChevronDown,
  Filter,
  Play,
  FileCheck,
  FileClock,
  Target,
  MoreVertical,
  Archive,
  Volume2,
  Building2,
  Globe,
  Award
} from 'lucide-react';

export default function TrainingPage() {
  const { profile: currentProfile, clientId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state from URL or default
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'modules');
  
  // Data
  const [modules, setModules] = useState([]);
  const [myDevelopmentTasks, setMyDevelopmentTasks] = useState([]);
  const [userTraining, setUserTraining] = useState([]);
  const [users, setUsers] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    competency_id: '',
    content_type: 'generated',
    content_url: '',
    duration_minutes: 30,
    status: 'draft',
    owner_id: ''
  });

  // Assign Users Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningModule, setAssigningModule] = useState(null);
  const [assignForm, setAssignForm] = useState({
    selectedUsers: [],
    validator_id: '',
    due_date: ''
  });
  const [assigning, setAssigning] = useState(false);
  const [userCompetencyLevels, setUserCompetencyLevels] = useState({}); // { odule.userId: { current_level, target_level } }
  const [loadingLevels, setLoadingLevels] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentProfile, clientId]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadModules(),
        loadMyDevelopmentTasks(),
        loadUsers(),
        loadCompetencies()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      let url = 'training_modules?select=*,competency:competency_id(id,name),client:client_id(id,name),created_by_user:created_by(id,full_name),owner:owner_id(id,full_name)&order=created_at.desc';
      if (clientId) {
        url += `&client_id=eq.${clientId}`;
      }
      const data = await dbFetch(url);
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
      setModules([]);
    }
  };

  const loadMyDevelopmentTasks = async () => {
    if (!currentProfile?.id) return;
    
    try {
      // Get competencies where I'm the training developer
      const comps = await dbFetch(
        `competencies?training_developer_id=eq.${currentProfile.id}&select=id,name,description,competency_categories(name,color)&is_active=eq.true`
      );
      
      // Get existing modules to check status
      const allModules = await dbFetch('training_modules?select=id,title,status,competency_id');
      
      const enriched = (comps || []).map(comp => {
        const relatedModules = allModules?.filter(m => m.competency_id === comp.id) || [];
        const hasReleased = relatedModules.some(m => 
          m.status === 'published' || m.status === 'content_approved'
        );
        const hasDraft = relatedModules.some(m => 
          m.status === 'draft'
        );
        
        return {
          ...comp,
          modules: relatedModules,
          developmentStatus: hasReleased ? 'published' : hasDraft ? 'draft' : 'not_started'
        };
      });
      
      setMyDevelopmentTasks(enriched);
    } catch (error) {
      console.error('Error loading development tasks:', error);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role&is_active=eq.true&order=full_name.asc';
      if (clientId) {
        url += `&client_id=eq.${clientId}`;
      }
      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCompetencies = async () => {
    try {
      const data = await dbFetch('competencies?select=id,name&is_active=eq.true&order=name.asc');
      setCompetencies(data || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const handleCreateModule = (competencyId = null) => {
    setEditingModule(null);
    setFormData({
      title: '',
      description: '',
      competency_id: competencyId || '',
      content_type: 'generated',
      content_url: '',
      duration_minutes: 30,
      status: 'draft',
      owner_id: currentProfile?.id || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleEditModule = (module) => {
    setEditingModule(module);
    setFormData({
      title: module.title || '',
      description: module.description || '',
      competency_id: module.competency_id || '',
      content_type: module.content_type || 'document',
      content_url: module.content_url || '',
      duration_minutes: module.duration_minutes || 30,
      status: module.status || 'draft',
      owner_id: module.owner_id || module.created_by || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      const moduleData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        competency_id: formData.competency_id || null,
        content_type: formData.content_type,
        content_url: formData.content_url,
        duration_minutes: parseInt(formData.duration_minutes) || 30,
        status: formData.status,
        client_id: clientId || null,
        owner_id: formData.owner_id || null
      };

      if (editingModule) {
        // Update last_reviewed_at when editing
        moduleData.last_reviewed_at = new Date().toISOString();
        await dbFetch(`training_modules?id=eq.${editingModule.id}`, {
          method: 'PATCH',
          body: JSON.stringify(moduleData)
        });
      } else {
        moduleData.created_by = currentProfile.id;
        await dbFetch('training_modules', {
          method: 'POST',
          body: JSON.stringify(moduleData)
        });
      }

      setShowModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving module:', error);
      setError(error.message || 'Failed to save module');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!confirm('Are you sure you want to delete this training module?')) return;
    
    try {
      await dbFetch(`training_modules?id=eq.${moduleId}`, {
        method: 'DELETE'
      });
      await loadModules();
    } catch (error) {
      console.error('Error deleting module:', error);
    }
  };

  const handleUpdateStatus = async (moduleId, newStatus) => {
    try {
      await dbFetch(`training_modules?id=eq.${moduleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Handle assigning users to training module
  const handleAssignUsers = async () => {
    if (assignForm.selectedUsers.length === 0) {
      alert('Please select at least one user to assign');
      return;
    }
    if (!assignForm.validator_id) {
      alert('Please select a validator/coach who will validate the competency after completion');
      return;
    }

    setAssigning(true);
    try {
      // Create user_training records for each selected user
      for (const userId of assignForm.selectedUsers) {
        // Check if already assigned
        const existing = await dbFetch(
          `user_training?user_id=eq.${userId}&module_id=eq.${assigningModule.id}`
        );
        
        if (existing && existing.length > 0) {
          // Update existing assignment with new validator
          await supabase
            .from('user_training')
            .update({
              validator_id: assignForm.validator_id,
              due_date: assignForm.due_date || null,
              assigned_by: currentProfile.id,
              assigned_at: new Date().toISOString()
            })
            .eq('id', existing[0].id);
        } else {
          // Create new assignment
          const { error: insertError } = await supabase
            .from('user_training')
            .insert({
              user_id: userId,
              module_id: assigningModule.id,
              status: 'pending',
              validator_id: assignForm.validator_id,
              due_date: assignForm.due_date || null,
              assigned_by: currentProfile.id,
              assigned_at: new Date().toISOString()
            });
          
          if (insertError) throw insertError;
        }

        // Get user info for notification
        const userInfo = users.find(u => u.id === userId);
        
        // Notify the assigned user
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'training_assigned',
          title: 'New Training Assigned',
          message: `You have been assigned the training: "${assigningModule.title}"${assignForm.due_date ? ` - Due: ${new Date(assignForm.due_date).toLocaleDateString()}` : ''}`,
          link: '/my-training',
          metadata: {
            module_id: assigningModule.id,
            module_title: assigningModule.title,
            assigned_by: currentProfile.id,
            validator_id: assignForm.validator_id
          }
        });

        // Notify the validator/coach that they've been assigned as validator
        if (assignForm.validator_id !== userId) {
          await supabase.from('notifications').insert({
            user_id: assignForm.validator_id,
            type: 'validator_assigned',
            title: 'Assigned as Validator',
            message: `You have been assigned to validate "${userInfo?.full_name || 'a trainee'}" after they complete: "${assigningModule.title}"`,
            link: '/dashboard',
            metadata: {
              module_id: assigningModule.id,
              module_title: assigningModule.title,
              trainee_id: userId,
              trainee_name: userInfo?.full_name,
              assigned_by: currentProfile.id
            }
          });
        }
      }

      setShowAssignModal(false);
      setAssigningModule(null);
      alert(`Successfully assigned ${assignForm.selectedUsers.length} user(s) to this training`);
      
    } catch (error) {
      console.error('Error assigning users:', error);
      alert('Error assigning users. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  // Toggle user selection for assignment
  const toggleUserSelection = (userId) => {
    setAssignForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  // Load competency levels for all users when opening assign modal
  const loadUserCompetencyLevels = async (competencyId) => {
    if (!competencyId) {
      setUserCompetencyLevels({});
      return;
    }
    
    setLoadingLevels(true);
    try {
      const levels = await dbFetch(
        `user_competencies?select=user_id,current_level,target_level&competency_id=eq.${competencyId}`
      );
      
      const levelMap = {};
      (levels || []).forEach(uc => {
        levelMap[uc.user_id] = {
          current_level: uc.current_level || 0,
          target_level: uc.target_level || 3
        };
      });
      setUserCompetencyLevels(levelMap);
    } catch (error) {
      console.error('Error loading competency levels:', error);
    } finally {
      setLoadingLevels(false);
    }
  };

  // Open assign modal and load competency levels
  const openAssignModal = async (module) => {
    setAssigningModule(module);
    setAssignForm({
      selectedUsers: [],
      validator_id: module.owner_id || module.training_developer_id || '',
      due_date: ''
    });
    setShowAssignModal(true);
    
    // Get competency_id from module
    const competencyId = module.competency_id || module.competency?.id;
    if (competencyId) {
      await loadUserCompetencyLevels(competencyId);
    } else {
      setUserCompetencyLevels({});
    }
  };

  // Filter modules by search
  const filteredModules = modules.filter(m =>
    m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'content_approved':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'archived':
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training</h1>
          <p className="text-gray-600 mt-1">Manage training modules and assignments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('modules')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'modules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              All Modules
            </div>
          </button>
          <button
            onClick={() => setActiveTab('development')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'development'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Development
              {myDevelopmentTasks.filter(t => t.developmentStatus !== 'published').length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {myDevelopmentTasks.filter(t => t.developmentStatus !== 'published').length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('assign')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'assign'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assign Training
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          {/* Search and Add */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <button
              onClick={() => handleCreateModule()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          </div>

          {/* Modules Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModules.length === 0 ? (
              <div className="col-span-full bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No training modules yet</p>
                <button
                  onClick={() => handleCreateModule()}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Create your first module
                </button>
              </div>
            ) : (
              filteredModules.map((module) => (
                <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  {/* Header with title and dropdown */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 pr-2">{module.title}</h3>
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === module.id ? null : module.id);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      {openDropdown === module.id && (
                        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={() => {
                              handleEditModule(module);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              window.open(`/training/preview/${module.id}`, '_blank');
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          {module.status === 'published' && (
                            <button
                              onClick={() => {
                                handleUpdateStatus(module.id, 'archived');
                                setOpenDropdown(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Archive className="w-4 h-4" />
                              Archive
                            </button>
                          )}
                          <button
                            onClick={() => {
                              openAssignModal(module);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Assign Users
                          </button>
                          <button
                            onClick={() => {
                              // TODO: Generate audio
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                          >
                            <Volume2 className="w-4 h-4" />
                            Generate Audio
                          </button>
                          <hr className="my-1" />
                          <button
                            onClick={() => {
                              handleDeleteModule(module.id);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status badge */}
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${getStatusColor(module.status)}`}>
                    {module.status === 'published' ? 'Published' : module.status === 'draft' ? 'Draft' : module.status}
                  </span>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{module.description || 'No description'}</p>
                  
                  {/* Module info */}
                  <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                    {module.client?.name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{module.client.name}</span>
                      </div>
                    )}
                    {module.competency?.name && (
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5" />
                        <span>{module.competency.name}</span>
                        {module.target_level && <span>• Level {module.target_level}</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {module.slides_count || 0} slides
                    </span>
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      {module.quiz_count || 0} questions
                    </span>
                  </div>
                  
                  {/* Language and pass rate */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {module.language || 'English'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      Pass: {module.pass_percentage || 80}%
                    </span>
                  </div>
                  
                  {/* Metadata: Created, Last Review, Owner */}
                  <div className="pt-3 border-t border-gray-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-gray-600">
                        {module.created_at ? new Date(module.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Last review:</span>
                      <span className="text-gray-600">
                        {module.last_reviewed_at 
                          ? new Date(module.last_reviewed_at).toLocaleDateString() 
                          : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Owner:</span>
                      <span className="text-gray-600 truncate max-w-[120px]">
                        {module.owner?.full_name || module.created_by_user?.full_name || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'development' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Competencies assigned to you for training development</p>
          </div>

          {myDevelopmentTasks.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No training development tasks assigned to you</p>
              <p className="text-sm mt-2">You'll see competencies here when assigned as Training Developer</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {myDevelopmentTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {task.competency_categories?.color && (
                        <div 
                          className="w-4 h-4 rounded-full mt-1"
                          style={{ backgroundColor: task.competency_categories.color }}
                        />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{task.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          Category: {task.competency_categories?.name || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.developmentStatus === 'published' 
                          ? 'bg-green-100 text-green-700'
                          : task.developmentStatus === 'draft'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {task.developmentStatus === 'published' 
                          ? 'Released' 
                          : task.developmentStatus === 'draft'
                            ? 'In Development'
                            : 'Not Started'}
                      </span>
                      {task.developmentStatus !== 'published' && (
                        <button
                          onClick={() => handleCreateModule(task.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Plus className="w-4 h-4" />
                          {task.modules?.length > 0 ? 'Add Module' : 'Create Module'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Existing modules for this competency */}
                  {task.modules?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm font-medium text-gray-700 mb-2">Training Modules:</p>
                      <div className="space-y-2">
                        {task.modules.map(mod => (
                          <div key={mod.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-700">{mod.title}</span>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(mod.status)}`}>
                                {mod.status}
                              </span>
                              <button
                                onClick={() => {
                                  const fullModule = modules.find(m => m.id === mod.id);
                                  if (fullModule) handleEditModule(fullModule);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'assign' && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Training assignment feature</p>
          <p className="text-sm mt-2">Assign released training modules to users</p>
          {/* TODO: Add user training assignment */}
        </div>
      )}

      {/* Create/Edit Module Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingModule ? 'Edit Module' : 'Create Training Module'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="e.g., Introduction to Safety Procedures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="What will users learn..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Linked Competency</label>
                <select
                  value={formData.competency_id}
                  onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">No linked competency</option>
                  {competencies.map(comp => (
                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <select
                  value={formData.owner_id}
                  onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Select owner...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="generated">Generated</option>
                    <option value="uploaded">Uploaded</option>
                    <option value="adapted">Adapted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content URL</label>
                <input
                  type="url"
                  value={formData.content_url}
                  onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="content_approved">Content Approved</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </form>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingModule ? 'Save Changes' : 'Create Module'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && assigningModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assign Users</h2>
                <p className="text-sm text-gray-500">{assigningModule.title}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Module competency info */}
              {(assigningModule.competency_id || assigningModule.competency?.id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Target className="w-4 h-4" />
                    <span className="font-medium">Linked Competency:</span>
                    <span>{assigningModule.competency?.name || 'Loading...'}</span>
                    {assigningModule.target_level && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-200 text-blue-800 rounded text-xs">
                        Target: L{assigningModule.target_level}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* User Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users to Assign *
                </label>
                {loadingLevels && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading competency levels...
                  </div>
                )}
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {users.filter(u => u.id !== currentProfile?.id).length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No users available</p>
                  ) : (
                    users
                      .filter(u => u.id !== currentProfile?.id && u.is_active !== false)
                      .map(user => {
                        const userLevel = userCompetencyLevels[user.id];
                        const currentLevel = userLevel?.current_level || 0;
                        const targetLevel = userLevel?.target_level || assigningModule.target_level || 3;
                        const hasGap = currentLevel < targetLevel;
                        
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                              assignForm.selectedUsers.includes(user.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={assignForm.selectedUsers.includes(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-medium text-sm">
                                  {user.full_name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                  <p className="text-xs text-gray-500">{user.role || user.email}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Current Maturity Level */}
                            {(assigningModule.competency_id || assigningModule.competency?.id) && (
                              <div className="flex items-center gap-2">
                                <div className={`px-2 py-1 rounded text-xs font-medium ${
                                  currentLevel === 0 ? 'bg-gray-100 text-gray-600' :
                                  currentLevel >= targetLevel ? 'bg-green-100 text-green-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  L{currentLevel}
                                </div>
                                {hasGap && (
                                  <span className="text-xs text-gray-400">→ L{targetLevel}</span>
                                )}
                                {!hasGap && currentLevel > 0 && (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </div>
                            )}
                          </label>
                        );
                      })
                  )}
                </div>
                {assignForm.selectedUsers.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    {assignForm.selectedUsers.length} user(s) selected
                  </p>
                )}
              </div>

              {/* Validator/Coach Selection - REQUIRED */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    Select Validator/Coach *
                  </span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  This person will be notified when training is completed and will validate the competency level.
                </p>
                <select
                  value={assignForm.validator_id}
                  onChange={(e) => setAssignForm({ ...assignForm, validator_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select validator/coach...</option>
                  {users
                    .filter(u => u.is_active !== false)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                        {user.id === assigningModule.owner_id ? ' (Module Owner)' : ''}
                        {user.id === assigningModule.training_developer_id ? ' (Training Developer)' : ''}
                        {user.role === 'team_lead' || user.role === 'admin' ? ` (${user.role})` : ''}
                      </option>
                    ))
                  }
                </select>
                {!assignForm.validator_id && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    A validator is required to approve competency levels after completion
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={assignForm.due_date}
                  onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Info box about the workflow */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-1">📋 Validation Workflow</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>1. Selected users will receive a notification to complete the training</li>
                  <li>2. When training is completed, the validator/coach will be notified</li>
                  <li>3. Validator reviews and grants the appropriate maturity level (1-4)</li>
                  <li>4. The competency level is updated in the trainee's progress</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUsers}
                disabled={assigning || assignForm.selectedUsers.length === 0 || !assignForm.validator_id}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Assign ({assignForm.selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
