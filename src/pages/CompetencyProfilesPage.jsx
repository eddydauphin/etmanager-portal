import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  Copy,
  Briefcase,
  Target,
  MoreVertical,
  Building2,
  UserPlus,
  Calendar,
  Loader2
} from 'lucide-react';

export default function CompetencyProfilesPage() {
  const { profile: currentProfile } = useAuth();
  
  // State
  const [profiles, setProfiles] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]); // For owner, developer, and assignment
  const [trainees, setTrainees] = useState([]); // For profile assignment
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false); // NEW: Assign to users modal
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [profileToAssign, setProfileToAssign] = useState(null); // NEW
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    owner_id: '',                    // NEW: Profile owner (expert)
    training_developer_id: '',       // NEW: Training developer
    competencies: [] // Array of { competency_id, default_target_level }
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Assign form state
  const [assignFormData, setAssignFormData] = useState({
    user_ids: [],
    target_date: '',
    coach_id: ''
  });
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Category filter for competency selection
  const [selectedCategory, setSelectedCategory] = useState('all');

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
      await Promise.all([loadProfiles(), loadCompetencies(), loadClients(), loadCategories(), loadUsers(), loadTrainees()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = async () => {
    try {
      const data = await dbFetch('competency_profiles?select=*,clients(name),owner:owner_id(id,full_name),training_developer:training_developer_id(id,full_name),profile_competencies(competency_id,default_target_level,competencies(name,competency_categories(name,color)))&order=name.asc');
      setProfiles(data || []);
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadCompetencies = async () => {
    try {
      const data = await dbFetch('competencies?select=*,competency_categories(name,color)&is_active=eq.true&order=name.asc');
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

  const loadCategories = async () => {
    try {
      const data = await dbFetch('competency_categories?select=*&order=name.asc');
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // Load users who can be owners or training developers (non-trainees)
      const data = await dbFetch('profiles?select=id,full_name,email,role,client_id&is_active=eq.true&role=neq.trainee&order=full_name.asc');
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTrainees = async () => {
    try {
      // Load trainees for profile assignment
      let url = 'profiles?select=id,full_name,email,role,client_id&is_active=eq.true&order=full_name.asc';
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      } else if (currentProfile?.role === 'team_lead') {
        url += `&reports_to_id=eq.${currentProfile.id}`;
      }
      const data = await dbFetch(url);
      setTrainees(data || []);
    } catch (error) {
      console.error('Error loading trainees:', error);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === 'all' || profile.client_id === clientFilter;
    return matchesSearch && matchesClient;
  });

  // Filter competencies by category for selection
  const filteredCompetencies = competencies.filter(comp => {
    return selectedCategory === 'all' || comp.category_id === selectedCategory;
  });

  // Handle create/edit profile
  const handleOpenModal = (profile = null) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        name: profile.name || '',
        description: profile.description || '',
        client_id: profile.client_id || '',
        owner_id: profile.owner_id || '',
        training_developer_id: profile.training_developer_id || '',
        competencies: profile.profile_competencies?.map(pc => ({
          competency_id: pc.competency_id,
          default_target_level: pc.default_target_level || 3
        })) || []
      });
    } else {
      setEditingProfile(null);
      setFormData({
        name: '',
        description: '',
        client_id: currentProfile?.role === 'client_admin' ? currentProfile.client_id : '',
        owner_id: '',
        training_developer_id: '',
        competencies: []
      });
    }
    setSelectedCategory('all');
    setFormError('');
    setShowModal(true);
  };

  // Handle assign profile to users
  const handleOpenAssignModal = (profile) => {
    setProfileToAssign(profile);
    setAssignFormData({
      user_ids: [],
      target_date: '',
      coach_id: profile.owner_id || ''
    });
    setAssignError('');
    setShowAssignModal(true);
  };

  const handleAssignProfile = async () => {
    setAssignError('');
    setAssigning(true);

    try {
      if (assignFormData.user_ids.length === 0) {
        throw new Error('Please select at least one user');
      }

      // For each selected user, create user_competencies records for all profile competencies
      for (const userId of assignFormData.user_ids) {
        // Create user_profile_assignment record
        await dbFetch('user_profile_assignments', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            profile_id: profileToAssign.id,
            assigned_by: currentProfile.id,
            coach_id: assignFormData.coach_id || profileToAssign.owner_id || null,
            target_date: assignFormData.target_date || null,
            client_id: profileToAssign.client_id,
            status: 'active'
          })
        });

        // Create user_competencies for each competency in the profile
        for (const pc of profileToAssign.profile_competencies || []) {
          // Check if user already has this competency
          const existing = await dbFetch(
            `user_competencies?user_id=eq.${userId}&competency_id=eq.${pc.competency_id}`
          );

          if (!existing || existing.length === 0) {
            await dbFetch('user_competencies', {
              method: 'POST',
              body: JSON.stringify({
                user_id: userId,
                competency_id: pc.competency_id,
                target_level: pc.default_target_level || 3,
                current_level: 0,
                status: 'assigned'
              })
            });
          }
        }
      }

      setShowAssignModal(false);
      setProfileToAssign(null);
      // Show success message or reload data
    } catch (error) {
      console.error('Error assigning profile:', error);
      setAssignError(error.message || 'Failed to assign profile');
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
        throw new Error('Profile name is required');
      }
      if (!formData.client_id) {
        throw new Error('Client is required');
      }
      if (formData.competencies.length === 0) {
        throw new Error('At least one competency is required');
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id,
        owner_id: formData.owner_id || null,
        training_developer_id: formData.training_developer_id || null,
        is_active: true,
        created_by: currentProfile?.id
      };

      let profileId;

      if (editingProfile) {
        await dbFetch(`competency_profiles?id=eq.${editingProfile.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        profileId = editingProfile.id;

        // Delete existing competency associations
        await dbFetch(`profile_competencies?profile_id=eq.${editingProfile.id}`, {
          method: 'DELETE'
        });
      } else {
        const result = await dbFetch('competency_profiles?select=id', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        profileId = result[0]?.id;
      }

      // Insert competency associations
      if (profileId && formData.competencies.length > 0) {
        const competencyAssociations = formData.competencies.map(comp => ({
          profile_id: profileId,
          competency_id: comp.competency_id,
          default_target_level: comp.default_target_level
        }));
        await dbFetch('profile_competencies', {
          method: 'POST',
          body: JSON.stringify(competencyAssociations)
        });
      }

      await loadProfiles();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setFormError(error.message || 'Failed to save profile');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle competency selection
  const toggleCompetency = (competencyId) => {
    const exists = formData.competencies.find(c => c.competency_id === competencyId);
    if (exists) {
      setFormData({
        ...formData,
        competencies: formData.competencies.filter(c => c.competency_id !== competencyId)
      });
    } else {
      setFormData({
        ...formData,
        competencies: [...formData.competencies, { competency_id: competencyId, default_target_level: 3 }]
      });
    }
  };

  const updateTargetLevel = (competencyId, level) => {
    setFormData({
      ...formData,
      competencies: formData.competencies.map(c => 
        c.competency_id === competencyId ? { ...c, default_target_level: level } : c
      )
    });
  };

  // Handle delete
  const handleDeleteClick = (profile) => {
    setProfileToDelete(profile);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;

    try {
      await dbFetch(`competency_profiles?id=eq.${profileToDelete.id}`, {
        method: 'DELETE'
      });
      await loadProfiles();
      setShowDeleteModal(false);
      setProfileToDelete(null);
    } catch (error) {
      console.error('Error deleting profile:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (profile) => {
    setOpenDropdown(null);
    setEditingProfile(null);
    setFormData({
      name: `${profile.name} (Copy)`,
      description: profile.description || '',
      client_id: profile.client_id || '',
      competencies: profile.profile_competencies?.map(pc => ({
        competency_id: pc.competency_id,
        default_target_level: pc.default_target_level || 3
      })) || []
    });
    setSelectedCategory('all');
    setFormError('');
    setShowModal(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Competency Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">Create role-based competency templates for quick user assignment</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Profile
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{profiles.length}</p>
              <p className="text-sm text-gray-500">Total Profiles</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{competencies.length}</p>
              <p className="text-sm text-gray-500">Available Competencies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Building2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              <p className="text-sm text-gray-500">Clients</p>
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
              placeholder="Search profiles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
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
        </div>
      </div>

      {/* Profiles List */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Profiles Found</h3>
          <p className="text-gray-500 mb-4">Create competency profiles to quickly assign competencies to users.</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(profile => (
            <div key={profile.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                    <p className="text-xs text-gray-500">{profile.clients?.name || 'No client'}</p>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === profile.id ? null : profile.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {openDropdown === profile.id && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => {
                          handleOpenAssignModal(profile);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign to Users
                      </button>
                      <button
                        onClick={() => {
                          handleOpenModal(profile);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(profile)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleDeleteClick(profile)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {profile.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{profile.description}</p>
              )}
              
              {/* Competencies preview */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  {profile.profile_competencies?.length || 0} Competencies
                </p>
                <div className="flex flex-wrap gap-1">
                  {profile.profile_competencies?.slice(0, 4).map(pc => (
                    <span
                      key={pc.competency_id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600"
                      title={`Target Level: ${pc.default_target_level}`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: pc.competencies?.competency_categories?.color || '#3B82F6' }}
                      />
                      {pc.competencies?.name?.substring(0, 15)}{pc.competencies?.name?.length > 15 ? '...' : ''}
                      <span className="text-gray-400">L{pc.default_target_level}</span>
                    </span>
                  ))}
                  {(profile.profile_competencies?.length || 0) > 4 && (
                    <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-500">
                      +{profile.profile_competencies.length - 4} more
                    </span>
                  )}
                </div>
              </div>
              
              {/* Owner info */}
              {(profile.owner || profile.training_developer) && (
                <div className="flex gap-4 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                  {profile.owner && (
                    <span>Owner: <span className="text-gray-700">{profile.owner.full_name}</span></span>
                  )}
                  {profile.training_developer && (
                    <span>Developer: <span className="text-gray-700">{profile.training_developer.full_name}</span></span>
                  )}
                </div>
              )}
              
              {/* Quick Assign Button */}
              <button
                onClick={() => handleOpenAssignModal(profile)}
                className="w-full mt-3 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Assign to Users
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingProfile ? 'Edit Profile' : 'Create Profile'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {formError}
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., ZIPP Liquid Side Operator"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client *
                    </label>
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={currentProfile?.role === 'client_admin'}
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief description of this role profile..."
                    />
                  </div>

                  {/* Owner and Training Developer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner (Expert/Coach)
                    </label>
                    <select
                      value={formData.owner_id}
                      onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Owner</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Expert who coaches and approves learners</p>
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
                      <option value="">Select Developer</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.full_name} ({user.role})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Person who creates training materials</p>
                  </div>
                </div>

                {/* Competency Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Competencies * <span className="text-gray-400">({formData.competencies.length} selected)</span>
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                    {filteredCompetencies.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No competencies found in this category
                      </div>
                    ) : (
                      filteredCompetencies.map(comp => {
                        const isSelected = formData.competencies.some(c => c.competency_id === comp.id);
                        const selectedComp = formData.competencies.find(c => c.competency_id === comp.id);
                        
                        return (
                          <div
                            key={comp.id}
                            className={`flex items-center justify-between p-3 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                          >
                            <label className="flex items-center gap-3 cursor-pointer flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCompetency(comp.id)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: comp.competency_categories?.color || '#3B82F6' }}
                                />
                                <span className="text-sm text-gray-900">{comp.name}</span>
                                <span className="text-xs text-gray-400">({comp.competency_categories?.name || 'Uncategorized'})</span>
                              </div>
                            </label>
                            
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Target:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map(level => (
                                    <button
                                      key={level}
                                      type="button"
                                      onClick={() => updateTargetLevel(comp.id, level)}
                                      className={`w-6 h-6 rounded-full text-xs font-medium transition-colors ${
                                        level <= (selectedComp?.default_target_level || 3)
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                      }`}
                                    >
                                      {level}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Selected Competencies Summary */}
                {formData.competencies.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Competencies Summary
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.competencies.map(fc => {
                        const comp = competencies.find(c => c.id === fc.competency_id);
                        return (
                          <span
                            key={fc.competency_id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: comp?.competency_categories?.color || '#3B82F6' }}
                            />
                            {comp?.name || 'Unknown'}
                            <span className="text-blue-600 font-medium">L{fc.default_target_level}</span>
                            <button
                              type="button"
                              onClick={() => toggleCompetency(fc.competency_id)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingProfile ? 'Update Profile' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && profileToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Profile?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{profileToDelete.name}</strong>? 
                This will not affect users who already have these competencies assigned.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProfileToDelete(null);
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

      {/* Assign to Users Modal */}
      {showAssignModal && profileToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Assign Profile to Users</h2>
                  <p className="text-sm text-gray-500">{profileToAssign.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setProfileToAssign(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {assignError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {assignError}
                </div>
              )}

              {/* Profile Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  This will assign <strong>{profileToAssign.profile_competencies?.length || 0} competencies</strong> to the selected users:
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {profileToAssign.profile_competencies?.map(pc => (
                    <span key={pc.competency_id} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {pc.competencies?.name} (L{pc.default_target_level})
                    </span>
                  ))}
                </div>
              </div>

              {/* Select Users */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Users to Assign *
                </label>
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {trainees.filter(t => t.role === 'trainee' || t.role === 'team_lead').length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No users available</p>
                  ) : (
                    trainees.filter(t => t.role === 'trainee' || t.role === 'team_lead').map(user => (
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
                    ))
                  )}
                </div>
                {assignFormData.user_ids.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{assignFormData.user_ids.length} user(s) selected</p>
                )}
              </div>

              {/* Coach Override */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coach (Optional)
                </label>
                <select
                  value={assignFormData.coach_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, coach_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Use profile owner ({profileToAssign.owner?.full_name || 'None'})</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Target Date */}
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
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setProfileToAssign(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignProfile}
                disabled={assigning || assignFormData.user_ids.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Assign Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
