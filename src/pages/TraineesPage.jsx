// src/pages/TraineesPage.jsx
// E&T Manager - Team Members (Trainees) Management Page
// Date: November 30, 2025

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
  Phone,
  Briefcase,
  Calendar,
  Target,
  User,
  MoreVertical,
  ChevronDown,
  Filter,
  RefreshCw,
  UserPlus,
  Hash
} from 'lucide-react';

export default function TraineesPage() {
  const { 
    user: currentUser, 
    profile: currentProfile, 
    clientId,
    clientName,
    isSuperAdmin,
    isClientAdmin
  } = useAuth();
  
  // State
  const [trainees, setTrainees] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTrainee, setEditingTrainee] = useState(null);
  const [traineeToDelete, setTraineeToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_number: '',
    job_title: '',
    department: '',
    client_id: '',
    hire_date: '',
    career_goal: '',
    notes: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Dropdown state for action menus
  const [openDropdown, setOpenDropdown] = useState(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [currentProfile, clientId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTrainees(), loadClients()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrainees = async () => {
    try {
      let query = supabase
        .from('trainees')
        .select(`
          *,
          clients:client_id (
            id,
            name,
            code
          )
        `)
        .order('last_name', { ascending: true });

      // If client admin, only show trainees from their client
      // Super admin sees all trainees
      if (!isSuperAdmin && clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrainees(data || []);
    } catch (error) {
      console.error('Error loading trainees:', error);
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

  // Get unique departments for filter
  const departments = [...new Set(trainees.map(t => t.department).filter(Boolean))].sort();

  // Filter trainees based on search and filters
  const filteredTrainees = trainees.filter(trainee => {
    const fullName = `${trainee.first_name || ''} ${trainee.last_name || ''}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) ||
      trainee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = clientFilter === 'all' || trainee.client_id === clientFilter;
    const matchesDepartment = departmentFilter === 'all' || trainee.department === departmentFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && trainee.is_active !== false) ||
      (statusFilter === 'inactive' && trainee.is_active === false);

    return matchesSearch && matchesClient && matchesDepartment && matchesStatus;
  });

  // Open modal for creating new trainee
  const handleCreateTrainee = () => {
    setEditingTrainee(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      employee_number: '',
      job_title: '',
      department: '',
      client_id: isSuperAdmin ? '' : clientId,
      hire_date: '',
      career_goal: '',
      notes: '',
      is_active: true
    });
    setFormError('');
    setFormSuccess('');
    setShowModal(true);
  };

  // Open modal for editing trainee
  const handleEditTrainee = (trainee) => {
    setEditingTrainee(trainee);
    setFormData({
      first_name: trainee.first_name || '',
      last_name: trainee.last_name || '',
      email: trainee.email || '',
      employee_number: trainee.employee_number || '',
      job_title: trainee.job_title || '',
      department: trainee.department || '',
      client_id: trainee.client_id || '',
      hire_date: trainee.hire_date || '',
      career_goal: trainee.career_goal || '',
      notes: trainee.notes || '',
      is_active: trainee.is_active !== false
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
      if (!formData.first_name || !formData.last_name) {
        throw new Error('First name and last name are required');
      }

      if (!formData.client_id) {
        throw new Error('Organization is required');
      }

      if (formData.email && !formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      const traineeData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        employee_number: formData.employee_number.trim() || null,
        job_title: formData.job_title.trim() || null,
        department: formData.department.trim() || null,
        client_id: formData.client_id,
        hire_date: formData.hire_date || null,
        career_goal: formData.career_goal.trim() || null,
        notes: formData.notes.trim() || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingTrainee) {
        // Update existing trainee
        const { error } = await supabase
          .from('trainees')
          .update(traineeData)
          .eq('id', editingTrainee.id);

        if (error) throw error;
        
        setFormSuccess('Team member updated successfully');
      } else {
        // Create new trainee
        const { error } = await supabase
          .from('trainees')
          .insert({
            ...traineeData,
            created_at: new Date().toISOString()
          });

        if (error) throw error;
        
        setFormSuccess('Team member created successfully');
      }

      // Reload data and close modal after brief delay
      await loadTrainees();
      setTimeout(() => {
        setShowModal(false);
      }, 1000);

    } catch (error) {
      console.error('Error saving trainee:', error);
      setFormError(error.message || 'Failed to save team member');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete click
  const handleDeleteClick = (trainee) => {
    setTraineeToDelete(trainee);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!traineeToDelete) return;

    try {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from('trainees')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', traineeToDelete.id);

      if (error) throw error;

      await loadTrainees();
      setShowDeleteModal(false);
      setTraineeToDelete(null);
    } catch (error) {
      console.error('Error deleting trainee:', error);
    }
  };

  // Get initials for avatar
  const getInitials = (trainee) => {
    const first = trainee.first_name?.[0] || '';
    const last = trainee.last_name?.[0] || '';
    return (first + last).toUpperCase() || '?';
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
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-500 mt-1">
              {isSuperAdmin 
                ? 'Manage team members across all organizations'
                : `Manage ${clientName || 'your'} team`
              }
            </p>
          </div>
          <button
            onClick={handleCreateTrainee}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <UserPlus className="w-5 h-5" />
            Add Team Member
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{trainees.length}</p>
                <p className="text-sm text-gray-500">Total Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {trainees.filter(t => t.is_active !== false).length}
                </p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
                <p className="text-sm text-gray-500">Departments</p>
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
            
            {/* Client Filter - Only for Super Admin */}
            {isSuperAdmin && (
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

            {/* Department Filter */}
            {departments.length > 0 && (
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[160px]"
                >
                  <option value="all">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
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

        {/* Team Members List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredTrainees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No team members found</h3>
              <p className="text-gray-500">
                {searchTerm || clientFilter !== 'all' || departmentFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first team member to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Team Member
                    </th>
                    {isSuperAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role / Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
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
                  {filteredTrainees.map((trainee) => (
                    <tr key={trainee.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {getInitials(trainee)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {trainee.first_name} {trainee.last_name}
                            </div>
                            {trainee.employee_number && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {trainee.employee_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="px-6 py-4">
                          {trainee.clients ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                              <Building2 className="w-3.5 h-3.5" />
                              {trainee.clients.name}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-gray-900">{trainee.job_title || '—'}</div>
                          {trainee.department && (
                            <div className="text-sm text-gray-500">{trainee.department}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {trainee.email ? (
                          <a 
                            href={`mailto:${trainee.email}`}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            {trainee.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {trainee.is_active !== false ? (
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
                              setOpenDropdown(openDropdown === trainee.id ? null : trainee.id);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          
                          {openDropdown === trainee.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                              <button
                                onClick={() => handleEditTrainee(trainee)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Details
                              </button>
                              <button
                                onClick={() => handleDeleteClick(trainee)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                {trainee.is_active !== false ? 'Deactivate' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Count */}
        {filteredTrainees.length > 0 && (
          <div className="text-sm text-gray-500 text-center">
            Showing {filteredTrainees.length} of {trainees.length} team members
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  {editingTrainee ? <Edit2 className="w-5 h-5 text-blue-600" /> : <UserPlus className="w-5 h-5 text-blue-600" />}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingTrainee ? 'Edit Team Member' : 'Add Team Member'}
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
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="First name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Last name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              {/* Employee Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Employee Number
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

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Organization *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    disabled={!isSuperAdmin}
                    className={`w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${!isSuperAdmin ? 'bg-gray-50' : ''}`}
                    required
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

              {/* Job Title and Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Job Title
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Process Operator"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Production"
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

              {/* Career Goal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Career Goal
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.career_goal}
                    onChange={(e) => setFormData({ ...formData, career_goal: e.target.value })}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g., Become a shift supervisor within 2 years"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Active Status - Only for editing */}
              {editingTrainee && (
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
                      {editingTrainee ? 'Update' : 'Add'} Team Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && traineeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                {traineeToDelete.is_active !== false ? 'Deactivate' : 'Delete'} Team Member?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to {traineeToDelete.is_active !== false ? 'deactivate' : 'delete'}{' '}
                <strong>{traineeToDelete.first_name} {traineeToDelete.last_name}</strong>?
                {traineeToDelete.is_active !== false && ' They will no longer appear in active lists.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTraineeToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  {traineeToDelete.is_active !== false ? 'Deactivate' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
