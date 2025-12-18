// ============================================================================
// E&T MANAGER - TRAINING PAGE
// Training modules management with Development and Assignment tabs
// ============================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
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
  Target
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
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    competency_id: '',
    content_type: 'document',
    content_url: '',
    duration_minutes: 30,
    status: 'draft'
  });

  useEffect(() => {
    loadData();
  }, [currentProfile, clientId]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

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
      let url = 'training_modules?select=*,competency:competency_id(id,name)&order=created_at.desc';
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
          m.status === 'released' || m.status === 'active' || m.status === 'published'
        );
        const hasDraft = relatedModules.some(m => 
          m.status === 'draft' || m.status === 'in_development'
        );
        
        return {
          ...comp,
          modules: relatedModules,
          developmentStatus: hasReleased ? 'released' : hasDraft ? 'in_development' : 'not_started'
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
      content_type: 'document',
      content_url: '',
      duration_minutes: 30,
      status: 'draft'
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
      status: module.status || 'draft'
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
        client_id: clientId || null
      };

      if (editingModule) {
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

  // Filter modules by search
  const filteredModules = modules.filter(m =>
    m.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'released':
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'in_development':
        return 'bg-blue-100 text-blue-700';
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
              {myDevelopmentTasks.filter(t => t.developmentStatus !== 'released').length > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                  {myDevelopmentTasks.filter(t => t.developmentStatus !== 'released').length}
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

          {/* Modules List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {filteredModules.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
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
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredModules.map((module) => (
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{module.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{module.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {module.competency?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">{module.content_type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                          {module.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {module.status === 'draft' && (
                            <button
                              onClick={() => handleUpdateStatus(module.id, 'released')}
                              className="p-1 hover:bg-green-100 rounded text-green-600"
                              title="Release"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditModule(module)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteModule(module.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                        task.developmentStatus === 'released' 
                          ? 'bg-green-100 text-green-700'
                          : task.developmentStatus === 'in_development'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}>
                        {task.developmentStatus === 'released' 
                          ? 'Released' 
                          : task.developmentStatus === 'in_development'
                            ? 'In Development'
                            : 'Not Started'}
                      </span>
                      {task.developmentStatus !== 'released' && (
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="document">Document</option>
                    <option value="video">Video</option>
                    <option value="presentation">Presentation</option>
                    <option value="quiz">Quiz</option>
                    <option value="external">External Link</option>
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
                  <option value="in_development">In Development</option>
                  <option value="released">Released</option>
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
    </div>
  );
}
