import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  BookOpen,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Target,
  AlertCircle,
  RotateCcw,
  Lock,
  Calendar,
  TrendingUp
} from 'lucide-react';

export default function MyTrainingPage() {
  const { profile } = useAuth();
  
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  
  // Viewer state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  
  // Quiz state
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadAssignments();
    }
  }, [profile]);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const data = await dbFetch(
        `user_training?user_id=eq.${profile.id}&select=*,training_modules(*,competency_modules(competencies(name)))&order=assigned_date.desc`
      );
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTraining = async (assignment) => {
    try {
      // Load slides
      const slidesData = await dbFetch(
        `module_slides?module_id=eq.${assignment.module_id}&order=slide_number.asc`
      );
      setSlides(slidesData || []);
      
      // Update status to in_progress if pending
      if (assignment.status === 'pending') {
        await dbFetch(`user_training?id=eq.${assignment.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_progress' })
        });
      }
      
      setSelectedTraining(assignment);
      setCurrentSlide(0);
      setShowViewer(true);
    } catch (error) {
      console.error('Error starting training:', error);
    }
  };

  const startQuiz = async () => {
    try {
      // Check if max attempts reached
      if (selectedTraining.attempts_count >= selectedTraining.training_modules?.max_attempts) {
        alert('Maximum attempts reached. Contact your administrator.');
        return;
      }

      // Load questions
      const questionsData = await dbFetch(
        `module_questions?module_id=eq.${selectedTraining.module_id}&order=sort_order.asc`
      );
      setQuestions(questionsData || []);
      setCurrentQuestion(0);
      setAnswers({});
      setQuizSubmitted(false);
      setQuizResult(null);
      setShowViewer(false);
      setShowQuiz(true);
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  };

  const selectAnswer = (questionId, answer) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    try {
      // Calculate score
      let correctCount = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) {
          correctCount++;
        }
      });
      
      const score = Math.round((correctCount / questions.length) * 100);
      const passScore = selectedTraining.training_modules?.pass_score || 80;
      const passed = score >= passScore;
      
      // Save attempt
      const attemptNumber = (selectedTraining.attempts_count || 0) + 1;
      await dbFetch('user_training_attempts', {
        method: 'POST',
        body: JSON.stringify({
          user_training_id: selectedTraining.id,
          attempt_number: attemptNumber,
          score: score,
          passed: passed,
          answers: answers,
          completed_at: new Date().toISOString()
        })
      });
      
      // Update user_training
      const updateData = {
        attempts_count: attemptNumber,
        best_score: Math.max(selectedTraining.best_score || 0, score)
      };
      
      if (passed) {
        updateData.status = 'passed';
        updateData.completed_at = new Date().toISOString();
      } else if (attemptNumber >= (selectedTraining.training_modules?.max_attempts || 3)) {
        updateData.status = 'failed';
      }
      
      await dbFetch(`user_training?id=eq.${selectedTraining.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      // If passed, update competency level
      if (passed && selectedTraining.user_competency_id) {
        const competencyModule = selectedTraining.training_modules?.competency_modules?.[0];
        if (competencyModule) {
          await dbFetch(`user_competencies?id=eq.${selectedTraining.user_competency_id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              current_level: competencyModule.target_level,
              status: 'achieved'
            })
          });
        }
      }
      
      setQuizResult({ score, passed, correctCount, total: questions.length });
      setQuizSubmitted(true);
      
      // Reload assignments
      await loadAssignments();
    } catch (error) {
      console.error('Error submitting quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const closeAll = () => {
    setShowViewer(false);
    setShowQuiz(false);
    setSelectedTraining(null);
    setSlides([]);
    setQuestions([]);
    setAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'passed').length,
    inProgress: assignments.filter(a => a.status === 'in_progress').length,
    pending: assignments.filter(a => a.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Slide Viewer
  if (showViewer && selectedTraining) {
    const slide = slides[currentSlide];
    
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{selectedTraining.training_modules?.title}</h1>
            <p className="text-sm text-gray-400">Slide {currentSlide + 1} of {slides.length}</p>
          </div>
          <button
            onClick={closeAll}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            Exit
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-700">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Slide content */}
        <div className="max-w-4xl mx-auto p-8">
          {slide ? (
            <div className="bg-gray-800 rounded-xl p-8 min-h-[400px]">
              <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
              
              <div className="space-y-4 mb-8">
                {slide.content?.key_points?.map((point, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-xl text-gray-200">{point}</p>
                  </div>
                ))}
              </div>

              {slide.audio_script && (
                <div className="bg-gray-700 rounded-lg p-4 mt-6">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm">Narrator Script</span>
                  </div>
                  <p className="text-gray-300">{slide.audio_script}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-400">No slides available</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentSlide ? 'bg-blue-500' : 
                    i < currentSlide ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {currentSlide < slides.length - 1 ? (
              <button
                onClick={() => setCurrentSlide(currentSlide + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={startQuiz}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
              >
                Take Quiz
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz View
  if (showQuiz && selectedTraining) {
    const question = questions[currentQuestion];
    const allAnswered = questions.every(q => answers[q.id] !== undefined);
    
    if (quizSubmitted && quizResult) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              quizResult.passed ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {quizResult.passed ? (
                <CheckCircle className="w-10 h-10 text-green-600" />
              ) : (
                <XCircle className="w-10 h-10 text-red-600" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {quizResult.passed ? 'Congratulations!' : 'Not Passed'}
            </h2>
            
            <p className="text-gray-600 mb-4">
              You scored {quizResult.score}% ({quizResult.correctCount}/{quizResult.total} correct)
            </p>
            
            <div className="text-sm text-gray-500 mb-6">
              Pass score: {selectedTraining.training_modules?.pass_score || 80}%
            </div>

            {!quizResult.passed && selectedTraining.attempts_count < (selectedTraining.training_modules?.max_attempts || 3) && (
              <p className="text-sm text-amber-600 mb-6">
                You have {(selectedTraining.training_modules?.max_attempts || 3) - selectedTraining.attempts_count} attempts remaining
              </p>
            )}
            
            <button
              onClick={closeAll}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Training
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Quiz: {selectedTraining.training_modules?.title}</h1>
              <p className="text-sm text-gray-500">Question {currentQuestion + 1} of {questions.length}</p>
            </div>
            <button
              onClick={closeAll}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="max-w-3xl mx-auto p-6">
          {question && (
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-medium text-gray-900 mb-6">
                {currentQuestion + 1}. {question.question_text}
              </h2>
              
              <div className="space-y-3">
                {question.options?.map((option, i) => {
                  const letter = option.charAt(0);
                  const isSelected = answers[question.id] === letter;
                  
                  return (
                    <button
                      key={i}
                      onClick={() => selectAnswer(question.id, letter)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {letter}
                      </span>
                      {option.substring(3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <div className="flex gap-1">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i === currentQuestion ? 'bg-blue-500' : 
                    answers[q.id] ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={() => setCurrentQuestion(currentQuestion + 1)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={!allAnswered || submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Training</h1>
        <p className="text-sm text-gray-500 mt-1">Complete your assigned training modules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Assigned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Training List */}
      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Assigned</h3>
          <p className="text-gray-500">You don't have any training modules assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => {
            const module = assignment.training_modules;
            const maxAttempts = module?.max_attempts || 3;
            const attemptsLeft = maxAttempts - (assignment.attempts_count || 0);
            const isLocked = assignment.status === 'failed' && attemptsLeft <= 0;
            
            return (
              <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{module?.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                        {assignment.status === 'passed' ? 'Completed' : 
                         assignment.status === 'failed' ? 'Failed' :
                         assignment.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    
                    {module?.description && (
                      <p className="text-sm text-gray-500 mb-3">{module.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {module?.competency_modules?.[0]?.competencies?.name && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          <span>{module.competency_modules[0].competencies.name}</span>
                        </div>
                      )}
                      
                      {assignment.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Due: {new Date(assignment.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        <span>Pass: {module?.pass_score}%</span>
                      </div>
                      
                      {assignment.best_score !== null && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Best: {assignment.best_score}%</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <RotateCcw className="w-4 h-4" />
                        <span>Attempts: {assignment.attempts_count || 0}/{maxAttempts}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {isLocked ? (
                      <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4" />
                        Locked
                      </button>
                    ) : assignment.status === 'passed' ? (
                      <button
                        onClick={() => startTraining(assignment)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Review
                      </button>
                    ) : (
                      <button
                        onClick={() => startTraining(assignment)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Play className="w-4 h-4" />
                        {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
