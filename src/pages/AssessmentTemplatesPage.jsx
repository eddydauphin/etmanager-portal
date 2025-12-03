import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  ClipboardList,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Archive,
  Eye,
  FileText,
  Building2,
  Target,
  MoreVertical,
  GripVertical
} from 'lucide-react';

export default function AssessmentTemplatesPage() {
  const { profile: currentProfile } = useAuth();
  
  // State
  const [templates, setTemplates] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    competency_id: '',
    technology_area: '',
    status: 'draft',
    criteria: []
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Expanded criteria levels
  const [expandedLevels, setExpandedLevels] = useState([1, 2, 3, 4, 5]);

  // Technology areas
  const technologyAreas = [
    'Spray Drying',
    'Evaporation',
    'Pasteurization',
    'Homogenization',
    'Filtration',
    'CIP/Cleaning',
    'Packaging',
    'Quality Control',
    'HACCP',
    'GMP',
    'Leadership',
    'Safety',
    'Other'
  ];

  // Evidence types
  const evidenceTypes = [
    { value: 'observation', label: 'Observation' },
    { value: 'document', label: 'Document Review' },
    { value: 'test', label: 'Written Test' },
    { value: 'demonstration', label: 'Practical Demonstration' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'interview', label: 'Interview' }
  ];

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
      await Promise.all([loadTemplates(), loadCompetencies(), loadClients()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await dbFetch('assessment_templates?select=*,clients(name),competencies(name),template_criteria(*)&order=created_at.desc');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
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

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.technology_area?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    const matchesClient = clientFilter === 'all' || template.client_id === clientFilter;
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Handle create/edit template
  const handleOpenModal = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name || '',
        description: template.description || '',
        client_id: template.client_id || '',
        competency_id: template.competency_id || '',
        technology_area: template.technology_area || '',
        status: template.status || 'draft',
        criteria: template.template_criteria?.map(tc => ({
          id: tc.id,
          level: tc.level,
          criterion_text: tc.criterion_text,
          description: tc.description || '',
          evidence_type: tc.evidence_type || 'observation',
          is_mandatory: tc.is_mandatory ?? true
        })) || []
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        client_id: currentProfile?.role === 'client_admin' ? currentProfile.client_id : '',
        competency_id: '',
        technology_area: '',
        status: 'draft',
        criteria: []
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!formData.name) {
        throw new Error('Template name is required');
      }
      if (!formData.client_id) {
        throw new Error('Client is required');
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        client_id: formData.client_id,
        competency_id: formData.competency_id || null,
        technology_area: formData.technology_area || null,
        status: formData.status,
        created_by: currentProfile?.id
      };

      let templateId;

      if (editingTemplate) {
        await dbFetch(`assessment_templates?id=eq.${editingTemplate.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
        templateId = editingTemplate.id;

        // Delete existing criteria
        await dbFetch(`template_criteria?template_id=eq.${editingTemplate.id}`, {
          method: 'DELETE'
        });
      } else {
        const result = await dbFetch('assessment_templates?select=id', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        templateId = result[0]?.id;
      }

      // Insert criteria
      if (templateId && formData.criteria.length > 0) {
        const criteriaToInsert = formData.criteria.map((c, index) => ({
          template_id: templateId,
          level: c.level,
          criterion_text: c.criterion_text,
          description: c.description || null,
          evidence_type: c.evidence_type || 'observation',
          is_mandatory: c.is_mandatory ?? true,
          sort_order: index
        }));
        await dbFetch('template_criteria', {
          method: 'POST',
          body: JSON.stringify(criteriaToInsert)
        });
      }

      await loadTemplates();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving template:', error);
      setFormError(error.message || 'Failed to save template');
    } finally {
      setSubmitting(false);
    }
  };

  // Add criterion
  const addCriterion = (level) => {
    setFormData({
      ...formData,
      criteria: [...formData.criteria, {
        level,
        criterion_text: '',
        description: '',
        evidence_type: 'observation',
        is_mandatory: true
      }]
    });
  };

  // Update criterion
  const updateCriterion = (index, field, value) => {
    const updated = [...formData.criteria];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, criteria: updated });
  };

  // Remove criterion
  const removeCriterion = (index) => {
    setFormData({
      ...formData,
      criteria: formData.criteria.filter((_, i) => i !== index)
    });
  };

  // Handle delete
  const handleDeleteClick = (template) => {
    setTemplateToDelete(template);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await dbFetch(`assessment_templates?id=eq.${templateToDelete.id}`, {
        method: 'DELETE'
      });
      await loadTemplates();
      setShowDeleteModal(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (template) => {
    setOpenDropdown(null);
    handleOpenModal({
      ...template,
      name: `${template.name} (Copy)`,
      id: null,
      status: 'draft'
    });
  };

  // Handle preview
  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
    setOpenDropdown(null);
  };

  // Handle status change
  const handleStatusChange = async (template, newStatus) => {
    try {
      await dbFetch(`assessment_templates?id=eq.${template.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await loadTemplates();
    } catch (error) {
      console.error('Error updating status:', error);
    }
    setOpenDropdown(null);
  };

  // Get criteria count by level
  const getCriteriaByLevel = (criteria, level) => {
    return criteria?.filter(c => c.level === level) || [];
  };

  // Stats
  const stats = {
    total: templates.length,
    active: templates.filter(t => t.status === 'active').length,
    draft: templates.filter(t => t.status === 'draft').length,
    archived: templates.filter(t => t.status === 'archived').length
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
          <h1 className="text-2xl font-bold text-gray-900">Assessment Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage assessment forms for competency evaluation</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Templates</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Active</p>
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
            <div className="p-2 bg-gray-100 rounded-lg">
              <Archive className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.archived}</p>
              <p className="text-sm text-gray-500">Archived</p>
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
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
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

      {/* Templates List */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
          <p className="text-gray-500 mb-4">Create assessment templates to evaluate competencies.</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      template.status === 'active' ? 'bg-green-100 text-green-700' :
                      template.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {template.status}
                    </span>
                  </div>
                  
                  {template.description && (
                    <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {template.clients?.name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {template.clients.name}
                      </span>
                    )}
                    {template.competencies?.name && (
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {template.competencies.name}
                      </span>
                    )}
                    {template.technology_area && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {template.technology_area}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClipboardList className="w-4 h-4" />
                      {template.template_criteria?.length || 0} criteria
                    </span>
                  </div>

                  {/* Criteria summary by level */}
                  {template.template_criteria?.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {[1, 2, 3, 4, 5].map(level => {
                        const count = getCriteriaByLevel(template.template_criteria, level).length;
                        return count > 0 ? (
                          <span
                            key={level}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              level === 1 ? 'bg-red-100 text-red-700' :
                              level === 2 ? 'bg-orange-100 text-orange-700' :
                              level === 3 ? 'bg-yellow-100 text-yellow-700' :
                              level === 4 ? 'bg-lime-100 text-lime-700' :
                              'bg-green-100 text-green-700'
                            }`}
                          >
                            L{level}: {count}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div className="relative ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown(openDropdown === template.id ? null : template.id);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                  {openDropdown === template.id && (
                    <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handlePreview(template)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          handleOpenModal(template);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      {template.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange(template, 'active')}
                          className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Set Active
                        </button>
                      )}
                      {template.status !== 'archived' && (
                        <button
                          onClick={() => handleStatusChange(template, 'archived')}
                          className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteClick(template)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
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
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Spray Drying Operator Assessment"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Technology Area
                    </label>
                    <select
                      value={formData.technology_area}
                      onChange={(e) => setFormData({ ...formData, technology_area: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Area</option>
                      {technologyAreas.map(area => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to Competency
                    </label>
                    <select
                      value={formData.competency_id}
                      onChange={(e) => setFormData({ ...formData, competency_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">No Link (Standalone)</option>
                      {competencies.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
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
                      placeholder="Brief description of this assessment template..."
                    />
                  </div>
                </div>

                {/* Criteria Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Assessment Criteria</h3>
                    <span className="text-sm text-gray-500">{formData.criteria.length} criteria</span>
                  </div>

                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(level => {
                      const levelCriteria = formData.criteria.filter(c => c.level === level);
                      const isExpanded = expandedLevels.includes(level);
                      
                      return (
                        <div key={level} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedLevels(isExpanded 
                                ? expandedLevels.filter(l => l !== level)
                                : [...expandedLevels, level]
                              );
                            }}
                            className={`w-full flex items-center justify-between p-3 ${
                              level === 1 ? 'bg-red-50' :
                              level === 2 ? 'bg-orange-50' :
                              level === 3 ? 'bg-yellow-50' :
                              level === 4 ? 'bg-lime-50' :
                              'bg-green-50'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                level === 1 ? 'bg-red-500' :
                                level === 2 ? 'bg-orange-500' :
                                level === 3 ? 'bg-yellow-500' :
                                level === 4 ? 'bg-lime-500' :
                                'bg-green-500'
                              }`}>
                                {level}
                              </span>
                              <span className="font-medium text-gray-900">
                                Level {level} - {
                                  level === 1 ? 'Awareness' :
                                  level === 2 ? 'Knowledge' :
                                  level === 3 ? 'Practitioner' :
                                  level === 4 ? 'Proficient' :
                                  'Expert'
                                }
                              </span>
                              <span className="text-sm text-gray-500">({levelCriteria.length} criteria)</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addCriterion(level);
                                if (!isExpanded) {
                                  setExpandedLevels([...expandedLevels, level]);
                                }
                              }}
                              className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50"
                            >
                              + Add
                            </button>
                          </button>

                          {isExpanded && (
                            <div className="p-3 space-y-3 bg-white">
                              {levelCriteria.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-2">No criteria for this level</p>
                              ) : (
                                formData.criteria.map((criterion, index) => {
                                  if (criterion.level !== level) return null;
                                  return (
                                    <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="text"
                                          value={criterion.criterion_text}
                                          onChange={(e) => updateCriterion(index, 'criterion_text', e.target.value)}
                                          placeholder="Criterion (e.g., Can explain the spray drying process)"
                                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex gap-2">
                                          <select
                                            value={criterion.evidence_type}
                                            onChange={(e) => updateCriterion(index, 'evidence_type', e.target.value)}
                                            className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-2 focus:ring-blue-500"
                                          >
                                            {evidenceTypes.map(et => (
                                              <option key={et.value} value={et.value}>{et.label}</option>
                                            ))}
                                          </select>
                                          <label className="flex items-center gap-1 text-xs text-gray-600">
                                            <input
                                              type="checkbox"
                                              checked={criterion.is_mandatory}
                                              onChange={(e) => updateCriterion(index, 'is_mandatory', e.target.checked)}
                                              className="w-3 h-3 rounded"
                                            />
                                            Mandatory
                                          </label>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => removeCriterion(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
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
                  {submitting ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{previewTemplate.name}</h2>
                <p className="text-sm text-gray-500">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(level => {
                  const levelCriteria = getCriteriaByLevel(previewTemplate.template_criteria, level);
                  if (levelCriteria.length === 0) return null;

                  return (
                    <div key={level} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className={`p-3 flex items-center gap-2 ${
                        level === 1 ? 'bg-red-50' :
                        level === 2 ? 'bg-orange-50' :
                        level === 3 ? 'bg-yellow-50' :
                        level === 4 ? 'bg-lime-50' :
                        'bg-green-50'
                      }`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          level === 1 ? 'bg-red-500' :
                          level === 2 ? 'bg-orange-500' :
                          level === 3 ? 'bg-yellow-500' :
                          level === 4 ? 'bg-lime-500' :
                          'bg-green-500'
                        }`}>
                          {level}
                        </span>
                        <span className="font-medium text-gray-900">
                          Level {level} - {
                            level === 1 ? 'Awareness' :
                            level === 2 ? 'Knowledge' :
                            level === 3 ? 'Practitioner' :
                            level === 4 ? 'Proficient' :
                            'Expert'
                          }
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        {levelCriteria.map((criterion, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                            <div className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900">{criterion.criterion_text}</p>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {evidenceTypes.find(e => e.value === criterion.evidence_type)?.label || criterion.evidence_type}
                                </span>
                                {criterion.is_mandatory && (
                                  <span className="text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Required</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && templateToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Template?
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <strong>{templateToDelete.name}</strong>? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setTemplateToDelete(null);
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
    </div>
  );
}
