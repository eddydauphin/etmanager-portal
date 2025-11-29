import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Building2,
  Mail,
  Shield,
  ShieldCheck,
  UserCheck,
  Key,
  MoreVertical,
  ChevronDown,
  Filter,
  RefreshCw
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser, profile: currentProfile } = useAuth();
  
  // State
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'trainee',
    client_id: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Dropdown state for action menus
  const [openDropdown, setOpenDropdown] = useState(null);

  // Load users and clients on mount
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
      await Promise.all([loadUsers(), loadClients()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      // If client admin, only show users from their client
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        query = query.eq('client_id', currentProfile.client_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesClient = clientFilter === 'all' || user.client_id === clientFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active !== false) ||
      (statusFilter === 'inactive' && user.is_active === false);

    return matchesSearch && matchesRole && matchesClient && matchesStatus;
  });

  // Open modal for creating new user
  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      role: currentProfile?.role === 'client_admin' ? 'trainee' : 'trainee',
      client_id: currentProfile?.role === 'client_admin' ? currentProfile.client_id : '',
      is_active: true
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  // Open modal for editing user
  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role || 'trainee',
      client_id: user.client_id || '',
      is_active: user.is_active !== false
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
    setOpenDropdown(null);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      // Validation
      if (!formData.email || !formData.full_name) {
        throw new Error('Email and full name are required');
      }

      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      // Role validation for non-super-admin users
      if (formData.role !== 'super_admin' && !formData.client_id) {
        throw new Error('Client assignment is required for Client Admins and Trainees');
      }

      if (editingUser) {
        // Update existing user profile
        const updateData = {
          full_name: formData.full_name,
          role: formData.role,
          client_id: formData.role === 'super_admin' ? null : formData.client_id,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        setFormSuccess('User updated successfully!');
      } else {
        // Create new user via Supabase Auth
        // Note: In production, you'd use an Edge Function or server-side API
        // to create users with admin privileges. For now, we'll use signUp
        // and then update the profile.
        
        // Generate a temporary password
        const tempPassword = generateTempPassword();
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: tempPassword,
          options: {
            data: {
              full_name: formData.full_name
            }
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            throw new Error('A user with this email already exists');
          }
          throw authError;
        }

        if (authData.user) {
          // Update the profile with role and client
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name,
              role: formData.role,
              client_id: formData.role === 'super_admin' ? null : formData.client_id,
              must_change_password: true,
              is_active: true
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }

        setFormSuccess(`User created! Temporary password: ${tempPassword}`);
      }

      // Reload users after a short delay to show success message
      setTimeout(() => {
        loadUsers();
        if (editingUser) {
          setShowModal(false);
        }
      }, editingUser ? 1000 : 3000);

    } catch (error) {
      console.error('Error saving user:', error);
      setFormError(error.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate temporary password
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const special = '!@#$%&*';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    password += special.charAt(Math.floor(Math.random() * special.length));
    return password;
  };

  // Handle delete
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userToDelete.id);

      if (error) throw error;

      loadUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deactivating user:', error);
      alert('Failed to deactivate user');
    }
  };

  // Handle password reset
  const handleResetPasswordClick = (user) => {
    setUserToResetPassword(user);
    setShowResetPasswordModal(true);
    setOpenDropdown(null);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return;

    try {
      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(
        userToResetPassword.email,
        { redirectTo: `${window.location.origin}/change-password` }
      );

      if (error) throw error;

      // Mark user as must change password
      await supabase
        .from('profiles')
        .update({ must_change_password: true })
        .eq('id', userToResetPassword.id);

      alert(`Password reset email sent to ${userToResetPassword.email}`);
      setShowResetPasswordModal(false);
      setUserToResetPassword(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to send password reset email');
    }
  };

  // Toggle user active status
  const handleToggleActive = async (user) => {
    try {
      const newStatus = user.is_active === false ? true : false;
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
    setOpenDropdown(null);
  };

  // Get role badge styling
  const getRoleBadge = (role) => {
    const styles = {
      super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
      client_admin: 'bg-blue-100 text-blue-800 border-blue-200',
      trainee: 'bg-green-100 text-green-800 border-green-200'
    };
    const labels = {
      super_admin: 'Super Admin',
      client_admin: 'Client Admin',
      trainee: 'Trainee'
    };
    const icons = {
      super_admin: ShieldCheck,
      client_admin: Shield,
      trainee: UserCheck
    };
    const Icon = icons[role] || UserCheck;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[role] || styles.trainee}`}>
        <Icon className="w-3.5 h-3.5" />
        {labels[role] || role}
      </span>
    );
  };

  // Get status badge
  const getStatusBadge = (isActive) => {
    if (isActive !== false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Inactive
      </span>
    );
  };

  // Check if current user can edit this user
  const canEditUser = (user) => {
    if (currentProfile?.role === 'super_admin') return true;
    if (currentProfile?.role === 'client_admin') {
      // Client admins can edit trainees in their org, but not other admins
      return user.role === 'trainee' && user.client_id === currentProfile.client_id;
    }
    return false;
  };

  // Check if current user can manage roles
  const canManageRoles = () => {
    return currentProfile?.role === 'super_admin';
  };

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {currentProfile?.role === 'super_admin' 
                ? 'Manage all users across the platform'
                : 'Manage users in your organization'}
            </p>
          </div>
          <button
            onClick={handleCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Role Filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                >
                  <option value="all">All Roles</option>
                  {currentProfile?.role === 'super_admin' && (
                    <option value="super_admin">Super Admin</option>
                  )}
                  <option value="client_admin">Client Admin</option>
                  <option value="trainee">Trainee</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Client Filter - Only for Super Admin */}
              {currentProfile?.role === 'super_admin' && (
                <div className="relative">
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="appearance-none pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                  >
                    <option value="all">All Clients</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-3 pr-10 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm font-medium text-gray-700"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-500">Loading users...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || roleFilter !== 'all' || clientFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first user'}
              </p>
              {!searchTerm && roleFilter === 'all' && clientFilter === 'all' && statusFilter === 'all' && (
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add User
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    {currentProfile?.role === 'super_admin' && (
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                    )}
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-gray-50 transition-colors ${user.is_active === false ? 'opacity-60' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.full_name || 'No name'}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-600 font-normal">(You)</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      {currentProfile?.role === 'super_admin' && (
                        <td className="px-6 py-4">
                          {user.clients ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{user.clients.name}</span>
                              <span className="text-xs text-gray-400">({user.clients.code})</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              {user.role === 'super_admin' ? 'All Access' : 'Not assigned'}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {getStatusBadge(user.is_active)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canEditUser(user) && user.id !== currentUser?.id ? (
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === user.id ? null : user.id);
                              }}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-500" />
                            </button>
                            
                            {openDropdown === user.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Edit User
                                </button>
                                <button
                                  onClick={() => handleResetPasswordClick(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Key className="w-4 h-4" />
                                  Reset Password
                                </button>
                                <button
                                  onClick={() => handleToggleActive(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  {user.is_active !== false ? (
                                    <>
                                      <X className="w-4 h-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Activate
                                    </>
                                  )}
                                </button>
                                <hr className="my-1 border-gray-200" />
                                <button
                                  onClick={() => handleDeleteClick(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete User
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer with Count */}
          {!loading && filteredUsers.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} users
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error/Success Messages */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Success!</div>
                    <div className="text-xs mt-0.5">{formSuccess}</div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={editingUser}
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingUser ? 'bg-gray-50 text-gray-500' : ''}`}
                    placeholder="user@company.com"
                  />
                </div>
                {editingUser && (
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                )}
              </div>

              {/* Full Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Smith"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Role *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {canManageRoles() && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'super_admin' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="super_admin"
                        checked={formData.role === 'super_admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, client_id: '' })}
                        className="sr-only"
                      />
                      <ShieldCheck className={`w-5 h-5 ${formData.role === 'super_admin' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Super Admin</div>
                        <div className="text-xs text-gray-500">Full system access, all clients</div>
                      </div>
                    </label>
                  )}
                  
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'client_admin' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="client_admin"
                      checked={formData.role === 'client_admin'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="sr-only"
                      disabled={currentProfile?.role === 'client_admin'}
                    />
                    <Shield className={`w-5 h-5 ${formData.role === 'client_admin' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">Client Admin</div>
                      <div className="text-xs text-gray-500">Manage their organization</div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'trainee' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="trainee"
                      checked={formData.role === 'trainee'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="sr-only"
                    />
                    <UserCheck className={`w-5 h-5 ${formData.role === 'trainee' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">Trainee</div>
                      <div className="text-xs text-gray-500">View own progress & training</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Client Selection - Only shown if not Super Admin role */}
              {formData.role !== 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Organization *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                      disabled={currentProfile?.role === 'client_admin'}
                      className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${currentProfile?.role === 'client_admin' ? 'bg-gray-50' : ''}`}
                    >
                      <option value="">Select organization...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.code})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Active Status - Only for editing */}
              {editingUser && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {editingUser ? 'Update User' : 'Create User'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete User?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{userToDelete.full_name || userToDelete.email}</strong>? 
                This will deactivate their account.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
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

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordModal && userToResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mx-auto mb-4">
                <Key className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Reset Password?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Send a password reset email to <strong>{userToResetPassword.email}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setUserToResetPassword(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPasswordConfirm}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium"
                >
                  Send Reset Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
