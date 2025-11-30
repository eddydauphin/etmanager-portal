import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { dbFetch } from '../lib/db';
import {
  Network,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  AlertCircle,
  Building2,
  Users,
  Target,
  Calendar,
  ChevronDown,
  RefreshCw,
  Crown,
  Star,
  Award,
  MoreVertical,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Eye
} from 'lucide-react';

export default function ExpertNetworkPage() {
  const { profile: currentProfile } = useAuth();
  
  // Data state
  const [networks, setNetworks] = useState([]);
  const [members, setMembers] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [clientFilter, setClientFilter] = useState('all');
  const [factoryFilter, setFactoryFilter] = useState('all');
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  
  // Modal state
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editingAction, setEditingAction] = useState(null);
  
  // Form state
  const [networkForm, setNetworkForm] = useState({
    name: '',
    description: '',
    client_id: '',
    factory: '',
    line: '',
    target_maturity: 3.5
  });
  
  const [memberForm, setMemberForm] = useState({
    user_id: '',
    role: 'fsme',
    specialty: '',
    reports_to_id: '',
    maturity_level: 1
  });
  
  const [actionForm, setActionForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    status: 'planned',
    priority: 'medium',
    due_date: ''
  });
  
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [currentProfile]);

  // Set client filter for client admins
  useEffect(() => {
    if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
      setClientFilter(currentProfile.client_id);
    }
  }, [currentProfile]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadNetworks(),
        loadClients(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNetworks = async () => {
    try {
      let url = 'expert_networks?select=*&is_active=eq.true&order=name.asc';

      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }

      const data = await dbFetch(url);
      setNetworks(data || []);

      // Load members for all networks
      if (data && data.length > 0) {
        const networkIds = data.map(n => n.id);
        await loadMembers(networkIds);
        await loadActionPlans(networkIds);
      }
    } catch (error) {
      console.error('Error loading networks:', error);
    }
  };

  const loadMembers = async (networkIds) => {
    try {
      // Load members for each network
      const allMembers = [];
      for (const networkId of networkIds) {
        const data = await dbFetch(`expert_network_members?select=*&network_id=eq.${networkId}`);
        if (data) {
          // Fetch user info for each member
          for (const member of data) {
            if (member.user_id) {
              const userData = await dbFetch(`profiles?select=id,full_name,email,department&id=eq.${member.user_id}`);
              member.user = userData?.[0] || null;
            }
          }
          allMembers.push(...data);
        }
      }
      setMembers(allMembers);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const loadActionPlans = async (networkIds) => {
    try {
      const allActions = [];
      for (const networkId of networkIds) {
        const data = await dbFetch(`network_action_plans?select=*&network_id=eq.${networkId}&order=due_date.asc`);
        if (data) {
          allActions.push(...data);
        }
      }
      setActionPlans(allActions);
    } catch (error) {
      console.error('Error loading action plans:', error);
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

  const loadUsers = async () => {
    try {
      let url = 'profiles?select=id,full_name,email,client_id,department&is_active=eq.true&order=full_name.asc';

      if (currentProfile?.role === 'client_admin' && currentProfile?.client_id) {
        url += `&client_id=eq.${currentProfile.client_id}`;
      }

      const data = await dbFetch(url);
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Filter networks
  const filteredNetworks = networks.filter(network => {
    const matchesClient = clientFilter === 'all' || network.client_id === clientFilter;
    const matchesFactory = factoryFilter === 'all' || network.factory === factoryFilter;
    return matchesClient && matchesFactory;
  });

  // Get unique factories for filter
  const factories = [...new Set(networks.map(n => n.factory).filter(Boolean))];

  // Get members for a specific network
  const getNetworkMembers = (networkId) => members.filter(m => m.network_id === networkId);
  
  // Get action plans for a specific network
  const getNetworkActions = (networkId) => actionPlans.filter(a => a.network_id === networkId);

  // Calculate network stats
  const getNetworkStats = (networkId) => {
    const networkMembers = getNetworkMembers(networkId);
    const networkActions = getNetworkActions(networkId);
    
    const leaders = networkMembers.filter(m => m.role === 'network_leader');
    const gsmes = networkMembers.filter(m => m.role === 'gsme');
    const fsmes = networkMembers.filter(m => m.role === 'fsme');
    
    const avgMaturity = networkMembers.length > 0
      ? (networkMembers.reduce((sum, m) => sum + m.maturity_level, 0) / networkMembers.length).toFixed(1)
      : 0;
    
    const completedActions = networkActions.filter(a => a.status === 'completed').length;
    const overdueActions = networkActions.filter(a => 
      a.status !== 'completed' && a.status !== 'cancelled' && 
      a.due_date && new Date(a.due_date) < new Date()
    ).length;
    
    return {
      leaders: leaders.length,
      gsmes: gsmes.length,
      fsmes: fsmes.length,
      total: networkMembers.length,
      avgMaturity,
      completedActions,
      totalActions: networkActions.length,
      overdueActions
    };
  };

  // Calculate overall KPIs
  const getOverallKPIs = () => {
    const relevantNetworks = filteredNetworks;
    const relevantMembers = members.filter(m => 
      relevantNetworks.some(n => n.id === m.network_id)
    );
    const relevantActions = actionPlans.filter(a =>
      relevantNetworks.some(n => n.id === a.network_id)
    );

    const networksWithLeaders = relevantNetworks.filter(n => 
      members.some(m => m.network_id === n.id && m.role === 'network_leader')
    ).length;

    const coverage = relevantNetworks.length > 0 
      ? Math.round((networksWithLeaders / relevantNetworks.length) * 100)
      : 0;

    const avgMaturity = relevantMembers.length > 0
      ? (relevantMembers.reduce((sum, m) => sum + m.maturity_level, 0) / relevantMembers.length).toFixed(1)
      : 0;

    const completedActions = relevantActions.filter(a => a.status === 'completed').length;
    const trainingCompletion = relevantActions.length > 0
      ? Math.round((completedActions / relevantActions.length) * 100)
      : 0;

    const overdueActions = relevantActions.filter(a => 
      a.status !== 'completed' && a.status !== 'cancelled' && 
      a.due_date && new Date(a.due_date) < new Date()
    ).length;

    const upcomingActions = relevantActions.filter(a => {
      if (a.status === 'completed' || a.status === 'cancelled') return false;
      if (!a.due_date) return false;
      const dueDate = new Date(a.due_date);
      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= thirtyDays;
    }).length;

    return {
      totalNetworks: relevantNetworks.length,
      coverage,
      avgMaturity,
      trainingCompletion,
      overdueActions,
      upcomingActions,
      totalMembers: relevantMembers.length
    };
  };

  // Handle network form
  const handleCreateNetwork = () => {
    setEditingNetwork(null);
    setNetworkForm({
      name: '',
      description: '',
      client_id: currentProfile?.role === 'client_admin' ? currentProfile.client_id : '',
      factory: '',
      line: '',
      target_maturity: 3.5
    });
    setFormError('');
    setShowNetworkModal(true);
  };

  const handleEditNetwork = (network) => {
    setEditingNetwork(network);
    setNetworkForm({
      name: network.name,
      description: network.description || '',
      client_id: network.client_id,
      factory: network.factory || '',
      line: network.line || '',
      target_maturity: network.target_maturity || 3.5
    });
    setFormError('');
    setShowNetworkModal(true);
  };

  const handleDeleteNetwork = async (network) => {
    const memberCount = getNetworkMembers(network.id).length;
    const actionCount = getNetworkActions(network.id).length;
    
    let confirmMsg = `Are you sure you want to delete "${network.name}"?`;
    if (memberCount > 0 || actionCount > 0) {
      confirmMsg += `\n\nThis will also delete:\n- ${memberCount} member(s)\n- ${actionCount} action plan(s)`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
      // Soft delete - mark as inactive
      await dbFetch(`expert_networks?id=eq.${network.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
      });
      
      loadNetworks();
    } catch (error) {
      console.error('Error deleting network:', error);
      alert('Failed to delete network: ' + error.message);
    }
  };

  const handleSubmitNetwork = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!networkForm.name || !networkForm.client_id) {
        throw new Error('Name and client are required');
      }

      const data = {
        name: networkForm.name,
        description: networkForm.description || null,
        client_id: networkForm.client_id,
        factory: networkForm.factory || null,
        line: networkForm.line || null,
        target_maturity: networkForm.target_maturity,
        updated_at: new Date().toISOString()
      };

      if (editingNetwork) {
        await dbFetch(`expert_networks?id=eq.${editingNetwork.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      } else {
        await dbFetch('expert_networks', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      setShowNetworkModal(false);
      loadNetworks();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle member form
  const handleAddMember = (network) => {
    setSelectedNetwork(network);
    setEditingMember(null);
    setMemberForm({
      user_id: '',
      role: 'fsme',
      specialty: '',
      reports_to_id: '',
      maturity_level: 1
    });
    setFormError('');
    setShowMemberModal(true);
  };

  const handleEditMember = (member, network) => {
    setSelectedNetwork(network);
    setEditingMember(member);
    setMemberForm({
      user_id: member.user_id,
      role: member.role,
      specialty: member.specialty || '',
      reports_to_id: member.reports_to_id || '',
      maturity_level: member.maturity_level
    });
    setFormError('');
    setShowMemberModal(true);
  };

  const handleSubmitMember = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!memberForm.user_id || !memberForm.role) {
        throw new Error('User and role are required');
      }

      const data = {
        network_id: selectedNetwork.id,
        user_id: memberForm.user_id,
        role: memberForm.role,
        specialty: memberForm.specialty || null,
        reports_to_id: memberForm.reports_to_id || null,
        maturity_level: memberForm.maturity_level,
        updated_at: new Date().toISOString()
      };

      if (editingMember) {
        await dbFetch(`expert_network_members?id=eq.${editingMember.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      } else {
        await dbFetch('expert_network_members', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      setShowMemberModal(false);
      loadNetworks();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('Remove this member from the network?')) return;
    
    try {
      await dbFetch(`expert_network_members?id=eq.${memberId}`, {
        method: 'DELETE'
      });
      loadNetworks();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  // Handle action plan form
  const handleAddAction = (network) => {
    setSelectedNetwork(network);
    setEditingAction(null);
    setActionForm({
      title: '',
      description: '',
      assigned_to: '',
      status: 'planned',
      priority: 'medium',
      due_date: ''
    });
    setFormError('');
    setShowActionModal(true);
  };

  const handleEditAction = (action, network) => {
    setSelectedNetwork(network);
    setEditingAction(action);
    setActionForm({
      title: action.title,
      description: action.description || '',
      assigned_to: action.assigned_to || '',
      status: action.status,
      priority: action.priority,
      due_date: action.due_date || ''
    });
    setFormError('');
    setShowActionModal(true);
  };

  const handleSubmitAction = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (!actionForm.title) {
        throw new Error('Title is required');
      }

      const data = {
        network_id: selectedNetwork.id,
        title: actionForm.title,
        description: actionForm.description || null,
        assigned_to: actionForm.assigned_to || null,
        status: actionForm.status,
        priority: actionForm.priority,
        due_date: actionForm.due_date || null,
        completed_date: actionForm.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      };

      if (editingAction) {
        await dbFetch(`network_action_plans?id=eq.${editingAction.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data)
        });
      } else {
        data.created_by = currentProfile?.id;
        await dbFetch('network_action_plans', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }

      setShowActionModal(false);
      loadNetworks();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // View network details
  const handleViewNetwork = (network) => {
    setSelectedNetwork(network);
    setShowDetailModal(true);
  };

  // Role icons and colors
  const getRoleInfo = (role) => {
    switch (role) {
      case 'network_leader':
        return { label: 'Network Leader', color: 'bg-purple-100 text-purple-700', icon: Crown };
      case 'gsme':
        return { label: 'GSME', color: 'bg-blue-100 text-blue-700', icon: Star };
      case 'fsme':
        return { label: 'FSME', color: 'bg-green-100 text-green-700', icon: Award };
      default:
        return { label: role, color: 'bg-gray-100 text-gray-700', icon: Users };
    }
  };

  // Status colors
  const getStatusInfo = (status) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
      case 'in_progress':
        return { label: 'In Progress', color: 'bg-blue-100 text-blue-700', icon: Clock };
      case 'overdue':
        return { label: 'Overdue', color: 'bg-red-100 text-red-700', icon: AlertTriangle };
      case 'cancelled':
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: X };
      default:
        return { label: 'Planned', color: 'bg-yellow-100 text-yellow-700', icon: Calendar };
    }
  };

  // Priority colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Maturity bar
  const MaturityBar = ({ level, target }) => {
    const percentage = (level / 5) * 100;
    const targetPercentage = (target / 5) * 100;
    const isOnTarget = level >= target;
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden relative">
          <div 
            className={`h-full rounded-full ${isOnTarget ? 'bg-green-500' : 'bg-amber-500'}`}
            style={{ width: `${percentage}%` }}
          />
          <div 
            className="absolute top-0 h-full w-0.5 bg-gray-400"
            style={{ left: `${targetPercentage}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${isOnTarget ? 'text-green-600' : 'text-amber-600'}`}>
          {level}
        </span>
      </div>
    );
  };

  const kpis = getOverallKPIs();

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
            <h1 className="text-2xl font-bold text-gray-900">Expert Network</h1>
            <p className="text-gray-500 mt-1">Manage knowledge networks and subject matter experts</p>
          </div>
          <button
            onClick={handleCreateNetwork}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Create Network
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Network className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalNetworks}</p>
                <p className="text-sm text-gray-500">Networks</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.totalMembers}</p>
                <p className="text-sm text-gray-500">Experts</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.coverage}%</p>
                <p className="text-sm text-gray-500">Coverage</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.avgMaturity}</p>
                <p className="text-sm text-gray-500">Avg Maturity</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.overdueActions}</p>
                <p className="text-sm text-gray-500">Overdue</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpis.upcomingActions}</p>
                <p className="text-sm text-gray-500">Due 30d</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-4">
            {/* Client Filter - Only for Super Admin */}
            {currentProfile?.role === 'super_admin' && (
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={clientFilter}
                  onChange={(e) => {
                    setClientFilter(e.target.value);
                    setFactoryFilter('all');
                  }}
                  className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[200px]"
                >
                  <option value="all">All Organizations</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Factory Filter */}
            {factories.length > 0 && (
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={factoryFilter}
                  onChange={(e) => setFactoryFilter(e.target.value)}
                  className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none bg-white min-w-[180px]"
                >
                  <option value="all">All Factories</option>
                  {factories.map(factory => (
                    <option key={factory} value={factory}>{factory}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Networks Grid */}
        {filteredNetworks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No networks found</h3>
            <p className="text-gray-500 mb-4">Create your first expert network to get started</p>
            <button
              onClick={handleCreateNetwork}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Create Network
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredNetworks.map(network => {
              const stats = getNetworkStats(network.id);
              const networkMembers = getNetworkMembers(network.id);
              const leaders = networkMembers.filter(m => m.role === 'network_leader');
              
              return (
                <div key={network.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Network Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{network.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {network.clients?.name}
                          {network.factory && ` • ${network.factory}`}
                          {network.line && ` • ${network.line}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewNetwork(network)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditNetwork(network)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Edit network"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNetwork(network)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Delete network"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Network Leader */}
                  <div className="p-4 bg-purple-50 border-b border-purple-100">
                    {leaders.length > 0 ? (
                      <div className="space-y-2">
                        {leaders.map(leader => (
                          <div key={leader.id} className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-purple-900">{leader.user?.full_name}</span>
                            {leader.specialty && (
                              <span className="text-sm text-purple-600">({leader.specialty})</span>
                            )}
                            <span className="ml-auto text-sm font-medium text-purple-700">
                              L{leader.maturity_level}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Crown className="w-4 h-4" />
                        <span className="italic">No Network Leader assigned</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="p-4 grid grid-cols-4 gap-2 text-center border-b border-gray-100">
                    <div>
                      <p className="text-lg font-bold text-purple-600">{stats.leaders}</p>
                      <p className="text-xs text-gray-500">Leaders</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-600">{stats.gsmes}</p>
                      <p className="text-xs text-gray-500">GSME</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">{stats.fsmes}</p>
                      <p className="text-xs text-gray-500">FSME</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>

                  {/* Maturity */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Avg Maturity</span>
                      <span className="text-sm text-gray-500">Target: {network.target_maturity}</span>
                    </div>
                    <MaturityBar level={parseFloat(stats.avgMaturity)} target={network.target_maturity} />
                  </div>

                  {/* Action Plan Summary */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Action Plans</span>
                      <div className="flex items-center gap-2">
                        {stats.overdueActions > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            {stats.overdueActions} overdue
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {stats.completedActions}/{stats.totalActions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 bg-gray-50 flex gap-2">
                    <button
                      onClick={() => handleAddMember(network)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Add Member
                    </button>
                    <button
                      onClick={() => handleAddAction(network)}
                      className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Add Action
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Network Modal */}
      {showNetworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingNetwork ? 'Edit Network' : 'Create Network'}
              </h2>
              <button
                onClick={() => setShowNetworkModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNetwork} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Network Name *</label>
                <input
                  type="text"
                  value={networkForm.name}
                  onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Aseptic Technology"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={networkForm.description}
                  onChange={(e) => setNetworkForm({ ...networkForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description of this network"
                />
              </div>

              {currentProfile?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization *</label>
                  <select
                    value={networkForm.client_id}
                    onChange={(e) => setNetworkForm({ ...networkForm, client_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select organization...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Factory</label>
                  <input
                    type="text"
                    value={networkForm.factory}
                    onChange={(e) => setNetworkForm({ ...networkForm, factory: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Plant A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Line</label>
                  <input
                    type="text"
                    value={networkForm.line}
                    onChange={(e) => setNetworkForm({ ...networkForm, line: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Line 1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Maturity</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  value={networkForm.target_maturity}
                  onChange={(e) => setNetworkForm({ ...networkForm, target_maturity: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNetworkModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingNetwork ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Member Modal */}
      {showMemberModal && selectedNetwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingMember ? 'Edit Member' : 'Add Member'}
                </h2>
                <p className="text-sm text-gray-500">{selectedNetwork.name}</p>
              </div>
              <button
                onClick={() => setShowMemberModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMember} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Person *</label>
                <select
                  value={memberForm.user_id}
                  onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={editingMember}
                >
                  <option value="">Select person...</option>
                  {users
                    .filter(u => u.client_id === selectedNetwork.client_id || currentProfile?.role === 'super_admin')
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${memberForm.role === 'network_leader' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="network_leader"
                      checked={memberForm.role === 'network_leader'}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value, reports_to_id: '' })}
                      className="sr-only"
                    />
                    <Crown className={`w-5 h-5 ${memberForm.role === 'network_leader' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium">Network Leader</div>
                      <div className="text-xs text-gray-500">Leads this technology network</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${memberForm.role === 'gsme' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="gsme"
                      checked={memberForm.role === 'gsme'}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="sr-only"
                    />
                    <Star className={`w-5 h-5 ${memberForm.role === 'gsme' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium">GSME</div>
                      <div className="text-xs text-gray-500">Global Subject Matter Expert</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${memberForm.role === 'fsme' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="role"
                      value="fsme"
                      checked={memberForm.role === 'fsme'}
                      onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                      className="sr-only"
                    />
                    <Award className={`w-5 h-5 ${memberForm.role === 'fsme' ? 'text-green-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium">FSME</div>
                      <div className="text-xs text-gray-500">Factory Subject Matter Expert</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Specialty</label>
                <input
                  type="text"
                  value={memberForm.specialty}
                  onChange={(e) => setMemberForm({ ...memberForm, specialty: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Filling, Sterilization"
                />
              </div>

              {memberForm.role !== 'network_leader' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Reports To</label>
                  <select
                    value={memberForm.reports_to_id}
                    onChange={(e) => setMemberForm({ ...memberForm, reports_to_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select supervisor...</option>
                    {getNetworkMembers(selectedNetwork.id)
                      .filter(m => memberForm.role === 'fsme' ? (m.role === 'gsme' || m.role === 'network_leader') : m.role === 'network_leader')
                      .map(m => (
                        <option key={m.id} value={m.user_id}>
                          {m.user?.full_name} ({getRoleInfo(m.role).label})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Maturity Level (1-5)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={memberForm.maturity_level}
                    onChange={(e) => setMemberForm({ ...memberForm, maturity_level: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-gray-900 w-8 text-center">{memberForm.maturity_level}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Awareness</span>
                  <span>Knowledge</span>
                  <span>Practitioner</span>
                  <span>Proficient</span>
                  <span>Expert</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingMember ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Action Plan Modal */}
      {showActionModal && selectedNetwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingAction ? 'Edit Action' : 'Add Action'}
                </h2>
                <p className="text-sm text-gray-500">{selectedNetwork.name}</p>
              </div>
              <button
                onClick={() => setShowActionModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAction} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={actionForm.title}
                  onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., GMP Level 1 Training"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
                <select
                  value={actionForm.assigned_to}
                  onChange={(e) => setActionForm({ ...actionForm, assigned_to: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {getNetworkMembers(selectedNetwork.id).map(m => (
                    <option key={m.id} value={m.user_id}>
                      {m.user?.full_name} ({getRoleInfo(m.role).label})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    value={actionForm.status}
                    onChange={(e) => setActionForm({ ...actionForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
                  <select
                    value={actionForm.priority}
                    onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={actionForm.due_date}
                  onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingAction ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Network Detail Modal */}
      {showDetailModal && selectedNetwork && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedNetwork.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedNetwork.clients?.name}
                  {selectedNetwork.factory && ` • ${selectedNetwork.factory}`}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Members List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Network Members</h3>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleAddMember(selectedNetwork);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Member
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {getNetworkMembers(selectedNetwork.id).length === 0 ? (
                      <p className="text-gray-500 text-sm">No members assigned yet</p>
                    ) : (
                      getNetworkMembers(selectedNetwork.id)
                        .sort((a, b) => {
                          const order = { network_leader: 0, gsme: 1, fsme: 2 };
                          return order[a.role] - order[b.role];
                        })
                        .map(member => {
                          const roleInfo = getRoleInfo(member.role);
                          const RoleIcon = roleInfo.icon;
                          
                          return (
                            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <div className={`p-2 rounded-lg ${roleInfo.color}`}>
                                <RoleIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{member.user?.full_name}</div>
                                <div className="text-sm text-gray-500">
                                  {roleInfo.label}
                                  {member.specialty && ` • ${member.specialty}`}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-900">L{member.maturity_level}</div>
                                <div className="text-xs text-gray-500">Maturity</div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    setShowDetailModal(false);
                                    handleEditMember(member, selectedNetwork);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Action Plans */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Action Plans</h3>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleAddAction(selectedNetwork);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Action
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {getNetworkActions(selectedNetwork.id).length === 0 ? (
                      <p className="text-gray-500 text-sm">No action plans yet</p>
                    ) : (
                      getNetworkActions(selectedNetwork.id).map(action => {
                        const statusInfo = getStatusInfo(action.status);
                        const StatusIcon = statusInfo.icon;
                        const isOverdue = action.status !== 'completed' && action.status !== 'cancelled' && 
                          action.due_date && new Date(action.due_date) < new Date();
                        
                        return (
                          <div key={action.id} className={`p-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded ${statusInfo.color}`}>
                                <StatusIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{action.title}</div>
                                <div className="text-sm text-gray-500 mt-0.5">
                                  {action.assigned_user?.full_name || 'Unassigned'}
                                  {action.due_date && ` • Due: ${new Date(action.due_date).toLocaleDateString()}`}
                                </div>
                              </div>
                              <span className={`text-xs font-medium ${getPriorityColor(action.priority)}`}>
                                {action.priority.toUpperCase()}
                              </span>
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  handleEditAction(action, selectedNetwork);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
