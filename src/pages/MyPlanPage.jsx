import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  Target,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Award
} from 'lucide-react';

export default function MyPlanPage() {
  const { profile } = useAuth();
  
  const [competencies, setCompetencies] = useState([]);
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load competencies with gaps
      const compData = await dbFetch(
        `user_competencies?user_id=eq.${profile.id}&select=*,competencies(id,name,competency_categories(name,color))&order=created_at.desc`
      );
      setCompetencies(compData || []);

      // Load assigned training
      const trainingData = await dbFetch(
        `user_training?user_id=eq.${profile.id}&select=*,training_modules(title,pass_score)&order=due_date.asc`
      );
      setTraining(trainingData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'achieved': 
      case 'passed': 
        return 'bg-green-100 text-green-700';
      case 'in_progress': 
        return 'bg-blue-100 text-blue-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default: 
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Items with gaps or pending
  const competencyGaps = competencies.filter(c => 
    (c.target_level || 3) > (c.current_level || 1) && c.status !== 'achieved'
  );

  const pendingTraining = training.filter(t => 
    t.status === 'pending' || t.status === 'in_progress'
  );

  const upcomingDeadlines = training
    .filter(t => t.due_date && t.status !== 'passed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

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
        <h1 className="text-2xl font-bold text-gray-900">My Development Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Your learning roadmap and upcoming tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{competencyGaps.length}</p>
              <p className="text-sm text-gray-500">Skills to Develop</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingTraining.length}</p>
              <p className="text-sm text-gray-500">Training Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {training.filter(t => t.status === 'passed').length}
              </p>
              <p className="text-sm text-gray-500">Training Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {competencies.filter(c => c.status === 'achieved').length}
              </p>
              <p className="text-sm text-gray-500">Skills Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Gaps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            Skills to Develop
          </h2>

          {competencyGaps.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500">No skill gaps!</p>
              <p className="text-sm text-gray-400">You've achieved all your targets.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {competencyGaps.map(comp => {
                const gap = (comp.target_level || 3) - (comp.current_level || 1);
                
                return (
                  <div key={comp.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{comp.competencies?.name}</h3>
                      <span className="text-xs text-amber-600 font-medium">
                        +{gap} level{gap > 1 ? 's' : ''} needed
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Level {comp.current_level || 1}</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${((comp.current_level || 1) / (comp.target_level || 3)) * 100}%` }}
                        />
                      </div>
                      <span className="text-gray-500">Level {comp.target_level || 3}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Upcoming Deadlines
          </h2>

          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming deadlines</p>
              <p className="text-sm text-gray-400">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {upcomingDeadlines.map(item => {
                const dueDate = new Date(item.due_date);
                const today = new Date();
                const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                const isOverdue = daysLeft < 0;
                const isUrgent = daysLeft <= 3 && daysLeft >= 0;

                return (
                  <div 
                    key={item.id} 
                    className={`border rounded-lg p-3 ${
                      isOverdue ? 'border-red-300 bg-red-50' :
                      isUrgent ? 'border-amber-300 bg-amber-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.training_modules?.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                          {isOverdue && (
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          isOverdue ? 'text-red-600' :
                          isUrgent ? 'text-amber-600' :
                          'text-gray-600'
                        }`}>
                          {dueDate.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {isOverdue ? `${Math.abs(daysLeft)} days overdue` :
                           daysLeft === 0 ? 'Due today' :
                           daysLeft === 1 ? 'Due tomorrow' :
                           `${daysLeft} days left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pending Training */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Pending Training
        </h2>

        {pendingTraining.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending training</p>
            <p className="text-sm text-gray-400">All training modules completed!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTraining.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{item.training_modules?.title}</h3>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                    {item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                  </span>
                  {item.due_date && (
                    <span className="text-xs text-gray-500">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
