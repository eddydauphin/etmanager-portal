// ============================================================================
// COMPETENCY MATURITY DASHBOARD
// Spider graph showing Current vs Target competency levels
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { dbFetch } from '../lib/db';
import {
  Target,
  ChevronRight,
  RefreshCw,
  Users,
  User,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Filter,
  Award,
  Star
} from 'lucide-react';

// ============================================================================
// RADAR CHART COMPONENT (SVG-based)
// ============================================================================

function RadarChart({ data, size = 300 }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>No competency data available</p>
      </div>
    );
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = (size / 2) - 40; // Leave room for labels
  const levels = 5; // Max level is 5
  const angleStep = (2 * Math.PI) / data.length;

  // Calculate point position
  const getPoint = (index, value) => {
    const angle = (index * angleStep) - (Math.PI / 2); // Start from top
    const r = (value / levels) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle)
    };
  };

  // Generate polygon points string
  const getPolygonPoints = (getValue) => {
    return data.map((item, i) => {
      const point = getPoint(i, getValue(item));
      return `${point.x},${point.y}`;
    }).join(' ');
  };

  // Generate level circles
  const levelCircles = [];
  for (let i = 1; i <= levels; i++) {
    const r = (i / levels) * radius;
    levelCircles.push(
      <circle
        key={i}
        cx={centerX}
        cy={centerY}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
      />
    );
  }

  // Generate axis lines and labels
  const axes = data.map((item, i) => {
    const endPoint = getPoint(i, levels);
    const labelPoint = getPoint(i, levels + 0.8);
    
    // Truncate long names
    const displayName = item.name.length > 12 
      ? item.name.substring(0, 10) + '...' 
      : item.name;

    return (
      <g key={i}>
        <line
          x1={centerX}
          y1={centerY}
          x2={endPoint.x}
          y2={endPoint.y}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        <text
          x={labelPoint.x}
          y={labelPoint.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-xs fill-gray-600"
          style={{ fontSize: '10px' }}
        >
          {displayName}
        </text>
      </g>
    );
  });

  // Target polygon (outer line)
  const targetPoints = getPolygonPoints(item => item.target || 0);
  
  // Current polygon (filled area)
  const currentPoints = getPolygonPoints(item => item.current || 0);

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background circles */}
      {levelCircles}
      
      {/* Level labels */}
      {[1, 2, 3, 4, 5].map(level => (
        <text
          key={level}
          x={centerX + 8}
          y={centerY - (level / levels) * radius}
          className="text-xs fill-gray-400"
          style={{ fontSize: '9px' }}
        >
          {level}
        </text>
      ))}
      
      {/* Axes */}
      {axes}
      
      {/* Target polygon (orange/red dashed line) */}
      <polygon
        points={targetPoints}
        fill="none"
        stroke="#f97316"
        strokeWidth="2"
        strokeDasharray="5,3"
      />
      
      {/* Current polygon (blue filled) */}
      <polygon
        points={currentPoints}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      
      {/* Data points - Current */}
      {data.map((item, i) => {
        const point = getPoint(i, item.current || 0);
        return (
          <circle
            key={`current-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
        );
      })}
      
      {/* Data points - Target */}
      {data.map((item, i) => {
        const point = getPoint(i, item.target || 0);
        return (
          <circle
            key={`target-${i}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill="#f97316"
            stroke="white"
            strokeWidth="1"
          />
        );
      })}
    </svg>
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
  const [loading, setLoading] = useState(true);
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'list'

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
        // Get specific user's competencies
        const userId = selectedUserId || profile?.id;
        if (userId) {
          userCompetencies = await dbFetch(
            `user_competencies?select=*,competency:competency_id(id,name,description)&user_id=eq.${userId}`
          );
        }
      } else if (scope === 'team') {
        // Get team's competencies (users reporting to current user or in same team)
        let teamUserIds = [];
        
        if (profile?.role === 'team_lead') {
          // Get direct reports
          const teamUsers = await dbFetch(
            `profiles?select=id&reports_to_id=eq.${profile.id}&is_active=eq.true`
          );
          teamUserIds = teamUsers?.map(u => u.id) || [];
          teamUserIds.push(profile.id); // Include self
        } else if (clientId) {
          // Get all users in client for admins
          const clientUsers = await dbFetch(
            `profiles?select=id&client_id=eq.${clientId}&is_active=eq.true`
          );
          teamUserIds = clientUsers?.map(u => u.id) || [];
        }

        if (teamUserIds.length > 0) {
          userCompetencies = await dbFetch(
            `user_competencies?select=*,competency:competency_id(id,name,description)&user_id=in.(${teamUserIds.join(',')})`
          );
        }
      } else if (scope === 'organization') {
        // Get all competencies for the organization
        if (clientId) {
          const clientUsers = await dbFetch(
            `profiles?select=id&client_id=eq.${clientId}&is_active=eq.true`
          );
          const userIds = clientUsers?.map(u => u.id) || [];
          
          if (userIds.length > 0) {
            userCompetencies = await dbFetch(
              `user_competencies?select=*,competency:competency_id(id,name,description)&user_id=in.(${userIds.join(',')})`
            );
          }
        }
      }

      // Process and aggregate data
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

    // Group by competency
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
        current: uc.current_level || 0,
        target: uc.target_level || 0
      });
    });

    // Calculate aggregates based on scope
    return Object.values(grouped).map(comp => {
      let current, target;

      if (scope === 'individual') {
        // Just take the single value
        current = comp.currentLevels[0] || 0;
        target = comp.targetLevels[0] || 0;
      } else if (scope === 'team') {
        // Average for team
        current = comp.currentLevels.length > 0 
          ? Math.round((comp.currentLevels.reduce((a, b) => a + b, 0) / comp.currentLevels.length) * 10) / 10
          : 0;
        target = comp.targetLevels.length > 0
          ? Math.round((comp.targetLevels.reduce((a, b) => a + b, 0) / comp.targetLevels.length) * 10) / 10
          : 0;
      } else {
        // Max for organization (to see expertise peaks)
        current = Math.max(...comp.currentLevels, 0);
        target = Math.max(...comp.targetLevels, 0);
      }

      // Find experts (Level 4+)
      const experts = comp.users.filter(u => u.current >= 4);

      return {
        id: comp.id,
        name: comp.name,
        description: comp.description,
        current,
        target,
        gap: target - current,
        achieved: current >= target,
        expertCount: experts.length,
        userCount: comp.users.length
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    if (competencyData.length === 0) {
      return { total: 0, achieved: 0, onTrack: 0, atRisk: 0, avgProgress: 0 };
    }

    const total = competencyData.length;
    const achieved = competencyData.filter(c => c.achieved).length;
    const atRisk = competencyData.filter(c => c.gap >= 2).length;
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

  // Get scope label
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
            <h3 className="font-semibold text-gray-900">Competency Maturity Dashboard</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'chart' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                By Competency
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                List View
              </button>
            </div>

            {/* Scope Selector */}
            <div className="relative">
              <button
                onClick={() => setShowScopeDropdown(!showScopeDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
              >
                <Filter className="w-4 h-4 text-gray-500" />
                {getScopeLabel()}
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

      {/* Summary Stats */}
      <div className="grid grid-cols-5 border-b border-gray-100">
        <div className="p-3 text-center border-r border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="p-3 text-center border-r border-gray-100 bg-green-50">
          <p className="text-2xl font-bold text-green-600">{stats.achieved}</p>
          <p className="text-xs text-gray-500">Achieved</p>
        </div>
        <div className="p-3 text-center border-r border-gray-100 bg-blue-50">
          <p className="text-2xl font-bold text-blue-600">{stats.onTrack}</p>
          <p className="text-xs text-gray-500">On Track</p>
        </div>
        <div className="p-3 text-center border-r border-gray-100 bg-amber-50">
          <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
          <p className="text-xs text-gray-500">At Risk</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats.avgProgress}%</p>
          <p className="text-xs text-gray-500">Avg Progress</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {competencyData.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No competency data</h3>
            <p className="text-gray-500">
              {scope === 'individual' 
                ? 'No competencies have been assigned yet'
                : 'No competencies found for this scope'}
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Radar Chart */}
            <div className="flex-1 flex justify-center">
              <RadarChart data={competencyData} size={320} />
            </div>

            {/* Legend & Details */}
            <div className="lg:w-80 space-y-4">
              {/* Legend */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-blue-500"></div>
                  <span className="text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-orange-500 border-dashed" style={{ borderStyle: 'dashed' }}></div>
                  <span className="text-gray-600">Target</span>
                </div>
              </div>

              {/* Competency List */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {competencyData.map(comp => (
                  <div 
                    key={comp.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => navigate(`/competencies?id=${comp.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{comp.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-blue-600">L{comp.current}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-orange-600">L{comp.target}</span>
                        {comp.achieved ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : comp.gap >= 2 ? (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>

              {/* Expert Candidates - for Organization scope */}
              {scope === 'organization' && (
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Expert Candidates (L4+)
                  </h4>
                  <div className="space-y-1">
                    {competencyData.filter(c => c.current >= 4).length === 0 ? (
                      <p className="text-sm text-gray-500">No Level 4+ experts yet</p>
                    ) : (
                      competencyData
                        .filter(c => c.current >= 4)
                        .map(comp => (
                          <div key={comp.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{comp.name}</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              L{comp.current}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {competencyData.map(comp => {
              const progressPercent = comp.target > 0 ? Math.min((comp.current / comp.target) * 100, 100) : 100;
              
              return (
                <div 
                  key={comp.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                  onClick={() => navigate(`/competencies?id=${comp.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{comp.name}</p>
                      {comp.achieved && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Achieved
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{comp.description}</p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-blue-600 font-medium">L{comp.current}</span>
                      <span className="text-orange-600">Target: L{comp.target}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full ${comp.achieved ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                      {/* Target marker */}
                      <div 
                        className="absolute top-0 h-full w-0.5 bg-orange-500"
                        style={{ left: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-20 text-right">
                    {comp.achieved ? (
                      <span className="text-green-600 text-sm">✓</span>
                    ) : comp.gap >= 2 ? (
                      <span className="text-amber-600 text-sm">⚠ Gap: {comp.gap}</span>
                    ) : (
                      <span className="text-blue-600 text-sm">Gap: {comp.gap}</span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              );
            })}
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
