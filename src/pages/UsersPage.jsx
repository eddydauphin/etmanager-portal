import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { dbFetch } from '../lib/db';
import { getDefaultCapabilities, getAvailableCapabilitiesForRole } from '../components/shared/Layout';
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
  RefreshCw,
  Copy,
  CheckCircle2,
  Hash,
  Briefcase,
  Calendar,
  Settings2,
  ToggleLeft,
  ToggleRight,
  Info
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
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToResetPassword, setUserToResetPassword] = useState(null);
  
  // New user credentials (shown after creation)
  const [newUserCredentials, setNewUserCredentials] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  
  // Form state - now includes employee fields and capabilities
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'trainee',
    client_id: '',
    reports_to_id: '',
    employee_number: '',
    department: '',
    line: '',
    hire_date: '',
    site: '',
    has_global_access: false,
    is_active: true,
    capabilities: {}
  });
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Team leads for "Reports To" dropdown
  const [teamLeads, setTeamLeads] = useState([]);
  
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
      await Promise.all([loadUsers(), loadClients(), loadTeamLeads()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=*&order=created_at.desc';
      
      // If client admin, only show users from their client
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      
      // If team lead, only show trainees that report to them
      if (currentProfile?.role === 'team_lead') {
        url += `&or=(id.eq.${currentProfile.id},reports_to_id.eq.${currentProfile.id})`;
      }

      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadClients = async () => {
    try {
      const data = await dbFetch('clients?select=id,name,code&is_active=eq.true&order=name.asc');
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadTeamLeads = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,client_id&role=eq.team_lead&is_active=eq.true&order=full_name.asc';
      
      // If client admin, only show team leads from their client
      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }
      
      const data = await dbFetch(url);
      setTeamLeads(data || []);
    } catch (error) {
      console.error('Error loading team leads:', error);
    }
  };

  // Get unique departments for filter
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))].sort();

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    
    // Team leads can only create trainees that report to them
    const defaultReportsTo = currentProfile?.role === 'team_lead' ? currentProfile.id : '';
    const defaultRole = (currentProfile?.role === 'client_admin' || currentProfile?.role === 'site_admin' || currentProfile?.role === 'team_lead') ? 'trainee' : 'trainee';
    
    setFormData({
      email: '',
      full_name: '',
      role: defaultRole,
      client_id: (currentProfile?.role === 'client_admin' || currentProfile?.role === 'site_admin' || currentProfile?.role === 'team_lead') ? currentProfile.client_id : '',
      reports_to_id: defaultReportsTo,
      employee_number: '',
      department: '',
      line: '',
      hire_date: '',
      site: '',
      has_global_access: false,
      is_active: true,
      capabilities: getDefaultCapabilities(defaultRole)
    });
    setShowCapabilities(false);
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
      reports_to_id: user.reports_to_id || '',
      employee_number: user.employee_number || '',
      department: user.department || '',
      line: user.line || '',
      hire_date: user.hire_date || '',
      site: user.site || '',
      has_global_access: user.has_global_access || false,
      is_active: user.is_active !== false,
      capabilities: user.capabilities || getDefaultCapabilities(user.role || 'trainee')
    });
    setShowCapabilities(false);
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
    setOpenDropdown(null);
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

  // Log credentials to email_log table for reference
  const logCredentials = async (email, password, fullName, createdBy) => {
    try {
      await dbFetch('email_log', {
        method: 'POST',
        body: JSON.stringify({
          recipient_email: email,
          subject: 'New User Account Created',
          body: `Account created for ${fullName}\nEmail: ${email}\nTemporary Password: ${password}\nUser must change password on first login.`,
          status: 'logged',
          sent_at: new Date().toISOString(),
          created_by: createdBy
        })
      });
    } catch (error) {
      console.error('Error logging credentials:', error);
    }
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
          reports_to_id: formData.role === 'trainee' ? (formData.reports_to_id || null) : null,
          employee_number: formData.employee_number || null,
          department: formData.department || null,
          line: formData.line || null,
          hire_date: formData.hire_date || null,
          site: formData.site || null,
          has_global_access: formData.role === 'site_admin' ? formData.has_global_access : false,
          is_active: formData.is_active,
          capabilities: formData.capabilities || getDefaultCapabilities(formData.role),
          updated_at: new Date().toISOString()
        };

        await dbFetch(`profiles?id=eq.${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify(updateData)
        });

        setFormSuccess('User updated successfully!');
        
        // Reload and close modal after delay
        setTimeout(() => {
          loadUsers();
          setShowModal(false);
        }, 1000);
        
      } else {
        // Create new user via Supabase Auth
        // Note: signUp auto-logs in the new user, so we need to restore the admin session after
        const tempPassword = generateTempPassword();
        
        // Store current session before creating user
        const { data: currentSession } = await supabase.auth.getSession();
        
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
          // Update the profile with all fields
          await dbFetch(`profiles?id=eq.${authData.user.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              full_name: formData.full_name,
              role: formData.role,
              client_id: formData.role === 'super_admin' ? null : formData.client_id,
              reports_to_id: formData.role === 'trainee' ? (formData.reports_to_id || null) : null,
              employee_number: formData.employee_number || null,
              department: formData.department || null,
              line: formData.line || null,
              hire_date: formData.hire_date || null,
              site: formData.site || null,
              has_global_access: formData.role === 'site_admin' ? formData.has_global_access : false,
              capabilities: formData.capabilities || getDefaultCapabilities(formData.role),
              must_change_password: true,
              is_active: true
            })
          });
          
          // Restore admin session - sign out and reload
          await supabase.auth.signOut();
          
          // Re-authenticate the admin
          if (currentSession?.session?.access_token) {
            await supabase.auth.setSession({
              access_token: currentSession.session.access_token,
              refresh_token: currentSession.session.refresh_token
            });
          } else {
            // Force page reload to restore session from storage
            window.location.reload();
            return;
          }
          
          // Log credentials for reference
          await logCredentials(
            formData.email, 
            tempPassword, 
            formData.full_name,
            currentUser?.id
          );
          
          // Store credentials and show credentials modal
          setNewUserCredentials({
            email: formData.email,
            password: tempPassword,
            fullName: formData.full_name
          });
          
          // Close form modal, open credentials modal
          setShowModal(false);
          setShowCredentialsModal(true);
          
          // Reload users
          loadUsers();
        }
      }

    } catch (error) {
      console.error('Error saving user:', error);
      setFormError(error.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle delete click
  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      await dbFetch(`profiles?id=eq.${userToDelete.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
      });

      await loadUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  // Handle reset password click
  const handleResetPasswordClick = (user) => {
    setUserToResetPassword(user);
    setShowResetPasswordModal(true);
    setOpenDropdown(null);
  };

  // Confirm reset password
  const handleResetPasswordConfirm = async () => {
    if (!userToResetPassword) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        userToResetPassword.email,
        { redirectTo: `${window.location.origin}/change-password` }
      );

      if (error) throw error;

      setShowResetPasswordModal(false);
      setUserToResetPassword(null);
      alert('Password reset email sent successfully!');
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to send reset email: ' + error.message);
    }
  };

  // Get role display info
  const getRoleInfo = (role) => {
    switch (role) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck };
      case 'client_admin':
        return { label: 'Client Admin', color: 'bg-blue-100 text-blue-700', icon: Shield };
      case 'category_admin':
        return { label: 'Category Admin', color: 'bg-indigo-100 text-indigo-700', icon: Briefcase };
      case 'site_admin':
        return { label: 'Site Admin', color: 'bg-cyan-100 text-cyan-700', icon: Building2 };
      case 'team_lead':
        return { label: 'Team Lead', color: 'bg-orange-100 text-orange-700', icon: Users };
      default:
        return { label: 'Trainee', color: 'bg-green-100 text-green-700', icon: UserCheck };
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-500 mt-1">Manage system users and their access</p>
          </div>
          <button
            onClick={handleCreateUser}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>
          {currentProfile?.role === 'super_admin' ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'super_admin').length}
                  </p>
                  <p className="text-sm text-gray-500">Super Admins</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.role === 'team_lead').length}
                  </p>
                  <p className="text-sm text-gray-500">Team Leads</p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'client_admin').length}
                </p>
                <p className="text-sm text-gray-500">Client Admins</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'trainee').length}
                </p>
                <p className="text-sm text-gray-500">Trainees</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or employee #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Role Filter */}
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[150px]"
              >
                <option value="all">All Roles</option>
                {currentProfile?.role === 'super_admin' && (
                  <option value="super_admin">Super Admin</option>
                )}
                <option value="client_admin">Client Admin</option>
                <option value="category_admin">Category Admin</option>
                <option value="site_admin">Site Admin</option>
                <option value="team_lead">Team Lead</option>
                <option value="trainee">Trainee</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Client Filter - Only for Super Admin */}
            {currentProfile?.role === 'super_admin' && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[180px]"
                >
                  <option value="all">All Organizations</option>
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
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[140px]"
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
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
              <p className="text-gray-500">
                {searchTerm || roleFilter !== 'all' || clientFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first user to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Department / Line
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const roleInfo = getRoleInfo(user.role);
                    const RoleIcon = roleInfo.icon;
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                              {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{user.full_name || 'No name'}</div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                              {user.employee_number && (
                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {user.employee_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${roleInfo.color}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.client_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                              <Building2 className="w-3.5 h-3.5" />
                              {clients.find(c => c.id === user.client_id)?.name || 'Unknown'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.department || user.line ? (
                            <div>
                              {user.department && <div className="text-gray-900">{user.department}</div>}
                              {user.line && <div className="text-sm text-gray-500">{user.line}</div>}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.is_active !== false ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-green-100 text-green-700">
                              <Check className="w-3.5 h-3.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
                              <X className="w-3.5 h-3.5" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdown(openDropdown === user.id ? null : user.id);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-5 h-5" />
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
                                {user.id !== currentUser?.id && (
                                  <button
                                    onClick={() => handleDeleteClick(user)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Deactivate
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredUsers.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {editingUser ? <Edit2 className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error Message */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Success Message */}
              {formSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  {formSuccess}
                </div>
              )}

              {/* Email */}
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
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${editingUser ? 'bg-gray-50' : ''}`}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                {editingUser && (
                  <p className="mt-1 text-xs text-gray-500">Email cannot be changed after creation</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <div className="space-y-2">
                  {/* Super Admin - Only visible to Super Admins */}
                  {currentProfile?.role === 'super_admin' && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'super_admin' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="super_admin"
                        checked={formData.role === 'super_admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, client_id: '', reports_to_id: '', capabilities: getDefaultCapabilities(e.target.value) })}
                        className="sr-only"
                      />
                      <ShieldCheck className={`w-5 h-5 ${formData.role === 'super_admin' ? 'text-purple-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Super Admin</div>
                        <div className="text-xs text-gray-500">Full system access, all clients</div>
                      </div>
                    </label>
                  )}
                  
                  {/* Client Admin - visible to Super Admin and Client Admin */}
                  {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin') && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'client_admin' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="client_admin"
                        checked={formData.role === 'client_admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, reports_to_id: '', has_global_access: false, capabilities: getDefaultCapabilities(e.target.value) })}
                        className="sr-only"
                      />
                      <Shield className={`w-5 h-5 ${formData.role === 'client_admin' ? 'text-blue-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Client Admin</div>
                        <div className="text-xs text-gray-500">Manage entire organization</div>
                      </div>
                    </label>
                  )}

                  {/* Category Admin - visible to Super Admin and Client Admin */}
                  {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin') && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'category_admin' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="category_admin"
                        checked={formData.role === 'category_admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, reports_to_id: '', capabilities: getDefaultCapabilities(e.target.value) })}
                        className="sr-only"
                      />
                      <Briefcase className={`w-5 h-5 ${formData.role === 'category_admin' ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Category Admin</div>
                        <div className="text-xs text-gray-500">Manage category/division within organization</div>
                      </div>
                    </label>
                  )}

                  {/* Site Admin - visible to Super Admin, Client Admin, and Category Admin */}
                  {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin' || currentProfile?.role === 'category_admin') && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'site_admin' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="site_admin"
                        checked={formData.role === 'site_admin'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, reports_to_id: '', capabilities: getDefaultCapabilities(e.target.value) })}
                        className="sr-only"
                      />
                      <Building2 className={`w-5 h-5 ${formData.role === 'site_admin' ? 'text-cyan-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Site Admin</div>
                        <div className="text-xs text-gray-500">Manage site/location within organization</div>
                      </div>
                    </label>
                  )}

                  {/* Team Lead - visible to Super Admin, Client Admin, Site Admin, and Team Lead */}
                  {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin' || currentProfile?.role === 'site_admin' || currentProfile?.role === 'team_lead') && (
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'team_lead' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input
                        type="radio"
                        name="role"
                        value="team_lead"
                        checked={formData.role === 'team_lead'}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value, reports_to_id: '', capabilities: getDefaultCapabilities(e.target.value) })}
                        className="sr-only"
                      />
                      <Users className={`w-5 h-5 ${formData.role === 'team_lead' ? 'text-orange-600' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium text-gray-900">Team Lead</div>
                        <div className="text-xs text-gray-500">Manage assigned team members, assess & train</div>
                      </div>
                    </label>
                  )}

                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${formData.role === 'trainee' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="trainee"
                      checked={formData.role === 'trainee'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value, capabilities: getDefaultCapabilities(e.target.value) })}
                      className="sr-only"
                    />
                    <UserCheck className={`w-5 h-5 ${formData.role === 'trainee' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">Trainee</div>
                      <div className="text-xs text-gray-500">Access training & track progress</div>
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
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value, reports_to_id: '' })}
                      disabled={currentProfile?.role === 'client_admin' || currentProfile?.role === 'team_lead'}
                      className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${(currentProfile?.role === 'client_admin' || currentProfile?.role === 'team_lead') ? 'bg-gray-50' : ''}`}
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

              {/* Site Admin Specific Fields */}
              {formData.role === 'site_admin' && (
                <div className="space-y-4 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <h3 className="text-sm font-medium text-cyan-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Site Admin Settings
                  </h3>
                  
                  {/* Site/Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Site / Location
                    </label>
                    <input
                      type="text"
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="e.g., Factory A, Building 1, Paris Site"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The site or location this admin will manage
                    </p>
                  </div>
                  
                  {/* Global Access Toggle */}
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-cyan-200">
                    <div>
                      <p className="font-medium text-gray-900">Global Data Access</p>
                      <p className="text-xs text-gray-500">
                        Allow access to data across all sites within the organization
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.has_global_access}
                        onChange={(e) => setFormData({ ...formData, has_global_access: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Reports To - For trainees, optionally assign to a team lead */}
              {formData.role === 'trainee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reports To (Team Lead)
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.reports_to_id}
                      onChange={(e) => setFormData({ ...formData, reports_to_id: e.target.value })}
                      disabled={currentProfile?.role === 'team_lead'}
                      className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${currentProfile?.role === 'team_lead' ? 'bg-gray-50' : ''}`}
                    >
                      <option value="">No team lead (reports to Client Admin)</option>
                      {teamLeads
                        .filter(tl => !formData.client_id || tl.client_id === formData.client_id)
                        .map(lead => (
                          <option key={lead.id} value={lead.id}>
                            {lead.full_name} ({lead.email})
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign this trainee to a team lead who will manage their training and assessments
                  </p>
                </div>
              )}

              {/* Employee Fields - Only for Trainees */}
              {formData.role === 'trainee' && (
                <>
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Employee Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Employee Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Employee #
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.employee_number}
                            onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="EMP-001"
                          />
                        </div>
                      </div>

                      {/* Hire Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Hire Date
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={formData.hire_date}
                            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {/* Department */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Department
                        </label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Production"
                          />
                        </div>
                      </div>

                      {/* Line */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Line / Area
                        </label>
                        <input
                          type="text"
                          value={formData.line}
                          onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Line 1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Capabilities Section */}
              {(currentProfile?.role === 'super_admin' || currentProfile?.role === 'client_admin' || currentProfile?.role === 'site_admin') && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCapabilities(!showCapabilities)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-900">Capabilities & Permissions</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCapabilities ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showCapabilities && (
                    <div className="p-4 space-y-4">
                      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                          Enable or disable specific features for this user. These settings override role-based defaults.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {getAvailableCapabilitiesForRole(formData.role).map(cap => {
                          const isEnabled = formData.capabilities?.[cap.key] !== false && 
                            (formData.capabilities?.[cap.key] === true || getDefaultCapabilities(formData.role)[cap.key]);
                          const Icon = cap.icon;
                          
                          return (
                            <label
                              key={cap.key}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isEnabled 
                                  ? 'border-purple-300 bg-purple-50' 
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={(e) => {
                                  setFormData({
                                    ...formData,
                                    capabilities: {
                                      ...formData.capabilities,
                                      [cap.key]: e.target.checked
                                    }
                                  });
                                }}
                                className="sr-only"
                              />
                              <div className={`flex-shrink-0 ${isEnabled ? 'text-purple-600' : 'text-gray-400'}`}>
                                {isEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${isEnabled ? 'text-purple-600' : 'text-gray-400'}`} />
                                  <span className={`font-medium text-sm ${isEnabled ? 'text-purple-700' : 'text-gray-700'}`}>
                                    {cap.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{cap.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            capabilities: getDefaultCapabilities(formData.role) 
                          })}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Reset to defaults
                        </button>
                      </div>
                    </div>
                  )}
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

              {/* Info about password for new users */}
              {!editingUser && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Temporary Password</p>
                      <p className="mt-0.5">A secure temporary password will be generated. You'll be shown the credentials after creation.</p>
                    </div>
                  </div>
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
                      {editingUser ? 'Updating...' : 'Creating...'}
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

      {/* Credentials Modal */}
      {showCredentialsModal && newUserCredentials && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                User Created Successfully!
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Save these credentials - they won't be shown again.
              </p>

              <div className="space-y-3 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Name</div>
                  <div className="font-medium text-gray-900">{newUserCredentials.fullName}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-gray-900 break-all">{newUserCredentials.email}</code>
                    <button
                      onClick={() => copyToClipboard(newUserCredentials.email, 'email')}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      {copiedField === 'email' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-xs text-amber-700 mb-1 font-medium">Temporary Password</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-lg text-amber-900 font-semibold">{newUserCredentials.password}</code>
                    <button
                      onClick={() => copyToClipboard(newUserCredentials.password, 'password')}
                      className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors flex-shrink-0"
                    >
                      {copiedField === 'password' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard(`Email: ${newUserCredentials.email}\nPassword: ${newUserCredentials.password}`, 'both')}
                  className="w-full py-2.5 px-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 flex items-center justify-center gap-2"
                >
                  {copiedField === 'both' ? (
                    <><Check className="w-4 h-4 text-green-600" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Both</>
                  )}
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-6">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> The user will be required to change their password on first login.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCredentialsModal(false);
                  setNewUserCredentials(null);
                }}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Done
              </button>
            </div>
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
                Deactivate User?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to deactivate <strong>{userToDelete.full_name || userToDelete.email}</strong>? 
                They will no longer be able to log in.
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
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
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
