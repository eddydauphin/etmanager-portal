import { useState, useEffect } from 'react';
import { dbFetch } from '../lib/db';
import { useAuth } from '../lib/AuthContext';
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
  Briefcase,
  ClipboardList,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  History
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
    const labelRadius = radius + 25;
    return {
      x: center + labelRadius * Math.cos(angle),
      y: center + labelRadius * Math.sin(angle)
    };
  };

  const pointsToPath = (points) => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  };

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background levels */}
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

      {/* Target area (dashed) */}
      <path
        d={pointsToPath(targetPoints)}
        fill="rgba(251, 191, 36, 0.1)"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeDasharray="4 2"
      />

      {/* Current level area */}
      <path
        d={pointsToPath(currentPoints)}
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
          r="4"
          fill="#3b82f6"
          stroke="white"
          strokeWidth="1.5"
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
  const { profile: currentProfile } = useAuth();
  const [userCompetencies, setUserCompetencies] = useState([]);
  const [availableCompetencies, setAvailableCompetencies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Assessment mode
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [selectedForAssessment, setSelectedForAssessment] = useState([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentData, setAssessmentData] = useState({});
  const [showHistory, setShowHistory] = useState(false);

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
      await Promise.all([loadUserCompetencies(), loadAvailableCompetencies(), loadProfiles(), loadAssessments()]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserCompetencies = async () => {
    const data = await dbFetch(
      `user_competencies?user_id=eq.${user.id}&select=*,competencies(id,name,description,level_1_description,level_2_description,level_3_description,level_4_description,level_5_description,competency_categories(name,color))&order=created_at.desc`
    );
    
    // Transform data for spider chart
    const transformed = (data || []).map(uc => ({
      ...uc,
      competency_name: uc.competencies?.name || 'Unknown',
      competency_description: uc.competencies?.description || '',
      category_name: uc.competencies?.competency_categories?.name || 'Uncategorized',
      category_color: uc.competencies?.competency_categories?.color || '#3B82F6',
      level_descriptions: {
        1: uc.competencies?.level_1_description || 'Awareness - Can recognize the topic',
        2: uc.competencies?.level_2_description || 'Knowledge - Can explain concepts',
        3: uc.competencies?.level_3_description || 'Practitioner - Can perform with supervision',
        4: uc.competencies?.level_4_description || 'Proficient - Works independently',
        5: uc.competencies?.level_5_description || 'Expert - Can teach others'
      }
    }));
    
    setUserCompetencies(transformed);
  };

  const loadAvailableCompetencies = async () => {
    let url = 'competencies?select=*,competency_categories(name,color),competency_clients(client_id)&is_active=eq.true&order=name.asc';
    const data = await dbFetch(url);
    
    const filtered = (data || []).filter(comp => {
      if (!user.client_id) return true;
      return comp.competency_clients?.some(cc => cc.client_id === user.client_id);
    });
    
    setAvailableCompetencies(filtered);
  };

  const loadProfiles = async () => {
    if (!user.client_id) {
      setProfiles([]);
      return;
    }
    
    const data = await dbFetch(
      `competency_profiles?select=*,profile_competencies(competency_id,default_target_level,competencies(name))&client_id=eq.${user.client_id}&is_active=eq.true&order=name.asc`
    );
    setProfiles(data || []);
  };

  const loadAssessments = async () => {
    const data = await dbFetch(
      `assessments?user_id=eq.${user.id}&select=*,competencies(name)&order=assessment_date.desc&limit=20`
    );
    setAssessments(data || []);
  };

  const handleApplyProfile = async (profile) => {
    if (!profile.profile_competencies || profile.profile_competencies.length === 0) {
      setError('This profile has no competencies');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const existingIds = userCompetencies.map(uc => uc.competency_id);
      const newCompetencies = profile.profile_competencies.filter(
        pc => !existingIds.includes(pc.competency_id)
      );

      if (newCompetencies.length === 0) {
        setError('All competencies from this profile are already assigned');
        setSaving(false);
        return;
      }

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
      const updateData = { [field]: value };
      
      if (field === 'current_level') {
        const uc = userCompetencies.find(c => c.id === userCompetencyId);
        if (uc && value >= uc.target_level) {
          updateData.status = 'achieved';
        } else if (value > 1) {
          updateData.status = 'in_progress';
        }
      }

      await dbFetch(`user_competencies?id=eq.${userCompetencyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      await loadUserCompetencies();
    } catch (err) {
      console.error('Error updating level:', err);
      setError('Failed to update level');
    }
  };

  const handleUpdateStatus = async (userCompetencyId, status) => {
    try {
      await dbFetch(`user_competencies?id=eq.${userCompetencyId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      await loadUserCompetencies();
    } catch (err) {
      console.error('Error updating status:', err);
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
      console.error('Error removing competency:', err);
      setError('Failed to remove competency');
    }
  };

  // Assessment functions
  const toggleAssessmentSelection = (ucId) => {
    if (selectedForAssessment.includes(ucId)) {
      setSelectedForAssessment(selectedForAssessment.filter(id => id !== ucId));
    } else {
      setSelectedForAssessment([...selectedForAssessment, ucId]);
    }
  };

  const startAssessment = () => {
    if (selectedForAssessment.length === 0) {
      setError('Please select at least one competency to assess');
      return;
    }
    
    // Initialize assessment data
    const initialData = {};
    selectedForAssessment.forEach(ucId => {
      const uc = userCompetencies.find(c => c.id === ucId);
      if (uc) {
        initialData[ucId] = {
          competency_id: uc.competency_id,
          competency_name: uc.competency_name,
          current_level: uc.current_level,
          target_level: uc.target_level,
          assessed_level: uc.current_level,
          level_descriptions: uc.level_descriptions,
          criteria_results: {},
          notes: ''
        };
        // Initialize criteria results for target level
        for (let i = 1; i <= uc.target_level; i++) {
          initialData[ucId].criteria_results[i] = null; // null = not assessed, true = pass, false = fail
        }
      }
    });
    
    setAssessmentData(initialData);
    setShowAssessmentForm(true);
    setAssessmentMode(false);
  };

  const updateCriteriaResult = (ucId, level, passed) => {
    setAssessmentData(prev => ({
      ...prev,
      [ucId]: {
        ...prev[ucId],
        criteria_results: {
          ...prev[ucId].criteria_results,
          [level]: passed
        }
      }
    }));
  };

  const updateAssessmentNotes = (ucId, notes) => {
    setAssessmentData(prev => ({
      ...prev,
      [ucId]: {
        ...prev[ucId],
        notes
      }
    }));
  };

  const calculateAchievedLevel = (ucId) => {
    const data = assessmentData[ucId];
    if (!data) return 1;
    
    let achievedLevel = 0;
    for (let i = 1; i <= 5; i++) {
      if (data.criteria_results[i] === true) {
        achievedLevel = i;
      } else {
        break;
      }
    }
    return achievedLevel || 1;
  };

  const saveAssessment = async () => {
    setSaving(true);
    setError('');

    try {
      for (const ucId of Object.keys(assessmentData)) {
        const data = assessmentData[ucId];
        const achievedLevel = calculateAchievedLevel(ucId);
        
        // Save assessment record
        await dbFetch('assessments', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            competency_id: data.competency_id,
            assessed_by: currentProfile?.id,
            assessment_date: new Date().toISOString(),
            assessment_type: 'custom',
            assessment_role: 'manager',
            level_achieved: achievedLevel,
            notes: data.notes || null,
            status: 'validated'
          })
        });

        // Update user competency level
        const newStatus = achievedLevel >= data.target_level ? 'achieved' : 
                         achievedLevel > data.current_level ? 'in_progress' : 
                         'not_started';
        
        await dbFetch(`user_competencies?id=eq.${ucId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            current_level: achievedLevel,
            status: newStatus,
            last_assessment_date: new Date().toISOString()
          })
        });
      }

      await loadUserCompetencies();
      await loadAssessments();
      setShowAssessmentForm(false);
      setSelectedForAssessment([]);
      setAssessmentData({});
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  // Filtered competencies for adding
  const filteredAvailable = availableCompetencies.filter(comp => {
    const alreadyAssigned = userCompetencies.some(uc => uc.competency_id === comp.id);
    const matchesSearch = comp.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return !alreadyAssigned && matchesSearch;
  });

  // Stats
  const stats = {
    assigned: userCompetencies.length,
    achieved: userCompetencies.filter(uc => uc.status === 'achieved').length,
    inProgress: userCompetencies.filter(uc => uc.status === 'in_progress').length,
    avgLevel: userCompetencies.length > 0 
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
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user?.full_name}</h2>
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
          ) : showAssessmentForm ? (
            /* Assessment Form */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Conduct Assessment</h3>
                  <p className="text-sm text-gray-500">Evaluate {Object.keys(assessmentData).length} competencies</p>
                </div>
                <button
                  onClick={() => {
                    setShowAssessmentForm(false);
                    setAssessmentData({});
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Profile
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {Object.entries(assessmentData).map(([ucId, data]) => (
                  <div key={ucId} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{data.competency_name}</h4>
                          <p className="text-sm text-gray-500">
                            Current: Level {data.current_level} → Target: Level {data.target_level}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Achieved Level</p>
                          <p className="text-2xl font-bold text-blue-600">{calculateAchievedLevel(ucId)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      {[1, 2, 3, 4, 5].map(level => {
                        if (level > data.target_level) return null;
                        const passed = data.criteria_results[level];
                        
                        return (
                          <div 
                            key={level}
                            className={`p-3 rounded-lg border ${
                              passed === true ? 'bg-green-50 border-green-200' :
                              passed === false ? 'bg-red-50 border-red-200' :
                              'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
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
                                    {level === 1 ? 'Awareness' :
                                     level === 2 ? 'Knowledge' :
                                     level === 3 ? 'Practitioner' :
                                     level === 4 ? 'Proficient' :
                                     'Expert'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">
                                  {data.level_descriptions[level]}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateCriteriaResult(ucId, level, true)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    passed === true 
                                      ? 'bg-green-500 text-white' 
                                      : 'bg-white border border-gray-200 text-gray-400 hover:border-green-500 hover:text-green-500'
                                  }`}
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => updateCriteriaResult(ucId, level, false)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    passed === false 
                                      ? 'bg-red-500 text-white' 
                                      : 'bg-white border border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-500'
                                  }`}
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={data.notes}
                          onChange={(e) => updateAssessmentNotes(ucId, e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                          placeholder="Assessment notes..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAssessmentForm(false);
                    setAssessmentData({});
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAssessment}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </div>
          ) : showHistory ? (
            /* Assessment History */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assessment History</h3>
                  <p className="text-sm text-gray-500">{assessments.length} assessments</p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to Profile
                </button>
              </div>

              {assessments.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No assessments yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assessments.map(assessment => (
                    <div key={assessment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          assessment.level_achieved >= 4 ? 'bg-green-500' :
                          assessment.level_achieved >= 3 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}>
                          {assessment.level_achieved}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{assessment.competencies?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(assessment.assessment_date).toLocaleDateString()} • Level {assessment.level_achieved} achieved
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        assessment.status === 'validated' ? 'bg-green-100 text-green-700' :
                        assessment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {assessment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Main Profile View */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Stats and Spider Chart */}
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
                    <p className="text-xs text-blue-600">Assigned</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.achieved}</p>
                    <p className="text-xs text-green-600">Achieved</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
                    <p className="text-xs text-amber-600">In Progress</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.avgLevel}</p>
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

                {/* History Button */}
                {assessments.length > 0 && (
                  <button
                    onClick={() => setShowHistory(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <History className="w-4 h-4" />
                    View Assessment History ({assessments.length})
                  </button>
                )}
              </div>

              {/* Right: Competency List */}
              <div className="space-y-4">
                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-700">Assigned Competencies</h3>
                  <div className="flex gap-2">
                    {assessmentMode ? (
                      <>
                        <button
                          onClick={() => {
                            setAssessmentMode(false);
                            setSelectedForAssessment([]);
                          }}
                          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={startAssessment}
                          disabled={selectedForAssessment.length === 0}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          Assess ({selectedForAssessment.length})
                        </button>
                      </>
                    ) : (
                      <>
                        {userCompetencies.length > 0 && (
                          <button
                            onClick={() => setAssessmentMode(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-green-600 text-green-600 text-sm rounded-lg hover:bg-green-50"
                          >
                            <ClipboardList className="w-4 h-4" />
                            Assess
                          </button>
                        )}
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
                      </>
                    )}
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
                      <div>
                        <label className="block text-xs text-blue-900 mb-1">Target Level</label>
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
                      <div>
                        <label className="block text-xs text-blue-900 mb-1">Target Date</label>
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
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
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
                        className={`bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow ${
                          assessmentMode && selectedForAssessment.includes(uc.id) 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {assessmentMode && (
                              <input
                                type="checkbox"
                                checked={selectedForAssessment.includes(uc.id)}
                                onChange={() => toggleAssessmentSelection(uc.id)}
                                className="w-4 h-4 text-green-600 rounded border-gray-300"
                              />
                            )}
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: uc.category_color }}
                            />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{uc.competency_name}</p>
                              <p className="text-xs text-gray-500">{uc.category_name}</p>
                            </div>
                          </div>
                          {!assessmentMode && (
                            <button
                              onClick={() => handleRemove(uc.id)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Competency Description */}
                        {uc.competency_description && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-600 leading-relaxed">{uc.competency_description}</p>
                          </div>
                        )}

                        {/* Level Controls */}
                        <div className="grid grid-cols-2 gap-3">
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

                        {/* Status and Gap */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                          <select
                            value={uc.status || 'not_started'}
                            onChange={(e) => handleUpdateStatus(uc.id, e.target.value)}
                            className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="achieved">Achieved</option>
                          </select>

                          {uc.current_level < uc.target_level && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                              <TrendingUp className="w-3 h-3" />
                              Gap: {uc.target_level - uc.current_level} level(s) to target
                            </div>
                          )}
                          {uc.current_level >= uc.target_level && (
                            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                              <Award className="w-3 h-3" />
                              Target achieved!
                            </div>
                          )}
                        </div>
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
