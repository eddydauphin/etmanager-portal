// ============================================================================
// E&T MANAGER - MY TRAINING PAGE
// Trainee-facing page to complete assigned training modules
// Features: Slide viewer, Quiz taker, Progress tracking, Audio playback
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { dbFetch } from '../lib/db';
import {
  BookOpen,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Target,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowLeft,
  Loader2,
  Trophy,
  Star,
  ClipboardList,
  PlayCircle,
  Lock,
  Calendar,
  FileText,
  HelpCircle
} from 'lucide-react';

// Progress Ring Component
const ProgressRing = ({ percentage, size = 80, strokeWidth = 6, color = '#3b82f6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  );
};

// Training Card Component
function TrainingCard({ training, onStart, onContinue }) {
  const module = training.training_modules;
  const status = training.status;
  const dueDate = training.due_date ? new Date(training.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && status !== 'passed';
  
  const getStatusBadge = () => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <PlayCircle className="w-3.5 h-3.5" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            Not Started
          </span>
        );
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 transition-all hover:shadow-md ${
      isOverdue ? 'border-red-200' : status === 'passed' ? 'border-green-200' : 'border-gray-100'
    }`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg mb-1">{module?.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-2">{module?.description}</p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-500">
          {module?.duration_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {module.duration_minutes} min
            </span>
          )}
          {module?.pass_score && (
            <span className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              Pass: {module.pass_score}%
            </span>
          )}
          {dueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-4 h-4" />
              Due: {dueDate.toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Progress bar for in_progress */}
        {status === 'in_progress' && training.attempts > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Best Score: {training.best_score || 0}%</span>
              <span>Attempts: {training.attempts}/{module?.max_attempts || 3}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${training.best_score || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Completed info */}
        {status === 'passed' && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg mb-4">
            <Trophy className="w-8 h-8 text-green-500" />
            <div>
              <p className="font-medium text-green-700">Score: {training.best_score}%</p>
              <p className="text-sm text-green-600">
                Completed {training.completed_at ? new Date(training.completed_at).toLocaleDateString() : ''}
              </p>
            </div>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={() => status === 'pending' ? onStart(training) : onContinue(training)}
          disabled={status === 'passed' && training.attempts >= (module?.max_attempts || 3)}
          className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            status === 'passed'
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : status === 'in_progress'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
          }`}
        >
          {status === 'passed' ? (
            <>
              <RotateCcw className="w-4 h-4" />
              Review
            </>
          ) : status === 'in_progress' ? (
            <>
              <Play className="w-4 h-4" />
              Continue
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4" />
              Start Training
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Slide Viewer Component
function SlideViewer({ slides, currentSlide, setCurrentSlide, onComplete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true); // User preference for audio
  const audioRef = useRef(null);
  
  const slide = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;
  const isFirstSlide = currentSlide === 0;
  
  // Check if ANY slide in the module has audio
  const moduleHasAudio = slides.some(s => s.audio_url);

  // Stop audio when changing slides
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentSlide]);

  const playAudio = async () => {
    if (!slide?.audio_url) return;
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setAudioLoading(true);
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Audio playback failed:', error);
        }
        setAudioLoading(false);
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const toggleAudioEnabled = () => {
    if (audioEnabled && isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    setAudioEnabled(!audioEnabled);
  };

  // Parse content - handle both string and object formats
  const keyPoints = typeof slide?.content === 'string' 
    ? JSON.parse(slide.content)?.key_points || []
    : slide?.content?.key_points || [];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Slide Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-blue-100 text-sm">Slide {currentSlide + 1} of {slides.length}</p>
            <h2 className="text-xl font-semibold">{slide?.title}</h2>
          </div>
          
          {/* Audio Controls */}
          {moduleHasAudio && (
            <div className="flex items-center gap-2">
              {/* Audio Enable/Disable Toggle */}
              <button
                onClick={toggleAudioEnabled}
                className={`p-2 rounded-full transition-colors ${
                  audioEnabled 
                    ? 'bg-white/20 hover:bg-white/30' 
                    : 'bg-red-500/30 hover:bg-red-500/40'
                }`}
                title={audioEnabled ? 'Disable audio narration' : 'Enable audio narration'}
              >
                {audioEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
              
              {/* Play/Pause Button - only show if audio enabled AND slide has audio */}
              {audioEnabled && slide?.audio_url && (
                <button
                  onClick={playAudio}
                  disabled={audioLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  {audioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <>
                      <Pause className="w-5 h-5" />
                      <span className="text-sm font-medium">Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span className="text-sm font-medium">Play Audio</span>
                    </>
                  )}
                </button>
              )}
              
              {/* No audio for this slide indicator */}
              {audioEnabled && !slide?.audio_url && (
                <span className="text-xs text-blue-200 italic">No audio for this slide</span>
              )}
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Slide Content */}
      <div className="p-6 min-h-[400px]">
        <ul className="space-y-4">
          {keyPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <p className="text-gray-700 text-lg leading-relaxed pt-0.5">{point}</p>
            </li>
          ))}
        </ul>

        {/* Audio script (expandable) */}
        {slide?.audio_script && (
          <details className="mt-6 p-4 bg-gray-50 rounded-lg">
            <summary className="text-sm font-medium text-gray-600 cursor-pointer">
              View narration script
            </summary>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              {slide.audio_script}
            </p>
          </details>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
          disabled={isFirstSlide}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {/* Slide dots */}
        <div className="flex gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentSlide 
                  ? 'bg-blue-600 w-6' 
                  : index < currentSlide 
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {isLastSlide ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Start Quiz
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hidden audio element */}
      {slide?.audio_url && (
        <audio
          ref={audioRef}
          src={slide.audio_url}
          onEnded={handleAudioEnded}
        />
      )}
    </div>
  );
}

// Quiz Component
function QuizTaker({ questions, passScore, onComplete, maxAttempts, currentAttempts }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const allAnswered = Object.keys(answers).length === questions.length;
  
  // Parse options - handle both string and array formats
  const options = typeof question?.options === 'string' 
    ? JSON.parse(question.options) 
    : question?.options || [];

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [question.id]: answer });
  };

  const calculateScore = () => {
    let correct = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(q => {
      const points = q.points || 1;
      totalPoints += points;
      
      const userAnswer = answers[q.id];
      if (userAnswer === q.correct_answer) {
        correct++;
        earnedPoints += points;
      }
    });

    return Math.round((earnedPoints / totalPoints) * 100);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const calculatedScore = calculateScore();
    setScore(calculatedScore);
    setShowResults(true);
    setSubmitting(false);
    
    // Pass results back to parent
    onComplete(calculatedScore, calculatedScore >= passScore, answers);
  };

  if (showResults) {
    const passed = score >= passScore;
    
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className={`p-8 text-center ${passed ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-orange-500 to-red-500'}`}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
            {passed ? (
              <Trophy className="w-10 h-10 text-white" />
            ) : (
              <RotateCcw className="w-10 h-10 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {passed ? 'Congratulations!' : 'Keep Trying!'}
          </h2>
          <p className="text-white/90 text-lg">
            {passed 
              ? 'You have successfully passed this training module.'
              : `You need ${passScore}% to pass. You can try again.`
            }
          </p>
        </div>

        <div className="p-6">
          {/* Score display */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <ProgressRing 
                  percentage={score} 
                  size={120} 
                  strokeWidth={10}
                  color={passed ? '#10b981' : '#f59e0b'}
                />
                <span className="absolute text-3xl font-bold text-gray-900">{score}%</span>
              </div>
              <p className="mt-2 text-gray-500">Your Score</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-300">{passScore}%</div>
              <p className="text-gray-500">Pass Score</p>
            </div>
          </div>

          {/* Question breakdown */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Question Review</h3>
            <div className="space-y-3">
              {questions.map((q, index) => {
                const userAnswer = answers[q.id];
                const isCorrect = userAnswer === q.correct_answer;
                return (
                  <div 
                    key={q.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isCorrect ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">Q{index + 1}: {q.question_text}</p>
                      {!isCorrect && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Correct: {q.correct_answer}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Quiz Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center justify-between text-white">
          <div>
            <p className="text-purple-100 text-sm">Question {currentQuestion + 1} of {questions.length}</p>
            <h2 className="text-xl font-semibold">Quiz Time!</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Pass: {passScore}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="p-6">
        <div className="flex items-start gap-3 mb-6">
          <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold">
            {currentQuestion + 1}
          </span>
          <h3 className="text-lg text-gray-900 pt-1">{question?.question_text}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index); // A, B, C, D
            const isSelected = answers[question.id] === letter;
            
            return (
              <button
                key={index}
                onClick={() => handleAnswer(letter)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected 
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    isSelected 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {letter}
                  </span>
                  <span className="text-gray-700">{option}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
          Previous
        </button>

        {/* Question dots */}
        <div className="flex gap-1.5">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(index)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentQuestion 
                  ? 'bg-purple-600 w-6' 
                  : answers[q.id]
                  ? 'bg-green-500' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {isLastQuestion ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Main Page Component
export default function MyTrainingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState([]);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [slides, setSlides] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mode, setMode] = useState('list'); // 'list', 'slides', 'quiz', 'results'
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      loadTrainings();
    }
  }, [profile]);

  const loadTrainings = async () => {
    setLoading(true);
    try {
      const data = await dbFetch(
        `user_training?select=*,training_modules(*)&user_id=eq.${profile.id}&order=created_at.desc`
      );
      
      // Filter to only show published modules
      const filtered = (data || []).filter(t => t.training_modules?.status === 'published');
      setTrainings(filtered);
    } catch (error) {
      console.error('Error loading trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadModuleContent = async (training) => {
    setLoadingContent(true);
    try {
      const moduleId = training.module_id;
      
      // Load slides
      const slidesData = await dbFetch(
        `module_slides?module_id=eq.${moduleId}&order=slide_number.asc`
      );
      setSlides(slidesData || []);
      
      // Load questions
      const questionsData = await dbFetch(
        `module_questions?module_id=eq.${moduleId}&order=sort_order.asc`
      );
      setQuestions(questionsData || []);
      
    } catch (error) {
      console.error('Error loading module content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleStartTraining = async (training) => {
    setSelectedTraining(training);
    await loadModuleContent(training);
    setCurrentSlide(0);
    
    // Update status to in_progress if pending
    if (training.status === 'pending') {
      try {
        await dbFetch(`user_training?id=eq.${training.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'in_progress' })
        });
        // Update local state
        setTrainings(prev => prev.map(t => 
          t.id === training.id ? { ...t, status: 'in_progress' } : t
        ));
        setSelectedTraining({ ...training, status: 'in_progress' });
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
    
    setMode('slides');
  };

  const handleSlidesComplete = () => {
    if (questions.length > 0) {
      setMode('quiz');
    } else {
      // No quiz, mark as completed
      handleQuizComplete(100, true, {});
    }
  };

  const handleQuizComplete = async (score, passed, answers) => {
    try {
      const newAttempts = (selectedTraining.attempts || 0) + 1;
      const newBestScore = Math.max(selectedTraining.best_score || 0, score);
      
      const updateData = {
        attempts: newAttempts,
        best_score: newBestScore,
        score: score, // Also save current score
        status: passed ? 'passed' : (newAttempts >= (selectedTraining.training_modules?.max_attempts || 3) ? 'failed' : 'in_progress'),
        ...(passed && { completed_at: new Date().toISOString() })
      };

      await dbFetch(`user_training?id=eq.${selectedTraining.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });

      // Record the attempt (wrapped in try-catch in case table doesn't exist)
      try {
        await dbFetch('user_training_attempts', {
          method: 'POST',
          body: JSON.stringify({
            user_training_id: selectedTraining.id,
            user_id: profile.id,
            module_id: selectedTraining.module_id,
            attempt_number: newAttempts,
            score: score,
            passed: passed,
            answers: answers,
            completed_at: new Date().toISOString()
          })
        });
      } catch (attemptError) {
        console.warn('Could not record attempt (table may not exist):', attemptError);
      }

      // If passed, ensure user_competency record exists for linked competency
      if (passed) {
        try {
          // Get linked competency from training module
          const competencyLinks = await dbFetch(
            `competency_modules?select=competency_id,target_level&module_id=eq.${selectedTraining.module_id}`
          );
          
          if (competencyLinks && competencyLinks.length > 0) {
            const { competency_id, target_level } = competencyLinks[0];
            
            // Check if user_competency record exists
            const existingUC = await dbFetch(
              `user_competencies?select=id&user_id=eq.${profile.id}&competency_id=eq.${competency_id}`
            );
            
            if (!existingUC || existingUC.length === 0) {
              // Create user_competency record
              await dbFetch('user_competencies', {
                method: 'POST',
                body: JSON.stringify({
                  user_id: profile.id,
                  competency_id: competency_id,
                  current_level: 0,
                  target_level: target_level || 3,
                  status: 'in_progress'
                })
              });
              console.log('Created user_competency record for competency:', competency_id);
            }
          }
        } catch (ucError) {
          console.warn('Could not create user_competency record:', ucError);
        }
      }

      // Update local state
      const updatedTraining = { 
        ...selectedTraining, 
        ...updateData 
      };
      setSelectedTraining(updatedTraining);
      setTrainings(prev => prev.map(t => 
        t.id === selectedTraining.id ? updatedTraining : t
      ));

      setMode('results');
    } catch (error) {
      console.error('Error saving quiz results:', error);
    }
  };

  const handleBackToList = () => {
    setSelectedTraining(null);
    setSlides([]);
    setQuestions([]);
    setCurrentSlide(0);
    setMode('list');
    loadTrainings(); // Refresh list
  };

  const handleRetry = () => {
    setCurrentSlide(0);
    setMode('slides');
  };

  // Stats
  const stats = {
    total: trainings.length,
    completed: trainings.filter(t => t.status === 'passed').length,
    inProgress: trainings.filter(t => t.status === 'in_progress').length,
    pending: trainings.filter(t => t.status === 'pending').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading your training...</p>
        </div>
      </div>
    );
  }

  // Training View Mode (Slides or Quiz)
  if (mode !== 'list' && selectedTraining) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to My Training
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{selectedTraining.training_modules?.title}</h1>
          <p className="text-gray-500 mt-1">{selectedTraining.training_modules?.description}</p>
        </div>

        {loadingContent ? (
          <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl shadow-sm">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading content...</p>
            </div>
          </div>
        ) : mode === 'slides' ? (
          <SlideViewer
            slides={slides}
            currentSlide={currentSlide}
            setCurrentSlide={setCurrentSlide}
            onComplete={handleSlidesComplete}
          />
        ) : mode === 'quiz' ? (
          <QuizTaker
            questions={questions}
            passScore={selectedTraining.training_modules?.pass_score || 80}
            maxAttempts={selectedTraining.training_modules?.max_attempts || 3}
            currentAttempts={selectedTraining.attempts || 0}
            onComplete={handleQuizComplete}
          />
        ) : mode === 'results' ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              selectedTraining.status === 'passed' ? 'bg-green-100' : 'bg-orange-100'
            }`}>
              {selectedTraining.status === 'passed' ? (
                <Trophy className="w-10 h-10 text-green-600" />
              ) : (
                <RotateCcw className="w-10 h-10 text-orange-600" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedTraining.status === 'passed' ? 'Training Complete!' : 'Quiz Results'}
            </h2>
            
            <p className="text-gray-500 mb-6">
              Your best score: <span className="font-bold text-2xl text-gray-900">{selectedTraining.best_score}%</span>
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleBackToList}
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Back to Training List
              </button>
              
              {selectedTraining.status !== 'passed' && 
               (selectedTraining.attempts || 0) < (selectedTraining.training_modules?.max_attempts || 3) && (
                <button
                  onClick={handleRetry}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again ({(selectedTraining.training_modules?.max_attempts || 3) - (selectedTraining.attempts || 0)} attempts left)
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Training</h1>
        <p className="text-gray-500 mt-1">Complete your assigned training modules</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <PlayCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              <p className="text-sm text-gray-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Not Started</p>
            </div>
          </div>
        </div>
      </div>

      {/* Training List */}
      {trainings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Assigned</h3>
          <p className="text-gray-500">You don't have any training modules assigned yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trainings.map(training => (
            <TrainingCard
              key={training.id}
              training={training}
              onStart={handleStartTraining}
              onContinue={handleStartTraining}
            />
          ))}
        </div>
      )}
    </div>
  );
}
