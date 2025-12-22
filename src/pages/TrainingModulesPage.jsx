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
  Send,
  Loader2
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
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingFile, setProcessingFile] = useState(false);
  const [importMode, setImportMode] = useState('smart'); // 'smart' or 'direct'
  
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
      let url = 'training_modules?select=*,clients(name),competency_modules(competency_id,target_level,competencies(name)),module_questions(id),module_slides(id)&order=created_at.desc';
      
      // Filter based on current user's role - CRITICAL: Users must only see their own organization
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        // Client admin sees modules for their organization
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'department_lead' && currentProfile?.client_id) {
        // Department lead sees modules for their organization (same as client admin for modules)
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'team_lead' && currentProfile?.client_id) {
        // Team lead sees modules for their organization
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'trainee' && currentProfile?.client_id) {
        // Trainees see modules for their organization (filtered further by assignment elsewhere)
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      // Super admin sees all modules (no additional filter)
      
      const data = await dbFetch(url);
      setModules(data || []);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadCompetencies = async () => {
    try {
      // Fetch competencies with their client associations via junction table
      let url = 'competencies?select=*,competency_clients(client_id)&is_active=eq.true&order=name.asc';
      
      // Trainees only see competencies they're assigned to develop (regardless of client)
      if (currentProfile?.role === 'trainee') {
        url += `&training_developer_id=eq.${currentProfile.id}`;
      }
      
      let data = await dbFetch(url);
      
      // Transform to include client_ids from junction table
      data = (data || []).map(comp => ({
        ...comp,
        client_ids: comp.competency_clients?.map(cc => cc.client_id).filter(Boolean) || []
      }));
      
      // Filter by client access for non-super_admin, non-trainee users
      // This checks the junction table (competency_clients) to support multi-client sharing
      if (currentProfile?.role !== 'super_admin' && currentProfile?.role !== 'trainee' && currentProfile?.client_id) {
        data = data.filter(comp => 
          comp.client_ids?.includes(currentProfile.client_id)
        );
      }
      
      console.log('Loaded competencies for role', currentProfile?.role, ':', data);
      setCompetencies(data || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const loadClients = async () => {
    try {
      let url = 'clients?select=id,name&order=name.asc';
      
      // Filter based on current user's role - non-super_admin should only see their own client
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        url += `&id=eq.${currentProfile.client_id}`;
      }
      
      const data = await dbFetch(url);
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role,client_id,department,line,clients!profiles_client_id_fkey(name)&role=eq.trainee&order=full_name.asc';
      
      // Filter based on current user's role - CRITICAL: Users must only see their own organization
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        // Client admin sees all trainees in their organization
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'department_lead' && currentProfile?.client_id) {
        // Department lead sees only trainees in their department
        url += `&client_id=eq.${currentProfile.client_id}&department=eq.${currentProfile.department}`;
      } else if (currentProfile?.role === 'team_lead' && currentProfile?.client_id) {
        // Team lead sees only trainees in their organization
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'trainee' && currentProfile?.client_id) {
        // Trainees should only see their own organization (if they have assign rights)
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      // Super admin sees all trainees (no additional filter)
      
      const data = await dbFetch(url);
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
    setUploadedFile(null);
    setUploadProgress(0);
    setProcessingFile(false);
    setImportMode('smart');
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
      
      // Debug logging
      console.log('=== GENERATE CONTENT DEBUG ===');
      console.log('Form title:', formData.title);
      console.log('Selected competency_id:', formData.competency_id);
      console.log('Found competency:', competency);
      console.log('All competencies:', competencies);
      console.log('==============================');
      
      if (!competency) {
        throw new Error('Selected competency not found');
      }
      
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
      const requestPayload = {
        type: 'slides',
        title: formData.title,
        description: formData.description, // User's description, not competency description
        competency: competency,
        targetLevel: formData.target_level,
        levelDescriptions: levelDescriptions,
        language: languageLabel,
        _nonce: `${Date.now()}-${Math.random()}` // Bypass Vercel Edge cache
      };
      console.log('Sending to API:', requestPayload);
      
      // Add timestamp to prevent browser caching
      const slidesResponse = await fetch(`/api/generate-training?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify(requestPayload)
      });

      if (!slidesResponse.ok) {
        const error = await slidesResponse.json();
        throw new Error(error.error || 'Failed to generate slides');
      }

      const slidesData = await slidesResponse.json();
      setGeneratedSlides(slidesData.slides || []);

      // Generate quiz
      const quizResponse = await fetch(`/api/generate-training?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({
          type: 'quiz',
          title: formData.title,
          description: formData.description, // User's description
          competency: competency,
          targetLevel: formData.target_level,
          language: languageLabel,
          _nonce: `${Date.now()}-${Math.random()}` // Bypass Vercel Edge cache
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

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type - Only PDF supported currently
    const validTypes = ['application/pdf'];
    const validExtensions = ['.pdf'];
    
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidType = validTypes.includes(file.type);

    if (!hasValidExtension && !hasValidType) {
      setFormError('Please upload a PDF file. PowerPoint and Word files must be converted to PDF first.');
      return;
    }

    // Validate file size (max 4MB - Vercel limit)
    if (file.size > 4 * 1024 * 1024) {
      setFormError('File size must be less than 4MB');
      return;
    }

    setUploadedFile(file);
    setFormError('');
  };

  // Process uploaded presentation
  const handleProcessUpload = async () => {
    if (!uploadedFile) {
      setFormError('Please select a file to upload');
      return;
    }

    if (!formData.title || formData.client_ids.length === 0 || !formData.competency_id) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (formData.audio_languages.length === 0) {
      setFormError('Please select at least one language');
      return;
    }

    setProcessingFile(true);
    setUploadProgress(10);
    setFormError('');

    try {
      // Read file as base64
      const fileContent = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      setUploadProgress(30);

      const competency = competencies.find(c => c.id === formData.competency_id);
      const primaryLanguage = formData.audio_languages[0];
      const languageLabel = languages.find(l => l.code === primaryLanguage)?.label || 'English';

      setUploadProgress(50);

      // Send to processing API with cache-busting
      const response = await fetch(`/api/process-presentation?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        body: JSON.stringify({
          fileContent,
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          title: formData.title,
          competency: competency,
          targetLevel: formData.target_level,
          language: languageLabel,
          importMode: importMode,
          _nonce: `${Date.now()}-${Math.random()}` // Bypass Vercel Edge cache
        })
      });

      setUploadProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process presentation');
      }

      const result = await response.json();
      
      setUploadProgress(100);

      // Set generated content
      setGeneratedSlides(result.slides || []);
      setGeneratedQuiz(result.questions || []);
      
      setCreateStep(2);
    } catch (error) {
      console.error('Error processing upload:', error);
      setFormError(error.message || 'Failed to process presentation. Please try again.');
    } finally {
      setProcessingFile(false);
      setUploadProgress(0);
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
            content_type: createMethod === 'upload' ? 'uploaded' : 'generated',
            original_file_name: uploadedFile?.name || null,
            status: 'draft',
            created_by: currentProfile?.id,
            created_by_department: currentProfile?.department || null
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
          quiz_approved_at: new Date().toISOString(),
          reviewed_by: currentProfile?.id,
          reviewed_at: new Date().toISOString()
        })
      });
      await loadModules();
    } catch (error) {
      console.error('Error publishing:', error);
    }
    setOpenDropdown(null);
  };

  // Submit for Review (for trainees and department leads)
  const handleSubmitForReview = async (module) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'submitted',
          submitted_by: currentProfile?.id,
          submitted_at: new Date().toISOString()
        })
      });
      await loadModules();
      alert('Training module submitted for review!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Failed to submit for review');
    }
    setOpenDropdown(null);
  };

  // Approve submission (for department leads and client admins)
  const handleApproveSubmission = async (module) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'published',
          reviewed_by: currentProfile?.id,
          reviewed_at: new Date().toISOString()
        })
      });
      await loadModules();
    } catch (error) {
      console.error('Error approving:', error);
    }
    setOpenDropdown(null);
  };

  // Return submission for revision
  const handleReturnSubmission = async (module, notes) => {
    try {
      await dbFetch(`training_modules?id=eq.${module.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'returned',
          reviewed_by: currentProfile?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes
        })
      });
      await loadModules();
    } catch (error) {
      console.error('Error returning:', error);
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
      case 'submitted': return 'bg-purple-100 text-purple-700';
      case 'in_review': return 'bg-indigo-100 text-indigo-700';
      case 'returned': return 'bg-red-100 text-red-700';
      case 'draft': return 'bg-amber-100 text-amber-700';
      case 'archived': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'published': return 'Published';
      case 'content_approved': return 'Quiz Pending';
      case 'submitted': return 'Pending Review';
      case 'in_review': return 'In Review';
      case 'returned': return 'Needs Revision';
      case 'draft': return 'Draft';
      case 'archived': return 'Archived';
      default: return status;
    }
  };

  // Check if current user can approve submissions
  const canApprove = (module) => {
    if (currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin') {
      return true;
    }
    if (currentProfile?.role === 'department_lead') {
      // Department lead can approve submissions from trainees in their department
      return module.created_by_department === currentProfile?.department && 
             module.created_by !== currentProfile?.id;
    }
    return false;
  };

  // Check if current user should submit for review vs publish directly
  const shouldSubmitForReview = () => {
    // Trainees always submit for review
    if (currentProfile?.role === 'trainee') return true;
    // Department leads submit for client admin review
    if (currentProfile?.role === 'department_lead') return true;
    // Client admins and super admins can publish directly
    return false;
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
            <option value="submitted">Pending Review</option>
            <option value="returned">Needs Revision</option>
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
                        <>
                          <button
                            onClick={() => handleApproveContent(module)}
                            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Approve Content
                          </button>
                        </>
                      )}
                      
                      {module.status === 'content_approved' && (
                        <>
                          {shouldSubmitForReview() ? (
                            <button
                              onClick={() => handleSubmitForReview(module)}
                              className="w-full px-4 py-2 text-left text-sm text-purple-600 hover:bg-purple-50 flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Submit for Review
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePublish(module)}
                              className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                            >
                              <Send className="w-4 h-4" />
                              Approve Quiz & Publish
                            </button>
                          )}
                        </>
                      )}

                      {module.status === 'submitted' && canApprove(module) && (
                        <>
                          <button
                            onClick={() => handleApproveSubmission(module)}
                            className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve & Publish
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Please provide feedback for the creator:');
                              if (notes) handleReturnSubmission(module, notes);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Return for Revision
                          </button>
                        </>
                      )}

                      {module.status === 'returned' && module.created_by === currentProfile?.id && (
                        <div className="px-4 py-2 text-xs text-red-600 bg-red-50">
                          Feedback: {module.review_notes || 'No notes provided'}
                        </div>
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
                  {module.content_type === 'uploaded' && (
                    <div className="flex items-center gap-1">
                      <Upload className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Uploaded</span>
                    </div>
                  )}
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

                    {/* File Upload Section - shown when upload method selected */}
                    {createMethod === 'upload' && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        {/* Import Mode Selection */}
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Import Mode
                        </label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <button
                            type="button"
                            onClick={() => setImportMode('smart')}
                            className={`p-3 border-2 rounded-lg text-left transition-colors ${
                              importMode === 'smart'
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="w-5 h-5 text-purple-500" />
                              <span className="font-medium text-gray-900">Smart Transform</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              AI restructures content into optimized training slides with narration
                            </p>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => setImportMode('direct')}
                            className={`p-3 border-2 rounded-lg text-left transition-colors ${
                              importMode === 'direct'
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-5 h-5 text-green-500" />
                              <span className="font-medium text-gray-900">Direct Import</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Preserves original content as-is, adds audio scripts & quiz
                            </p>
                          </button>
                        </div>

                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload Presentation File
                        </label>
                        
                        <div className="flex items-center gap-3">
                          <label className="flex-1">
                            <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                              uploadedFile 
                                ? 'border-green-300 bg-green-50' 
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }`}>
                              {uploadedFile ? (
                                <div className="flex items-center justify-center gap-2">
                                  <FileText className="w-5 h-5 text-green-600" />
                                  <span className="text-sm font-medium text-green-700">{uploadedFile.name}</span>
                                  <span className="text-xs text-gray-500">
                                    ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-sm text-gray-600">Click to select a file</p>
                                  <p className="text-xs text-gray-400">PDF only (max 4MB)</p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                          </label>
                          
                          {uploadedFile && (
                            <button
                              type="button"
                              onClick={() => setUploadedFile(null)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>

                        {/* Progress bar during processing */}
                        {processingFile && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">
                                {importMode === 'smart' ? 'AI is transforming content...' : 'Extracting content...'}
                              </span>
                              <span className="text-blue-600 font-medium">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {importMode === 'smart' 
                                ? 'AI is restructuring content and creating optimized slides...'
                                : 'Extracting original content and generating quiz questions...'}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-3">
                          {importMode === 'smart' ? (
                            <><strong>Smart Transform:</strong> AI analyzes your document and creates restructured training slides optimized for learning, with narration scripts and quiz questions.</>
                          ) : (
                            <><strong>Direct Import:</strong> Your original content is preserved exactly as written. AI adds audio narration scripts and generates quiz questions based on the content.</>
                          )}
                        </p>
                      </div>
                    )}
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

              {createStep === 1 && createMethod === 'generate' && (
                <button
                  onClick={handleGenerateContent}
                  disabled={generating || !formData.title || formData.client_ids.length === 0 || !formData.competency_id || formData.audio_languages.length === 0}
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

              {createStep === 1 && createMethod === 'upload' && (
                <button
                  onClick={handleProcessUpload}
                  disabled={processingFile || !uploadedFile || !formData.title || formData.client_ids.length === 0 || !formData.competency_id || formData.audio_languages.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {processingFile ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Process Presentation
                    </>
                  )}
                </button>
              )}

              {createStep === 1 && !createMethod && (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                >
                  Select a method above
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
                {currentProfile?.role === 'department_lead' && (
                  <p className="text-xs text-gray-500 mb-2">Showing trainees in your department: {currentProfile.department}</p>
                )}
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
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                          {user.department && (
                            <p className="text-xs text-gray-400">{user.department}{user.line ? ` • ${user.line}` : ''}</p>
                          )}
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
