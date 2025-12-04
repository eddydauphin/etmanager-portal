import { useState, useEffect } from 'react';
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
  ChevronDown,
  Eye,
  Upload,
  Sparkles,
  Play,
  FileText,
  Building2,
  Target,
  MoreVertical,
  Clock,
  Award,
  Users,
  CheckCircle,
  XCircle,
  Volume2,
  Globe,
  ClipboardList,
  RotateCcw,
  Archive,
  Send
} from 'lucide-react';

export default function TrainingModulesPage() {
  const { profile: currentProfile } = useAuth();
  
  // State
  const [modules, setModules] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  
  // Assignment state
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [assignDueDate, setAssignDueDate] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleToDelete, setModuleToDelete] = useState(null);
  
  // Create form state
  const [createStep, setCreateStep] = useState(1); // 1: Basic info, 2: Content, 3: Quiz
  const [createMethod, setCreateMethod] = useState(null); // 'generate' or 'upload'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_ids: [], // Changed to array for multi-select
    competency_id: '',
    target_level: 3,
    pass_score: 80,
    max_attempts: 3,
    has_audio: true,
    audio_languages: ['en'] // Changed to array for multi-select
  });
  const [generating, setGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState([]);
  const [generatedQuiz, setGeneratedQuiz] = useState([]);
  const [formError, setFormError] = useState('');
  
  // Dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
    { code: 'es', label: 'Spanish' },
    { code: 'et', label: 'Estonian' }
  ];

  useEffect(() => {
    loadData();
  }, [currentProfile]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadModules(), loadCompetencies(), loadClients(), loadUsers()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModules = async () => {
    try {
      const data = await dbFetch(
        'training_modules?select=*,clients(name),competency_modules(competency_id,target_level,competencies(name)),module_questions(id),module_slides(id)&order=created_at.desc'
      );
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadCompetencies = async () => {
    try {
      const data = await dbFetch('competencies?select=*&is_active=eq.true&order=name.asc');
      setCompetencies(data || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const loadClients = async () => {
    try {
      const data = await dbFetch('clients?select=id,name&order=name.asc');
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await dbFetch('profiles?select=id,full_name,email,role,client_id,clients(name)&role=eq.trainee&order=full_name.asc');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAssignedUsers = async (moduleId) => {
    try {
      const data = await dbFetch(`user_training?module_id=eq.${moduleId}&select=*,profiles(id,full_name,email)`);
      setAssignedUsers(data || []);
    } catch (error) {
      console.error('Error loading assigned users:', error);
    }
  };

  // Filter modules
  const filteredModules = modules.filter(module => {
    const matchesSearch = 
      module.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || module.status === statusFilter;
    const matchesClient = clientFilter === 'all' || module.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Stats
  const stats = {
    total: modules.length,
    published: modules.filter(m => m.status === 'published').length,
    draft: modules.filter(m => m.status === 'draft').length,
    pending: modules.filter(m => m.status === 'content_approved').length
  };

  // Open create modal
  const handleOpenCreate = () => {
    setFormData({
      title: '',
      description: '',
      client_ids: currentProfile?.role === 'client_admin' ? [currentProfile.client_id] : [],
      competency_id: '',
      target_level: 3,
      pass_score: 80,
      max_attempts: 3,
      has_audio: true,
      audio_languages: ['en']
    });
    setCreateStep(1);
    setCreateMethod(null);
    setGeneratedSlides([]);
    setGeneratedQuiz([]);
    setFormError('');
    setShowCreateModal(true);
  };

  // Generate content with AI
  const handleGenerateContent = async () => {
    if (!formData.title || formData.client_ids.length === 0 || !formData.competency_id) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.audio_languages.length === 0) {
      setFormError('Please select at least one language');
      return;
    }

    setGenerating(true);
    setFormError('');

    try {
      const competency = competencies.find(c => c.id === formData.competency_id);
      // Use first selected language for generation
      const primaryLanguage = formData.audio_languages[0];
      const languageLabel = languages.find(l => l.code === primaryLanguage)?.label || 'English';
      
      const levelDescriptions = {
        1: competency?.level_1_description || 'Can recognize the topic',
        2: competency?.level_2_description || 'Can explain concepts',
        3: competency?.level_3_description || 'Can perform with supervision',
        4: competency?.level_4_description || 'Works independently',
        5: competency?.level_5_description || 'Can teach others'
      };

      // Generate slides
      const slidesResponse = await fetch('/api/generate-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'slides',
          title: formData.title,
          competency: competency,
          targetLevel: formData.target_level,
          levelDescriptions: levelDescriptions,
          language: languageLabel
        })
      });

      if (!slidesResponse.ok) {
        const error = await slidesResponse.json();
        throw new Error(error.error || 'Failed to generate slides');
      }

      const slidesData = await slidesResponse.json();
      setGeneratedSlides(slidesData.slides || []);

      // Generate quiz
      const quizResponse = await fetch('/api/generate-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quiz',
          title: formData.title,
          competency: competency,
          targetLevel: formData.target_level,
          language: languageLabel
        })
      });

      if (!quizResponse.ok) {
        const error = await quizResponse.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const quizData = await quizResponse.json();
      setGeneratedQuiz(quizData.questions || []);

      setCreateStep(2);
    } catch (error) {
      console.error('Error generating content:', error);
      setFormError(error.message || 'Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Save module
  const handleSaveModule = async () => {
    setGenerating(true);
    setFormError('');

    try {
      // Create a module for each client and language combination
      for (const clientId of formData.client_ids) {
        for (const langCode of formData.audio_languages) {
          const langLabel = languages.find(l => l.code === langCode)?.label || 'English';
          const clientName = clients.find(c => c.id === clientId)?.name || '';
          
          // Add language suffix if multiple languages selected
          const titleSuffix = formData.audio_languages.length > 1 ? ` (${langLabel})` : '';
          
          const modulePayload = {
            title: formData.title + titleSuffix,
            description: formData.description,
            client_id: clientId,
            pass_score: formData.pass_score,
            max_attempts: formData.max_attempts,
            has_audio: formData.has_audio,
            audio_language: langCode,
            content_type: 'generated',
            status: 'draft',
            created_by: currentProfile?.id
          };

          const moduleResult = await dbFetch('training_modules?select=id', {
            method: 'POST',
            body: JSON.stringify(modulePayload)
          });

          const moduleId = moduleResult[0]?.id;
          if (!moduleId) throw new Error('Failed to create module');

          // Link to competency
          if (formData.competency_id) {
            await dbFetch('competency_modules', {
              method: 'POST',
              body: JSON.stringify({
                competency_id: formData.competency_id,
                module_id: moduleId,
                target_level: formData.target_level,
                is_mandatory: true
              })
            });
          }

          // Save slides
          if (generatedSlides.length > 0) {
            const slidesPayload = generatedSlides.map((slide, index) => ({
              module_id: moduleId,
              slide_number: index + 1,
              title: slide.title,
              content: { key_points: slide.key_points },
              audio_script: slide.audio_script
            }));

            await dbFetch('module_slides', {
              method: 'POST',
              body: JSON.stringify(slidesPayload)
            });
          }

          // Save quiz questions
          if (generatedQuiz.length > 0) {
            const questionsPayload = generatedQuiz.map((q, index) => ({
              module_id: moduleId,
              question_text: q.question_text,
              question_type: 'multiple_choice',
              options: q.options,
              correct_answer: q.correct_answer,
              points: q.points || 1,
              sort_order: index
            }));

            await dbFetch('module_questions', {
              method: 'POST',
              body: JSON.stringify(questionsPayload)
            });
          }
        }
      }

      await loadModules();
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error saving module:', error);
      setFormError('Failed to save module');
    } finally {
      setGenerating(false);
    }
  };

  // Approve content
  const handleApproveContent = async (module) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'content_approved',
          content_approved_by: currentProfile?.id,
          content_approved_at: new Date().toISOString()
        })
      });
      await loadModules();
    } catch (error) {
      console.error('Error approving content:', error);
    }
    setOpenDropdown(null);
  };

  // Approve quiz and publish
  const handlePublish = async (module) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'published',
          quiz_approved_by: currentProfile?.id,
          quiz_approved_at: new Date().toISOString()
        })
      });
      await loadModules();
    } catch (error) {
      console.error('Error publishing:', error);
    }
    setOpenDropdown(null);
  };

  // Archive
  const handleArchive = async (module) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' })
      });
      await loadModules();
    } catch (error) {
      console.error('Error archiving:', error);
    }
    setOpenDropdown(null);
  };

  // Delete
  const handleDelete = async () => {
    if (!moduleToDelete) return;
    try {
      await dbFetch(`training_modules?id=eq.${moduleToDelete.id}`, {
        method: 'DELETE'
      });
      await loadModules();
      setShowDeleteModal(false);
      setModuleToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  // Preview
  const handlePreview = async (module) => {
    // Load slides and questions for preview
    const slides = await dbFetch(`module_slides?module_id=eq.${module.id}&order=slide_number.asc`);
    const questions = await dbFetch(`module_questions?module_id=eq.${module.id}&order=sort_order.asc`);
    
    setSelectedModule({
      ...module,
      slides: slides || [],
      questions: questions || []
    });
    setShowPreviewModal(true);
    setOpenDropdown(null);
  };

  const getLevelName = (level) => {
    const names = {
      1: 'Awareness',
      2: 'Knowledge',
      3: 'Practitioner',
      4: 'Proficient',
      5: 'Expert'
    };
    return names[level] || 'Unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'content_approved': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-amber-100 text-amber-700';
      case 'archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published': return 'Published';
      case 'content_approved': return 'Quiz Pending';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  const isSuperAdmin = currentProfile?.role === 'super_admin';

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage AI-powered training content</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Module
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Modules</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.published}</p>
              <p className="text-sm text-gray-500">Published</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
              <p className="text-sm text-gray-500">Draft</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Quiz Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="content_approved">Quiz Pending</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          {isSuperAdmin && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Modules List */}
      {filteredModules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Modules</h3>
          <p className="text-gray-500 mb-4">Create AI-powered training content for your team.</p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Sparkles className="w-4 h-4" />
            Create with AI
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map(module => (
            <div key={module.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{module.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                    {getStatusLabel(module.status)}
                  </span>
                </div>
                <div className="relative">
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
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handlePreview(module)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      
                      {module.status === 'draft' && (
                        <button
                          onClick={() => handleApproveContent(module)}
                          className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Approve Content
                        </button>
                      )}
                      
                      {module.status === 'content_approved' && (
                        <button
                          onClick={() => handlePublish(module)}
                          className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Approve Quiz & Publish
                        </button>
                      )}
                      
                      {module.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(module)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}
                      
                      {module.status === 'published' && (
                        <button
                          onClick={async () => {
                            setSelectedModule(module);
                            await loadAssignedUsers(module.id);
                            setShowAssignModal(true);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Assign Users
                        </button>
                      )}
                      
                      <div className="border-t border-gray-100 my-1" />
                      
                      <button
                        onClick={() => {
                          setModuleToDelete(module);
                          setShowDeleteModal(true);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {module.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{module.description}</p>
              )}

              <div className="space-y-2 text-sm text-gray-500">
                {module.clients?.name && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{module.clients.name}</span>
                  </div>
                )}
                
                {module.competency_modules?.[0] && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>
                      {module.competency_modules[0].competencies?.name} 
                      <span className="text-gray-400"> • Level {module.competency_modules[0].target_level}</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{module.module_slides?.length || 0} slides</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClipboardList className="w-4 h-4" />
                    <span>{module.module_questions?.length || 0} questions</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {module.has_audio && (
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-4 h-4" />
                      <span>{languages.find(l => l.code === module.audio_language)?.label}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>Pass: {module.pass_score}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create Training Module</h2>
                  <p className="text-sm text-gray-500">Step {createStep} of 3</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              {/* Step 1: Basic Info */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Spray Drying Fundamentals"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief description of the training..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clients * {formData.client_ids.length > 0 && `(${formData.client_ids.length} selected)`}</label>
                      <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {currentProfile?.role === 'client_admin' ? (
                          <div className="text-sm text-gray-600 p-1">
                            {clients.find(c => c.id === currentProfile.client_id)?.name}
                          </div>
                        ) : (
                          clients.map(client => (
                            <label key={client.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.client_ids.includes(client.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, client_ids: [...formData.client_ids, client.id] });
                                  } else {
                                    setFormData({ ...formData, client_ids: formData.client_ids.filter(id => id !== client.id) });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm text-gray-700">{client.name}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Competency *</label>
                      <select
                        value={formData.competency_id}
                        onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select competency</option>
                        {competencies.map(comp => (
                          <option key={comp.id} value={comp.id}>{comp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Level</label>
                      <select
                        value={formData.target_level}
                        onChange={(e) => setFormData({ ...formData, target_level: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>Level 1 - Awareness</option>
                        <option value={2}>Level 2 - Knowledge</option>
                        <option value={3}>Level 3 - Practitioner</option>
                        <option value={4}>Level 4 - Proficient</option>
                        <option value={5}>Level 5 - Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Languages * {formData.audio_languages.length > 0 && `(${formData.audio_languages.length} selected)`}</label>
                      <div className="border border-gray-200 rounded-lg p-2">
                        {languages.map(lang => (
                          <label key={lang.code} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.audio_languages.includes(lang.code)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({ ...formData, audio_languages: [...formData.audio_languages, lang.code] });
                                } else {
                                  setFormData({ ...formData, audio_languages: formData.audio_languages.filter(c => c !== lang.code) });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{lang.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pass Score (%)</label>
                      <input
                        type="number"
                        value={formData.pass_score}
                        onChange={(e) => setFormData({ ...formData, pass_score: parseInt(e.target.value) })}
                        min={0}
                        max={100}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                      <input
                        type="number"
                        value={formData.max_attempts}
                        onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) })}
                        min={1}
                        max={10}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="has_audio"
                      checked={formData.has_audio}
                      onChange={(e) => setFormData({ ...formData, has_audio: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="has_audio" className="text-sm text-gray-700">
                      Enable audio narration (ElevenLabs)
                    </label>
                  </div>

                  {/* Content Source Selection */}
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Content Source</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setCreateMethod('generate')}
                        className={`p-4 border-2 rounded-xl text-left transition-colors ${
                          createMethod === 'generate'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Sparkles className="w-8 h-8 text-blue-500 mb-2" />
                        <p className="font-medium text-gray-900">Generate with AI</p>
                        <p className="text-sm text-gray-500">AI creates slides and quiz</p>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setCreateMethod('upload')}
                        className={`p-4 border-2 rounded-xl text-left transition-colors ${
                          createMethod === 'upload'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Upload className="w-8 h-8 text-green-500 mb-2" />
                        <p className="font-medium text-gray-900">Upload Presentation</p>
                        <p className="text-sm text-gray-500">Upload existing PPT/PDF</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Review Content */}
              {createStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Review & Edit Slides ({generatedSlides.length})</h3>
                      <p className="text-sm text-gray-500">Click on any field to edit</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateStep(1)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        ← Back to settings
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedSlides([...generatedSlides, {
                            slide_number: generatedSlides.length + 1,
                            title: 'New Slide',
                            key_points: ['Point 1', 'Point 2', 'Point 3'],
                            audio_script: 'Audio script for this slide.'
                          }]);
                        }}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                      >
                        + Add Slide
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto">
                    {generatedSlides.map((slide, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={slide.title}
                              onChange={(e) => {
                                const updated = [...generatedSlides];
                                updated[index] = { ...updated[index], title: e.target.value };
                                setGeneratedSlides(updated);
                              }}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded font-medium text-gray-900 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const updated = generatedSlides.filter((_, i) => i !== index);
                              setGeneratedSlides(updated);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="mb-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Key Points</label>
                          {slide.key_points?.map((point, i) => (
                            <div key={i} className="flex items-center gap-2 mb-1">
                              <span className="text-gray-400">•</span>
                              <input
                                type="text"
                                value={point}
                                onChange={(e) => {
                                  const updated = [...generatedSlides];
                                  const newPoints = [...(updated[index].key_points || [])];
                                  newPoints[i] = e.target.value;
                                  updated[index] = { ...updated[index], key_points: newPoints };
                                  setGeneratedSlides(updated);
                                }}
                                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => {
                                  const updated = [...generatedSlides];
                                  const newPoints = updated[index].key_points.filter((_, pi) => pi !== i);
                                  updated[index] = { ...updated[index], key_points: newPoints };
                                  setGeneratedSlides(updated);
                                }}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const updated = [...generatedSlides];
                              const newPoints = [...(updated[index].key_points || []), 'New point'];
                              updated[index] = { ...updated[index], key_points: newPoints };
                              setGeneratedSlides(updated);
                            }}
                            className="text-xs text-blue-600 hover:underline mt-1"
                          >
                            + Add point
                          </button>
                        </div>
                        
                        <div className="bg-gray-50 rounded-lg p-3">
                          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            Audio Script
                          </label>
                          <textarea
                            value={slide.audio_script}
                            onChange={(e) => {
                              const updated = [...generatedSlides];
                              updated[index] = { ...updated[index], audio_script: e.target.value };
                              setGeneratedSlides(updated);
                            }}
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-gray-700 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setCreateStep(3)}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Review Quiz Questions →
                  </button>
                </div>
              )}

              {/* Step 3: Review Quiz */}
              {createStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Review & Edit Quiz ({generatedQuiz.length} questions)</h3>
                      <p className="text-sm text-gray-500">Click on any field to edit. Green = correct answer.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateStep(2)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        ← Back to slides
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedQuiz([...generatedQuiz, {
                            question_text: 'New question?',
                            options: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
                            correct_answer: 'A',
                            points: 1
                          }]);
                        }}
                        className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
                      >
                        + Add Question
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto">
                    {generatedQuiz.map((q, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
                              {index + 1}
                            </span>
                            <textarea
                              value={q.question_text}
                              onChange={(e) => {
                                const updated = [...generatedQuiz];
                                updated[index] = { ...updated[index], question_text: e.target.value };
                                setGeneratedQuiz(updated);
                              }}
                              rows={2}
                              className="flex-1 px-2 py-1 border border-gray-200 rounded font-medium text-gray-900 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const updated = generatedQuiz.filter((_, i) => i !== index);
                              setGeneratedQuiz(updated);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="space-y-2 ml-8">
                          {q.options?.map((option, i) => {
                            const letter = option.charAt(0);
                            const isCorrect = q.correct_answer === letter;
                            return (
                              <div key={i} className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const updated = [...generatedQuiz];
                                    updated[index] = { ...updated[index], correct_answer: letter };
                                    setGeneratedQuiz(updated);
                                  }}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                                    isCorrect 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                  }`}
                                  title={isCorrect ? 'Correct answer' : 'Click to set as correct'}
                                >
                                  {letter}
                                </button>
                                <input
                                  type="text"
                                  value={option.substring(3)}
                                  onChange={(e) => {
                                    const updated = [...generatedQuiz];
                                    const newOptions = [...updated[index].options];
                                    newOptions[i] = `${letter}) ${e.target.value}`;
                                    updated[index] = { ...updated[index], options: newOptions };
                                    setGeneratedQuiz(updated);
                                  }}
                                  className={`flex-1 px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-blue-500 ${
                                    isCorrect 
                                      ? 'border-green-300 bg-green-50' 
                                      : 'border-gray-200'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>

              {createStep === 1 && (
                <button
                  onClick={handleGenerateContent}
                  disabled={generating || !createMethod || !formData.title || formData.client_ids.length === 0 || !formData.competency_id || formData.audio_languages.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Content
                    </>
                  )}
                </button>
              )}

              {createStep === 3 && (
                <button
                  onClick={handleSaveModule}
                  disabled={generating}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {generating ? 'Saving...' : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Module
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedModule.title}</h2>
                <p className="text-sm text-gray-500">Preview Mode</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Slides */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Slides ({selectedModule.slides?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedModule.slides?.map((slide, index) => (
                    <div key={slide.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {slide.slide_number}
                        </span>
                        <h4 className="font-medium text-gray-900">{slide.title}</h4>
                      </div>
                      {slide.content?.key_points && (
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {slide.content.key_points.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Questions */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Quiz Questions ({selectedModule.questions?.length || 0})</h3>
                <div className="space-y-3">
                  {selectedModule.questions?.map((q, index) => (
                    <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium text-gray-900 mb-2">{index + 1}. {q.question_text}</p>
                      <div className="space-y-1">
                        {q.options?.map((option, i) => (
                          <div
                            key={i}
                            className={`text-sm p-2 rounded ${
                              option.startsWith(q.correct_answer)
                                ? 'bg-green-50 text-green-700'
                                : 'text-gray-600'
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && moduleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Module?</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                This will permanently delete <strong>{moduleToDelete.title}</strong> and all associated slides and questions.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setModuleToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && selectedModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assign Users</h2>
                <p className="text-sm text-gray-500">{selectedModule.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUsers([]);
                  setAssignDueDate('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Already assigned */}
              {assignedUsers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Already Assigned ({assignedUsers.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {assignedUsers.map(au => (
                      <div key={au.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{au.profiles?.full_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          au.status === 'passed' ? 'bg-green-100 text-green-700' :
                          au.status === 'failed' ? 'bg-red-100 text-red-700' :
                          au.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {au.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Select users */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Select Users to Assign</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {users
                    .filter(u => selectedModule.client_id ? u.client_id === selectedModule.client_id : true)
                    .filter(u => !assignedUsers.some(au => au.user_id === u.id))
                    .map(user => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  {users.filter(u => selectedModule.client_id ? u.client_id === selectedModule.client_id : true)
                    .filter(u => !assignedUsers.some(au => au.user_id === u.id)).length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No users available to assign</p>
                  )}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUsers([]);
                  setAssignDueDate('');
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedUsers.length === 0) return;
                  
                  try {
                    const assignments = selectedUsers.map(userId => ({
                      user_id: userId,
                      module_id: selectedModule.id,
                      assigned_by: currentProfile?.id,
                      due_date: assignDueDate || null,
                      status: 'pending'
                    }));

                    await dbFetch('user_training', {
                      method: 'POST',
                      body: JSON.stringify(assignments)
                    });

                    setShowAssignModal(false);
                    setSelectedUsers([]);
                    setAssignDueDate('');
                  } catch (error) {
                    console.error('Error assigning users:', error);
                  }
                }}
                disabled={selectedUsers.length === 0}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Assign {selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
