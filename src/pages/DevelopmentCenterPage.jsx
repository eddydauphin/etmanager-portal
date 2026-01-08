// ============================================================================
// DEVELOPMENT CENTER PAGE
// Unified view: Competencies + Training + Coaching + OJT Tasks
// One page to manage all development activities
// ============================================================================

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Target,
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Users,
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Sparkles,
  Award,
  Loader2,
  MoreVertical,
  Eye,
  Play,
  FileText,
  Tag,
  Building2,
  ArrowRight,
  Zap,
  RefreshCw
} from 'lucide-react';

// Import existing components
import CompetencyMaturityDashboard from '../components/CompetencyMaturityDashboard';
import CompetencyGapAnalysis from '../components/CompetencyGapAnalysis';

export default function DevelopmentCenterPage() {
  const { profile: currentProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View mode: 'competencies' (default), 'team', 'individual'
  const [viewMode, setViewMode] = useState('competencies');
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // Data
  const [competencies, setCompetencies] = useState([]);
  const [userCompetencies, setUserCompetencies] = useState([]);
  const [trainingModules, setTrainingModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [tags, setTags] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, gap, achieved
  
  // Expanded competencies (to show details)
  const [expandedCompetencies, setExpandedCompetencies] = useState(new Set());
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [showCoachingModal, setShowCoachingModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [selectedUserCompetency, setSelectedUserCompetency] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tag_ids: [],
    client_ids: [],
    level_1_description: 'Awareness - Can recognize the topic',
    level_2_description: 'Knowledge - Can explain concepts',
    level_3_description: 'Practitioner - Can perform with supervision',
    level_4_description: 'Proficient - Works independently',
    level_5_description: 'Expert - Can teach others'
  });
  
  const [assignFormData, setAssignFormData] = useState({
    user_ids: [],
    target_level: 3,
    current_level: 0,
    due_date: '',
    development_method: '' // training, coaching, ojt, mixed
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Client ID
  const clientId = currentProfile?.client_id;

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  
  useEffect(() => {
    if (currentProfile) {
      loadData();
    }
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
        loadClients()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetencies = async () => {
    try {
      let url = 'competencies?select=*,competency_tag_links(tag_id,competency_tags(id,name,color)),competency_clients(client_id,clients(id,name)),competency_modules(module_id,target_level,training_modules(id,title,status))&is_active=eq.true&order=name.asc';
      
      const data = await dbFetch(url);
      
      // Transform data
      const transformed = (data || []).map(comp => ({
        ...comp,
        tags: comp.competency_tag_links?.map(tl => tl.competency_tags).filter(Boolean) || [],
        client_ids: comp.competency_clients?.map(cc => cc.client_id).filter(Boolean) || [],
        clients: comp.competency_clients?.map(cc => cc.clients).filter(Boolean) || [],
        training_modules: comp.competency_modules?.map(cm => ({
          ...cm.training_modules,
          target_level: cm.target_level
        })).filter(tm => tm?.id) || []
      }));
      
      // Filter by client access
      let filtered = transformed;
      if (currentProfile?.role !== 'super_admin' && clientId) {
        filtered = transformed.filter(comp => 
          comp.client_ids?.includes(clientId)
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
      
      // Determine which users to load based on role
      if (currentProfile?.role === 'trainee') {
        userIds = [currentProfile.id];
      } else if (currentProfile?.role === 'team_lead') {
        const teamUsers = await dbFetch(
          `profiles?select=id&reports_to_id=eq.${currentProfile.id}&is_active=eq.true`
        );
        userIds = teamUsers?.map(u => u.id) || [];
        userIds.push(currentProfile.id);
      } else if (clientId) {
        const clientUsers = await dbFetch(
          `profiles?select=id&client_id=eq.${clientId}&is_active=eq.true`
        );
        userIds = clientUsers?.map(u => u.id) || [];
      }
      
      if (userIds.length === 0) {
        setUserCompetencies([]);
        return;
      }
      
      const data = await dbFetch(
        `user_competencies?select=*,user:user_id(id,full_name,email),competency:competency_id(id,name)&user_id=in.(${userIds.join(',')})&order=created_at.desc`
      );
      
      setUserCompetencies(data || []);
    } catch (error) {
      console.error('Error loading user competencies:', error);
    }
  };

  const loadTrainingModules = async () => {
    try {
      let url = 'training_modules?select=id,title,status,competency_modules(competency_id,target_level)&order=title.asc';
      
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
      let url = 'profiles?select=id,full_name,email,role,department&is_active=eq.true&order=full_name.asc';
      
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

  const loadClients = async () => {
    try {
      let url = 'clients?select=id,name&order=name.asc';
      
      if (currentProfile?.role !== 'super_admin' && clientId) {
        url += `&id=eq.${clientId}`;
      }
      
      const data = await dbFetch(url);
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  // Get competencies with their user assignments
  const enrichedCompetencies = competencies.map(comp => {
    const assignments = userCompetencies.filter(uc => uc.competency_id === comp.id);
    const totalAssigned = assignments.length;
    const achieved = assignments.filter(a => a.current_level >= a.target_level).length;
    const gaps = assignments.filter(a => a.current_level < a.target_level);
    const avgGap = gaps.length > 0 
      ? gaps.reduce((sum, g) => sum + (g.target_level - g.current_level), 0) / gaps.length 
      : 0;
    
    return {
      ...comp,
      assignments,
      totalAssigned,
      achieved,
      gapCount: gaps.length,
      avgGap: avgGap.toFixed(1),
      hasTraining: comp.training_modules?.some(tm => tm.status === 'published')
    };
  });
  
  // Apply filters
  const filteredCompetencies = enrichedCompetencies.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = tagFilter === 'all' || comp.tags?.some(t => t.id === tagFilter);
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'gap' && comp.gapCount > 0) ||
      (statusFilter === 'achieved' && comp.gapCount === 0 && comp.totalAssigned > 0);
    return matchesSearch && matchesTag && matchesStatus;
  });

  // Stats
  const stats = {
    totalCompetencies: competencies.length,
    totalAssignments: userCompetencies.length,
    totalGaps: userCompetencies.filter(uc => uc.current_level < uc.target_level).length,
    totalAchieved: userCompetencies.filter(uc => uc.current_level >= uc.target_level).length,
    trainingAvailable: trainingModules.filter(tm => tm.status === 'published').length
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const toggleExpand = (compId) => {
    const newExpanded = new Set(expandedCompetencies);
    if (newExpanded.has(compId)) {
      newExpanded.delete(compId);
    } else {
      newExpanded.add(compId);
    }
    setExpandedCompetencies(newExpanded);
  };

  const handleCreateCompetency = async () => {
    setSubmitting(true);
    setFormError('');
    
    try {
      if (!formData.name.trim()) {
        throw new Error('Competency name is required');
      }
      
      // Create competency
      const result = await dbFetch('competencies?select=id', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          level_1_description: formData.level_1_description,
          level_2_description: formData.level_2_description,
          level_3_description: formData.level_3_description,
          level_4_description: formData.level_4_description,
          level_5_description: formData.level_5_description,
          is_active: true
        })
      });
      
      const compId = result?.[0]?.id;
      if (!compId) throw new Error('Failed to create competency');
      
      // Link to clients
      for (const cid of formData.client_ids) {
        await dbFetch('competency_clients', {
          method: 'POST',
          body: JSON.stringify({ competency_id: compId, client_id: cid })
        });
      }
      
      // Link to tags
      for (const tagId of formData.tag_ids) {
        await dbFetch('competency_tag_links', {
          method: 'POST',
          body: JSON.stringify({ competency_id: compId, tag_id: tagId })
        });
      }
      
      await loadCompetencies();
      setShowCreateModal(false);
      resetForm();
      
    } catch (error) {
      console.error('Error creating competency:', error);
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignCompetency = async () => {
    setSubmitting(true);
    setFormError('');
    
    try {
      if (assignFormData.user_ids.length === 0) {
        throw new Error('Please select at least one user');
      }
      
      for (const userId of assignFormData.user_ids) {
        // Check if already assigned
        const existing = await dbFetch(
          `user_competencies?user_id=eq.${userId}&competency_id=eq.${selectedCompetency.id}`
        );
        
        if (existing && existing.length > 0) {
          // Update existing
          await dbFetch(`user_competencies?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              target_level: assignFormData.target_level,
              due_date: assignFormData.due_date || null
            })
          });
        } else {
          // Create new
          await dbFetch('user_competencies', {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId,
              competency_id: selectedCompetency.id,
              target_level: assignFormData.target_level,
              current_level: assignFormData.current_level,
              due_date: assignFormData.due_date || null,
              status: 'in_progress'
            })
          });
        }
        
        // Create development activity based on method
        if (assignFormData.development_method) {
          await dbFetch('development_activities', {
            method: 'POST',
            body: JSON.stringify({
              trainee_id: userId,
              type: assignFormData.development_method === 'training' ? 'training' : 
                    assignFormData.development_method === 'coaching' ? 'coaching' : 'on_the_job',
              title: `${selectedCompetency.name} Development`,
              description: `Develop ${selectedCompetency.name} competency to Level ${assignFormData.target_level}`,
              competency_id: selectedCompetency.id,
              target_level: assignFormData.target_level,
              status: 'pending',
              due_date: assignFormData.due_date || null,
              created_by: currentProfile?.id
            })
          });
        }
      }
      
      await loadUserCompetencies();
      setShowAssignModal(false);
      resetAssignForm();
      
    } catch (error) {
      console.error('Error assigning competency:', error);
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tag_ids: [],
      client_ids: currentProfile?.client_id ? [currentProfile.client_id] : [],
      level_1_description: 'Awareness - Can recognize the topic',
      level_2_description: 'Knowledge - Can explain concepts',
      level_3_description: 'Practitioner - Can perform with supervision',
      level_4_description: 'Proficient - Works independently',
      level_5_description: 'Expert - Can teach others'
    });
    setFormError('');
  };

  const resetAssignForm = () => {
    setAssignFormData({
      user_ids: [],
      target_level: 3,
      current_level: 0,
      due_date: '',
      development_method: ''
    });
    setSelectedCompetency(null);
    setFormError('');
  };

  const openAssignModal = (competency) => {
    setSelectedCompetency(competency);
    setAssignFormData({
      user_ids: [],
      target_level: 3,
      current_level: 0,
      due_date: '',
      development_method: competency.hasTraining ? 'training' : ''
    });
    setShowAssignModal(true);
  };

  const getGapColor = (current, target) => {
    const gap = target - current;
    if (gap <= 0) return 'text-green-600 bg-green-50';
    if (gap === 1) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

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
          <p className="text-gray-600 mt-1">Manage competencies, training, and development activities</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          New Competency
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.trainingAvailable}</p>
              <p className="text-xs text-gray-500">Training Ready</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spider Graph */}
      <CompetencyMaturityDashboard
        profile={currentProfile}
        clientId={clientId}
        users={users}
        initialScope={currentProfile?.role === 'trainee' ? 'individual' : 'team'}
      />

      {/* Gap Analysis */}
      <CompetencyGapAnalysis
        profile={currentProfile}
        clientId={clientId}
        viewMode={currentProfile?.role === 'trainee' ? 'individual' : 'manager'}
        maxRows={10}
        showFilters={true}
      />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
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
          
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Tags</option>
            {tags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name}</option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="gap">Has Gaps</option>
            <option value="achieved">All Achieved</option>
          </select>
          
          <button
            onClick={loadData}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Competencies List */}
      <div className="space-y-4">
        {filteredCompetencies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No competencies found</p>
            <p className="text-gray-400 text-sm mt-1">Create a competency to get started</p>
          </div>
        ) : (
          filteredCompetencies.map(comp => (
            <div key={comp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Competency Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(comp.id)}
              >
                <div className="flex items-center gap-4">
                  <button className="p-1">
                    {expandedCompetencies.has(comp.id) ? (
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
                    <p className="text-sm text-gray-500 mt-0.5">{comp.description || 'No description'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{comp.totalAssigned}</p>
                      <p className="text-xs text-gray-500">Assigned</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-green-600">{comp.achieved}</p>
                      <p className="text-xs text-gray-500">Achieved</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold ${comp.gapCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {comp.gapCount}
                      </p>
                      <p className="text-xs text-gray-500">Gaps</p>
                    </div>
                  </div>
                  
                  {/* Training indicator */}
                  {comp.hasTraining ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                      <BookOpen className="w-3 h-3" />
                      Training Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      No Training
                    </span>
                  )}
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openAssignModal(comp)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Assign to users"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.location.href = `/training?create=true&competency=${comp.id}`}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Create training"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Content */}
              {expandedCompetencies.has(comp.id) && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  {/* Level Descriptions */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">LEVEL DEFINITIONS</p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className="bg-white rounded-lg p-2 border border-gray-200">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                              {level}
                            </span>
                            <span className="text-xs font-medium text-gray-700">
                              {level === 1 ? 'Awareness' : level === 2 ? 'Knowledge' : level === 3 ? 'Practitioner' : level === 4 ? 'Proficient' : 'Expert'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {comp[`level_${level}_description`] || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Linked Training Modules */}
                  {comp.training_modules?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-500 mb-2">LINKED TRAINING</p>
                      <div className="flex flex-wrap gap-2">
                        {comp.training_modules.map(tm => (
                          <a
                            key={tm.id}
                            href={`/training?module=${tm.id}`}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">{tm.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              tm.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {tm.status}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Assigned Users */}
                  {comp.assignments?.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">ASSIGNED USERS</p>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">User</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Current</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Target</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Gap</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Due Date</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {comp.assignments.map(assignment => {
                              const gap = assignment.target_level - assignment.current_level;
                              return (
                                <tr key={assignment.id} className="hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                                        {assignment.user?.full_name?.charAt(0) || '?'}
                                      </div>
                                      <span className="font-medium text-gray-900">{assignment.user?.full_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                                      {assignment.current_level}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                                      {assignment.target_level}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getGapColor(assignment.current_level, assignment.target_level)}`}>
                                      {gap <= 0 ? (
                                        <><CheckCircle className="w-3 h-3" /> Done</>
                                      ) : (
                                        <><AlertTriangle className="w-3 h-3" /> -{gap}</>
                                      )}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 text-xs">
                                    {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center justify-center gap-1">
                                      {gap > 0 && (
                                        <>
                                          {comp.hasTraining && (
                                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Assign training">
                                              <BookOpen className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Schedule coaching">
                                            <MessageSquare className="w-4 h-4" />
                                          </button>
                                          <button className="p-1 text-green-600 hover:bg-green-50 rounded" title="Assign task">
                                            <ClipboardList className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm">No users assigned to this competency</p>
                      <button
                        onClick={() => openAssignModal(comp)}
                        className="mt-2 text-blue-600 hover:underline text-sm"
                      >
                        Assign Users →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Competency Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Competency</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="e.g., Spray Drying Operations"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Brief description of this competency..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-lg min-h-[40px]">
                    {formData.tag_ids.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color || '#3B82F6' }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              tag_ids: formData.tag_ids.filter(id => id !== tagId)
                            })}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.filter(t => !formData.tag_ids.includes(t.id)).map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          tag_ids: [...formData.tag_ids, tag.id]
                        })}
                        className="px-2 py-0.5 rounded text-xs border border-gray-200 hover:bg-gray-50"
                        style={{ color: tag.color || '#3B82F6' }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clients *</label>
                  <div className="border border-gray-200 rounded-lg p-2 max-h-32 overflow-y-auto">
                    {clients.map(client => (
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
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCompetency}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Competency
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedCompetency && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Assign Competency</h2>
                <p className="text-sm text-gray-500">{selectedCompetency.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Users *</label>
                <div className="border border-gray-200 rounded-lg p-2 max-h-40 overflow-y-auto">
                  {users.filter(u => u.role === 'trainee').map(user => (
                    <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignFormData.user_ids.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignFormData({ ...assignFormData, user_ids: [...assignFormData.user_ids, user.id] });
                          } else {
                            setAssignFormData({ ...assignFormData, user_ids: assignFormData.user_ids.filter(id => id !== user.id) });
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{user.full_name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Level</label>
                  <select
                    value={assignFormData.current_level}
                    onChange={(e) => setAssignFormData({ ...assignFormData, current_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value={0}>0 - Not Started</option>
                    <option value={1}>1 - Awareness</option>
                    <option value={2}>2 - Knowledge</option>
                    <option value={3}>3 - Practitioner</option>
                    <option value={4}>4 - Proficient</option>
                    <option value={5}>5 - Expert</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Level *</label>
                  <select
                    value={assignFormData.target_level}
                    onChange={(e) => setAssignFormData({ ...assignFormData, target_level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value={1}>1 - Awareness</option>
                    <option value={2}>2 - Knowledge</option>
                    <option value={3}>3 - Practitioner</option>
                    <option value={4}>4 - Proficient</option>
                    <option value={5}>5 - Expert</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignFormData.due_date}
                  onChange={(e) => setAssignFormData({ ...assignFormData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Development Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignFormData({ ...assignFormData, development_method: 'training' })}
                    className={`p-3 rounded-lg border text-center ${
                      assignFormData.development_method === 'training'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Training</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignFormData({ ...assignFormData, development_method: 'coaching' })}
                    className={`p-3 rounded-lg border text-center ${
                      assignFormData.development_method === 'coaching'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">Coaching</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignFormData({ ...assignFormData, development_method: 'ojt' })}
                    className={`p-3 rounded-lg border text-center ${
                      assignFormData.development_method === 'ojt'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <ClipboardList className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">OJT Task</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCompetency}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
