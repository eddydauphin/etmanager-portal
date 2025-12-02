import { useState, useEffect } from 'react';
import { dbFetch } from '../lib/db';
import {
  X,
  Target,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Calendar,
  TrendingUp,
  Award,
  ChevronDown,
  Search,
  Briefcase
} from 'lucide-react';

// Spider Chart Component
const SpiderChart = ({ data, size = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No competencies assigned yet</p>
      </div>
    );
  }

  const center = size / 2;
  const radius = (size - 80) / 2;
  const levels = 5;
  const angleStep = (2 * Math.PI) / data.length;

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

  const getDataPoints = (field) => {
    return data.map((item, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = item[field] || 0;
      const itemRadius = (radius * value) / levels;
      return {
        x: center + itemRadius * Math.cos(angle),
        y: center + itemRadius * Math.sin(angle)
      };
    });
  };

  const currentPoints = getDataPoints('current_level');
  const targetPoints = getDataPoints('target_level');

  const getLabelPosition = (index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelRadius = radius + 35;
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

      {/* Current level area */}
      <polygon
        points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
        fill="rgba(59, 130, 246, 0.2)"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {/* Current level points */}
      {currentPoints.map((point, i) => (
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
            {item.competency_name?.length > 12 
              ? item.competency_name.substring(0, 12) + '...' 
              : item.competency_name}
          </text>
        );
      })}

      {/* Level labels */}
      {[1, 2, 3, 4, 5].map((level) => (
        <text
          key={level}
          x={center + 8}
          y={center - (radius * level) / levels + 3}
          className="text-xs fill-gray-400"
          style={{ fontSize: '9px' }}
        >
          {level}
        </text>
      ))}
    </svg>
  );
};

