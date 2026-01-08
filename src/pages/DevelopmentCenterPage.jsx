// ============================================================================
// DEVELOPMENT CENTER PAGE - REDESIGNED
// Single guided wizard for: Competency → Tags → Training → Assignment
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
  Award
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
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [editingCompetency, setEditingCompetency] = useState(null);
  
  // Wizard form state
  const [wizardData, setWizardData] = useState({
    name: '',
    description: '',
    tag_ids: [],
    newTagName: '',
    newTagColor: '#3B82F6',
    trainingOption: 'none', // 'none', 'later', 'assign', 'generate', 'link'
    training_developer_id: '',
    training_due_date: '',
    linkedModuleId: '',
    generateTitle: '',
    assignments: [],
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState([]);
  const [generatedQuiz, setGeneratedQuiz] = useState([]);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // competency to delete
  const [userTrainingMap, setUserTrainingMap] = useState({}); // { oduleId_oduleId: status }
  const [validateModal, setValidateModal] = useState(null); // { assignment, competency }

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
        loadUserTraining()
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
        filtered = transformed.filter(comp => comp.client_ids?.includes(clientId));
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
      
      // Get user_competencies without FK join
      const ucData = await dbFetch(
        `user_competencies?select=*&user_id=in.(${userIds.join(',')})&order=created_at.desc`
      );
      
      if (!ucData || ucData.length === 0) {
        setUserCompetencies([]);
        return;
      }
      
      // Get user details separately
      const userProfiles = await dbFetch(
        `profiles?select=id,full_name,email&id=in.(${userIds.join(',')})`
      );
      const userMap = {};
      (userProfiles || []).forEach(u => userMap[u.id] = u);
      
      // Get competency details separately  
      const compIds = [...new Set(ucData.map(uc => uc.competency_id).filter(Boolean))];
      let compMap = {};
      if (compIds.length > 0) {
        const compData = await dbFetch(
          `competencies?select=id,name&id=in.(${compIds.join(',')})`
        );
        (compData || []).forEach(c => compMap[c.id] = c);
      }
      
      // Combine data
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

  const loadUserTraining = async () => {
    try {
      // Get all user_training records to know completion status
      let url = 'user_training?select=user_id,module_id,status,score,completed_at';
      const data = await dbFetch(url);
      
      // Create a map: { oduleId: { status, score, completed_at } }
      const map = {};
      (data || []).forEach(ut => {
        const key = `${ut.user_id}_${ut.module_id}`;
        map[key] = {
          status: ut.status,
          score: ut.score,
          completed_at: ut.completed_at
        };
      });
      setUserTrainingMap(map);
    } catch (error) {
      console.error('Error loading user training:', error);
    }
  };

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

  // ==========================================================================
  // WIZARD HANDLERS
  // ==========================================================================
  
  const openWizard = (competency = null) => {
    if (competency) {
      setEditingCompetency(competency);
      // Determine training option based on existing data
      let trainingOpt = 'none';
      if (competency.hasTraining) {
        trainingOpt = 'link';
      } else if (competency.training_developer_id) {
        trainingOpt = 'assign';
      }
      
      setWizardData({
        name: competency.name,
        description: competency.description || '',
        tag_ids: competency.tags?.map(t => t.id) || [],
        newTagName: '',
        newTagColor: '#3B82F6',
        trainingOption: trainingOpt,
        training_developer_id: competency.training_developer_id || '',
        training_due_date: competency.training_due_date || '',
        linkedModuleId: competency.training_modules?.[0]?.id || '',
        generateTitle: `${competency.name} Training`,
        assignments: competency.assignments?.map(a => ({
          user_id: a.user_id,
          target_level: a.target_level || 3,
          due_date: a.due_date || '',
          methods: ['training']
        })) || []
      });
    } else {
      setEditingCompetency(null);
      setWizardData({
        name: '',
        description: '',
        tag_ids: [],
        newTagName: '',
        newTagColor: '#3B82F6',
        trainingOption: 'none',
        training_developer_id: '',
        training_due_date: '',
        linkedModuleId: '',
        generateTitle: '',
        assignments: []
      });
    }
    setWizardStep(1);
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
      // Delete related records first
      await dbFetch(`competency_tag_links?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`competency_clients?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`competency_modules?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      await dbFetch(`user_competencies?competency_id=eq.${competency.id}`, { method: 'DELETE' });
      
      // Delete the competency (or soft delete by setting is_active = false)
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
          client_id: clientId || null
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

  const handleGenerateContent = async () => {
    if (!wizardData.name) {
      setFormError('Please enter a competency name first');
      return;
    }
    
    setGenerating(true);
    setFormError('');
    
    try {
      const prompt = `Create a professional training module for "${wizardData.name}".
Description: ${wizardData.description || wizardData.name}

Generate:
1. 5-7 training slides with title, content (2-3 paragraphs), and key points
2. 5 quiz questions (multiple choice, 4 options each)

Target audience: Manufacturing/food industry professionals
Level: Practitioner (able to perform with some supervision)

Respond in JSON format only, no other text:
{
  "slides": [
    {"title": "...", "content": "...", "key_points": ["...", "..."]}
  ],
  "quiz": [
    {"question": "...", "options": ["A", "B", "C", "D"], "correct_answer": 0, "explanation": "..."}
  ]
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setGeneratedSlides(parsed.slides || []);
        setGeneratedQuiz(parsed.quiz || []);
        setWizardData(prev => ({
          ...prev,
          generateTitle: `${wizardData.name} Training`
        }));
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setFormError('Failed to generate content. Please try again.');
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
            methods: wizardData.trainingOption !== 'none' ? ['training'] : ['coaching']
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

  const handleSubmitWizard = async () => {
    setSubmitting(true);
    setFormError('');
    
    try {
      if (!wizardData.name.trim()) {
        throw new Error('Competency name is required');
      }
      
      let competencyId = editingCompetency?.id;
      
      // Create/Update Competency
      // Determine training_developer_id based on option
      const trainingDeveloperId = wizardData.trainingOption === 'assign' ? wizardData.training_developer_id : null;
      
      if (editingCompetency) {
        await dbFetch(`competencies?id=eq.${competencyId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description,
            training_developer_id: trainingDeveloperId
          })
        });
        await dbFetch(`competency_tag_links?competency_id=eq.${competencyId}`, { method: 'DELETE' });
      } else {
        const result = await dbFetch('competencies?select=id', {
          method: 'POST',
          body: JSON.stringify({
            name: wizardData.name,
            description: wizardData.description,
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
      }
      
      // Link tags
      for (const tagId of wizardData.tag_ids) {
        await dbFetch('competency_tag_links', {
          method: 'POST',
          body: JSON.stringify({ competency_id: competencyId, tag_id: tagId })
        });
      }
      
      // Handle Training
      let moduleId = null;
      
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
          for (let i = 0; i < generatedSlides.length; i++) {
            const slide = generatedSlides[i];
            await dbFetch('module_slides', {
              method: 'POST',
              body: JSON.stringify({
                module_id: moduleId,
                order_index: i,
                title: slide.title,
                content: slide.content,
                key_points: slide.key_points
              })
            });
          }
          
          for (let i = 0; i < generatedQuiz.length; i++) {
            const q = generatedQuiz[i];
            await dbFetch('module_questions', {
              method: 'POST',
              body: JSON.stringify({
                module_id: moduleId,
                order_index: i,
                question: q.question,
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation
              })
            });
          }
          
          await dbFetch('competency_modules', {
            method: 'POST',
            body: JSON.stringify({
              competency_id: competencyId,
              module_id: moduleId,
              target_level: 3
            })
          });
        }
      } else if (wizardData.trainingOption === 'link' && wizardData.linkedModuleId) {
        moduleId = wizardData.linkedModuleId;
        const existing = await dbFetch(
          `competency_modules?competency_id=eq.${competencyId}&module_id=eq.${moduleId}`
        );
        if (!existing || existing.length === 0) {
          await dbFetch('competency_modules', {
            method: 'POST',
            body: JSON.stringify({
              competency_id: competencyId,
              module_id: moduleId,
              target_level: 3
            })
          });
        }
      }
      
      // Handle Assignments
      for (const assignment of wizardData.assignments) {
        const existing = await dbFetch(
          `user_competencies?user_id=eq.${assignment.user_id}&competency_id=eq.${competencyId}`
        );
        
        if (existing && existing.length > 0) {
          await dbFetch(`user_competencies?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              target_level: assignment.target_level,
              current_level: assignment.current_level || existing[0].current_level || 0,
              due_date: assignment.due_date || null,
              status: (assignment.current_level || 0) >= assignment.target_level ? 'achieved' : 'in_progress'
            })
          });
        } else {
          const currentLevel = assignment.current_level || 0;
          const isAlreadyCompetent = currentLevel >= assignment.target_level;
          
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
        
        // Only assign training if current_level < target (user has gap)
        const hasGap = (assignment.current_level || 0) < assignment.target_level;
        if (moduleId && hasGap && assignment.methods?.includes('training')) {
          const existingTraining = await dbFetch(
            `user_training?user_id=eq.${assignment.user_id}&module_id=eq.${moduleId}`
          );
          if (!existingTraining || existingTraining.length === 0) {
            await dbFetch('user_training', {
              method: 'POST',
              body: JSON.stringify({
                user_id: assignment.user_id,
                module_id: moduleId,
                status: 'pending',
                due_date: assignment.due_date || null,
                assigned_by: currentProfile?.id
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

  const tagColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Development Center</h1>
          <p className="text-gray-600 mt-1">Create competencies, training materials, and track progress</p>
        </div>
        <button
          onClick={() => openWizard()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Competency
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCompetencies}</p>
              <p className="text-xs text-gray-500">Competencies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
              <p className="text-xs text-gray-500">Assignments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalGaps}</p>
              <p className="text-xs text-gray-500">Gaps to Close</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalAchieved}</p>
              <p className="text-xs text-gray-500">Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search competencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      {/* Competencies List */}
      <div className="space-y-3">
        {filteredCompetencies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No competencies yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first competency to get started</p>
            <button
              onClick={() => openWizard()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Competency
            </button>
          </div>
        ) : (
          filteredCompetencies.map(comp => (
            <div key={comp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
              >
                <div className="flex items-center gap-3">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    {expandedId === comp.id ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{comp.name}</h3>
                      {comp.tags?.map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color || '#6B7280' }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    {comp.description && (
                      <p className="text-sm text-gray-500 mt-0.5">{comp.description}</p>
                    )}
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
                      <p className={`font-bold ${comp.gapCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {comp.gapCount}
                      </p>
                      <p className="text-xs text-gray-500">Gaps</p>
                    </div>
                  </div>
                  
                  {comp.hasTraining ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      <BookOpen className="w-3 h-3" />
                      Training
                    </span>
                  ) : comp.training_developer_id ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium" title={`Assigned to ${comp.training_developer?.full_name || 'someone'}`}>
                      <Users className="w-3 h-3" />
                      In Development
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-medium">
                      <BookOpen className="w-3 h-3" />
                      No Training
                    </span>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openWizard(comp);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(comp);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded */}
              {expandedId === comp.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {comp.assignments?.length > 0 ? (
                    <div className="space-y-2">
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
                              {comp.hasTraining && <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {comp.assignments.map(a => {
                              const gap = (a.target_level || 3) - (a.current_level || 0);
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
                                  {comp.hasTraining && (
                                    <td className="px-4 py-2 text-center">
                                      {(() => {
                                        const publishedModule = comp.training_modules?.find(tm => tm.status === 'published');
                                        if (!publishedModule) return <span className="text-xs text-gray-400">No module</span>;
                                        
                                        const trainingKey = `${a.user_id}_${publishedModule.id}`;
                                        const trainingStatus = userTrainingMap[trainingKey];
                                        
                                        // Training completed/passed - show Validate button
                                        if (trainingStatus?.status === 'passed' || trainingStatus?.status === 'completed') {
                                          if (gap > 0) {
                                            return (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setValidateModal({ assignment: a, competency: comp, trainingStatus });
                                                }}
                                                className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 font-medium"
                                              >
                                                ✓ Validate Level
                                              </button>
                                            );
                                          } else {
                                            return <span className="text-xs text-green-600 font-medium">✓ Validated</span>;
                                          }
                                        }
                                        
                                        // Training in progress
                                        if (trainingStatus?.status === 'in_progress') {
                                          return <span className="text-xs text-blue-600">In Progress...</span>;
                                        }
                                        
                                        // Training assigned but not started
                                        if (trainingStatus?.status === 'pending') {
                                          return <span className="text-xs text-gray-500">Assigned</span>;
                                        }
                                        
                                        // Not assigned yet - show assign button
                                        if (gap > 0) {
                                          return (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
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
                                                  console.error('Error assigning training:', error);
                                                  alert('Failed to assign training');
                                                }
                                              }}
                                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            >
                                              Assign Training
                                            </button>
                                          );
                                        }
                                        
                                        return <span className="text-xs text-green-600">✓ Complete</span>;
                                      })()}
                                    </td>
                                  )}
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
                      <button
                        onClick={() => openWizard(comp)}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                      >
                        Edit & Assign Users →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* WIZARD MODAL */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingCompetency ? 'Edit Competency' : 'New Competency'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3].map(step => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        wizardStep === step ? 'bg-blue-600 text-white' :
                        wizardStep > step ? 'bg-green-500 text-white' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {wizardStep > step ? <Check className="w-4 h-4" /> : step}
                      </div>
                      {step < 3 && (
                        <div className={`w-12 h-1 mx-1 rounded ${wizardStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {wizardStep === 1 && 'Define competency & tags'}
                  {wizardStep === 2 && 'Training material'}
                  {wizardStep === 3 && 'Assign to users'}
                </p>
              </div>
              <button onClick={closeWizard} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {formError}
                </div>
              )}
              
              {/* STEP 1 */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Competency Name *</label>
                    <input
                      type="text"
                      value={wizardData.name}
                      onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Spray Drying Operations"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={wizardData.description}
                      onChange={(e) => setWizardData({ ...wizardData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      placeholder="Brief description..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {wizardData.tag_ids.map(tagId => {
                        const tag = tags.find(t => t.id === tagId);
                        return tag ? (
                          <span key={tagId} className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium text-white" style={{ backgroundColor: tag.color || '#3B82F6' }}>
                            {tag.name}
                            <button onClick={() => setWizardData({ ...wizardData, tag_ids: wizardData.tag_ids.filter(id => id !== tagId) })} className="hover:bg-white/20 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                      {wizardData.tag_ids.length === 0 && <span className="text-gray-400 text-sm">No tags selected</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {tags.filter(t => !wizardData.tag_ids.includes(t.id)).map(tag => (
                        <button key={tag.id} onClick={() => setWizardData({ ...wizardData, tag_ids: [...wizardData.tag_ids, tag.id] })} className="px-2 py-1 rounded text-sm border border-gray-200 hover:bg-gray-50" style={{ color: tag.color || '#3B82F6' }}>
                          + {tag.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <input type="text" value={wizardData.newTagName} onChange={(e) => setWizardData({ ...wizardData, newTagName: e.target.value })} placeholder="New tag name..." className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded" />
                      <div className="flex gap-1">
                        {tagColors.map(color => (
                          <button key={color} onClick={() => setWizardData({ ...wizardData, newTagColor: color })} className={`w-6 h-6 rounded-full border-2 ${wizardData.newTagColor === color ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <button onClick={handleCreateTag} disabled={!wizardData.newTagName.trim()} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Add</button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* STEP 2 */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">How will users develop this competency?</p>
                  
                  <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'none' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" checked={wizardData.trainingOption === 'none'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'none', training_developer_id: '' })} className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">No training module</p>
                      <p className="text-sm text-gray-500">Develop through coaching or on-the-job tasks only</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'later' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" checked={wizardData.trainingOption === 'later'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'later', training_developer_id: '' })} className="mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Develop later</p>
                      <p className="text-sm text-gray-500">Mark as "Training Needed" - assign developer later</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'assign' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" checked={wizardData.trainingOption === 'assign'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'assign' })} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        Assign to team member
                      </p>
                      <p className="text-sm text-gray-500">Delegate training development to someone in your team</p>
                    </div>
                  </label>
                  
                  {wizardData.trainingOption === 'assign' && (
                    <div className="ml-7 p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign to *</label>
                        <select 
                          value={wizardData.training_developer_id} 
                          onChange={(e) => setWizardData({ ...wizardData, training_developer_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        >
                          <option value="">Select team member...</option>
                          {users.filter(u => u.id !== currentProfile?.id).map(user => (
                            <option key={user.id} value={user.id}>{user.full_name} ({user.role})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                        <input 
                          type="date" 
                          value={wizardData.training_due_date} 
                          onChange={(e) => setWizardData({ ...wizardData, training_due_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-purple-700">This will appear in their "Development Tasks" on the dashboard</p>
                    </div>
                  )}
                  
                  <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'generate' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" checked={wizardData.trainingOption === 'generate'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'generate', training_developer_id: '' })} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Generate with AI
                      </p>
                      <p className="text-sm text-gray-500">Create slides and quiz automatically now</p>
                    </div>
                  </label>
                  
                  {wizardData.trainingOption === 'generate' && (
                    <div className="ml-7 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      {generatedSlides.length === 0 ? (
                        <div className="text-center">
                          <button onClick={handleGenerateContent} disabled={generating || !wizardData.name} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 inline-flex items-center gap-2">
                            {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate Content</>}
                          </button>
                          <p className="text-xs text-amber-700 mt-2">Will create 5-7 slides and 5 quiz questions</p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-green-700 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Content Generated!</p>
                            <button onClick={handleGenerateContent} className="text-sm text-amber-700 hover:underline">Regenerate</button>
                          </div>
                          <p className="text-sm text-gray-600">{generatedSlides.length} slides, {generatedQuiz.length} quiz questions</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <label className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer ${wizardData.trainingOption === 'link' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" checked={wizardData.trainingOption === 'link'} onChange={() => setWizardData({ ...wizardData, trainingOption: 'link', training_developer_id: '' })} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 flex items-center gap-2"><Link className="w-4 h-4 text-blue-500" />Link existing training</p>
                      <p className="text-sm text-gray-500">Connect to an existing training module</p>
                    </div>
                  </label>
                  
                  {wizardData.trainingOption === 'link' && (
                    <div className="ml-7">
                      <select value={wizardData.linkedModuleId} onChange={(e) => setWizardData({ ...wizardData, linkedModuleId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg">
                        <option value="">Select a training module...</option>
                        {trainingModules.map(tm => (
                          <option key={tm.id} value={tm.id}>{tm.title} {tm.status === 'published' ? '✓' : '(draft)'}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
              
              {/* STEP 3 */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">Assign this competency to team members with target levels</p>
                  
                  {trainees.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      <p>No trainees found</p>
                      <p className="text-sm">You can skip this step and assign later</p>
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
                                    <select 
                                      value={assignment.current_level || 0} 
                                      onChange={(e) => updateAssignment(user.id, 'current_level', parseInt(e.target.value))} 
                                      className="block w-20 px-2 py-1 text-sm border border-gray-200 rounded"
                                    >
                                      <option value={0}>0</option>
                                      {[1, 2, 3, 4].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-500">Target</label>
                                    <select value={assignment.target_level} onChange={(e) => updateAssignment(user.id, 'target_level', parseInt(e.target.value))} className="block w-20 px-2 py-1 text-sm border border-gray-200 rounded">
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
                              <p className="text-xs text-green-600 mt-2 ml-7">
                                ✓ Will be validated at Level {assignment.current_level} (prior experience)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Level 5 Note */}
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span><strong>Level 5 (Expert)</strong> cannot be granted directly. It requires nomination and approval through the Expert Network.</span>
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
                    setFormError('');
                    setWizardStep(wizardStep + 1);
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleSubmitWizard} disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Check className="w-4 h-4" />{editingCompetency ? 'Update' : 'Create'} Competency</>}
                  </button>
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
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Competency</h3>
            </div>
            <p className="text-gray-600 mb-2">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will also remove all user assignments and training links. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCompetency(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validate Level Modal */}
      {validateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Validate Competency Level</h3>
            </div>
            
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800 font-medium">
                  ✓ {validateModal.assignment.user?.full_name} passed the training
                </p>
                {validateModal.trainingStatus?.score && (
                  <p className="text-sm text-green-700">Score: {validateModal.trainingStatus.score}%</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Set achieved level for "{validateModal.competency.name}"
                </label>
                <select
                  id="validateLevel"
                  defaultValue={Math.min(validateModal.assignment.target_level || 3, 4)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {[1, 2, 3, 4].map(level => (
                    <option key={level} value={level}>
                      Level {level} {level === validateModal.assignment.target_level ? '(Target)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  Level 5 (Expert) requires nomination to the Expert Network
                </p>
              </div>
              
              <p className="text-xs text-gray-500">
                Current level: {validateModal.assignment.current_level || 0} → 
                Target: {validateModal.assignment.target_level || 3}
              </p>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setValidateModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const levelSelect = document.getElementById('validateLevel');
                    const newLevel = parseInt(levelSelect.value);
                    
                    if (newLevel >= 5) {
                      alert('Level 5 requires nomination to the Expert Network. Please use the Expert Network page to nominate.');
                      return;
                    }
                    
                    // Update user_competencies
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
                    console.error('Error validating level:', error);
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
    </div>
  );
}
