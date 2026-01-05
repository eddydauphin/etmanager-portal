import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, ChevronDown, ChevronRight, Users, User, Building2, MapPin, 
  Factory, AlertTriangle, CheckCircle, Clock, TrendingUp, Filter,
  ToggleLeft, ToggleRight, Eye, Calendar, AlertCircle, ArrowRight,
  Layers, List, Grid3X3, RefreshCw, Download, ChevronUp, ExternalLink
} from 'lucide-react';

// ============================================================================
// COMPETENCY MATURITY DASHBOARD
// Shows maturity levels vs targets with multiple view modes
// ============================================================================

const MATURITY_LEVELS = [
  { level: 0, label: 'Not Started', color: '#9CA3AF' },
  { level: 1, label: 'Awareness', color: '#FCD34D' },
  { level: 2, label: 'Basic', color: '#F59E0B' },
  { level: 3, label: 'Competent', color: '#10B981' },
  { level: 4, label: 'Proficient', color: '#3B82F6' },
  { level: 5, label: 'Expert', color: '#8B5CF6' }
];

const STATUS_CONFIG = {
  achieved: { label: 'Achieved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-500' },
  on_track: { label: 'On Track', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: TrendingUp, iconColor: 'text-blue-500' },
  at_risk: { label: 'At Risk', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle, iconColor: 'text-amber-500' },
  delayed: { label: 'Delayed', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle, iconColor: 'text-red-500' },
  no_deadline: { label: 'No Deadline', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Clock, iconColor: 'text-gray-400' }
};

const SCOPE_OPTIONS = [
  { id: 'individual', label: 'Individual', icon: User, roles: ['trainee', 'team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'] },
  { id: 'team', label: 'My Team', icon: Users, roles: ['team_lead', 'category_admin', 'site_admin', 'client_admin', 'super_admin'] },
  { id: 'department', label: 'Department', icon: Building2, roles: ['category_admin', 'site_admin', 'client_admin', 'super_admin'] },
  { id: 'site', label: 'Site', icon: MapPin, roles: ['site_admin', 'client_admin', 'super_admin'] },
  { id: 'organization', label: 'Organization', icon: Factory, roles: ['client_admin', 'super_admin'] }
];

// Get allowed scopes based on user role
function getAllowedScopes(role) {
  return SCOPE_OPTIONS.filter(option => option.roles.includes(role || 'trainee'));
}

// Helper function to fetch data from Supabase
async function dbFetch(endpoint) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch data');
  return response.json();
}

// ============================================================================
// MATURITY BAR COMPONENT
// ============================================================================

function MaturityBar({ current, target, size = 'medium' }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;
  
  const heights = { small: 'h-2', medium: 'h-3', large: 'h-4' };
  
  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${heights[size]} overflow-hidden relative`}>
        {/* Target marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-gray-600 z-10"
          style={{ left: `${(target / 5) * 100}%` }}
          title={`Target: Level ${target}`}
        />
        {/* Current progress */}
        <div 
          className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
          style={{ width: `${(current / 5) * 100}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>Level {current}</span>
        <span>Target: {target}</span>
      </div>
    </div>
  );
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.no_deadline;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className={`w-3 h-3 ${config.iconColor}`} />
      {config.label}
    </span>
  );
}

// ============================================================================
// CATEGORY CARD COMPONENT
// ============================================================================

