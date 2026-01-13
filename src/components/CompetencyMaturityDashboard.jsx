// ============================================================================
// COMPETENCY MATURITY DASHBOARD
// Bar chart showing Current vs Target competency levels with drill-down
// ============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbFetch } from '../lib/db';
import {
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users,
  User,
  Building2,
  AlertTriangle,
  CheckCircle,
  Filter,
  Award,
  Star,
  GraduationCap,
  X,
  MessageSquare
} from 'lucide-react';

// ============================================================================
// HORIZONTAL BAR CHART COMPONENT
// ============================================================================

function CompetencyBarChart({ data, onCompetencyClick, selectedId }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No competency data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map(comp => {
        const progressPercent = comp.target > 0 ? Math.min((comp.current / comp.target) * 100, 100) : 100;
        const targetPercent = (comp.target / 5) * 100; // Assuming max level is 5
        const currentPercent = (comp.current / 5) * 100;
        const isSelected = selectedId === comp.id;
        const isAchieved = comp.current >= comp.target;
        const isAtRisk = comp.gap >= 2;
        
        return (
          <div 
            key={comp.id}
            className={`rounded-lg border transition-all cursor-pointer ${
              isSelected 
                ? 'border-purple-300 bg-purple-50 shadow-md' 
                : 'border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
            }`}
            onClick={() => onCompetencyClick(comp.id)}
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium text-gray-900 truncate">{comp.name}</span>
                  {isAchieved && (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  )}
                  {isAtRisk && !isAchieved && (
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1 text-sm">
                    <span className={`font-semibold ${isAchieved ? 'text-green-600' : 'text-blue-600'}`}>
                      L{comp.current}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-orange-600">L{comp.target}</span>
                  </div>
                  {comp.userCount > 1 && (
                    <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                      {comp.userCount} users
                    </span>
                  )}
                  {isSelected ? (
                    <ChevronUp className="w-4 h-4 text-purple-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                {/* Current level bar */}
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    isAchieved ? 'bg-green-500' : isAtRisk ? 'bg-amber-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${currentPercent}%` }}
                />
                {/* Target marker */}
                <div 
                  className="absolute top-0 h-full w-1 bg-orange-500 z-10"
                  style={{ left: `${targetPercent}%`, transform: 'translateX(-50%)' }}
                />
                {/* Level markers */}
                {[1, 2, 3, 4, 5].map(level => (
                  <div 
                    key={level}
                    className="absolute top-0 h-full w-px bg-gray-300"
                    style={{ left: `${(level / 5) * 100}%` }}
                  />
                ))}
                {/* Current level text inside bar */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span className={`text-xs font-medium ${currentPercent > 30 ? 'text-white' : 'text-gray-700'}`}>
                    {isAchieved ? '✓ Achieved' : `Gap: ${comp.gap.toFixed(1)}`}
                  </span>
                </div>
              </div>
              
              {/* Level scale */}
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>L0</span>
                <span>L1</span>
                <span>L2</span>
                <span>L3</span>
                <span>L4</span>
                <span>L5</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TRAINEE DETAILS PANEL (Drill-down)
// ============================================================================

function TraineeDetailsPanel({ competency, clientId, onClose, onAssignCoaching }) {
  const [trainees, setTrainees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTraineeDetails();
  }, [competency.id]);

  const loadTraineeDetails = async () => {
    setLoading(true);
    try {
      // Get all user_competencies for this competency
      const userComps = await dbFetch(
        `user_competencies?select=*,user:user_id(id,full_name,email,role)&competency_id=eq.${competency.id}`
      );
      
      // Get training scores for this competency's modules
      const competencyModules = await dbFetch(
        `competency_modules?select=module_id&competency_id=eq.${competency.id}`
      );
      const moduleIds = competencyModules?.map(cm => cm.module_id) || [];
      
      // Enrich with training data
      const enrichedTrainees = await Promise.all((userComps || []).map(async (uc) => {
        let trainingScore = null;
        let trainingStatus = null;
        
        if (moduleIds.length > 0 && uc.user_id) {
          const userTrainings = await dbFetch(
            `user_training?select=status,score&user_id=eq.${uc.user_id}&module_id=in.(${moduleIds.join(',')})`
          );
          
          if (userTrainings?.length > 0) {
            const completed = userTrainings.filter(t => t.status === 'passed' || t.status === 'completed');
            if (completed.length > 0) {
              trainingScore = Math.round(completed.reduce((sum, t) => sum + (t.score || 0), 0) / completed.length);
              trainingStatus = 'completed';
            } else {
              const inProgress = userTrainings.find(t => t.status === 'in_progress');
              trainingStatus = inProgress ? 'in_progress' : 'pending';
            }
          }
        }
        
        const achieved = (uc.current_level || 0) >= (uc.target_level || 3);
        const gap = (uc.target_level || 3) - (uc.current_level || 0);
        
        return {
          id: uc.id,
          userId: uc.user_id,
          name: uc.user?.full_name || 'Unknown',
          email: uc.user?.email,
          role: uc.user?.role,
          currentLevel: uc.current_level || 0,
          targetLevel: uc.target_level || 3,
          achieved,
          gap,
          trainingScore,
          trainingStatus,
          status: uc.status
        };
      }));
      
      // Sort: achieved first, then by gap (largest first)
      enrichedTrainees.sort((a, b) => {
        if (a.achieved && !b.achieved) return -1;
        if (!a.achieved && b.achieved) return 1;
        return b.gap - a.gap;
      });
      
      setTrainees(enrichedTrainees);
    } catch (error) {
      console.error('Error loading trainee details:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievedCount = trainees.filter(t => t.achieved).length;
  const inProgressCount = trainees.filter(t => !t.achieved && t.gap < 2).length;
  const atRiskCount = trainees.filter(t => !t.achieved && t.gap >= 2).length;

  return (
    <div className="bg-white border border-purple-200 rounded-xl shadow-lg mt-2 overflow-hidden">
      {/* Header */}
      <div className="bg-purple-50 p-4 border-b border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{competency.name}</h3>
            <p className="text-sm text-gray-600">Target: Level {competency.target}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-purple-100 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Summary */}
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">{achievedCount} achieved</span>
          </div>
          <div className="flex items-center gap-1">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-700">{inProgressCount} on track</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-amber-700">{atRiskCount} at risk</span>
          </div>
        </div>
      </div>
      
      {/* Trainee List */}
      <div className="max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : trainees.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No trainees assigned to this competency
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-2">Trainee</th>
                <th className="px-4 py-2 text-center">Level</th>
                <th className="px-4 py-2 text-center">Training</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {trainees.map(trainee => (
                <tr 
                  key={trainee.id} 
                  className={`hover:bg-gray-50 ${trainee.achieved ? 'bg-green-50/50' : trainee.gap >= 2 ? 'bg-amber-50/50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        trainee.achieved ? 'bg-green-100 text-green-700' :
                        trainee.gap >= 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {trainee.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{trainee.name}</p>
                        <p className="text-xs text-gray-500">{trainee.role?.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-semibold ${trainee.achieved ? 'text-green-600' : 'text-blue-600'}`}>
                        L{trainee.currentLevel}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="text-orange-600">L{trainee.targetLevel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trainee.trainingScore !== null ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trainee.trainingScore >= 80 ? 'bg-green-100 text-green-700' :
                        trainee.trainingScore >= 60 ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {trainee.trainingScore}%
                      </span>
                    ) : trainee.trainingStatus === 'in_progress' ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        In Progress
                      </span>
                    ) : trainee.trainingStatus === 'pending' ? (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Pending
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trainee.achieved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3" />
                        Achieved
                      </span>
                    ) : trainee.gap >= 2 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        At Risk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        <Target className="w-3 h-3" />
                        On Track
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!trainee.achieved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignCoaching(trainee, competency);
                        }}
                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                        title="Assign coaching"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
  initialScope = 'individual',
  showRecommendButton = false,
  onRecommend
}) {
  const navigate = useNavigate();
  
  // State
  const [scope, setScope] = useState(initialScope);
  const [selectedUserId, setSelectedUserId] = useState(profile?.id);
  const [competencyData, setCompetencyData] = useState([]);
  const [rawUserCompetencies, setRawUserCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'list'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'achieved', 'onTrack', 'atRisk'
  const [selectedCompetencyId, setSelectedCompetencyId] = useState(null);

  // Scope options based on role
  const scopeOptions = [
    { value: 'individual', label: 'Individual', icon: User },
    { value: 'team', label: 'Team', icon: Users },
    { value: 'organization', label: 'Organization', icon: Building2 }
  ];

  // Load data when scope or selection changes
  useEffect(() => {
    loadCompetencyData();
  }, [scope, selectedUserId, clientId]);

  const loadCompetencyData = async () => {
    setLoading(true);
    try {
      let userCompetencies = [];

      if (scope === 'individual') {
        const userId = selectedUserId || profile?.id;
        if (userId) {
          userCompetencies = await dbFetch(
            `user_competencies?select=*,competency:competency_id(id,name,description)&user_id=eq.${userId}`
          );
        }
      } else if (scope === 'team') {
        let teamUserIds = [];
        
        if (profile?.role === 'team_lead') {
          const teamUsers = await dbFetch(
            `profiles?select=id&reports_to_id=eq.${profile.id}&is_active=eq.true`
          );
          teamUserIds = teamUsers?.map(u => u.id) || [];
          teamUserIds.push(profile.id);
        } else if (clientId) {
          const clientUsers = await dbFetch(
            `profiles?select=id&client_id=eq.${clientId}&is_active=eq.true`
          );
          teamUserIds = clientUsers?.map(u => u.id) || [];
        }

        if (teamUserIds.length > 0) {
          userCompetencies = await dbFetch(
            `user_competencies?select=*,competency:competency_id(id,name,description),user:user_id(id,full_name)&user_id=in.(${teamUserIds.join(',')})`
          );
        }
      } else if (scope === 'organization') {
        if (clientId) {
          const clientUsers = await dbFetch(
            `profiles?select=id&client_id=eq.${clientId}&is_active=eq.true`
          );
          const userIds = clientUsers?.map(u => u.id) || [];
          
          if (userIds.length > 0) {
            userCompetencies = await dbFetch(
              `user_competencies?select=*,competency:competency_id(id,name,description),user:user_id(id,full_name)&user_id=in.(${userIds.join(',')})`
            );
          }
        }
      }

      setRawUserCompetencies(userCompetencies || []);
      const processed = processCompetencyData(userCompetencies, scope);
      setCompetencyData(processed);
    } catch (error) {
      console.error('Error loading competency data:', error);
      setCompetencyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Process raw data into chart format
  const processCompetencyData = (rawData, scope) => {
    if (!rawData || rawData.length === 0) return [];

    const grouped = {};
    rawData.forEach(uc => {
      if (!uc.competency) return;
      
      const compId = uc.competency_id;
      if (!grouped[compId]) {
        grouped[compId] = {
          id: compId,
          name: uc.competency.name,
          description: uc.competency.description,
          currentLevels: [],
          targetLevels: [],
          users: []
        };
      }
      
      grouped[compId].currentLevels.push(uc.current_level || 0);
      grouped[compId].targetLevels.push(uc.target_level || 0);
      grouped[compId].users.push({
        userId: uc.user_id,
        userName: uc.user?.full_name,
        current: uc.current_level || 0,
        target: uc.target_level || 0
      });
    });

    return Object.values(grouped).map(comp => {
      let current, target;

      if (scope === 'individual') {
        current = comp.currentLevels[0] || 0;
        target = comp.targetLevels[0] || 0;
      } else if (scope === 'team') {
        current = comp.currentLevels.length > 0 
          ? Math.round((comp.currentLevels.reduce((a, b) => a + b, 0) / comp.currentLevels.length) * 10) / 10
          : 0;
        target = comp.targetLevels.length > 0
          ? Math.round((comp.targetLevels.reduce((a, b) => a + b, 0) / comp.targetLevels.length) * 10) / 10
          : 0;
      } else {
        current = comp.currentLevels.length > 0 
          ? Math.round((comp.currentLevels.reduce((a, b) => a + b, 0) / comp.currentLevels.length) * 10) / 10
          : 0;
        target = comp.targetLevels.length > 0
          ? Math.round((comp.targetLevels.reduce((a, b) => a + b, 0) / comp.targetLevels.length) * 10) / 10
          : 0;
      }

      const experts = comp.users.filter(u => u.current >= 4);

      return {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        current,
        target,
        gap: Math.max(0, target - current),
        achieved: current >= target,
        expertCount: experts.length,
        userCount: comp.users.length,
        users: comp.users
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Filter competencies by status
  const getFilteredData = () => {
    if (statusFilter === 'all') return competencyData;
    if (statusFilter === 'achieved') return competencyData.filter(c => c.achieved);
    if (statusFilter === 'onTrack') return competencyData.filter(c => !c.achieved && c.gap < 2);
    if (statusFilter === 'atRisk') return competencyData.filter(c => !c.achieved && c.gap >= 2);
    return competencyData;
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    if (competencyData.length === 0) {
      return { total: 0, achieved: 0, onTrack: 0, atRisk: 0, avgProgress: 0 };
    }

    const total = competencyData.length;
    const achieved = competencyData.filter(c => c.achieved).length;
    const atRisk = competencyData.filter(c => !c.achieved && c.gap >= 2).length;
    const onTrack = total - achieved - atRisk;
    
    const avgProgress = Math.round(
      competencyData.reduce((sum, c) => {
        const progress = c.target > 0 ? (c.current / c.target) * 100 : 100;
        return sum + Math.min(progress, 100);
      }, 0) / total
    );

    return { total, achieved, onTrack, atRisk, avgProgress };
  };

  const stats = getSummaryStats();
  const filteredData = getFilteredData();
  const selectedCompetency = competencyData.find(c => c.id === selectedCompetencyId);

  const handleCompetencyClick = (compId) => {
    if (selectedCompetencyId === compId) {
      setSelectedCompetencyId(null);
    } else {
      setSelectedCompetencyId(compId);
    }
  };

  const handleAssignCoaching = (trainee, competency) => {
    // Navigate to development center with pre-filled data
    navigate(`/development?action=create&trainee=${trainee.userId}&competency=${competency.id}&topic=${encodeURIComponent(competency.name)}`);
  };

  const getScopeLabel = () => {
    const option = scopeOptions.find(o => o.value === scope);
    return option?.label || 'Individual';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Competency Maturity Dashboard</h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'chart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                By Competency
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
            </div>

            {/* Scope Selector */}
            <div className="relative">
              <button
                onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                <span>{getScopeLabel()}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showScopeDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowScopeDropdown(false)} 
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {scopeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setScope(option.value);
                          setShowScopeDropdown(false);
                          setSelectedCompetencyId(null);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${
                          scope === option.value ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh */}
            <button
              onClick={loadCompetencyData}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">Track progress towards competency targets</p>
      </div>

      {/* Summary Stats - Clickable for filtering */}
      <div className="grid grid-cols-5 border-b border-gray-100">
        <button 
          onClick={() => setStatusFilter('all')}
          className={`p-3 text-center border-r border-gray-100 transition-colors ${
            statusFilter === 'all' ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </button>
        <button 
          onClick={() => setStatusFilter('achieved')}
          className={`p-3 text-center border-r border-gray-100 transition-colors ${
            statusFilter === 'achieved' ? 'bg-green-100' : 'bg-green-50 hover:bg-green-100'
          }`}
        >
          <p className="text-2xl font-bold text-green-600">{stats.achieved}</p>
          <p className="text-xs text-gray-500">Achieved</p>
        </button>
        <button 
          onClick={() => setStatusFilter('onTrack')}
          className={`p-3 text-center border-r border-gray-100 transition-colors ${
            statusFilter === 'onTrack' ? 'bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'
          }`}
        >
          <p className="text-2xl font-bold text-blue-600">{stats.onTrack}</p>
          <p className="text-xs text-gray-500">On Track</p>
        </button>
        <button 
          onClick={() => setStatusFilter('atRisk')}
          className={`p-3 text-center border-r border-gray-100 transition-colors ${
            statusFilter === 'atRisk' ? 'bg-amber-100' : 'bg-amber-50 hover:bg-amber-100'
          }`}
        >
          <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
          <p className="text-xs text-gray-500">At Risk</p>
        </button>
        <div className="p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p>
          <p className="text-xs text-gray-500">Avg Progress</p>
        </div>
      </div>

      {/* Filter indicator */}
      {statusFilter !== 'all' && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing: <span className="font-medium capitalize">{statusFilter}</span> ({filteredData.length})
          </span>
          <button 
            onClick={() => setStatusFilter('all')}
            className="text-sm text-purple-600 hover:text-purple-700"
          >
            Show all
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No competency data</h3>
            <p className="text-gray-500">
              {statusFilter !== 'all' 
                ? `No competencies match the "${statusFilter}" filter`
                : scope === 'individual' 
                  ? 'No competencies have been assigned yet'
                  : 'No competencies found for this scope'}
            </p>
          </div>
        ) : (
          <div>
            {/* Bar Chart */}
            <CompetencyBarChart 
              data={filteredData} 
              onCompetencyClick={handleCompetencyClick}
              selectedId={selectedCompetencyId}
            />
            
            {/* Drill-down Panel */}
            {selectedCompetency && scope !== 'individual' && (
              <TraineeDetailsPanel 
                competency={selectedCompetency}
                clientId={clientId}
                onClose={() => setSelectedCompetencyId(null)}
                onAssignCoaching={handleAssignCoaching}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer - View All Link */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => navigate('/competencies')}
          className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-1"
        >
          View all competencies
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
