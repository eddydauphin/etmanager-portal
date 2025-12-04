import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  TrendingUp,
  Target,
  Award,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
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
  const radius = (size / 2) - 40;
  const levels = 5;
  const angleStep = (2 * Math.PI) / data.length;

  const getPoint = (index, value) => {
    const angle = (index * angleStep) - (Math.PI / 2);
    const r = (value / 5) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const currentPoints = data.map((item, i) => getPoint(i, item.current));
  const targetPoints = data.map((item, i) => getPoint(i, item.target));

  const createPolygonPoints = (points) => 
    points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} className="mx-auto">
      {[...Array(levels)].map((_, i) => {
        const levelRadius = ((i + 1) / levels) * radius;
        const points = data.map((_, idx) => {
          const angle = (idx * angleStep) - (Math.PI / 2);
          return `${center + levelRadius * Math.cos(angle)},${center + levelRadius * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        );
      })}

      {data.map((_, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
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

      <polygon
        points={createPolygonPoints(targetPoints)}
        fill="rgba(251, 191, 36, 0.2)"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeDasharray="5,5"
      />

      <polygon
        points={createPolygonPoints(currentPoints)}
        fill="rgba(59, 130, 246, 0.3)"
        stroke="#3b82f6"
        strokeWidth="2"
      />

      {data.map((item, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
        const labelRadius = radius + 25;
        const x = center + labelRadius * Math.cos(angle);
        const y = center + labelRadius * Math.sin(angle);
        
        const truncatedName = item.name.length > 12 
          ? item.name.substring(0, 12) + '...' 
          : item.name;
        
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs fill-gray-600"
            style={{ fontSize: '10px' }}
          >
            {truncatedName}
          </text>
        );
      })}
    </svg>
  );
};

export default function MyProgressPage() {
  const { profile } = useAuth();
  
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadCompetencies();
    }
  }, [profile]);

  const loadCompetencies = async () => {
    setLoading(true);
    try {
      const data = await dbFetch(
        `user_competencies?user_id=eq.${profile.id}&select=*,competencies(id,name,description,competency_categories(name,color))&order=created_at.desc`
      );
      setCompetencies(data || []);
    } catch (error) {
      console.error('Error loading competencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-lime-500',
      5: 'bg-green-500'
    };
    return colors[level] || 'bg-gray-300';
  };

  // Stats
  const stats = {
    total: competencies.length,
    achieved: competencies.filter(c => c.status === 'achieved').length,
    inProgress: competencies.filter(c => c.status === 'in_progress').length,
    avgLevel: competencies.length > 0 
      ? (competencies.reduce((sum, c) => sum + (c.current_level || 1), 0) / competencies.length).toFixed(1)
      : 0
  };

  // Spider chart data
  const chartData = competencies.map(c => ({
    name: c.competencies?.name || 'Unknown',
    current: c.current_level || 1,
    target: c.target_level || 3
  }));

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="text-sm text-gray-500 mt-1">Track your competency development</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Assigned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.achieved}</p>
              <p className="text-sm text-gray-500">Achieved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgLevel}</p>
              <p className="text-sm text-gray-500">Avg Level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spider Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Competency Overview</h2>
          <div className="flex items-center justify-center gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-gray-600">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
              <span className="text-gray-600">Target</span>
            </div>
          </div>
          <SpiderChart data={chartData} size={300} />
        </div>

        {/* Competency List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Competencies</h2>
          
          {competencies.length === 0 ? (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No competencies assigned yet.</p>
              <p className="text-sm text-gray-400">Contact your manager to get started.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {competencies.map(comp => {
                const gap = (comp.target_level || 3) - (comp.current_level || 1);
                
                return (
                  <div key={comp.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{comp.competencies?.name}</h3>
                        {comp.competencies?.competency_categories?.name && (
                          <span 
                            className="inline-block px-2 py-0.5 rounded-full text-xs mt-1"
                            style={{ 
                              backgroundColor: `${comp.competencies.competency_categories.color}20`,
                              color: comp.competencies.competency_categories.color 
                            }}
                          >
                            {comp.competencies.competency_categories.name}
                          </span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(comp.status)}`}>
                        {comp.status === 'achieved' ? 'Achieved' : 
                         comp.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Current</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                level <= (comp.current_level || 1)
                                  ? `${getLevelColor(level)} text-white`
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              {level}
                            </div>
                          ))}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400" />

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Target</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(level => (
                            <div
                              key={level}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                level <= (comp.target_level || 3)
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}
                            >
                              {level}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {gap > 0 && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {gap} level{gap > 1 ? 's' : ''} to target
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