function CategoryCard({ category, competencies, isExpanded, onToggle, onCompetencyClick, onCategoryClick, onUserClick }) {
  const stats = useMemo(() => {
    const total = competencies.length;
    const achieved = competencies.filter(c => c.maturity_status === 'achieved').length;
    const atRisk = competencies.filter(c => c.maturity_status === 'at_risk').length;
    const delayed = competencies.filter(c => c.maturity_status === 'delayed').length;
    const avgProgress = total > 0 
      ? Math.round(competencies.reduce((sum, c) => sum + (c.progress_percentage || 0), 0) / total)
      : 0;
    return { total, achieved, atRisk, delayed, avgProgress };
  }, [competencies]);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Category Header */}
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1"
        >
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: category.color + '20' }}
          >
            <Layers className="w-5 h-5" style={{ color: category.color }} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-500">{stats.total} competencies</p>
          </div>
        </button>
        
        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="hidden md:flex items-center gap-3 text-sm">
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
              {stats.achieved} achieved
            </span>
            {stats.atRisk > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                {stats.atRisk} at risk
              </span>
            )}
            {stats.delayed > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {stats.delayed} delayed
              </span>
            )}
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#E5E7EB" strokeWidth="4" fill="none" />
              <circle 
                cx="24" cy="24" r="20" 
                stroke={stats.avgProgress >= 100 ? '#10B981' : '#3B82F6'} 
                strokeWidth="4" 
                fill="none"
                strokeDasharray={`${stats.avgProgress * 1.26} 126`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
              {stats.avgProgress}%
            </span>
          </div>
          
          {/* View Category Link */}
          {category.id !== 'uncategorized' && onCategoryClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onCategoryClick(category); }}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="View category details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
          
          <button onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </button>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
          {competencies.map(comp => (
            <div 
              key={comp.id} 
              className="bg-white rounded-lg p-3 border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => onCompetencyClick && onCompetencyClick(comp)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 group-hover:text-purple-700">{comp.competency_name}</span>
                  <StatusBadge status={comp.maturity_status} />
                </div>
                <div className="flex items-center gap-2">
                  {comp.target_due_date && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(comp.target_due_date).toLocaleDateString()}
                    </span>
                  )}
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <MaturityBar current={comp.current_level || 0} target={comp.target_level || 3} size="small" />
              {comp.user_name && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(comp); }}
                  className="text-xs text-gray-500 mt-1 hover:text-purple-600 hover:underline"
                >
                  {comp.user_name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPETENCY ROW COMPONENT (for list view)
// ============================================================================

function CompetencyRow({ competency, showUser = false, onClick, onUserClick }) {
  return (
    <div 
      className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onClick && onClick(competency)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 truncate group-hover:text-purple-700">{competency.competency_name}</span>
          <StatusBadge status={competency.maturity_status} />
        </div>
        {showUser && competency.user_name && (
          <button 
            onClick={(e) => { e.stopPropagation(); onUserClick && onUserClick(competency); }}
            className="text-sm text-gray-500 hover:text-purple-600 hover:underline"
          >
            {competency.user_name} • {competency.department || 'No dept'}
          </button>
        )}
        {competency.category_name && (
          <p className="text-xs text-gray-400">{competency.category_name}</p>
        )}
      </div>
      
      <div className="w-32 flex-shrink-0">
        <MaturityBar current={competency.current_level || 0} target={competency.target_level || 3} size="small" />
      </div>
      
      <div className="w-24 text-right flex-shrink-0 flex items-center justify-end gap-2">
        {competency.target_due_date ? (
          <span className={`text-xs ${
            competency.maturity_status === 'delayed' ? 'text-red-600 font-medium' :
            competency.maturity_status === 'at_risk' ? 'text-amber-600' : 'text-gray-500'
          }`}>
            {new Date(competency.target_due_date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-gray-400">No deadline</span>
        )}
        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// ============================================================================
// ACTION ITEMS SECTION
// ============================================================================

function ActionItemsSection({ items }) {
  if (!items || items.length === 0) return null;
  
  const delayed = items.filter(i => i.maturity_status === 'delayed');
  const atRisk = items.filter(i => i.maturity_status === 'at_risk');
  
  if (delayed.length === 0 && atRisk.length === 0) return null;
  
  return (
    <div className="bg-gradient-to-r from-red-50 to-amber-50 rounded-xl border border-red-200 p-4">
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        Action Required ({delayed.length + atRisk.length} items)
      </h3>
      
      <div className="space-y-2">
        {delayed.slice(0, 5).map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-900">{item.competency_name}</span>
              <span className="text-xs text-gray-500">• {item.user_name}</span>
            </div>
            <span className="text-xs text-red-600 font-medium">
              {Math.ceil((new Date() - new Date(item.target_due_date)) / (1000 * 60 * 60 * 24))} days overdue
            </span>
          </div>
        ))}
        {atRisk.slice(0, 3).map(item => (
          <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-900">{item.competency_name}</span>
              <span className="text-xs text-gray-500">• {item.user_name}</span>
            </div>
            <span className="text-xs text-amber-600">
              Due {new Date(item.target_due_date).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
      
      {(delayed.length + atRisk.length) > 8 && (
        <button className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
          View all {delayed.length + atRisk.length} items <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARY STATS BAR
// ============================================================================

function SummaryStats({ data }) {
  const stats = useMemo(() => {
    const total = data.length;
    const achieved = data.filter(d => d.maturity_status === 'achieved').length;
    const onTrack = data.filter(d => d.maturity_status === 'on_track').length;
    const atRisk = data.filter(d => d.maturity_status === 'at_risk').length;
    const delayed = data.filter(d => d.maturity_status === 'delayed').length;
    const avgProgress = total > 0 
      ? Math.round(data.reduce((sum, d) => sum + (d.progress_percentage || 0), 0) / total)
      : 0;
    
    return { total, achieved, onTrack, atRisk, delayed, avgProgress };
  }, [data]);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-xs text-gray-500">Total</div>
      </div>
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
        <div className="text-2xl font-bold text-emerald-700">{stats.achieved}</div>
        <div className="text-xs text-emerald-600">Achieved</div>
      </div>
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
        <div className="text-2xl font-bold text-blue-700">{stats.onTrack}</div>
        <div className="text-xs text-blue-600">On Track</div>
      </div>
      <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
        <div className="text-2xl font-bold text-amber-700">{stats.atRisk}</div>
        <div className="text-xs text-amber-600">At Risk</div>
      </div>
      <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
        <div className="text-2xl font-bold text-red-700">{stats.delayed}</div>
        <div className="text-xs text-red-600">Delayed</div>
      </div>
      <div className="bg-purple-50 rounded-xl border border-purple-200 p-4 text-center">
        <div className="text-2xl font-bold text-purple-700">{stats.avgProgress}%</div>
        <div className="text-xs text-purple-600">Avg Progress</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CompetencyMaturityDashboard({ 
  profile, 
  clientId, 
  users = [],
  initialScope = 'team'
}) {
  const navigate = useNavigate();
  
  // Get allowed scopes based on user role
  const allowedScopes = useMemo(() => getAllowedScopes(profile?.role), [profile?.role]);
  
  // Validate initial scope - use first allowed scope if initial is not allowed
  const validInitialScope = useMemo(() => {
    const allowed = allowedScopes.find(s => s.id === initialScope);
    return allowed ? initialScope : (allowedScopes[0]?.id || 'individual');
  }, [initialScope, allowedScopes]);
  
  const [scope, setScope] = useState(validInitialScope);
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'competency'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCompetency, setSelectedCompetency] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Navigation handlers
  const handleCompetencyClick = (competency) => {
    // Navigate to competency detail page with the competency and user info
    if (competency.user_id && competency.competency_id) {
      // Go to user's competency matrix with this competency highlighted
      navigate(`/competencies?user=${competency.user_id}&highlight=${competency.competency_id}`);
    } else if (competency.competency_id) {
      navigate(`/competencies?competency=${competency.competency_id}`);
    } else {
      navigate('/competencies');
    }
  };
  
  const handleCategoryClick = (category) => {
    // Navigate to competencies page filtered by category
    if (category.id && category.id !== 'uncategorized') {
      navigate(`/competencies?category=${category.id}`);
    } else {
      navigate('/competencies');
    }
  };
  
  const handleUserClick = (competency) => {
    // Navigate to user's profile or competency matrix
    if (competency.user_id) {
      // Check user role to determine where to navigate
      if (profile?.role === 'trainee') {
        navigate('/my-progress');
      } else {
        navigate(`/profiles?user=${competency.user_id}`);
      }
    }
  };
  
  // Update scope if it becomes invalid after role change
  useEffect(() => {
    if (!allowedScopes.find(s => s.id === scope)) {
      setScope(allowedScopes[0]?.id || 'individual');
    }
  }, [allowedScopes, scope]);
  
  // Load data
  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId, scope, profile]);
  
  async function loadData() {
    setLoading(true);
    try {
      // Load categories
      const categoriesData = await dbFetch(`competency_categories?client_id=eq.${clientId}&is_active=eq.true&order=sort_order.asc`);
      setCategories(categoriesData || []);
      
      // Build user filter based on scope
      let userFilter = '';
      if (scope === 'individual' && profile?.id) {
        userFilter = `&user_id=eq.${profile.id}`;
      } else if (scope === 'team' && profile?.id) {
        // Get team members who report to this user
        const teamMembers = users.filter(u => u.reports_to_id === profile.id).map(u => u.id);
        if (teamMembers.length > 0) {
          userFilter = `&user_id=in.(${teamMembers.join(',')})`;
        }
      } else if (scope === 'department' && profile?.department) {
        const deptUsers = users.filter(u => u.department === profile.department).map(u => u.id);
        if (deptUsers.length > 0) {
          userFilter = `&user_id=in.(${deptUsers.join(',')})`;
        }
      } else if (scope === 'site' && profile?.site) {
        const siteUsers = users.filter(u => u.site === profile.site).map(u => u.id);
        if (siteUsers.length > 0) {
          userFilter = `&user_id=in.(${siteUsers.join(',')})`;
        }
      }
      // 'organization' scope = all users in client (no additional filter)
      
      // Load competency data with user info
      const maturityData = await dbFetch(
        `user_competencies?select=*,competency:competencies(*,category:competency_categories(*)),user:profiles(full_name,department,site)&competency.client_id=eq.${clientId}${userFilter}`
      );
      
      // Transform data
      const transformedData = (maturityData || []).map(item => {
        const comp = item.competency || {};
        const cat = comp.category || {};
        const user = item.user || {};
        
        // Calculate status
        let maturity_status = 'no_deadline';
        const current = item.current_level || 0;
        const target = item.target_level || 3;
        
        if (current >= target) {
          maturity_status = 'achieved';
        } else if (item.target_due_date) {
          const dueDate = new Date(item.target_due_date);
          const today = new Date();
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue < 0) {
            maturity_status = 'delayed';
          } else if (daysUntilDue <= 14) {
            maturity_status = 'at_risk';
          } else {
            maturity_status = 'on_track';
          }
        }
        
        const progress_percentage = target > 0 ? Math.round((current / target) * 100) : 0;
        
        return {
          id: item.id,
          user_id: item.user_id,
          user_name: user.full_name,
          department: user.department,
          site: user.site,
          competency_id: comp.id,
          competency_name: comp.name,
          category_id: cat.id,
          category_name: cat.name,
          category_color: cat.color || '#6366f1',
          current_level: current,
          target_level: target,
          target_due_date: item.target_due_date,
          priority: item.priority,
          status: item.status,
          maturity_status,
          progress_percentage
        };
      });
      
      setData(transformedData);
    } catch (error) {
      console.error('Error loading maturity data:', error);
    } finally {
      setLoading(false);
    }
  }
  
  // Group data by category
  const groupedByCategory = useMemo(() => {
    const groups = new Map();
    
    // Add default category for uncategorized
    groups.set('uncategorized', {
      id: 'uncategorized',
      name: 'Uncategorized',
      color: '#9CA3AF',
      competencies: []
    });
    
    // Add known categories
    categories.forEach(cat => {
      groups.set(cat.id, { ...cat, competencies: [] });
    });
    
    // Group competencies
    data.forEach(item => {
      const catId = item.category_id || 'uncategorized';
      if (groups.has(catId)) {
        groups.get(catId).competencies.push(item);
      } else {
        groups.get('uncategorized').competencies.push(item);
      }
    });
    
    // Remove empty categories
    return Array.from(groups.values()).filter(g => g.competencies.length > 0);
  }, [data, categories]);
  
  // Filter by selected category/competency
  const filteredData = useMemo(() => {
    let filtered = [...data];
    
    if (selectedCategory) {
      filtered = filtered.filter(d => d.category_id === selectedCategory);
    }
    if (selectedCompetency) {
      filtered = filtered.filter(d => d.competency_id === selectedCompetency);
    }
    if (selectedUser) {
      filtered = filtered.filter(d => d.user_id === selectedUser);
    }
    
    return filtered;
  }, [data, selectedCategory, selectedCompetency, selectedUser]);
  
  // Toggle category expansion
  const toggleCategory = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-gray-500">Loading maturity data...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Competency Maturity Dashboard
              </h2>
              <button
                onClick={() => navigate('/competencies')}
                className="md:hidden text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500">Track progress towards competency targets</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View All Link - Desktop */}
            <button
              onClick={() => navigate('/competencies')}
              className="hidden md:flex items-center gap-1 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg text-sm font-medium transition-colors"
            >
              View all <ArrowRight className="w-4 h-4" />
            </button>
            
            {/* Scope Selector - shows only allowed scopes based on role */}
            {allowedScopes.length > 1 && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                {allowedScopes.map(option => {
                  const Icon = option.icon;
                  const isActive = scope === option.id;
                  return (
                    <button
                      key={option.id}
                      onClick={() => setScope(option.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-white text-purple-700 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode(viewMode === 'category' ? 'competency' : 'category')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              {viewMode === 'category' ? (
                <>
                  <Layers className="w-4 h-4" />
                  By Category
                </>
              ) : (
                <>
                  <List className="w-4 h-4" />
                  By Competency
                </>
              )}
            </button>
            
            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Summary Stats */}
      <SummaryStats data={filteredData} />
      
      {/* Action Items */}
      <ActionItemsSection items={filteredData} />
      
      {/* Main Content */}
      {viewMode === 'category' ? (
        <div className="space-y-4">
          {groupedByCategory.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              competencies={category.competencies}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              onCompetencyClick={handleCompetencyClick}
              onCategoryClick={handleCategoryClick}
              onUserClick={handleUserClick}
            />
          ))}
          
          {groupedByCategory.length === 0 && (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No competencies found</h3>
              <p className="text-gray-500 mt-1">No competency assignments for the selected scope</p>
              <button 
                onClick={() => navigate('/competencies')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Competencies
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredData.map(comp => (
            <CompetencyRow 
              key={comp.id} 
              competency={comp} 
              showUser={scope !== 'individual'} 
              onClick={handleCompetencyClick}
              onUserClick={handleUserClick}
            />
          ))}
          
          {filteredData.length === 0 && (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No competencies found</h3>
              <p className="text-gray-500 mt-1">No competency assignments for the selected scope</p>
              <button 
                onClick={() => navigate('/competencies')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Competencies
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Maturity Levels</h4>
        <div className="flex flex-wrap gap-4">
          {MATURITY_LEVELS.map(level => (
            <div key={level.level} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: level.color }}
              />
              <span className="text-sm text-gray-600">
                L{level.level}: {level.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export helper for use in DashboardPage
export { MaturityBar, StatusBadge, SummaryStats };