export default function UserCompetenciesModal({ user, isOpen, onClose }) {
  const [userCompetencies, setUserCompetencies] = useState([]);
  const [availableCompetencies, setAvailableCompetencies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New assignment form
  const [newAssignment, setNewAssignment] = useState({
    competency_id: '',
    target_level: 3,
    target_date: ''
  });

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadUserCompetencies(), loadAvailableCompetencies(), loadProfiles()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCompetencies = async () => {
    const data = await dbFetch(
      `user_competencies?user_id=eq.${user.id}&select=*,competencies(id,name,description,competency_categories(name,color))&order=created_at.desc`
    );
    
    // Transform data for spider chart
    const transformed = (data || []).map(uc => ({
      ...uc,
      competency_name: uc.competencies?.name || 'Unknown',
      category_name: uc.competencies?.competency_categories?.name || 'Uncategorized',
      category_color: uc.competencies?.competency_categories?.color || '#3B82F6'
    }));
    
    setUserCompetencies(transformed);
  };

  const loadAvailableCompetencies = async () => {
    // Load competencies for the user's client via junction table
    let url = 'competencies?select=*,competency_categories(name,color),competency_clients(client_id)&is_active=eq.true&order=name.asc';
    const data = await dbFetch(url);
    
    // Filter competencies that belong to user's client
    const filtered = (data || []).filter(comp => {
      if (!user.client_id) return true;
      return comp.competency_clients?.some(cc => cc.client_id === user.client_id);
    });
    
    setAvailableCompetencies(filtered);
  };

  const loadProfiles = async () => {
    // Load profiles for the user's client
    if (!user.client_id) {
      setProfiles([]);
      return;
    }
    
    const data = await dbFetch(
      `competency_profiles?select=*,profile_competencies(competency_id,default_target_level,competencies(name))&client_id=eq.${user.client_id}&is_active=eq.true&order=name.asc`
    );
    setProfiles(data || []);
  };

  const handleApplyProfile = async (profile) => {
    if (!profile.profile_competencies || profile.profile_competencies.length === 0) {
      setError('This profile has no competencies');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Get competencies not already assigned
      const existingIds = userCompetencies.map(uc => uc.competency_id);
      const newCompetencies = profile.profile_competencies.filter(
        pc => !existingIds.includes(pc.competency_id)
      );

      if (newCompetencies.length === 0) {
        setError('All competencies from this profile are already assigned');
        setSaving(false);
        return;
      }

      // Create assignments for each new competency
      const assignments = newCompetencies.map(pc => ({
        user_id: user.id,
        competency_id: pc.competency_id,
        current_level: 1,
        target_level: pc.default_target_level,
        status: 'not_started'
      }));

      await dbFetch('user_competencies', {
        method: 'POST',
        body: JSON.stringify(assignments)
      });

      await loadUserCompetencies();
      setShowProfileSelect(false);
    } catch (err) {
      console.error('Error applying profile:', err);
      setError('Failed to apply profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!newAssignment.competency_id) {
      setError('Please select a competency');
      return;
    }

    // Check if already assigned
    const existing = userCompetencies.find(uc => uc.competency_id === newAssignment.competency_id);
    if (existing) {
      setError('This competency is already assigned to this user');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await dbFetch('user_competencies', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.id,
          competency_id: newAssignment.competency_id,
          current_level: 1,
          target_level: newAssignment.target_level,
          target_date: newAssignment.target_date || null,
          status: 'not_started'
        })
      });

      await loadUserCompetencies();
      setShowAddForm(false);
      setNewAssignment({ competency_id: '', target_level: 3, target_date: '' });
    } catch (err) {
      console.error('Error assigning competency:', err);
      setError('Failed to assign competency');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLevel = async (userCompetencyId, field, value) => {
    try {
      await dbFetch(`user_competencies?id=eq.${userCompetencyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value })
      });
      await loadUserCompetencies();
    } catch (err) {
      console.error('Error updating:', err);
    }
  };

  const handleRemove = async (userCompetencyId) => {
    if (!confirm('Remove this competency from the user?')) return;

    try {
      await dbFetch(`user_competencies?id=eq.${userCompetencyId}`, {
        method: 'DELETE'
      });
      await loadUserCompetencies();
    } catch (err) {
      console.error('Error removing:', err);
    }
  };

  // Filter available competencies for adding
  const filteredAvailable = availableCompetencies.filter(comp => {
    const notAssigned = !userCompetencies.find(uc => uc.competency_id === comp.id);
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase());
    return notAssigned && matchesSearch;
  });

  // Stats
  const stats = {
    total: userCompetencies.length,
    achieved: userCompetencies.filter(uc => uc.status === 'achieved').length,
    inProgress: userCompetencies.filter(uc => uc.status === 'in_progress').length,
    avgCurrent: userCompetencies.length > 0 
      ? (userCompetencies.reduce((sum, uc) => sum + (uc.current_level || 0), 0) / userCompetencies.length).toFixed(1)
      : 0
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
              {user?.full_name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.full_name || user?.email}</h2>
              <p className="text-sm text-gray-500">Competency Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Spider Chart & Stats */}
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-blue-600">Assigned</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-600">{stats.achieved}</p>
                    <p className="text-xs text-green-600">Achieved</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-amber-600">In Progress</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-600">{stats.avgCurrent}</p>
                    <p className="text-xs text-purple-600">Avg Level</p>
                  </div>
                </div>

                {/* Spider Chart */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Competency Overview</h3>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        <span className="text-gray-500">Current</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                        <span className="text-gray-500">Target</span>
                      </div>
                    </div>
                  </div>
                  <SpiderChart data={userCompetencies} size={280} />
                </div>
              </div>

              {/* Right: Competency List */}
              <div className="space-y-4">
                {/* Add Buttons */}
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Assigned Competencies</h3>
                  <div className="flex gap-2">
                    {profiles.length > 0 && (
                      <button
                        onClick={() => {
                          setShowProfileSelect(!showProfileSelect);
                          setShowAddForm(false);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-600 text-blue-600 text-sm rounded-lg hover:bg-blue-50"
                      >
                        <Briefcase className="w-4 h-4" />
                        Apply Profile
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowAddForm(!showAddForm);
                        setShowProfileSelect(false);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Assign
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                {/* Profile Selection */}
                {showProfileSelect && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-purple-900">Apply Competency Profile</h4>
                    <p className="text-xs text-purple-700">Select a profile to quickly assign multiple competencies</p>
                    
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {profiles.map(profile => (
                        <div
                          key={profile.id}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{profile.name}</p>
                            <p className="text-xs text-gray-500">
                              {profile.profile_competencies?.length || 0} competencies
                            </p>
                          </div>
                          <button
                            onClick={() => handleApplyProfile(profile)}
                            disabled={saving}
                            className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
                          >
                            {saving ? '...' : 'Apply'}
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setShowProfileSelect(false)}
                      className="w-full text-center text-xs text-purple-600 hover:underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Add Form */}
                {showAddForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-medium text-blue-900">Assign New Competency</h4>
                    
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search competencies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Competency Select */}
                    <select
                      value={newAssignment.competency_id}
                      onChange={(e) => setNewAssignment({ ...newAssignment, competency_id: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a competency...</option>
                      {filteredAvailable.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} {comp.competency_categories?.name ? `(${comp.competency_categories.name})` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Target Level */}
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">Target Level</label>
                        <select
                          value={newAssignment.target_level}
                          onChange={(e) => setNewAssignment({ ...newAssignment, target_level: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>1 - Awareness</option>
                          <option value={2}>2 - Knowledge</option>
                          <option value={3}>3 - Practitioner</option>
                          <option value={4}>4 - Proficient</option>
                          <option value={5}>5 - Expert</option>
                        </select>
                      </div>

                      {/* Target Date */}
                      <div>
                        <label className="block text-xs font-medium text-blue-900 mb-1">Target Date</label>
                        <input
                          type="date"
                          value={newAssignment.target_date}
                          onChange={(e) => setNewAssignment({ ...newAssignment, target_date: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewAssignment({ competency_id: '', target_level: 3, target_date: '' });
                          setSearchTerm('');
                        }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-blue-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAssign}
                        disabled={saving || !newAssignment.competency_id}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {saving ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Competency List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {userCompetencies.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No competencies assigned yet</p>
                      <p className="text-xs text-gray-400">Click "Assign" to add competencies</p>
                    </div>
                  ) : (
                    userCompetencies.map(uc => (
                      <div
                        key={uc.id}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: uc.category_color }}
                            />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{uc.competency_name}</p>
                              <p className="text-xs text-gray-500">{uc.category_name}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(uc.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Level Controls */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Current Level</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(level => (
                                <button
                                  key={level}
                                  onClick={() => handleUpdateLevel(uc.id, 'current_level', level)}
                                  className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                                    level <= (uc.current_level || 0)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Target Level</label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(level => (
                                <button
                                  key={level}
                                  onClick={() => handleUpdateLevel(uc.id, 'target_level', level)}
                                  className={`w-7 h-7 rounded-full text-xs font-medium transition-colors ${
                                    level <= (uc.target_level || 0)
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                  }`}
                                >
                                  {level}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Status & Date */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                          <select
                            value={uc.status || 'not_started'}
                            onChange={(e) => handleUpdateLevel(uc.id, 'status', e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="achieved">Achieved</option>
                          </select>
                          {uc.target_date && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(uc.target_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Gap indicator */}
                        {(uc.target_level || 0) > (uc.current_level || 0) && (
                          <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Gap: {(uc.target_level || 0) - (uc.current_level || 0)} level(s) to target
                          </div>
                        )}
                        {(uc.current_level || 0) >= (uc.target_level || 0) && uc.status !== 'achieved' && (
                          <div className="mt-2 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Target reached! Update status to "Achieved"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
