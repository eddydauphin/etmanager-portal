import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Target,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Filter,
  BarChart3,
  Users,
  Building2,
  Layers,
  BookOpen,
  Award,
  TrendingUp,
  MoreVertical,
  Copy,
  Archive,
  Eye,
  UserPlus,
  Calendar,
  Loader2,
  Network,
  Star,
  Send
} from 'lucide-react';

// Spider Chart Component using SVG
const SpiderChart = ({ data, maxLevel = 5, size = 300 }) => {
  const center = size / 2;
  const radius = (size - 60) / 2;
  const levels = maxLevel;
  const angleStep = (2 * Math.PI) / data.length;
  
  // Generate points for each level ring
  const getLevelPoints = (level) => {
    const points = [];
    const levelRadius = (radius * level) / levels;
    for (let i = 0; i < data.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push({
        x: center + levelRadius * Math.cos(angle),
        y: center + levelRadius * Math.sin(angle)
      });
    }
    return points;
  };
  
  // Generate points for data
  const getDataPoints = () => {
    return data.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const itemRadius = (radius * item.currentLevel) / levels;
      return {
        x: center + itemRadius * Math.cos(angle),
        y: center + itemRadius * Math.sin(angle)
      };
    });
  };
  
  // Generate points for target
  const getTargetPoints = () => {
    return data.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const itemRadius = (radius * item.targetLevel) / levels;
      return {
        x: center + itemRadius * Math.cos(angle),
        y: center + itemRadius * Math.sin(angle)
      };
    });
  };
  
  const dataPoints = getDataPoints();
  const targetPoints = getTargetPoints();
  
  // Convert points to SVG path
  const pointsToPath = (points) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  };
  
  // Get label position
  const getLabelPosition = (index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle)
    };
  };
  
  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background circles */}
      {[1, 2, 3, 4, 5].map((level) => {
        const points = getLevelPoints(level);
        return (
          <polygon
            key={level}
            points={points.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}
      
      {/* Axis lines */}
      {data.map((_, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const endX = center + radius * Math.cos(angle);
        const endY = center + radius * Math.sin(angle);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={endX}
            y2={endY}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}
      
      {/* Target area (dotted) */}
      <polygon
        points={targetPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(251, 191, 36, 0.1)"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeDasharray="5,5"
      />
      
      {/* Data area */}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      
      {/* Data points */}
      {dataPoints.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="5"
          fill="#3b82f6"
          stroke="white"
          strokeWidth="2"
        />
      ))}
      
      {/* Labels */}
      {data.map((item, i) => {
        const pos = getLabelPosition(i);
        const textAnchor = pos.x > center + 10 ? 'start' : pos.x < center - 10 ? 'end' : 'middle';
        return (
          <text
            key={i}
            x={pos.x}
            y={pos.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            className="text-xs fill-gray-600 font-medium"
            style={{ fontSize: '10px' }}
          >
            {item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name}
          </text>
        );
      })}
      
      {/* Level labels */}
      {[1, 2, 3, 4, 5].map((level) => (
        <text
          key={level}
          x={center + 5}
          y={center - (radius * level) / levels}
          className="text-xs fill-gray-400"
          style={{ fontSize: '9px' }}
        >
          {level}
        </text>
      ))}
    </svg>
  );
};

// Mini Spider Chart for cards
const MiniSpiderChart = ({ data, size = 120 }) => {
  if (!data || data.length === 0) return null;
  
  const center = size / 2;
  const radius = (size - 20) / 2;
  const angleStep = (2 * Math.PI) / data.length;
  
  const getDataPoints = () => {
    return data.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const itemRadius = (radius * item.currentLevel) / 5;
      return {
        x: center + itemRadius * Math.cos(angle),
        y: center + itemRadius * Math.sin(angle)
      };
    });
  };
  
  const dataPoints = getDataPoints();
  
  return (
    <svg width={size} height={size}>
      {/* Background */}
      {[1, 2, 3, 4, 5].map((level) => (
        <circle
          key={level}
          cx={center}
          cy={center}
          r={(radius * level) / 5}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="0.5"
        />
      ))}
      
      {/* Data area */}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export default function CompetenciesPage() {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const isSuperAdmin = currentProfile?.role === 'super_admin';
  const isClientAdmin = currentProfile?.role === 'client_admin';
  const isCategoryAdmin = currentProfile?.role === 'category_admin';
  const isSiteAdmin = currentProfile?.role === 'site_admin';
  const isTeamLead = currentProfile?.role === 'team_lead';
  
  // Can nominate for Expert Network (Team Lead, Site Admin, and above)
  const canNominate = isTeamLead || isSiteAdmin || isCategoryAdmin || isClientAdmin || isSuperAdmin;
  
  // Can directly add to Expert Network (Category Admin and above)
  const canDirectlyAdd = isCategoryAdmin || isClientAdmin || isSuperAdmin;
  
  // Can manage tags (Team Lead, Site Admin, Category Admin, Client Admin, Super Admin)
  const canManageTags = isTeamLead || isSiteAdmin || isCategoryAdmin || isClientAdmin || isSuperAdmin;
  
  // State
  const [competencies, setCompetencies] = useState([]);
  const [tags, setTags] = useState([]); // Renamed from categories
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]); // For owner and training developer selection
  const [trainees, setTrainees] = useState([]); // NEW: For competency assignment
  const [expertNetworks, setExpertNetworks] = useState([]); // Expert networks for nomination
  const [existingNominations, setExistingNominations] = useState([]); // Track existing nominations
  const [existingNetworkMembers, setExistingNetworkMembers] = useState([]); // Track who's already in networks
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState('all'); // Renamed from tagFilter
  const [clientFilter, setClientFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteTagModal, setShowDeleteTagModal] = useState(false); // NEW: Tag delete confirmation
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState(null);
  const [editingTag, setEditingTag] = useState(null);
  const [competencyToDelete, setCompetencyToDelete] = useState(null);
  const [tagToDelete, setTagToDelete] = useState(null); // NEW: Tag to delete
  const [competencyToAssign, setCompetencyToAssign] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tag_ids: [], // Changed from tag_id to support multiple tags
    client_ids: [],
    owner_id: '',                    // NEW: Competency owner (expert/coach)
    training_developer_id: '',       // NEW: Who creates training materials
    level_1_description: 'Awareness - Can recognize the topic',
    level_2_description: 'Knowledge - Can explain concepts',
    level_3_description: 'Practitioner - Can perform with supervision',
    level_4_description: 'Proficient - Works independently',
    level_5_description: 'Expert - Can teach others',
    is_active: true
  });
  const [tagFormData, setTagFormData] = useState({ // Renamed from tagFormData
    name: '',
    description: '',
    color: '#3B82F6',
    client_id: ''
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // NEW: Assign form state
  const [assignFormData, setAssignFormData] = useState({
    user_ids: [],
    target_level: 3,
    current_level: 0,
    target_date: '',
    coach_id: ''
  });
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // NEW: Existing user competencies and validation
  const [existingUserCompetencies, setExistingUserCompetencies] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [competencyToValidate, setCompetencyToValidate] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validateForm, setValidateForm] = useState({
    achieved_level: 3,
    notes: ''
  });
  
  // NEW: Nomination modal state
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [nominationData, setNominationData] = useState({
    user_id: '',
    user_name: '',
    competency_id: '',
    competency_name: '',
    current_level: 0,
    proposed_role: 'fsme',
    site_name: '',
    notes: ''
  });
  const [nominating, setNominating] = useState(false);
  const [nominationError, setNominationError] = useState('');
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Spider chart category filter (separate from list filter)
  const [selectedChartTags, setSelectedChartTags] = useState([]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [currentProfile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompetencies(), 
        loadTags(), // Renamed from loadTags
        loadClients(), 
        loadUsers(), 
        loadTrainees(),
        loadExpertNetworks(),
        loadExistingNominations(),
        loadExistingNetworkMembers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetencies = async () => {
    try {
      // Fetch competencies with tags via junction table and client associations
      const data = await dbFetch('competencies?select=*,competency_tag_links(tag_id,competency_tags(id,name,color)),competency_clients(client_id,clients(id,name)),owner:owner_id(id,full_name),training_developer:training_developer_id(id,full_name)&order=name.asc');
      
      // Transform data to include client names array and tags array
      let transformed = (data || []).map(comp => ({
        ...comp,
        client_names: comp.competency_clients?.map(cc => cc.clients?.name).filter(Boolean) || [],
        client_ids: comp.competency_clients?.map(cc => cc.client_id).filter(Boolean) || [],
        tags: comp.competency_tag_links?.map(tl => tl.competency_tags).filter(Boolean) || [],
        tag_ids: comp.competency_tag_links?.map(tl => tl.tag_id).filter(Boolean) || []
      }));
      
      // CRITICAL: Filter by client access for non-super_admin users
      // This checks the junction table (competency_clients) to support multi-client sharing
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        transformed = transformed.filter(comp => 
          comp.client_ids?.includes(currentProfile.client_id)
        );
      }
      
      setCompetencies(transformed);
    } catch (error) {
      console.error('Error loading competencies:', error);
    }
  };

  const loadTags = async () => {
    try {
      let url = 'competency_tags?select=*&order=name.asc';
      
      // Filter by client for non-super_admin users
      // Include tags where client_id matches OR client_id is null (global tags)
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        url += `&or=(client_id.eq.${currentProfile.client_id},client_id.is.null)`;
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
      
      // Non-super_admin should only see their own client
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
      // Load ALL users from the organization (anyone can be a training developer)
      let url = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      
      // CRITICAL: Filter by client for all non-super_admin users
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      
      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // NEW: Load trainees for competency assignment
  const loadTrainees = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      
      // CRITICAL: Always filter by client for non-super_admin
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'team_lead' && currentProfile?.client_id) {
        // Team lead: filter by client AND reports_to
        url += `&client_id=eq.${currentProfile.client_id}&reports_to_id=eq.${currentProfile.id}`;
      } else if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        // Any other non-super_admin role
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      
      const data = await dbFetch(url);
      setTrainees(data || []);
    } catch (error) {
      console.error('Error loading trainees:', error);
    }
  };

  // NEW: Load expert networks for nomination
  const loadExpertNetworks = async () => {
    try {
      let url = 'expert_networks?select=id,name,competency_id,client_id&is_active=eq.true';
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      const data = await dbFetch(url);
      setExpertNetworks(data || []);
    } catch (error) {
      console.error('Error loading expert networks:', error);
    }
  };

  // NEW: Load existing nominations to show status
  const loadExistingNominations = async () => {
    try {
      let url = 'expert_nominations?select=id,user_id,competency_id,status';
      if (currentProfile?.role !== 'super_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      const data = await dbFetch(url);
      setExistingNominations(data || []);
    } catch (error) {
      console.error('Error loading nominations:', error);
    }
  };

  // NEW: Load existing network members to check who's already in
  const loadExistingNetworkMembers = async () => {
    try {
      const data = await dbFetch('expert_network_members?select=user_id,network_id,network:network_id(competency_id)');
      setExistingNetworkMembers(data || []);
    } catch (error) {
      console.error('Error loading network members:', error);
    }
  };

  // NEW: Check if user is already in network for a competency
  const isUserInNetwork = (userId, competencyId) => {
    return existingNetworkMembers.some(m => 
      m.user_id === userId && m.network?.competency_id === competencyId
    );
  };

  // NEW: Check if user has pending nomination for a competency
  const getUserNominationStatus = (userId, competencyId) => {
    const nomination = existingNominations.find(n => 
      n.user_id === userId && n.competency_id === competencyId
    );
    return nomination?.status || null;
  };

  // NEW: Open nomination modal
  const handleOpenNominationModal = (user, competency, currentLevel) => {
    setNominationData({
      user_id: user.id,
      user_name: user.full_name,
      competency_id: competency.id,
      competency_name: competency.name,
      current_level: currentLevel,
      proposed_role: currentLevel >= 5 ? 'gsme' : 'fsme',
      site_name: '',
      notes: ''
    });
    setNominationError('');
    setShowNominationModal(true);
  };

  // NEW: Submit nomination
  const handleSubmitNomination = async () => {
    setNominating(true);
    setNominationError('');
    
    try {
      // Check if network exists for this competency
      const network = expertNetworks.find(n => n.competency_id === nominationData.competency_id);
      
      await dbFetch('expert_nominations', {
        method: 'POST',
        body: JSON.stringify({
          user_id: nominationData.user_id,
          nominated_by: currentProfile?.id,
          competency_id: nominationData.competency_id,
          network_id: network?.id || null,
          current_level: nominationData.current_level,
          proposed_role: nominationData.proposed_role,
          site_name: nominationData.site_name || null,
          notes: nominationData.notes || null,
          client_id: currentProfile?.client_id,
          status: 'pending'
        })
      });

      setShowNominationModal(false);
      loadExistingNominations(); // Refresh nominations
      alert(`${nominationData.user_name} has been nominated for the Expert Network. Awaiting approval.`);
    } catch (error) {
      console.error('Error submitting nomination:', error);
      setNominationError(error.message || 'Failed to submit nomination');
    } finally {
      setNominating(false);
    }
  };

  // Filter competencies
  const filteredCompetencies = competencies.filter(comp => {
    const matchesSearch = 
      comp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = tagFilter === 'all' || comp.tag_ids?.includes(tagFilter);
    const matchesClient = clientFilter === 'all' || comp.client_ids?.includes(clientFilter);
    return matchesSearch && matchesTag && matchesClient;
  });

  // Handle create/edit competency
  const handleOpenModal = (competency = null) => {
    if (competency) {
      setEditingCompetency(competency);
      setFormData({
        name: competency.name || '',
        description: competency.description || '',
        tag_ids: competency.tag_ids || [],
        client_ids: competency.client_ids || [],
        owner_id: competency.owner_id || '',
        training_developer_id: competency.training_developer_id || '',
        level_1_description: competency.level_1_description || 'Awareness - Can recognize the topic',
        level_2_description: competency.level_2_description || 'Knowledge - Can explain concepts',
        level_3_description: competency.level_3_description || 'Practitioner - Can perform with supervision',
        level_4_description: competency.level_4_description || 'Proficient - Works independently',
        level_5_description: competency.level_5_description || 'Expert - Can teach others',
        is_active: competency.is_active ?? true
      });
    } else {
      setEditingCompetency(null);
      setFormData({
        name: '',
        description: '',
        tag_ids: [],
        client_ids: currentProfile?.role === 'client_admin' ? [currentProfile.client_id] : [],
        owner_id: '',
        training_developer_id: '',
        level_1_description: 'Awareness - Can recognize the topic',
        level_2_description: 'Knowledge - Can explain concepts',
        level_3_description: 'Practitioner - Can perform with supervision',
        level_4_description: 'Proficient - Works independently',
        level_5_description: 'Expert - Can teach others',
        is_active: true
      });
    }
    setFormError('');
    setShowModal(true);
  };

  // NEW: Handle assign competency to users
  const handleOpenAssignModal = async (competency) => {
    setCompetencyToAssign(competency);
    setAssignFormData({
      user_ids: [],
      target_level: 3,
      current_level: 0,
      target_date: '',
      coach_id: competency.owner_id || ''
    });
    setAssignError('');
    setShowAssignModal(true);
    
    // Load existing user competencies for this competency
    setLoadingExisting(true);
    try {
      const existing = await dbFetch(
        `user_competencies?competency_id=eq.${competency.id}&select=*`
      );
      
      // Fetch user details separately for each
      if (existing && existing.length > 0) {
        const enriched = await Promise.all(existing.map(async (uc) => {
          const userData = await dbFetch(`profiles?id=eq.${uc.user_id}&select=id,full_name,email`);
          return { ...uc, user: userData?.[0] || null };
        }));
        setExistingUserCompetencies(enriched);
      } else {
        setExistingUserCompetencies([]);
      }
    } catch (error) {
      console.error('Error loading existing competencies:', error);
      setExistingUserCompetencies([]);
    } finally {
      setLoadingExisting(false);
    }
  };

  // NEW: Open validation modal for existing competency
  const handleOpenValidateModal = (userCompetency) => {
    setCompetencyToValidate(userCompetency);
    setValidateForm({
      achieved_level: userCompetency.target_level || userCompetency.current_level + 1 || 3,
      notes: ''
    });
    setShowValidateModal(true);
  };

  // NEW: Handle competency validation
  const handleValidateCompetency = async () => {
    if (!competencyToValidate) return;
    
    setValidating(true);
    try {
      console.log('Validating competency:', competencyToValidate.id, 'to level:', validateForm.achieved_level);
      
      // Update user_competencies record - only update columns that exist
      const updateResult = await dbFetch(`user_competencies?id=eq.${competencyToValidate.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          current_level: validateForm.achieved_level,
          status: validateForm.achieved_level >= competencyToValidate.target_level ? 'achieved' : 'in_progress'
        })
      });
      console.log('Update result:', updateResult);

      // Create a validation record in development_activities
      const clientId = competencyToAssign?.client_ids?.[0] || currentProfile?.client_id;
      await dbFetch('development_activities', {
        method: 'POST',
        body: JSON.stringify({
          type: 'coaching',
          title: `Validation: ${competencyToAssign?.name || 'Competency'}`,
          description: validateForm.notes || `Competency validated at Level ${validateForm.achieved_level}`,
          trainee_id: competencyToValidate.user_id,
          assigned_by: currentProfile.id,
          coach_id: currentProfile.id,
          competency_id: competencyToValidate.competency_id,
          target_level: validateForm.achieved_level,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: currentProfile.id,
          client_id: clientId
        })
      });

      // Refresh existing competencies
      const existing = await dbFetch(
        `user_competencies?competency_id=eq.${competencyToAssign.id}&select=*`
      );
      if (existing && existing.length > 0) {
        const enriched = await Promise.all(existing.map(async (uc) => {
          const userData = await dbFetch(`profiles?id=eq.${uc.user_id}&select=id,full_name,email`);
          return { ...uc, user: userData?.[0] || null };
        }));
        setExistingUserCompetencies(enriched);
      } else {
        setExistingUserCompetencies([]);
      }
      
      setShowValidateModal(false);
      setCompetencyToValidate(null);
    } catch (error) {
      console.error('Error validating competency:', error);
    } finally {
      setValidating(false);
    }
  };

  // NEW: Handle assign submission
  const handleAssignCompetency = async () => {
    setAssignError('');
    setAssigning(true);

    try {
      if (assignFormData.user_ids.length === 0) {
        throw new Error('Please select at least one user');
      }

      const coachId = assignFormData.coach_id || competencyToAssign.owner_id || null;
      const targetDate = assignFormData.target_date || null;
      const targetLevel = assignFormData.target_level || 3;
      const currentLevel = assignFormData.current_level || 0;
      const isAlreadyCompetent = currentLevel > 0;

      // Get client_id from competency (use first client if multiple)
      const clientId = competencyToAssign.client_ids?.[0] || currentProfile?.client_id;

      // For each selected user, create user_competencies record and coaching activity
      for (const userId of assignFormData.user_ids) {
        // Check if user already has this competency
        const existing = await dbFetch(
          `user_competencies?user_id=eq.${userId}&competency_id=eq.${competencyToAssign.id}`
        );

        if (existing && existing.length > 0) {
          // Skip this user - already has competency
          continue;
        }

        // Create user_competencies record
        await dbFetch('user_competencies', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            competency_id: competencyToAssign.id,
            target_level: targetLevel,
            current_level: currentLevel,
            status: currentLevel >= targetLevel ? 'achieved' : 'in_progress'
          })
        });

        // If already competent, create a validation record
        if (isAlreadyCompetent) {
          await dbFetch('development_activities', {
            method: 'POST',
            body: JSON.stringify({
              type: 'coaching',
              title: `Initial Validation: ${competencyToAssign.name}`,
              description: `Competency validated at Level ${currentLevel} (prior experience)`,
              trainee_id: userId,
              assigned_by: currentProfile.id,
              coach_id: currentProfile.id,
              competency_id: competencyToAssign.id,
              target_level: currentLevel,
              status: 'validated',
              validated_at: new Date().toISOString(),
              validated_by: currentProfile.id,
              client_id: clientId
            })
          });
        } else if (coachId) {
          // Auto-create coaching activity only if not already competent
          await dbFetch('development_activities', {
            method: 'POST',
            body: JSON.stringify({
              type: 'coaching',
              title: `Coaching: ${competencyToAssign.name}`,
              description: `Coaching session for developing ${competencyToAssign.name} competency to Level ${targetLevel}`,
              objectives: `Achieve Level ${targetLevel} in ${competencyToAssign.name}`,
              success_criteria: `Trainee demonstrates competency at Level ${targetLevel} and is validated by coach`,
              trainee_id: userId,
              assigned_by: currentProfile.id,
              coach_id: coachId,
              competency_id: competencyToAssign.id,
              target_level: targetLevel,
              start_date: new Date().toISOString().split('T')[0],
              due_date: targetDate,
              status: 'pending',
              client_id: clientId
            })
          });
        }
      }

      setShowAssignModal(false);
      setCompetencyToAssign(null);
      // Show success (could add toast here)
    } catch (error) {
      console.error('Error assigning competency:', error);
      setAssignError(error.message || 'Failed to assign competency');
    } finally {
      setAssigning(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!formData.name) {
        throw new Error('Competency name is required');
      }
      if (formData.client_ids.length === 0) {
        throw new Error('At least one client is required');
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        owner_id: formData.owner_id || null,
        training_developer_id: formData.training_developer_id || null,
        level_1_description: formData.level_1_description,
        level_2_description: formData.level_2_description,
        level_3_description: formData.level_3_description,
        level_4_description: formData.level_4_description,
        level_5_description: formData.level_5_description,
        is_active: formData.is_active
      };

      let competencyId;

      if (editingCompetency) {
        // Update competency
        await dbFetch(`competencies?id=eq.${editingCompetency.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        competencyId = editingCompetency.id;

        // Delete existing client associations
        await dbFetch(`competency_clients?competency_id=eq.${editingCompetency.id}`, {
          method: 'DELETE'
        });
        
        // Delete existing tag associations
        await dbFetch(`competency_tag_links?competency_id=eq.${editingCompetency.id}`, {
          method: 'DELETE'
        });
      } else {
        // Create new competency
        const result = await dbFetch('competencies?select=id', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        competencyId = result[0]?.id;
      }

      // Insert client associations
      if (competencyId && formData.client_ids.length > 0) {
        const clientAssociations = formData.client_ids.map(clientId => ({
          competency_id: competencyId,
          client_id: clientId
        }));
        await dbFetch('competency_clients', {
          method: 'POST',
          body: JSON.stringify(clientAssociations)
        });
      }

      // Insert tag associations
      if (competencyId && formData.tag_ids.length > 0) {
        const tagAssociations = formData.tag_ids.map(tagId => ({
          competency_id: competencyId,
          tag_id: tagId
        }));
        await dbFetch('competency_tag_links', {
          method: 'POST',
          body: JSON.stringify(tagAssociations)
        });
      }

      await loadCompetencies();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving competency:', error);
      setFormError(error.message || 'Failed to save competency');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle tag modal
  const handleOpenTagModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagFormData({
        name: tag.name || '',
        description: tag.description || '',
        color: tag.color || '#3B82F6',
        client_id: tag.client_id || ''
      });
    } else {
      setEditingTag(null);
      setTagFormData({
        name: '',
        description: '',
        color: '#3B82F6',
        client_id: currentProfile?.role === 'client_admin' ? currentProfile.client_id : ''
      });
    }
    setShowTagModal(true);
  };

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!tagFormData.name) {
        throw new Error('Tag name is required');
      }

      const payload = {
        name: tagFormData.name,
        description: tagFormData.description || null,
        color: tagFormData.color,
        client_id: tagFormData.client_id || null
      };

      if (editingTag) {
        await dbFetch(`competency_tags?id=eq.${editingTag.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await dbFetch('competency_tags', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }

      await loadTags();
      setShowTagModal(false);
    } catch (error) {
      console.error('Error saving tag:', error);
      setFormError(error.message || 'Failed to save tag');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete tag - show confirmation modal
  const handleDeleteTagClick = (tag) => {
    setTagToDelete(tag);
    setShowDeleteTagModal(true);
  };

  // Confirm delete tag
  const handleDeleteTagConfirm = async () => {
    if (!tagToDelete) {
      console.error('No tag to delete');
      return;
    }
    
    console.log('Deleting tag:', tagToDelete.id, tagToDelete.name);
    setSubmitting(true);
    
    try {
      // Delete tag links first
      console.log('Deleting tag links...');
      const linkResult = await dbFetch(`competency_tag_links?tag_id=eq.${tagToDelete.id}`, {
        method: 'DELETE'
      });
      console.log('Tag links deleted:', linkResult);
      
      // Then delete the tag
      console.log('Deleting tag...');
      const tagResult = await dbFetch(`competency_tags?id=eq.${tagToDelete.id}`, {
        method: 'DELETE'
      });
      console.log('Tag deleted:', tagResult);
      
      // Refresh data
      await loadTags();
      await loadCompetencies();
      
      // Close modals
      setShowDeleteTagModal(false);
      setShowTagModal(false);
      setTagToDelete(null);
      setEditingTag(null);
      
      console.log('Tag deletion complete');
    } catch (error) {
      console.error('Error deleting tag:', error);
      // Show more detailed error
      const errorMsg = error?.message || JSON.stringify(error) || 'Unknown error';
      alert('Failed to delete tag: ' + errorMsg);
      // Still close the confirmation modal on error
      setShowDeleteTagModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteClick = (competency) => {
    setCompetencyToDelete(competency);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!competencyToDelete) return;

    try {
      const compId = competencyToDelete.id;
      
      // Delete all related records first (in correct order)
      // 1. Delete tag links
      await dbFetch(`competency_tag_links?competency_id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      // 2. Delete client associations
      await dbFetch(`competency_clients?competency_id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      // 3. Delete user_competencies
      await dbFetch(`user_competencies?competency_id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      // 4. Delete development_activities
      await dbFetch(`development_activities?competency_id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      // 5. Delete expert_nominations
      await dbFetch(`expert_nominations?competency_id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      // 6. Finally delete the competency
      await dbFetch(`competencies?id=eq.${compId}`, {
        method: 'DELETE'
      });
      
      await loadCompetencies();
      setShowDeleteModal(false);
      setCompetencyToDelete(null);
    } catch (error) {
      console.error('Error deleting competency:', error);
      // Show user-friendly error and close modal
      alert('Failed to delete competency. It may still be referenced by other records. Please try again or contact support.');
      setShowDeleteModal(false);
      setCompetencyToDelete(null);
    }
  };

  // Toggle client selection
  const toggleClient = (clientId) => {
    if (formData.client_ids.includes(clientId)) {
      setFormData({
        ...formData,
        client_ids: formData.client_ids.filter(id => id !== clientId)
      });
    } else {
      setFormData({
        ...formData,
        client_ids: [...formData.client_ids, clientId]
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading competencies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competencies</h1>
          <p className="text-gray-500 mt-1">Manage skills and competency frameworks</p>
        </div>
        <div className="flex gap-2">
          {canManageTags && (
            <button
              onClick={() => handleOpenTagModal()}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Layers className="w-4 h-4" />
              Manage Tags
            </button>
          )}
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Competency
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{competencies.length}</p>
              <p className="text-sm text-gray-500">Total Competencies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
              <p className="text-sm text-gray-500">Tags</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{competencies.filter(c => c.is_active).length}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              <p className="text-sm text-gray-500">Clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Quick View */}
      {tags.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Tags</h2>
            {canManageTags && (
              <button 
                onClick={() => handleOpenTagModal()}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Manage Tags
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(cat => (
              <div 
                key={cat.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200"
              >
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-gray-700">{cat.name}</span>
                <span className="text-xs text-gray-400">
                  ({competencies.filter(c => c.tag_ids?.includes(cat.id)).length})
                </span>
                {canManageTags && (
                  <button
                    onClick={() => handleOpenTagModal(cat)}
                    className="p-0.5 hover:bg-gray-200 rounded ml-1"
                  >
                    <Edit2 className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spider Chart with Category Selection */}
      {competencies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Category Selection */}
            <div className="lg:w-48 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Tags</h3>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedChartTags([])}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedChartTags.length === 0
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Tags
                </button>
                {tags.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (selectedChartTags.includes(cat.id)) {
                        setSelectedChartTags(selectedChartTags.filter(id => id !== cat.id));
                      } else {
                        setSelectedChartTags([...selectedChartTags, cat.id]);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      selectedChartTags.includes(cat.id)
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {competencies.filter(c => c.tag_id === cat.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Spider Chart */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Competency Framework</h2>
                  <p className="text-sm text-gray-500">
                    {selectedChartTags.length === 0 
                      ? 'Showing all competencies'
                      : `Showing ${selectedChartTags.length} selected categor${selectedChartTags.length === 1 ? 'y' : 'ies'}`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600">Defined</span>
                  </div>
                </div>
              </div>
              
              {/* Filter competencies for spider chart */}
              {(() => {
                const chartCompetencies = competencies
                  .filter(comp => 
                    selectedChartTags.length === 0 || 
                    selectedChartTags.includes(comp.tag_id)
                  )
                  .slice(0, 8) // Limit to 8 for readability
                  .map(comp => ({
                    name: comp.name,
                    currentLevel: 5, // Show all as "defined" (level 5)
                    targetLevel: 5,
                    color: comp.competency_categories?.color || '#3B82F6'
                  }));

                if (chartCompetencies.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No competencies in selected categories</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <>
                    <SpiderChart data={chartCompetencies} size={320} />
                    {competencies.filter(comp => 
                      selectedChartTags.length === 0 || 
                      selectedChartTags.includes(comp.tag_id)
                    ).length > 8 && (
                      <p className="text-xs text-gray-400 text-center mt-2">
                        Showing first 8 competencies. {competencies.filter(comp => 
                          selectedChartTags.length === 0 || 
                          selectedChartTags.includes(comp.tag_id)
                        ).length - 8} more not displayed.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search competencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Filter */}
          <div className="relative">
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Tags</option>
              {tags.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Client Filter (Super Admin only) */}
          {isSuperAdmin && (
            <div className="relative">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}

          {/* View Toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Competencies Grid/List */}
      {filteredCompetencies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Competencies Found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first competency.</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Competency
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompetencies.map(comp => (
            <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex flex-wrap gap-1">
                  {comp.tags?.length > 0 ? (
                    comp.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: tag.color || '#3B82F6' }}
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No tags</span>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === comp.id ? null : comp.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {openDropdown === comp.id && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleOpenModal(comp);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      {/* NEW: Assign to Users option */}
                      <button
                        onClick={() => {
                          handleOpenAssignModal(comp);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to Users
                      </button>
                      <button
                        onClick={() => handleDeleteClick(comp)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-1">{comp.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{comp.description || 'No description'}</p>
              
              {/* Level Preview */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map(level => (
                  <div
                    key={level}
                    className={`flex-1 h-1.5 rounded-full ${level <= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate max-w-[150px]" title={comp.client_names?.join(', ') || 'No clients'}>
                  {comp.client_names?.length > 0 
                    ? comp.client_names.length === 1 
                      ? comp.client_names[0]
                      : `${comp.client_names[0]} +${comp.client_names.length - 1}`
                    : 'No clients'}
                </span>
                <span className={`px-2 py-0.5 rounded-full ${comp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {comp.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Competency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCompetencies.map(comp => (
                <tr key={comp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{comp.name}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{comp.description || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {comp.competency_categories?.color && (
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: comp.competency_categories.color }}
                        />
                      )}
                      <span className="text-sm text-gray-600">
                        {comp.competency_categories?.name || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span title={comp.client_names?.join(', ') || 'No clients'}>
                      {comp.client_names?.length > 0 
                        ? comp.client_names.length === 1 
                          ? comp.client_names[0]
                          : `${comp.client_names[0]} +${comp.client_names.length - 1} more`
                        : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${comp.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {comp.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* NEW: Assign to Users button in list view */}
                      <button
                        onClick={() => handleOpenAssignModal(comp)}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                        title="Assign to Users"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(comp)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(comp)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Competency Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCompetency ? 'Edit Competency' : 'Add Competency'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., HACCP Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this competency..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1 p-2 border border-gray-200 rounded-lg min-h-[42px]">
                    {formData.tag_ids?.length > 0 ? (
                      formData.tag_ids.map(tagId => {
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
                              className="hover:bg-white/20 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })
                    ) : (
                      <span className="text-gray-400 text-sm">Click to add tags...</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.filter(t => !formData.tag_ids?.includes(t.id)).map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          tag_ids: [...(formData.tag_ids || []), tag.id]
                        })}
                        className="px-2 py-0.5 rounded text-xs font-medium border border-gray-200 hover:bg-gray-50"
                        style={{ color: tag.color || '#3B82F6' }}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner (Expert)
                  </label>
                  <select
                    value={formData.owner_id}
                    onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select owner...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Training Developer
                </label>
                <select
                  value={formData.training_developer_id}
                  onChange={(e) => setFormData({ ...formData, training_developer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select training developer...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clients *
                </label>
                <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                  {clients.map(client => (
                    <label
                      key={client.id}
                      className={`flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer ${
                        formData.client_ids.includes(client.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.client_ids.includes(client.id)}
                        onChange={() => toggleClient(client.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{client.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Level Descriptions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level Descriptions
                </label>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-sm font-medium">
                        {level}
                      </span>
                      <input
                        type="text"
                        value={formData[`level_${level}_description`]}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          [`level_${level}_description`]: e.target.value 
                        })}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCompetency ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTag ? 'Edit Tag' : 'Create Tag'}
              </h2>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleTagSubmit} className="p-6 space-y-4">
              {/* Predefined Tags or Custom */}
              {!editingTag && !tagFormData.isCustom && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Tag Template
                  </label>
                  <select
                    value={tagFormData.name}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected === 'custom') {
                        setTagFormData({ 
                          ...tagFormData, 
                          name: '', 
                          isCustom: true,
                          color: '#3B82F6'
                        });
                      } else {
                        const colorMap = {
                          'Safety': '#EF4444',
                          'Quality': '#8B5CF6',
                          'Cost': '#F59E0B',
                          'Supply': '#06B6D4',
                          'Technical': '#3B82F6',
                          'Sustainability': '#10B981',
                          'Soft Skills': '#EC4899'
                        };
                        setTagFormData({ 
                          ...tagFormData, 
                          name: selected, 
                          color: colorMap[selected] || '#3B82F6',
                          isCustom: false 
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a tag...</option>
                    <option value="Safety">🛡️ Safety</option>
                    <option value="Quality">✨ Quality</option>
                    <option value="Cost">💰 Cost</option>
                    <option value="Supply">📦 Supply</option>
                    <option value="Technical">⚙️ Technical</option>
                    <option value="Sustainability">🌱 Sustainability</option>
                    <option value="Soft Skills">💬 Soft Skills</option>
                    <option value="custom">➕ Add Custom...</option>
                  </select>
                </div>
              )}

              {/* Custom Name Input (shown when editing or custom selected) */}
              {(editingTag || tagFormData.isCustom) && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Tag Name *
                    </label>
                    {tagFormData.isCustom && !editingTag && (
                      <button
                        type="button"
                        onClick={() => setTagFormData({ ...tagFormData, name: '', isCustom: false })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        ← Back to list
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={tagFormData.name}
                    onChange={(e) => setTagFormData({ ...tagFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Digital Skills"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={tagFormData.description}
                  onChange={(e) => setTagFormData({ ...tagFormData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { color: '#EF4444', name: 'Red' },
                    { color: '#F59E0B', name: 'Amber' },
                    { color: '#10B981', name: 'Green' },
                    { color: '#06B6D4', name: 'Cyan' },
                    { color: '#3B82F6', name: 'Blue' },
                    { color: '#8B5CF6', name: 'Purple' },
                    { color: '#EC4899', name: 'Pink' },
                    { color: '#84CC16', name: 'Lime' }
                  ].map(({ color }) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setTagFormData({ ...tagFormData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        tagFormData.color === color 
                          ? 'border-gray-900 scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client (optional)
                  </label>
                  <select
                    value={tagFormData.client_id}
                    onChange={(e) => setTagFormData({ ...tagFormData, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Global (All Clients)</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-between pt-4">
                {/* Delete button - only when editing */}
                {editingTag ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTagClick(editingTag)}
                    disabled={submitting}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Tag
                  </button>
                ) : (
                  <div></div>
                )}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTagModal(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingTag ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Tag Confirmation Modal */}
      {showDeleteTagModal && tagToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Tag?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{tagToDelete.name}</strong>? 
                This will remove it from all competencies.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    console.log('Cancel clicked');
                    setShowDeleteTagModal(false);
                    setTagToDelete(null);
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Delete button clicked, calling handleDeleteTagConfirm');
                    handleDeleteTagConfirm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && competencyToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Competency?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{competencyToDelete.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setCompetencyToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Assign to Users Modal */}
      {showAssignModal && competencyToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Assign to Users</h2>
                  <p className="text-sm text-gray-500">{competencyToAssign.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCompetencyToAssign(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {assignError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {assignError}
                </div>
              )}

              {/* Target Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Level
                </label>
                <select
                  value={assignFormData.target_level}
                  onChange={(e) => setAssignFormData({ ...assignFormData, target_level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  {[1, 2, 3, 4, 5].map(level => (
                    <option key={level} value={level}>Level {level}</option>
                  ))}
                </select>
              </div>

              {/* Current Level - for direct validation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Level (if already competent)
                </label>
                <select
                  value={assignFormData.current_level || 0}
                  onChange={(e) => setAssignFormData({ ...assignFormData, current_level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value={0}>Not yet competent (Level 0)</option>
                  {[1, 2, 3, 4, 5].map(level => (
                    <option key={level} value={level}>Level {level}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {assignFormData.current_level > 0 
                    ? `Will be validated at Level ${assignFormData.current_level}` 
                    : 'Requires coaching to develop competency'}
                </p>
              </div>

              {/* Select Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users to Assign *
                </label>
                
                {loadingExisting ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {/* Users who already have this competency */}
                    {existingUserCompetencies.length > 0 && (
                      <div className="border-b border-gray-200">
                        <div className="px-3 py-2 bg-gray-100 text-xs font-medium text-gray-600 sticky top-0">
                          Already Assigned ({existingUserCompetencies.length})
                        </div>
                        {existingUserCompetencies.map(uc => {
                          const inNetwork = isUserInNetwork(uc.user_id, competencyToAssign.id);
                          const nominationStatus = getUserNominationStatus(uc.user_id, competencyToAssign.id);
                          const canRecommend = canNominate && uc.current_level >= 3 && !inNetwork && nominationStatus !== 'pending';
                          
                          return (
                            <div
                              key={uc.id}
                              className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0 bg-gray-50"
                            >
                              <div className="flex items-center gap-2">
                                {uc.current_level >= uc.target_level ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-amber-400" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{uc.user?.full_name}</p>
                                  <p className="text-xs text-gray-500">
                                    L{uc.current_level || 0} → L{uc.target_level} 
                                    {uc.current_level >= uc.target_level && (
                                      <span className="ml-1 text-green-600">✓ Achieved</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* Expert Network Status / Recommend Button */}
                                {inNetwork ? (
                                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                                    <Network className="w-3 h-3" /> In Network
                                  </span>
                                ) : nominationStatus === 'pending' ? (
                                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                                    ⏳ Pending
                                  </span>
                                ) : canRecommend ? (
                                  <button
                                    onClick={() => handleOpenNominationModal(uc.user, competencyToAssign, uc.current_level)}
                                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                                    title="Recommend for Expert Network"
                                  >
                                    <Star className="w-3 h-3" /> Recommend
                                  </button>
                                ) : null}
                                
                                {/* Validate Button */}
                                {uc.current_level < uc.target_level && (
                                  <button
                                    onClick={() => handleOpenValidateModal(uc)}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Validate
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Users without this competency (can be assigned) */}
                    {(() => {
                      const existingUserIds = existingUserCompetencies.map(uc => uc.user_id);
                      const availableUsers = trainees.filter(
                        t => (t.role === 'trainee' || t.role === 'team_lead') && !existingUserIds.includes(t.id)
                      );
                      
                      if (availableUsers.length === 0 && existingUserCompetencies.length === 0) {
                        return <p className="p-4 text-sm text-gray-500 text-center">No users available</p>;
                      }
                      
                      if (availableUsers.length === 0) {
                        return (
                          <div className="px-3 py-2 bg-blue-50 text-xs text-blue-600 text-center">
                            All users already have this competency assigned
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          {existingUserCompetencies.length > 0 && (
                            <div className="px-3 py-2 bg-gray-100 text-xs font-medium text-gray-600 sticky top-0">
                              Available to Assign ({availableUsers.length})
                            </div>
                          )}
                          {availableUsers.map(user => (
                            <label
                              key={user.id}
                              className={`flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 ${
                                assignFormData.user_ids.includes(user.id) ? 'bg-green-50' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={assignFormData.user_ids.includes(user.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAssignFormData({
                                      ...assignFormData,
                                      user_ids: [...assignFormData.user_ids, user.id]
                                    });
                                  } else {
                                    setAssignFormData({
                                      ...assignFormData,
                                      user_ids: assignFormData.user_ids.filter(id => id !== user.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 text-green-600 rounded border-gray-300"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </label>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                )}
                {assignFormData.user_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{assignFormData.user_ids.length} user(s) selected</p>
                )}
              </div>

              {/* Coach - only show if not already competent */}
              {(!assignFormData.current_level || assignFormData.current_level === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coach (Optional)
                  </label>
                  <select
                    value={assignFormData.coach_id}
                    onChange={(e) => setAssignFormData({ ...assignFormData, coach_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Use competency owner ({competencyToAssign.owner?.full_name || 'None'})</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Date - only show if not already competent */}
              {(!assignFormData.current_level || assignFormData.current_level === 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Completion Date (Optional)
                  </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={assignFormData.target_date}
                    onChange={(e) => setAssignFormData({ ...assignFormData, target_date: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setCompetencyToAssign(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCompetency}
                disabled={assigning || assignFormData.user_ids.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {assignFormData.current_level > 0 ? 'Assign & Validate' : 'Assign Competency'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Modal */}
      {showValidateModal && competencyToValidate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Validate Competency</h2>
                  <p className="text-sm text-gray-500">{competencyToAssign?.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setCompetencyToValidate(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Trainee Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Trainee</p>
                <p className="font-medium">{competencyToValidate.user?.full_name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Current: Level {competencyToValidate.current_level || 0} → Target: Level {competencyToValidate.target_level}
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
                      type="button"
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
                onClick={() => {
                  setShowValidateModal(false);
                  setCompetencyToValidate(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleValidateCompetency}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm Validation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Expert Network Nomination Modal */}
      {showNominationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Network className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Recommend for Expert Network</h2>
                  <p className="text-sm text-gray-500">{nominationData.competency_name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNominationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {nominationError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {nominationError}
                </div>
              )}

              {/* Candidate Info */}
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-900">{nominationData.user_name}</p>
                    <p className="text-sm text-purple-600">
                      Level {nominationData.current_level} in {nominationData.competency_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Proposed Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Role
                </label>
                <div className="space-y-2">
                  {nominationData.current_level >= 5 && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                      nominationData.proposed_role === 'gsme' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="proposed_role"
                        value="gsme"
                        checked={nominationData.proposed_role === 'gsme'}
                        onChange={(e) => setNominationData({ ...nominationData, proposed_role: e.target.value })}
                        className="sr-only"
                      />
                      <Star className={`w-5 h-5 ${nominationData.proposed_role === 'gsme' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">GSME</div>
                        <div className="text-xs text-gray-500">Global Subject Matter Expert</div>
                      </div>
                    </label>
                  )}
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                    nominationData.proposed_role === 'fsme' ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="proposed_role"
                      value="fsme"
                      checked={nominationData.proposed_role === 'fsme'}
                      onChange={(e) => setNominationData({ ...nominationData, proposed_role: e.target.value })}
                      className="sr-only"
                    />
                    <Award className={`w-5 h-5 ${nominationData.proposed_role === 'fsme' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium">FSME</div>
                      <div className="text-xs text-gray-500">Factory Subject Matter Expert</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Site Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Location
                </label>
                <input
                  type="text"
                  value={nominationData.site_name}
                  onChange={(e) => setNominationData({ ...nominationData, site_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Lyon, Singapore, Chicago"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={nominationData.notes}
                  onChange={(e) => setNominationData({ ...nominationData, notes: e.target.value })}
                  rows={2}
                  placeholder="Why is this person a good fit for the Expert Network?"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Info Box */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-gray-400" />
                  This nomination will be sent for approval to a Category Admin or Client Admin.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowNominationModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNomination}
                disabled={nominating}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {nominating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Nomination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
