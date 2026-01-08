// ============================================================================
// COMPETENCY GAP ANALYSIS
// Clear table showing Current vs Target levels with actionable gaps
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dbFetch } from '../lib/db';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  User,
  Users,
  Building2,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Filter,
  RefreshCw,
  ArrowRight,
  Zap
} from 'lucide-react';

export default function CompetencyGapAnalysis({ 
  profile, 
  clientId,
  viewMode = 'manager', // 'manager' (see team) or 'individual' (see self)
  maxRows = 10,
  showFilters = true,
  onActionClick
}) {
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'critical', 'behind', 'on-track'
  const [sortBy, setSortBy] = useState('gap'); // 'gap', 'trainee', 'competency'

  useEffect(() => {
    loadGapData();
  }, [profile, clientId, viewMode]);

  const loadGapData = async () => {
    setLoading(true);
    try {
      let userIds = [];

      if (viewMode === 'individual') {
        userIds = [profile?.id];
      } else {
        // Manager view - get team members
        if (profile?.role === 'team_lead') {
          const teamUsers = await dbFetch(
            `profiles?select=id,full_name&reports_to_id=eq.${profile.id}&is_active=eq.true`
          );
          userIds = teamUsers?.map(u => u.id) || [];
        } else if (profile?.role === 'department_lead' && profile?.department) {
          const deptUsers = await dbFetch(
            `profiles?select=id,full_name&client_id=eq.${clientId}&department=eq.${profile.department}&is_active=eq.true`
          );
          userIds = deptUsers?.map(u => u.id) || [];
        } else if (clientId) {
          // Client admin or super admin - get all users
          const allUsers = await dbFetch(
            `profiles?select=id,full_name&client_id=eq.${clientId}&role=eq.trainee&is_active=eq.true`
          );
          userIds = allUsers?.map(u => u.id) || [];
        }
      }

      if (userIds.length === 0) {
        setGaps([]);
        setLoading(false);
        return;
      }

      // Get user competencies with competency details
      const userComps = await dbFetch(
        `user_competencies?select=*,
          user:user_id(id,full_name,email),
          competency:competency_id(id,name,description,competency_tag_links(competency_tags(id,name,color)))
        &user_id=in.(${userIds.join(',')})
        &order=created_at.desc`
      );

      // Get training modules linked to competencies (to show available actions)
      const competencyIds = [...new Set(userComps?.map(uc => uc.competency_id).filter(Boolean))];
      let trainingModules = [];
      if (competencyIds.length > 0) {
        const moduleLinks = await dbFetch(
          `competency_modules?select=competency_id,module:module_id(id,title,status)&competency_id=in.(${competencyIds.join(',')})`
        );
        trainingModules = moduleLinks || [];
      }

      // Process into gap analysis rows
      const gapRows = (userComps || []).map(uc => {
        const current = uc.current_level || 0;
        const target = uc.target_level || 3;
        const gap = target - current;
        const tags = uc.competency?.competency_tag_links?.map(tl => tl.competency_tags).filter(Boolean) || [];
        
        // Find available training for this competency
        const availableTraining = trainingModules
          .filter(tm => tm.competency_id === uc.competency_id && tm.module?.status === 'published')
          .map(tm => tm.module);

        return {
          id: uc.id,
          user: uc.user,
          competency: uc.competency,
          tags,
          current,
          target,
          gap,
          status: gap <= 0 ? 'achieved' : gap >= 2 ? 'critical' : 'behind',
          hasTraining: availableTraining.length > 0,
          trainingModule: availableTraining[0] || null,
          lastUpdated: uc.updated_at
        };
      });

      // Sort by gap (biggest first)
      gapRows.sort((a, b) => b.gap - a.gap);

      setGaps(gapRows);
    } catch (error) {
      console.error('Error loading gap data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter gaps
  const filteredGaps = gaps.filter(g => {
    if (filter === 'all') return true;
    if (filter === 'critical') return g.gap >= 2;
    if (filter === 'behind') return g.gap === 1;
    if (filter === 'on-track') return g.gap <= 0;
    return true;
  });

  // Sort gaps
  const sortedGaps = [...filteredGaps].sort((a, b) => {
    if (sortBy === 'gap') return b.gap - a.gap;
    if (sortBy === 'trainee') return (a.user?.full_name || '').localeCompare(b.user?.full_name || '');
    if (sortBy === 'competency') return (a.competency?.name || '').localeCompare(b.competency?.name || '');
    return 0;
  });

  // Stats
  const stats = {
    total: gaps.length,
    critical: gaps.filter(g => g.gap >= 2).length,
    behind: gaps.filter(g => g.gap === 1).length,
    achieved: gaps.filter(g => g.gap <= 0).length
  };

  const getGapColor = (gap) => {
    if (gap <= 0) return 'text-green-600 bg-green-50';
    if (gap === 1) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getGapIcon = (gap) => {
    if (gap <= 0) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (gap === 1) return <TrendingUp className="w-4 h-4 text-amber-500" />;
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
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
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Competency Gap Analysis</h3>
          </div>
          <button 
            onClick={loadGapData}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All <span className="opacity-70">{stats.total}</span>
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'critical' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Critical <span className="opacity-70">{stats.critical}</span>
          </button>
          <button
            onClick={() => setFilter('behind')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'behind' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Behind <span className="opacity-70">{stats.behind}</span>
          </button>
          <button
            onClick={() => setFilter('on-track')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'on-track' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Achieved <span className="opacity-70">{stats.achieved}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      {sortedGaps.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No competency assignments found</p>
          <p className="text-sm mt-1">Assign competencies to trainees to see gap analysis</p>
          <Link 
            to="/competencies"
            className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:underline text-sm"
          >
            Go to Competencies <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {viewMode === 'manager' && (
                  <th 
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                    onClick={() => setSortBy('trainee')}
                  >
                    Trainee {sortBy === 'trainee' && '↓'}
                  </th>
                )}
                <th 
                  className="px-4 py-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortBy('competency')}
                >
                  Competency {sortBy === 'competency' && '↓'}
                </th>
                <th className="px-4 py-3 text-center">Current</th>
                <th className="px-4 py-3 text-center">Target</th>
                <th 
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100"
                  onClick={() => setSortBy('gap')}
                >
                  Gap {sortBy === 'gap' && '↓'}
                </th>
                <th className="px-4 py-3 text-center">Close Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedGaps.slice(0, maxRows).map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {viewMode === 'manager' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                          {row.user?.full_name?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-gray-900 text-sm">
                          {row.user?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{row.competency?.name}</p>
                      <div className="flex gap-1 mt-1">
                        {row.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color || '#6B7280' }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {row.current}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">
                      {row.target}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getGapColor(row.gap)}`}>
                      {getGapIcon(row.gap)}
                      {row.gap <= 0 ? '✓' : `-${row.gap}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {row.gap > 0 ? (
                        <>
                          {row.hasTraining ? (
                            <Link
                              to={`/training?module=${row.trainingModule?.id}`}
                              className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                              title="Training available"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Link>
                          ) : (
                            <Link
                              to={`/training?create=true&competency=${row.competency?.id}`}
                              className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"
                              title="Create training"
                            >
                              <Zap className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => onActionClick?.('coaching', row)}
                            className="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100"
                            title="Schedule coaching"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onActionClick?.('activity', row)}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                            title="Assign OJT task"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-green-600 text-xs font-medium">Complete</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {sortedGaps.length > maxRows && (
        <div className="p-3 border-t border-gray-100 text-center">
          <Link 
            to="/competencies"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            View all {sortedGaps.length} gaps <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
