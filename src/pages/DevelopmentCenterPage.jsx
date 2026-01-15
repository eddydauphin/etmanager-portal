// ============================================================================
// DEVELOPMENT CENTER PAGE - UNIFIED WORKFLOW
// Combines: Competency Creation + Development Activities (Coaching/Task) + Training
// ============================================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Target,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen,
  Users,
  CheckCircle,
  AlertTriangle,
  X,
  Sparkles,
  Loader2,
  Tag,
  Edit2,
  Trash2,
  Link,
  Check,
  Award,
  Briefcase,
  Calendar,
  Clock,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  UserCheck,
  Send,
  Eye,
  Filter
} from 'lucide-react';

export default function DevelopmentCenterPage() {
  const { profile: currentProfile } = useAuth();
  const clientId = currentProfile?.client_id;
  
  // Data state
  const [competencies, setCompetencies] = useState([]);
  const [userCompetencies, setUserCompetencies] = useState([]);
  const [trainingModules, setTrainingModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingCompetency, setEditingCompetency] = useState(null);
  
  // Wizard form state
  const [wizardData, setWizardData] = useState({
    // Step 1: Competency
    name: '',
    description: '',
    tag_ids: [],
    newTagName: '',
    newTagColor: '#3B82F6',
    
    // Step 2: Development Method
    developmentMethod: 'training', // 'coaching', 'task', 'training'
    
    // For Coaching/Task
    activityTitle: '',
    activityDescription: '',
    activityObjectives: '',
    activitySuccessCriteria: '',
    coach_id: '',
    template_id: '',
    
    // For Training
    trainingOption: 'none', // 'none', 'generate', 'link', 'assign_developer'
    training_developer_id: '',
    linkedModuleId: '',
    generateTitle: '',
    
    // Step 3: Assignments
    assignments: [],
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState([]);
  const [generatedQuiz, setGeneratedQuiz] = useState([]);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [userTrainingMap, setUserTrainingMap] = useState({});
  const [validateModal, setValidateModal] = useState(null);
  
  // Activity Management State (from DevelopmentActivitiesPage)
  const [activities, setActivities] = useState([]);
  const [showActivityDetail, setShowActivityDetail] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', 'pending', 'in_progress', 'completed'
  const [feedback, setFeedback] = useState([]);
  const [newFeedback, setNewFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('progress');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState('competencies'); // 'competencies', 'activities'

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  
  useEffect(() => {
    if (currentProfile) loadData();
  }, [currentProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompetencies(),
        loadUserCompetencies(),
        loadTrainingModules(),
        loadUsers(),
        loadTags(),
        loadTemplates(),
        loadUserTraining(),
        loadActivities()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetencies = async () => {
    try {
      const data = await dbFetch(
        'competencies?select=*,training_developer:training_developer_id(id,full_name),competency_tag_links(tag_id,competency_tags(id,name,color)),competency_clients(client_id),competency_modules(module_id,target_level,training_modules(id,title,status))&is_active=eq.true&order=name.asc'
      );
      
      const transformed = (data || []).map(comp => ({
        ...comp,
        tags: comp.competency_tag_links?.map(tl => tl.competency_tags).filter(Boolean) || [],
        client_ids: comp.competency_clients?.map(cc => cc.client_id).filter(Boolean) || [],
        training_modules: comp.competency_modules?.map(cm => ({
          ...cm.training_modules,
          target_level: cm.target_level
        })).filter(tm => tm?.id) || []
      }));
      
      let filtered = transformed;
      if (currentProfile?.role !== 'super_admin' && clientId) {
        filtered = transformed.filter(comp => 
          comp.client_ids.length === 0 || comp.client_ids.includes(clientId)
        );
      }
      
      setCompetencies(filtered);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const loadUserCompetencies = async () => {
    try {
      let userIds = [];
      
      if (currentProfile?.role === 'trainee') {
        userIds = [currentProfile.id];
      } else if (currentProfile?.role === 'team_lead') {
        const teamUsers = await dbFetch(
          `profiles?select=id,full_name,email&reports_to_id=eq.${currentProfile.id}&is_active=eq.true`
        );
        userIds = teamUsers?.map(u => u.id) || [];
        if (userIds.length === 0 && clientId) {
          const clientUsers = await dbFetch(
            `profiles?select=id,full_name,email&client_id=eq.${clientId}&role=eq.trainee&is_active=eq.true`
          );
          userIds = clientUsers?.map(u => u.id) || [];
        }
        userIds.push(currentProfile.id);
      } else if (clientId) {
        const clientUsers = await dbFetch(
          `profiles?select=id,full_name,email&client_id=eq.${clientId}&is_active=eq.true`
        );
        userIds = clientUsers?.map(u => u.id) || [];
      }
      
      if (userIds.length === 0) {
        setUserCompetencies([]);
        return;
      }
      
      const ucData = await dbFetch(
        `user_competencies?select=*&user_id=in.(${userIds.join(',')})&order=created_at.desc`
      );
      
      if (!ucData || ucData.length === 0) {
        setUserCompetencies([]);
        return;
      }
      
      const userProfiles = await dbFetch(
        `profiles?select=id,full_name,email&id=in.(${userIds.join(',')})`
      );
      const userMap = {};
      (userProfiles || []).forEach(u => userMap[u.id] = u);
      
      const compIds = [...new Set(ucData.map(uc => uc.competency_id).filter(Boolean))];
      let compMap = {};
      if (compIds.length > 0) {
        const compData = await dbFetch(
          `competencies?select=id,name&id=in.(${compIds.join(',')})`
        );
        (compData || []).forEach(c => compMap[c.id] = c);
      }
      
      const enriched = ucData.map(uc => ({
        ...uc,
        user: userMap[uc.user_id] || null,
        competency: compMap[uc.competency_id] || null
      }));
      
      setUserCompetencies(enriched);
    } catch (error) {
      console.error('Error loading user competencies:', error);
      setUserCompetencies([]);
    }
  };

  const loadTrainingModules = async () => {
    try {
      let url = 'training_modules?select=id,title,status&order=title.asc';
      if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&client_id=eq.${clientId}`;
      }
      const data = await dbFetch(url);
      setTrainingModules(data || []);
    } catch (error) {
      console.error('Error loading training modules:', error);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role&is_active=eq.true&order=full_name.asc';
      if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&client_id=eq.${clientId}`;
      }
      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTags = async () => {
    try {
      let url = 'competency_tags?select=*&order=name.asc';
      if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&or=(client_id.eq.${clientId},client_id.is.null)`;
      }
      const data = await dbFetch(url);
      setTags(data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      let url = 'activity_templates?select=*&is_active=eq.true&order=name.asc';
      if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&or=(client_id.eq.${clientId},client_id.is.null)`;
      }
      const data = await dbFetch(url);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadUserTraining = async () => {
    try {
      const data = await dbFetch('user_training?select=user_id,module_id,status,score,completed_at');
      const map = {};
      (data || []).forEach(ut => {
        const key = `${ut.user_id}_${ut.module_id}`;
        map[key] = { status: ut.status, score: ut.score, completed_at: ut.completed_at };
      });
      setUserTrainingMap(map);
    } catch (error) {
      console.error('Error loading user training:', error);
    }
  };

  // ==========================================================================
  // ACTIVITY MANAGEMENT FUNCTIONS (from DevelopmentActivitiesPage)
  // ==========================================================================

  const loadActivities = async () => {
    try {
      let url = 'development_activities?select=*&order=created_at.desc';
      
      if (currentProfile?.role === 'client_admin' && clientId) {
        url += `&client_id=eq.${clientId}`;
      } else if (currentProfile?.role === 'team_lead' && clientId) {
        url += `&client_id=eq.${clientId}&or=(assigned_by.eq.${currentProfile.id},coach_id.eq.${currentProfile.id})`;
      } else if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&client_id=eq.${clientId}`;
      }
      
      const data = await dbFetch(url);
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
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

  const handleStatusChange = async (activityId, newStatus) => {
    try {
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'validated') {
        updateData.validated_at = new Date().toISOString();
        updateData.validated_by = currentProfile.id;
        
        // Also update competency if linked
        const activity = activities.find(a => a.id === activityId);
        if (activity?.competency_id && activity?.trainee_id) {
          const existingComp = await dbFetch(
            `user_competencies?user_id=eq.${activity.trainee_id}&competency_id=eq.${activity.competency_id}`
          );
          
          if (existingComp && existingComp.length > 0) {
            if (activity.target_level > (existingComp[0].current_level || 0)) {
              await dbFetch(`user_competencies?id=eq.${existingComp[0].id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  current_level: activity.target_level,
                  status: 'achieved',
                  last_assessed: new Date().toISOString()
                })
              });
            }
          } else {
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
      
      await loadActivities();
      await loadUserCompetencies();
      
      if (selectedActivity?.id === activityId) {
        setSelectedActivity({ ...selectedActivity, ...updateData });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
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
          author_id: currentProfile.id,
          author_role: currentProfile.role === 'trainee' ? 'coachee' : 
                       selectedActivity.coach_id === currentProfile.id ? 'coach' : 'manager',
          feedback_type: feedbackType,
          content: newFeedback
        })
      });
      
      setNewFeedback('');
      await loadFeedback(selectedActivity.id);
    } catch (error) {
      console.error('Error adding feedback:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openActivityDetail = async (activity) => {
    setSelectedActivity(activity);
    await loadFeedback(activity.id);
    setShowActivityDetail(true);
  };

  // Activity helper functions
  const getActivityStatusColor = (status, dueDate) => {
    if (dueDate && new Date(dueDate) < new Date() && !['completed', 'validated', 'cancelled'].includes(status)) {
      return 'bg-red-100 text-red-700';
    }
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-purple-100 text-purple-700';
      case 'validated': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getActivityTypeIcon = (type) => {
    switch (type) {
      case 'training': return BookOpen;
      case 'coaching': return Users;
      case 'task': return Briefcase;
      default: return Target;
    }
  };

  const getActivityTypeColor = (type) => {
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

  // Activity stats
  const activityStats = {
    total: activities.length,
    pending: activities.filter(a => a.status === 'pending').length,
    inProgress: activities.filter(a => a.status === 'in_progress').length,
    completed: activities.filter(a => a.status === 'completed' || a.status === 'validated').length,
    overdue: activities.filter(a => a.due_date && new Date(a.due_date) < new Date() && !['completed', 'validated'].includes(a.status)).length
  };

  // Filtered activities
  const filteredActivities = activities.filter(activity => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'overdue') {
      return activity.due_date && new Date(activity.due_date) < new Date() && !['completed', 'validated'].includes(activity.status);
    }
    return activity.status === activityFilter;
  });

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  const enrichedCompetencies = competencies.map(comp => {
    const assignments = userCompetencies.filter(uc => uc.competency_id === comp.id);
    const achieved = assignments.filter(a => (a.current_level || 0) >= (a.target_level || 3)).length;
    const gaps = assignments.filter(a => (a.current_level || 0) < (a.target_level || 3));
    
    return {
      ...comp,
      assignments,
      totalAssigned: assignments.length,
      achieved,
      gapCount: gaps.length,
      hasTraining: comp.training_modules?.some(tm => tm.status === 'published')
    };
  });

  const filteredCompetencies = enrichedCompetencies.filter(comp =>
    comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalCompetencies: competencies.length,
    totalAssignments: userCompetencies.length,
    totalGaps: userCompetencies.filter(uc => (uc.current_level || 0) < (uc.target_level || 3)).length,
    totalAchieved: userCompetencies.filter(uc => (uc.current_level || 0) >= (uc.target_level || 3)).length
  };

  const trainees = users.filter(u => u.role === 'trainee');
  // Coaches can be anyone - trainees can also coach others (peer coaching)
  const coaches = users;

  // ==========================================================================
  // WIZARD HANDLERS
  // ==========================================================================
  
  // quickAction: null (full wizard), 'training', 'task', 'coaching'
  const openWizard = (quickActionOrCompetency = null) => {
    // Check if it's a quick action string or a competency object
    const isQuickAction = typeof quickActionOrCompetency === 'string';
    const competency = isQuickAction ? null : quickActionOrCompetency;
    const quickAction = isQuickAction ? quickActionOrCompetency : null;
    
    if (competency) {
      setEditingCompetency(competency);
      let devMethod = 'training';
      if (competency.training_developer_id) {
        devMethod = 'training';
      }
      
      setWizardData({
        name: competency.name,
        description: competency.description || '',
        tag_ids: competency.tags?.map(t => t.id) || [],
        newTagName: '',
        newTagColor: '#3B82F6',
        developmentMethod: devMethod,
        activityTitle: '',
        activityDescription: '',
        activityObjectives: '',
        activitySuccessCriteria: '',
        coach_id: '',
        template_id: '',
        trainingOption: competency.hasTraining ? 'link' : 'none',
        training_developer_id: competency.training_developer_id || '',
        linkedModuleId: competency.training_modules?.[0]?.id || '',
        generateTitle: `${competency.name} Training`,
        assignments: competency.assignments?.map(a => ({
          user_id: a.user_id,
          current_level: a.current_level || 0,
          target_level: a.target_level || 3,
          due_date: a.due_date || '',
        })) || [],
        // Quick action mode
        quickAction: null,
        isIndividualActivity: false
      });
      setWizardStep(1);
    } else if (quickAction) {
      // Quick action: skip to simplified flow
      setEditingCompetency(null);
      setWizardData({
        name: '',
        description: '',
        tag_ids: [],
        newTagName: '',
        newTagColor: '#3B82F6',
        developmentMethod: quickAction,
        activityTitle: '',
        activityDescription: '',
        activityObjectives: '',
        activitySuccessCriteria: '',
        coach_id: '',
        template_id: '',
        trainingOption: quickAction === 'training' ? 'link' : 'none',
        training_developer_id: '',
        linkedModuleId: '',
        generateTitle: '',
        assignments: [],
        // Quick action mode - individual activity (not global competency)
        quickAction: quickAction,
        isIndividualActivity: true
      });
      // For quick actions, start at step that makes sense
      setWizardStep(quickAction === 'training' ? 1 : 1);
    } else {
      // Full wizard: create new competency
      setEditingCompetency(null);
      setWizardData({
        name: '',
        description: '',
        tag_ids: [],
        newTagName: '',
        newTagColor: '#3B82F6',
        developmentMethod: 'training',
        activityTitle: '',
        activityDescription: '',
        activityObjectives: '',
        activitySuccessCriteria: '',
        coach_id: '',
        template_id: '',
        trainingOption: 'none',
        training_developer_id: '',
        linkedModuleId: '',
        generateTitle: '',
        assignments: [],
        quickAction: null,
        isIndividualActivity: false
      });
      setWizardStep(1);
    }
    setGeneratedSlides([]);
    setGeneratedQuiz([]);
    setFormError('');
    setShowWizard(true);
  };

  const closeWizard = () => {
    setShowWizard(false);
    setEditingCompetency(null);
    setWizardStep(1);
    setFormError('');
  };

  const handleDeleteCompetency = async (competency) => {
    try {
      await dbFetch(`competency_tag_links?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`competency_clients?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`competency_modules?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`user_competencies?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      
      await dbFetch(`competencies?id=eq.${competency.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false })
      });
      
      setDeleteConfirm(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting competency:', error);
      alert('Failed to delete competency. Please try again.');
    }
  };

  const handleCreateTag = async () => {
    if (!wizardData.newTagName.trim()) return;
    
    try {
      const result = await dbFetch('competency_tags?select=id', {
        method: 'POST',
        body: JSON.stringify({
          name: wizardData.newTagName.trim(),
          color: wizardData.newTagColor,
          client_id: clientId
        })
      });
      
      if (result?.[0]?.id) {
        await loadTags();
        setWizardData(prev => ({
          ...prev,
          tag_ids: [...prev.tag_ids, result[0].id],
          newTagName: '',
          newTagColor: '#3B82F6'
        }));
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (template.default_duration_days || 30));
      
      setWizardData(prev => ({
        ...prev,
        template_id: templateId,
        developmentMethod: template.type === 'training' ? 'training' : template.type,
        activityTitle: template.name,
        activityDescription: template.description || '',
        activityObjectives: template.objectives || '',
        activitySuccessCriteria: template.success_criteria || '',
      }));
    }
  };

  const handleGenerateContent = async () => {
    if (!wizardData.name) {
      setFormError('Please enter a competency name first');
      return;
    }
    
    setGenerating(true);
    setFormError('');
    
    try {
      console.log('Generating content for:', wizardData.name);
      
      const slidesResponse = await fetch(`/api/generate-training?t=${Date.now()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        cache: 'no-store',
        body: JSON.stringify({
          type: 'slides',
          title: `${wizardData.name} Training`,
          description: wizardData.description || wizardData.name,
          competency: { name: wizardData.name, description: wizardData.description || wizardData.name },
          targetLevel: 3,
          language: 'English',
          _nonce: `${Date.now()}-${Math.random()}`
        })
      });

      if (!slidesResponse.ok) {
        const error = await slidesResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate slides');
      }

      const slidesData = await slidesResponse.json();
      
      const quizResponse = await fetch(`/api/generate-training?t=${Date.now()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          type: 'quiz',
          title: `${wizardData.name} Training`,
          description: wizardData.description || wizardData.name,
          competency: { name: wizardData.name, description: wizardData.description || wizardData.name },
          targetLevel: 3,
          language: 'English',
          _nonce: `${Date.now()}-${Math.random()}`
        })
      });

      if (!quizResponse.ok) {
        const error = await quizResponse.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const quizData = await quizResponse.json();
      
      setGeneratedSlides(slidesData.slides || []);
      setGeneratedQuiz(quizData.questions || []);
      setWizardData(prev => ({ ...prev, generateTitle: `${wizardData.name} Training` }));
      
    } catch (error) {
      console.error('Error generating content:', error);
      setFormError(error.message || 'Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleUserAssignment = (userId) => {
    setWizardData(prev => {
      const existing = prev.assignments.find(a => a.user_id === userId);
      if (existing) {
        return { ...prev, assignments: prev.assignments.filter(a => a.user_id !== userId) };
      } else {
        return {
          ...prev,
          assignments: [...prev.assignments, {
            user_id: userId,
            current_level: 0,
            target_level: 3,
            due_date: '',
          }]
        };
      }
    });
  };

  const updateAssignment = (userId, field, value) => {
    setWizardData(prev => ({
      ...prev,
      assignments: prev.assignments.map(a =>
        a.user_id === userId ? { ...a, [field]: value } : a
      )
    }));
  };

  // Handle Quick Action Submit (individual activities - not global competencies)
  const handleQuickActionSubmit = async () => {
    setSubmitting(true);
    setFormError('');
    
    try {
      const { quickAction, assignments, linkedModuleId, activityTitle, activityDescription, coach_id, dueDate, startDate } = wizardData;
      
      if (assignments.length === 0) {
        throw new Error('Please select at least one user');
      }

      if (quickAction === 'training') {
        // Assign training module to selected users
        if (!linkedModuleId) {
          throw new Error('Please select a training module');
        }
        
        for (const assignment of assignments) {
          // Check if already assigned
          const existing = await dbFetch(`user_training?user_id=eq.${assignment.user_id}&module_id=eq.${linkedModuleId}`);
          if (existing && existing.length > 0) {
            continue; // Skip if already assigned
          }
          
          await dbFetch('user_training', {
            method: 'POST',
            body: JSON.stringify({
              user_id: assignment.user_id,
              module_id: linkedModuleId,
              status: 'assigned',
              assigned_by: currentProfile?.id,
              assigned_at: new Date().toISOString(),
              due_date: dueDate || null
            })
          });
          
          // Send notification
          await dbFetch('notifications', {
            method: 'POST',
            body: JSON.stringify({
              user_id: assignment.user_id,
              type: 'training_assigned',
              title: 'Training Assigned',
              message: `${currentProfile?.full_name || 'Your manager'} has assigned you a training module to complete.`,
              link: '/my-training',
              related_id: linkedModuleId,
              related_type: 'training_module'
            })
          });
        }
      } else if (quickAction === 'task' || quickAction === 'coaching') {
        // Create development activity for each user
        for (const assignment of assignments) {
          const activityResult = await dbFetch('development_activities?select=id', {
            method: 'POST',
            body: JSON.stringify({
              type: quickAction, // 'task' or 'coaching'
              title: activityTitle,
              description: activityDescription || '',
              trainee_id: assignment.user_id,
              coach_id: coach_id,
              assigned_by: currentProfile?.id,
              client_id: clientId,
              status: 'pending',
              start_date: startDate || new Date().toISOString().split('T')[0],
              due_date: dueDate || null
            })
          });
          
          // Send notification to trainee
          await dbFetch('notifications', {
            method: 'POST',
            body: JSON.stringify({
              user_id: assignment.user_id,
              type: quickAction === 'task' ? 'task_assigned' : 'coaching_assigned',
              title: quickAction === 'task' ? 'Task Assigned' : 'Coaching Session Assigned',
              message: `${currentProfile?.full_name || 'Your manager'} has assigned you ${quickAction === 'task' ? 'a development task' : 'a coaching session'}: "${activityTitle}"`,
              link: '/my-plan',
              related_id: activityResult?.[0]?.id,
              related_type: 'development_activity'
            })
          });
          
          // Send notification to coach if different from creator
          if (coach_id && coach_id !== currentProfile?.id) {
            const trainee = users.find(u => u.id === assignment.user_id);
            await dbFetch('notifications', {
              method: 'POST',
              body: JSON.stringify({
                user_id: coach_id,
                type: quickAction === 'task' ? 'task_coach_assigned' : 'coaching_coach_assigned',
                title: quickAction === 'task' ? 'Task Supervision Assigned' : 'Coaching Role Assigned',
                message: `You have been assigned ${quickAction === 'task' ? 'to supervise' : 'as coach for'} ${trainee?.full_name || 'a team member'}: "${activityTitle}"`,
                link: '/development',
                related_id: activityResult?.[0]?.id,
                related_type: 'development_activity'
              })
            });
          }
        }
      }
      
      // Success - reload and close
      await loadData();
      closeWizard();
      
    } catch (error) {
      console.error('Quick action submit error:', error);
      setFormError(error.message || 'Failed to complete action');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitWizard = async () => {
    setSubmitting(true);
    setFormError('');
    
    try {
      if (!wizardData.name.trim()) {
        throw new Error('Competency name is required');
      }
      
      let competencyId = editingCompetency?.id;
      
      // Create/Update Competency
      // Ensure empty strings become null for UUID fields
      const trainingDeveloperId = (wizardData.developmentMethod === 'training' && 
        wizardData.trainingOption === 'assign_developer' && 
        wizardData.training_developer_id) 
        ? wizardData.training_developer_id : null;
      
      if (editingCompetency) {
        await dbFetch(`competencies?id=eq.${competencyId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description || null,
            training_developer_id: trainingDeveloperId
          })
        });
        await dbFetch(`competency_tag_links?competency_id=eq.${competencyId}`, { method: 'DELETE' });
      } else {
        const result = await dbFetch('competencies?select=id', {
          method: 'POST',
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description || null,
            is_active: true,
            training_developer_id: trainingDeveloperId,
            level_1_description: 'Awareness - Can recognize the topic',
            level_2_description: 'Knowledge - Can explain concepts',
            level_3_description: 'Practitioner - Can perform with supervision',
            level_4_description: 'Proficient - Works independently',
            level_5_description: 'Expert - Can teach others'
          })
        });
        competencyId = result?.[0]?.id;
        if (!competencyId) throw new Error('Failed to create competency');
        
        if (clientId) {
          await dbFetch('competency_clients', {
            method: 'POST',
            body: JSON.stringify({ competency_id: competencyId, client_id: clientId })
          });
        }
        
        // NOTIFICATION: Training development assigned to someone
        if (trainingDeveloperId && trainingDeveloperId !== currentProfile?.id) {
          const developerName = users.find(u => u.id === trainingDeveloperId)?.full_name || 'Developer';
          await dbFetch('notifications', {
            method: 'POST',
            body: JSON.stringify({
              user_id: trainingDeveloperId,
              type: 'training_development_assigned',
              title: 'Training Development Assigned',
              message: `${currentProfile?.full_name || 'Someone'} has assigned you to develop training materials for "${wizardData.name}". Please create the training content.`,
              link: '/training',
              related_id: competencyId,
              related_type: 'competency'
            })
          });
        }
      }
      
      // Link tags
      for (const tagId of wizardData.tag_ids) {
        await dbFetch('competency_tag_links', {
          method: 'POST',
          body: JSON.stringify({ competency_id: competencyId, tag_id: tagId })
        });
      }
      
      // Handle Development Method
      let moduleId = null;
      
      if (wizardData.developmentMethod === 'training') {
        // Training workflow
        if (wizardData.trainingOption === 'generate' && generatedSlides.length > 0) {
          const moduleResult = await dbFetch('training_modules?select=id', {
            method: 'POST',
            body: JSON.stringify({
              title: wizardData.generateTitle || `${wizardData.name} Training`,
              description: wizardData.description,
              client_id: clientId,
              status: 'draft',
              pass_score: 80,
              max_attempts: 3,
              created_by: currentProfile?.id
            })
          });
          moduleId = moduleResult?.[0]?.id;
          
          if (moduleId) {
            // Save slides - match TrainingModulesPage format
            if (generatedSlides.length > 0) {
              const slidesPayload = generatedSlides.map((slide, index) => ({
                module_id: moduleId,
                slide_number: index + 1,
                title: slide.title,
                content: { key_points: slide.key_points || [] },
                audio_script: slide.audio_script || slide.content || ''
              }));
              
              await dbFetch('module_slides', {
                method: 'POST',
                body: JSON.stringify(slidesPayload)
              });
            }
            
            // Save quiz questions - match TrainingModulesPage format
            if (generatedQuiz.length > 0) {
              const questionsPayload = generatedQuiz.map((q, index) => ({
                module_id: moduleId,
                question_text: q.question_text || q.question,
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
            
            // Link to competency
            await dbFetch('competency_modules', {
              method: 'POST',
              body: JSON.stringify({ 
                competency_id: competencyId, 
                module_id: moduleId, 
                target_level: 3,
                is_mandatory: true
              })
            });
            
            // NOTIFICATION: Training material generated - notify for approval
            // Find client admins and team leads to notify about new training material
            const approvers = users.filter(u => 
              u.id !== currentProfile?.id && 
              ['client_admin', 'team_lead'].includes(u.role)
            );
            
            for (const approver of approvers.slice(0, 3)) { // Limit to 3 approvers
              await dbFetch('notifications', {
                method: 'POST',
                body: JSON.stringify({
                  user_id: approver.id,
                  type: 'training_material_created',
                  title: 'New Training Material Created',
                  message: `${currentProfile?.full_name || 'Someone'} has created "${wizardData.generateTitle || wizardData.name}" training material with ${generatedSlides.length} slides and ${generatedQuiz.length} quiz questions. Review and approve to make it available.`,
                  link: '/training',
                  related_id: moduleId,
                  related_type: 'training_module'
                })
              });
            }
          }
        } else if (wizardData.trainingOption === 'link' && wizardData.linkedModuleId) {
          moduleId = wizardData.linkedModuleId;
          const existing = await dbFetch(`competency_modules?competency_id=eq.${competencyId}&module_id=eq.${moduleId}`);
          if (!existing || existing.length === 0) {
            await dbFetch('competency_modules', {
              method: 'POST',
              body: JSON.stringify({ competency_id: competencyId, module_id: moduleId, target_level: 3 })
            });
          }
        }
      }
      
      // Create user assignments and development activities
      for (const assignment of wizardData.assignments) {
        const existing = await dbFetch(
          `user_competencies?user_id=eq.${assignment.user_id}&competency_id=eq.${competencyId}`
        );
        
        const currentLevel = assignment.current_level || 0;
        const isAlreadyCompetent = currentLevel >= assignment.target_level;
        
        if (existing && existing.length > 0) {
          await dbFetch(`user_competencies?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              target_level: assignment.target_level,
              current_level: currentLevel,
              due_date: assignment.due_date || null,
              status: isAlreadyCompetent ? 'achieved' : 'in_progress'
            })
          });
        } else {
          await dbFetch('user_competencies', {
            method: 'POST',
            body: JSON.stringify({
              user_id: assignment.user_id,
              competency_id: competencyId,
              target_level: assignment.target_level,
              current_level: currentLevel,
              due_date: assignment.due_date || null,
              status: isAlreadyCompetent ? 'achieved' : 'in_progress',
              last_assessed: currentLevel > 0 ? new Date().toISOString() : null
            })
          });
        }
        
        const hasGap = currentLevel < assignment.target_level;
        
        // Create development activity for coaching/task
        if (hasGap && (wizardData.developmentMethod === 'coaching' || wizardData.developmentMethod === 'task')) {
          const activityResult = await dbFetch('development_activities?select=id', {
            method: 'POST',
            body: JSON.stringify({
              type: wizardData.developmentMethod,
              title: wizardData.activityTitle || `${wizardData.name} - ${wizardData.developmentMethod}`,
              description: wizardData.activityDescription || null,
              objectives: wizardData.activityObjectives || null,
              success_criteria: wizardData.activitySuccessCriteria || null,
              trainee_id: assignment.user_id,
              assigned_by: currentProfile?.id || null,
              coach_id: (wizardData.developmentMethod === 'coaching' && wizardData.coach_id) ? wizardData.coach_id : null,
              competency_id: competencyId || null,
              target_level: assignment.target_level,
              start_date: new Date().toISOString().split('T')[0],
              due_date: assignment.due_date || null,
              status: 'pending',
              client_id: clientId || null
            })
          });
          
          const activityId = activityResult?.[0]?.id;
          const activityTitle = wizardData.activityTitle || `${wizardData.name} - ${wizardData.developmentMethod}`;
          const traineeName = users.find(u => u.id === assignment.user_id)?.full_name || 'Trainee';
          
          // NOTIFICATION: Notify trainee about assigned activity
          if (assignment.user_id !== currentProfile?.id) {
            await dbFetch('notifications', {
              method: 'POST',
              body: JSON.stringify({
                user_id: assignment.user_id,
                type: wizardData.developmentMethod === 'coaching' ? 'coaching_assigned' : 'task_assigned',
                title: wizardData.developmentMethod === 'coaching' ? 'New Coaching Session Assigned' : 'New Task Assigned',
                message: `${currentProfile?.full_name || 'Your manager'} has assigned you ${wizardData.developmentMethod === 'coaching' ? 'a coaching session' : 'a task'}: "${activityTitle}"`,
                link: '/development-center',
                related_id: activityId,
                related_type: 'development_activity'
              })
            });
          }
          
          // NOTIFICATION: Notify coach when assigned as coach
          if (wizardData.developmentMethod === 'coaching' && wizardData.coach_id && wizardData.coach_id !== currentProfile?.id) {
            await dbFetch('notifications', {
              method: 'POST',
              body: JSON.stringify({
                user_id: wizardData.coach_id,
                type: 'coach_assigned',
                title: 'You are Assigned as Coach',
                message: `${currentProfile?.full_name || 'Someone'} has assigned you as coach for ${traineeName}: "${activityTitle}"`,
                link: '/development-center',
                related_id: activityId,
                related_type: 'development_activity'
              })
            });
          }
        }
        
        // Assign training module
        if (hasGap && wizardData.developmentMethod === 'training' && moduleId) {
          const existingTraining = await dbFetch(
            `user_training?user_id=eq.${assignment.user_id}&module_id=eq.${moduleId}`
          );
          if (!existingTraining || existingTraining.length === 0) {
            // Determine validator: use selected coach, or training_developer, or assigner
            let validatorId = wizardData.coach_id || null;
            if (!validatorId) {
              // Try to get training_developer from the module
              const moduleInfo = await dbFetch(`training_modules?select=training_developer_id&id=eq.${moduleId}`);
              validatorId = moduleInfo?.[0]?.training_developer_id || currentProfile?.id;
            }
            
            await dbFetch('user_training', {
              method: 'POST',
              body: JSON.stringify({
                user_id: assignment.user_id,
                module_id: moduleId,
                status: 'pending',
                due_date: assignment.due_date || null,
                assigned_by: currentProfile?.id,
                validator_id: validatorId
              })
            });
          }
        }
      }
      
      await loadData();
      closeWizard();
      
    } catch (error) {
      console.error('Error saving:', error);
      setFormError(error.message || 'Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  const getGapColor = (current, target) => {
    const gap = (target || 3) - (current || 0);
    if (gap <= 0) return 'text-green-600 bg-green-50';
    if (gap === 1) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Development Center</h1>
        <p className="text-gray-600 mt-1">Create competencies, assign development activities, and track progress</p>
      </div>

      {/* 4 Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* New Competency - Global skill definition */}
        <button
          onClick={() => openWizard()}
          className="flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
        >
          <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
            <Target className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Competency</p>
            <p className="text-sm text-gray-500 mt-0.5">Create formal skill definition</p>
          </div>
        </button>

        {/* Formal Education - Training assignment */}
        <button
          onClick={() => openWizard('training')}
          className="flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-all text-left group"
        >
          <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
            <BookOpen className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Formal Education</p>
            <p className="text-sm text-gray-500 mt-0.5">Assign e-learning modules</p>
          </div>
        </button>

        {/* Learn by Doing - Task */}
        <button
          onClick={() => openWizard('task')}
          className="flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
        >
          <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Learn by Doing</p>
            <p className="text-sm text-gray-500 mt-0.5">Assign project or initiative</p>
          </div>
        </button>

        {/* Learn through Others - Coaching */}
        <button
          onClick={() => openWizard('coaching')}
          className="flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
        >
          <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Learn through Others</p>
            <p className="text-sm text-gray-500 mt-0.5">Assign coaching or mentoring</p>
          </div>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('competencies')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'competencies'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Competencies
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{competencies.length}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'activities'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Activities
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{activities.length}</span>
              {activityStats.overdue > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">{activityStats.overdue} overdue</span>
              )}
            </div>
          </button>
        </nav>
      </div>

      {/* COMPETENCIES TAB */}
      {activeTab === 'competencies' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompetencies}</p>
              <p className="text-sm text-gray-500">Competencies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
              <p className="text-sm text-gray-500">Assignments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGaps}</p>
              <p className="text-sm text-gray-500">Gaps to Close</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAchieved}</p>
              <p className="text-sm text-gray-500">Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search competencies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      {/* Competencies List */}
      <div className="bg-white rounded-xl shadow-sm">
        {filteredCompetencies.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No competencies yet</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first competency</p>
            <button onClick={() => openWizard()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Competency
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredCompetencies.map(comp => (
              <div key={comp.id} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedId === comp.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                        {comp.tags?.map(tag => (
                          <span key={tag.id} className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{comp.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center px-3">
                        <p className="font-bold text-gray-900">{comp.totalAssigned}</p>
                        <p className="text-xs text-gray-500">Assigned</p>
                      </div>
                      <div className="text-center px-3">
                        <p className="font-bold text-green-600">{comp.achieved}</p>
                        <p className="text-xs text-gray-500">Achieved</p>
                      </div>
                      <div className="text-center px-3">
                        <p className={`font-bold ${comp.gapCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>{comp.gapCount}</p>
                        <p className="text-xs text-gray-500">Gaps</p>
                      </div>
                    </div>
                    
                    {comp.hasTraining ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                        <BookOpen className="w-3 h-3" />Training
                      </span>
                    ) : comp.training_developer_id ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                        <Users className="w-3 h-3" />In Development
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                        <BookOpen className="w-3 h-3" />No Training
                      </span>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openWizard(comp); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(comp); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Expanded View */}
                {expandedId === comp.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 mt-4 rounded-lg">
                    {comp.assignments?.length > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-3">Assigned Users</p>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">User</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Current</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Target</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Gap</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Due</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {comp.assignments.map(a => {
                                const gap = (a.target_level || 3) - (a.current_level || 0);
                                const publishedModule = comp.training_modules?.find(tm => tm.status === 'published');
                                const trainingKey = publishedModule ? `${a.user_id}_${publishedModule.id}` : null;
                                const trainingStatus = trainingKey ? userTrainingMap[trainingKey] : null;
                                
                                return (
                                  <tr key={a.id}>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                                          {a.user?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <span className="font-medium text-gray-900">{a.user?.full_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                                        {a.current_level || 0}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                                        {a.target_level || 3}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getGapColor(a.current_level, a.target_level)}`}>
                                        {gap <= 0 ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {gap <= 0 ? 'Done' : `-${gap}`}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 text-xs">
                                      {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {gap <= 0 ? (
                                        <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                                      ) : trainingStatus?.status === 'passed' || trainingStatus?.status === 'completed' ? (
                                        <button
                                          onClick={() => setValidateModal({ assignment: a, competency: comp, trainingStatus })}
                                          className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 font-medium"
                                        >
                                          ✓ Validate Level
                                        </button>
                                      ) : trainingStatus?.status === 'in_progress' ? (
                                        <span className="text-xs text-blue-600">In Progress...</span>
                                      ) : trainingStatus?.status === 'pending' ? (
                                        <span className="text-xs text-gray-500">Training Assigned</span>
                                      ) : publishedModule ? (
                                        <button
                                          onClick={async () => {
                                            try {
                                              await dbFetch('user_training', {
                                                method: 'POST',
                                                body: JSON.stringify({
                                                  user_id: a.user_id,
                                                  module_id: publishedModule.id,
                                                  status: 'pending',
                                                  due_date: a.due_date || null,
                                                  assigned_by: currentProfile?.id
                                                })
                                              });
                                              await loadUserTraining();
                                              alert(`Training assigned to ${a.user?.full_name}`);
                                            } catch (error) {
                                              alert('Failed to assign training');
                                            }
                                          }}
                                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                        >
                                          Assign Training
                                        </button>
                                      ) : (
                                        <span className="text-xs text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500 text-sm">No users assigned yet</p>
                        <button onClick={() => openWizard(comp)} className="mt-2 text-blue-600 hover:underline text-sm">
                          Edit & Assign Users →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}

      {/* ACTIVITIES TAB */}
      {activeTab === 'activities' && (
        <>
          {/* Activity Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg"><Target className="w-5 h-5 text-gray-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activityStats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activityStats.pending}</p>
                  <p className="text-sm text-gray-500">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activityStats.inProgress}</p>
                  <p className="text-sm text-gray-500">In Progress</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activityStats.completed}</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg"><AlertCircle className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{activityStats.overdue}</p>
                  <p className="text-sm text-gray-500">Overdue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-4">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="validated">Validated</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities Found</h3>
              <p className="text-gray-500 mb-4">
                {activities.length === 0 
                  ? "Create a competency and assign it to team members to see activities here"
                  : "No activities match your current filter"}
              </p>
              {activities.length === 0 && (
                <button
                  onClick={() => { setActiveTab('competencies'); openWizard(); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Competency
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map(activity => {
                const TypeIcon = getActivityTypeIcon(activity.type);
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
                          <div className={`p-2 rounded-lg ${getActivityTypeColor(activity.type)}`}>
                            <TypeIcon className="w-4 h-4" />
                          </div>
                          <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActivityStatusColor(activity.status, activity.due_date)}`}>
                            {isOverdue ? 'Overdue' : activity.status?.replace('_', ' ')}
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
                        {activity.status === 'pending' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(activity.id, 'in_progress'); }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Start
                          </button>
                        )}
                        {activity.status === 'in_progress' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(activity.id, 'completed'); }}
                            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                          >
                            Complete
                          </button>
                        )}
                        {activity.status === 'completed' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(activity.id, 'validated'); }}
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
        </>
      )}

      {/* ======================================================================== */}
      {/* WIZARD MODAL */}
      {/* ======================================================================== */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Icon based on mode */}
                  <div className={`p-2 rounded-lg ${
                    wizardData.quickAction === 'training' ? 'bg-amber-100' :
                    wizardData.quickAction === 'task' ? 'bg-blue-100' :
                    wizardData.quickAction === 'coaching' ? 'bg-purple-100' :
                    'bg-emerald-100'
                  }`}>
                    {wizardData.quickAction === 'training' ? <BookOpen className={`w-5 h-5 text-amber-600`} /> :
                     wizardData.quickAction === 'task' ? <Briefcase className={`w-5 h-5 text-blue-600`} /> :
                     wizardData.quickAction === 'coaching' ? <Users className={`w-5 h-5 text-purple-600`} /> :
                     <Target className={`w-5 h-5 text-emerald-600`} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingCompetency ? 'Edit Competency' : 
                       wizardData.quickAction === 'training' ? 'Assign Formal Education' :
                       wizardData.quickAction === 'task' ? 'Assign Learn by Doing' :
                       wizardData.quickAction === 'coaching' ? 'Assign Learn through Others' :
                       'New Competency'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {wizardData.quickAction === 'training' ? 'Assign e-learning modules to team members' :
                       wizardData.quickAction === 'task' ? 'Assign project or hands-on initiative' :
                       wizardData.quickAction === 'coaching' ? 'Assign coaching or mentoring session' :
                       'Create formal skill definition with development path'}
                    </p>
                  </div>
                </div>
                <button onClick={closeWizard} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Progress - Different for quick actions vs full wizard */}
              {!wizardData.quickAction ? (
                <>
                  <div className="flex items-center gap-2 mt-4">
                    {[1, 2, 3].map(step => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          wizardStep > step ? 'bg-green-500 text-white' : wizardStep === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {wizardStep > step ? <Check className="w-4 h-4" /> : step}
                        </div>
                        {step < 3 && <div className={`w-12 h-1 mx-1 ${wizardStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {wizardStep === 1 && 'Define competency & tags'}
                    {wizardStep === 2 && 'Development method'}
                    {wizardStep === 3 && 'Assign to users'}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mt-4">
                    {[1, 2].map(step => (
                      <div key={step} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          wizardStep > step ? 'bg-green-500 text-white' : wizardStep === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {wizardStep > step ? <Check className="w-4 h-4" /> : step}
                        </div>
                        {step < 2 && <div className={`w-12 h-1 mx-1 ${wizardStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    {wizardStep === 1 && (
                      wizardData.quickAction === 'training' ? 'Select training module' :
                      'Define activity details'
                    )}
                    {wizardStep === 2 && 'Assign to users'}
                  </p>
                </>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{formError}</span>
                </div>
              )}
              
              {/* QUICK ACTION: Training - Select module */}
              {wizardStep === 1 && wizardData.quickAction === 'training' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Training Module *</label>
                    <select
                      value={wizardData.linkedModuleId}
                      onChange={(e) => setWizardData({ ...wizardData, linkedModuleId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">-- Select a module --</option>
                      {trainingModules.filter(m => m.status === 'published').map(module => (
                        <option key={module.id} value={module.id}>{module.title}</option>
                      ))}
                    </select>
                    {trainingModules.filter(m => m.status === 'published').length === 0 && (
                      <p className="text-sm text-amber-600 mt-2">No published training modules available. Create one in the Training page first.</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                    <input
                      type="date"
                      value={wizardData.dueDate || ''}
                      onChange={(e) => setWizardData({ ...wizardData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* QUICK ACTION: Task or Coaching - Activity details */}
              {wizardStep === 1 && (wizardData.quickAction === 'task' || wizardData.quickAction === 'coaching') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {wizardData.quickAction === 'task' ? 'Task Title *' : 'Coaching Topic *'}
                    </label>
                    <input
                      type="text"
                      value={wizardData.activityTitle}
                      onChange={(e) => setWizardData({ ...wizardData, activityTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      placeholder={wizardData.quickAction === 'task' ? 'e.g., Lead Q2 Process Improvement Project' : 'e.g., Presentation Skills Development'}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={wizardData.activityDescription}
                      onChange={(e) => setWizardData({ ...wizardData, activityDescription: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      rows={3}
                      placeholder={wizardData.quickAction === 'task' ? 'What should be accomplished?' : 'What should be learned or improved?'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {wizardData.quickAction === 'task' ? 'Supervisor / Mentor *' : 'Coach / Mentor *'}
                    </label>
                    <select
                      value={wizardData.coach_id}
                      onChange={(e) => setWizardData({ ...wizardData, coach_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    >
                      <option value="">-- Select --</option>
                      {users.filter(u => u.role !== 'trainee' || u.id === currentProfile?.id).map(user => (
                        <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={wizardData.startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setWizardData({ ...wizardData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                      <input
                        type="date"
                        value={wizardData.dueDate || ''}
                        onChange={(e) => setWizardData({ ...wizardData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* FULL WIZARD STEP 1: Competency & Tags */}
              {wizardStep === 1 && !wizardData.quickAction && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Competency Name *</label>
                    <input
                      type="text"
                      value={wizardData.name}
                      onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 5S Management"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={wizardData.description}
                      onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      rows={3}
                      placeholder="What does this competency cover?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    {wizardData.tag_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {wizardData.tag_ids.map(tagId => {
                          const tag = tags.find(t => t.id === tagId);
                          return tag ? (
                            <span key={tagId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                              {tag.name}
                              <button onClick={() => setWizardData({ ...wizardData, tag_ids: wizardData.tag_ids.filter(id => id !== tagId) })} className="hover:bg-white/20 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.filter(t => !wizardData.tag_ids.includes(t.id)).map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => setWizardData({ ...wizardData, tag_ids: [...wizardData.tag_ids, tag.id] })}
                          className="px-2 py-1 rounded-full text-xs font-medium border border-gray-200 hover:border-gray-400"
                          style={{ color: tag.color }}
                        >
                          + {tag.name}
                        </button>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        value={wizardData.newTagName}
                        onChange={(e) => setWizardData({ ...wizardData, newTagName: e.target.value })}
                        placeholder="New tag name"
                        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded"
                      />
                      <div className="flex gap-1">
                        {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map(color => (
                          <button
                            key={color}
                            onClick={() => setWizardData({ ...wizardData, newTagColor: color })}
                            className={`w-6 h-6 rounded-full ${wizardData.newTagColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleCreateTag}
                        disabled={!wizardData.newTagName.trim()}
                        className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* QUICK ACTION STEP 2: Assign Users (simplified) */}
              {wizardStep === 2 && wizardData.quickAction && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Select team members to assign this {
                      wizardData.quickAction === 'training' ? 'training' :
                      wizardData.quickAction === 'task' ? 'task' : 'coaching session'
                    }
                  </p>
                  
                  {trainees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>No team members found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {trainees.map(user => {
                        const isSelected = wizardData.assignments.some(a => a.user_id === user.id);
                        return (
                          <label
                            key={user.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                              isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setWizardData({
                                    ...wizardData,
                                    assignments: wizardData.assignments.filter(a => a.user_id !== user.id)
                                  });
                                } else {
                                  setWizardData({
                                    ...wizardData,
                                    assignments: [...wizardData.assignments, { user_id: user.id }]
                                  });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{user.full_name}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  
                  {wizardData.assignments.length > 0 && (
                    <p className="text-sm text-blue-600">{wizardData.assignments.length} user(s) selected</p>
                  )}
                </div>
              )}
              
              {/* FULL WIZARD STEP 2: Development Method */}
              {wizardStep === 2 && !wizardData.quickAction && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">How will users develop this competency?</p>
                  
                  {/* Use Template */}
                  {templates.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Use Template (Optional)</label>
                      <select
                        value={wizardData.template_id}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      >
                        <option value="">-- Select a template --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {/* Method Selection */}
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
                          className={`flex-1 p-4 border rounded-xl cursor-pointer transition-colors ${
                            wizardData.developmentMethod === type.value 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            value={type.value}
                            checked={wizardData.developmentMethod === type.value}
                            onChange={(e) => setWizardData({ ...wizardData, developmentMethod: e.target.value })}
                            className="sr-only"
                          />
                          <Icon className={`w-6 h-6 mb-2 ${wizardData.developmentMethod === type.value ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">{type.desc}</div>
                        </label>
                      );
                    })}
                  </div>
                  
                  {/* Coaching Fields */}
                  {wizardData.developmentMethod === 'coaching' && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coach/Mentor *</label>
                        <select
                          value={wizardData.coach_id}
                          onChange={(e) => setWizardData({ ...wizardData, coach_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        >
                          <option value="">-- Select coach --</option>
                          {coaches.map(user => (
                            <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Activity Title *</label>
                        <input
                          type="text"
                          value={wizardData.activityTitle}
                          onChange={(e) => setWizardData({ ...wizardData, activityTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                          placeholder="e.g., Safety Observation Coaching"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={wizardData.activityDescription} onChange={(e) => setWizardData({ ...wizardData, activityDescription: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="What is this activity about?" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Objectives</label>
                        <textarea value={wizardData.activityObjectives} onChange={(e) => setWizardData({ ...wizardData, activityObjectives: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="What should the trainee achieve?" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
                        <textarea value={wizardData.activitySuccessCriteria} onChange={(e) => setWizardData({ ...wizardData, activitySuccessCriteria: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="How will success be measured?" />
                      </div>
                    </div>
                  )}
                  
                  {/* Task Fields */}
                  {wizardData.developmentMethod === 'task' && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Task Title *</label>
                        <input
                          type="text"
                          value={wizardData.activityTitle}
                          onChange={(e) => setWizardData({ ...wizardData, activityTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                          placeholder="e.g., Complete SOP Review"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea value={wizardData.activityDescription} onChange={(e) => setWizardData({ ...wizardData, activityDescription: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="What is this task about?" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Objectives</label>
                        <textarea value={wizardData.activityObjectives} onChange={(e) => setWizardData({ ...wizardData, activityObjectives: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="What should the trainee achieve?" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
                        <textarea value={wizardData.activitySuccessCriteria} onChange={(e) => setWizardData({ ...wizardData, activitySuccessCriteria: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg" rows={2} placeholder="How will success be measured?" />
                      </div>
                    </div>
                  )}
                  
                  {/* Training Fields */}
                  {wizardData.developmentMethod === 'training' && (
                    <div className="mt-4 space-y-3">
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'none' ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" checked={wizardData.trainingOption === 'none'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'none' })} className="mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">No training module yet</p>
                          <p className="text-sm text-gray-500">Will assign training later</p>
                        </div>
                      </label>
                      
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'assign_developer' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" checked={wizardData.trainingOption === 'assign_developer'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'assign_developer' })} className="mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-purple-500" />Assign to developer</p>
                          <p className="text-sm text-gray-500">Delegate training creation to a team member</p>
                        </div>
                      </label>
                      
                      {wizardData.trainingOption === 'assign_developer' && (
                        <div className="ml-7 p-3 bg-purple-50 rounded-lg">
                          <select value={wizardData.training_developer_id} onChange={(e) => setWizardData({ ...wizardData, training_developer_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                            <option value="">Select developer...</option>
                            {users.filter(u => u.id !== currentProfile?.id).map(user => (
                              <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'generate' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" checked={wizardData.trainingOption === 'generate'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'generate' })} className="mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" />Generate with AI</p>
                          <p className="text-sm text-gray-500">Create slides and quiz automatically</p>
                        </div>
                      </label>
                      
                      {wizardData.trainingOption === 'generate' && (
                        <div className="ml-7 p-4 bg-amber-50 rounded-lg border border-amber-200">
                          {generatedSlides.length === 0 ? (
                            <div className="text-center">
                              <button onClick={handleGenerateContent} disabled={generating || !wizardData.name} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-2">
                                {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Content</>}
                              </button>
                              <p className="text-xs text-amber-700 mt-2">Will create 5-7 slides and quiz questions</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Content Generated!</p>
                                <button onClick={handleGenerateContent} disabled={generating} className="text-sm text-amber-700 hover:underline flex items-center gap-1">
                                  {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                  Regenerate
                                </button>
                              </div>
                              
                              {/* Slides Preview */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900 text-sm">Slides ({generatedSlides.length})</h4>
                                  <button
                                    onClick={() => setGeneratedSlides([...generatedSlides, {
                                      title: 'New Slide',
                                      key_points: ['Point 1', 'Point 2', 'Point 3'],
                                      audio_script: 'Audio script for this slide.'
                                    }])}
                                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                  >
                                    + Add Slide
                                  </button>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                  {generatedSlides.map((slide, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1">
                                          <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
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
                                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                        <button
                                          onClick={() => setGeneratedSlides(generatedSlides.filter((_, i) => i !== index))}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                      
                                      <div className="mb-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Key Points</label>
                                        {slide.key_points?.map((point, i) => (
                                          <div key={i} className="flex items-center gap-2 mb-1">
                                            <span className="text-gray-400 text-xs">•</span>
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
                                              className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                              onClick={() => {
                                                const updated = [...generatedSlides];
                                                const newPoints = updated[index].key_points.filter((_, pi) => pi !== i);
                                                updated[index] = { ...updated[index], key_points: newPoints };
                                                setGeneratedSlides(updated);
                                              }}
                                              className="p-0.5 text-gray-400 hover:text-red-500"
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
                                          className="text-xs text-blue-600 hover:underline"
                                        >
                                          + Add point
                                        </button>
                                      </div>
                                      
                                      <div className="bg-gray-50 rounded p-2">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Audio Script</label>
                                        <textarea
                                          value={slide.audio_script}
                                          onChange={(e) => {
                                            const updated = [...generatedSlides];
                                            updated[index] = { ...updated[index], audio_script: e.target.value };
                                            setGeneratedSlides(updated);
                                          }}
                                          rows={2}
                                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Quiz Preview */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900 text-sm">Quiz Questions ({generatedQuiz.length})</h4>
                                  <button
                                    onClick={() => setGeneratedQuiz([...generatedQuiz, {
                                      question_text: 'New question?',
                                      options: ['A) Option 1', 'B) Option 2', 'C) Option 3', 'D) Option 4'],
                                      correct_answer: 'A',
                                      points: 1
                                    }])}
                                    className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                  >
                                    + Add Question
                                  </button>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                  {generatedQuiz.map((q, index) => (
                                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-start gap-2 flex-1">
                                          <span className="w-5 h-5 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">
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
                                            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                                          />
                                        </div>
                                        <button
                                          onClick={() => setGeneratedQuiz(generatedQuiz.filter((_, i) => i !== index))}
                                          className="p-1 text-red-500 hover:bg-red-50 rounded ml-2"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                      
                                      <div className="space-y-1 ml-7">
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
                                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
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
                                                className={`flex-1 px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 ${
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
                            </div>
                          )}
                        </div>
                      )}
                      
                      <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'link' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" checked={wizardData.trainingOption === 'link'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'link' })} className="mt-1" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 flex items-center gap-2"><Link className="w-4 h-4 text-blue-500" />Link existing training</p>
                          <p className="text-sm text-gray-500">Connect to an existing module</p>
                        </div>
                      </label>
                      
                      {wizardData.trainingOption === 'link' && (
                        <div className="ml-7">
                          <select value={wizardData.linkedModuleId} onChange={(e) => setWizardData({ ...wizardData, linkedModuleId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                            <option value="">Select training module...</option>
                            {trainingModules.map(tm => (
                              <option key={tm.id} value={tm.id}>{tm.title} {tm.status === 'published' ? '✓' : '(draft)'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* STEP 3: Assign Users */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">Assign this competency to team members</p>
                  
                  {trainees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>No trainees found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {trainees.map(user => {
                        const assignment = wizardData.assignments.find(a => a.user_id === user.id);
                        const isSelected = !!assignment;
                        return (
                          <div key={user.id} className={`p-3 border rounded-lg ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={isSelected} onChange={() => toggleUserAssignment(user.id)} className="w-4 h-4 text-blue-600 rounded" />
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div>
                                    <label className="text-xs text-gray-500">Current</label>
                                    <select value={assignment.current_level || 0} onChange={(e) => updateAssignment(user.id, 'current_level', parseInt(e.target.value))} className="block w-16 px-2 py-1 text-sm border border-gray-200 rounded">
                                      {[0, 1, 2, 3, 4].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Target</label>
                                    <select value={assignment.target_level} onChange={(e) => updateAssignment(user.id, 'target_level', parseInt(e.target.value))} className="block w-16 px-2 py-1 text-sm border border-gray-200 rounded">
                                      {[1, 2, 3, 4, 5].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Due</label>
                                    <input type="date" value={assignment.due_date} onChange={(e) => updateAssignment(user.id, 'due_date', e.target.value)} className="block w-32 px-2 py-1 text-sm border border-gray-200 rounded" />
                                  </div>
                                </div>
                              )}
                            </div>
                            {isSelected && (assignment.current_level || 0) > 0 && (
                              <p className="text-xs text-green-600 mt-2 ml-7">✓ Will be validated at Level {assignment.current_level} (prior experience)</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span><strong>Level 5 (Expert)</strong> requires nomination through the Expert Network.</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <button onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : closeWizard()} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
                <ChevronLeft className="w-4 h-4" />
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              
              <div className="flex items-center gap-2">
                {/* Quick Action: 2 steps only */}
                {wizardData.quickAction ? (
                  <>
                    {wizardStep === 2 && (
                      <button onClick={handleQuickActionSubmit} disabled={submitting} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Skip & Save
                      </button>
                    )}
                    
                    {wizardStep < 2 ? (
                      <button onClick={() => {
                        // Validation for quick action step 1
                        if (wizardData.quickAction === 'training' && !wizardData.linkedModuleId) {
                          setFormError('Please select a training module');
                          return;
                        }
                        if ((wizardData.quickAction === 'task' || wizardData.quickAction === 'coaching') && !wizardData.activityTitle) {
                          setFormError('Please enter a title');
                          return;
                        }
                        if ((wizardData.quickAction === 'task' || wizardData.quickAction === 'coaching') && !wizardData.coach_id) {
                          setFormError('Please select a coach/supervisor');
                          return;
                        }
                        setFormError('');
                        setWizardStep(2);
                      }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={handleQuickActionSubmit} disabled={submitting || wizardData.assignments.length === 0} className={`px-4 py-2 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 ${
                        wizardData.quickAction === 'training' ? 'bg-amber-600 hover:bg-amber-700' :
                        wizardData.quickAction === 'task' ? 'bg-blue-600 hover:bg-blue-700' :
                        'bg-purple-600 hover:bg-purple-700'
                      }`}>
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Assigning...</> : <><Check className="w-4 h-4" />Assign {wizardData.assignments.length} User{wizardData.assignments.length !== 1 ? 's' : ''}</>}
                      </button>
                    )}
                  </>
                ) : (
                  /* Full Wizard: 3 steps */
                  <>
                    {wizardStep === 3 && (
                      <button onClick={handleSubmitWizard} disabled={submitting} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Skip & Save
                      </button>
                    )}
                    
                    {wizardStep < 3 ? (
                      <button onClick={() => {
                        if (wizardStep === 1 && !wizardData.name.trim()) {
                          setFormError('Please enter a competency name');
                          return;
                        }
                        if (wizardStep === 2) {
                          if (wizardData.developmentMethod === 'coaching' && !wizardData.coach_id) {
                            setFormError('Please select a coach');
                            return;
                          }
                          if (wizardData.developmentMethod === 'coaching' && !wizardData.activityTitle) {
                            setFormError('Please enter an activity title');
                            return;
                          }
                          if (wizardData.developmentMethod === 'task' && !wizardData.activityTitle) {
                            setFormError('Please enter a task title');
                            return;
                          }
                        }
                        setFormError('');
                        setWizardStep(wizardStep + 1);
                      }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                        Next <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={handleSubmitWizard} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{editingCompetency ? 'Update' : 'Create'} Competency</>}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full"><Trash2 className="w-6 h-6 text-red-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Competency</h3>
            </div>
            <p className="text-gray-600 mb-2">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
            <p className="text-sm text-gray-500 mb-6">This will also remove all user assignments. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={() => handleDeleteCompetency(deleteConfirm)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Level Modal */}
      {validateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full"><Award className="w-6 h-6 text-amber-600" /></div>
              <h3 className="text-lg font-semibold text-gray-900">Validate Competency Level</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">✓ {validateModal.assignment.user?.full_name} passed the training</p>
                {validateModal.trainingStatus?.score && <p className="text-sm text-green-700">Score: {validateModal.trainingStatus.score}%</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Set achieved level for "{validateModal.competency.name}"</label>
                <select id="validateLevel" defaultValue={Math.min(validateModal.assignment.target_level || 3, currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin' ? 5 : 4)} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                  {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin' 
                    ? [1, 2, 3, 4, 5] 
                    : [1, 2, 3, 4]
                  ).map(level => (
                    <option key={level} value={level}>Level {level} {level === validateModal.assignment.target_level ? '(Target)' : ''}</option>
                  ))}
                </select>
                {currentProfile?.role !== 'super_admin' && currentProfile?.role !== 'client_admin' && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><Award className="w-3 h-3" />Level 5 (Expert) requires nomination to Expert Network</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setValidateModal(null)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    const newLevel = parseInt(document.getElementById('validateLevel').value);
                    await dbFetch(`user_competencies?id=eq.${validateModal.assignment.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({
                        current_level: newLevel,
                        status: newLevel >= validateModal.assignment.target_level ? 'achieved' : 'in_progress',
                        last_assessed: new Date().toISOString()
                      })
                    });
                    setValidateModal(null);
                    await loadData();
                    alert(`${validateModal.assignment.user?.full_name}'s level updated to ${newLevel}`);
                  } catch (error) {
                    alert('Failed to validate level');
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Validate Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {showActivityDetail && selectedActivity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getActivityTypeColor(selectedActivity.type)}`}>
                  {(() => { const Icon = getActivityTypeIcon(selectedActivity.type); return <Icon className="w-5 h-5" />; })()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedActivity.title}</h2>
                  <p className="text-sm text-gray-500">{selectedActivity.type} activity</p>
                </div>
              </div>
              <button onClick={() => setShowActivityDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActivityStatusColor(selectedActivity.status, selectedActivity.due_date)}`}>
                    {selectedActivity.status?.replace('_', ' ')}
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
