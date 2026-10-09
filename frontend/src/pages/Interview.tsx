import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { interviewApi } from '../services/interview';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useCamera } from '../hooks/useCamera';
import type { Interview, QuestionAnswer } from '../types';

export function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const questionStartTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingQuestionRef = useRef<string | null>(null);

  const {
    isRecording,
    transcript,
    setTranscript,
    voiceMetrics,
    error: voiceError,
    startRecording,
    stopRecording,
    reset
  } = useVoiceRecorder();

  const { videoRef, stream, isActive: cameraActive, error: cameraError, startCamera, stopCamera, getCameraMetrics } = useCamera();

  useEffect(() => {
    if (id) loadInterview();
  }, [id]);

  useEffect(() => {
    if (voiceError) setError(voiceError);
  }, [voiceError]);

  useEffect(() => {
    if (cameraError) setError(cameraError);
  }, [cameraError]);

  // Speak pending question when page is ready
  useEffect(() => {
    if (pageReady && pendingQuestionRef.current && !speaking) {
      const text = pendingQuestionRef.current;
      pendingQuestionRef.current = null;
      setTimeout(() => speakQuestion(text), 800);
    }
  }, [pageReady, speaking]);

  // Stop camera when interview completes
  useEffect(() => {
    if (completed && cameraActive) {
      stopCamera();
    }
  }, [completed, cameraActive, stopCamera]);

  // Cleanup on component unmount (navigation away)
  useEffect(() => {
    return () => {
      if (cameraActive) stopCamera();
      if (isRecording) stopRecording();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [cameraActive, isRecording, stopCamera, stopRecording]);

  // Also cleanup on route change
  useEffect(() => {
    return () => {
      stopCamera();
      window.speechSynthesis?.cancel();
    };
  }, [location, stopCamera]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || !interview) return;
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, interview]);

  // Waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const bars = 64;
    const barWidth = (canvas.offsetWidth / bars) * 0.6;
    const gap = (canvas.offsetWidth / bars) * 0.4;
    const barHeights = new Array(bars).fill(0).map(() => Math.random() * 0.3 + 0.1);
    const targetHeights = new Array(bars).fill(0);

    const animate = () => {
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      const centerY = canvas.offsetHeight / 2;
      const maxHeight = canvas.offsetHeight * 0.4;

      // Update target heights based on voice metrics
      if (voiceMetrics?.volume.length) {
        const avgVolume = voiceMetrics.volume.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, voiceMetrics.volume.length);
        for (let i = 0; i < bars; i++) {
          const variation = 0.5 + Math.sin(Date.now() / 200 + i * 0.5) * 0.3;
          targetHeights[i] = Math.max(0.1, avgVolume * variation * 2);
        }
      } else {
        for (let i = 0; i < bars; i++) {
          targetHeights[i] = 0.1 + Math.sin(Date.now() / 300 + i * 0.3) * 0.15;
        }
      }

      // Smooth interpolation
      for (let i = 0; i < bars; i++) {
        barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.3;
        
        const height = barHeights[i] * maxHeight;
        const x = i * (barWidth + gap) + gap / 2;
        const y = centerY - height / 2;
        
        // Gradient for bars
        const gradient = ctx.createLinearGradient(0, centerY - height / 2, 0, centerY + height / 2);
        gradient.addColorStop(0, '#10B981');
        gradient.addColorStop(0.5, '#3B82F6');
        gradient.addColorStop(1, '#10B981');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording, voiceMetrics]);

  async function loadInterview() {
    try {
      let data = await interviewApi.get(parseInt(id!));
      
      if (data.cameraEnabled && !cameraStarted) {
        await startCamera();
        setCameraStarted(true);
      }

      if (data.status === 'SETUP') {
        data = await interviewApi.start(parseInt(id!));
      }

      setInterview(data);

      if (data.status === 'COMPLETED' || data.status === 'PARTIAL') {
        setCompleted(true);
        return;
      }

      // Start timer
      if (data.durationMinutes && data.startedAt) {
        const elapsed = Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000);
        const total = data.durationMinutes * 60;
        setTimeRemaining(Math.max(0, total - elapsed));
        setTimerActive(true);
      }

      const unanswered = data.questionAnswers.find(
        q => q.status === 'PENDING' || q.status === 'ASKED'
      );

      if (unanswered) {
        setCurrentQuestion(unanswered);
        if (unanswered.status === 'ASKED') {
          pendingQuestionRef.current = unanswered.questionText;
        } else if (unanswered.status === 'PENDING') {
          await interviewApi.start(parseInt(id!));
          await getNextQuestion();
        }
      } else if (data.status === 'IN_PROGRESS') {
        await getNextQuestion();
      }

    } catch (err) {
      console.error('Failed to load interview:', err);
      setError('Failed to load interview');
    } finally {
      setLoading(false);
      setTimeout(() => setPageReady(true), 300);
    }
  }

  async function getNextQuestion() {
    if (!interview) return;
    setLoading(true);
    try {
      const qa = await interviewApi.nextQuestion(interview.id);
      setCurrentQuestion(qa);
      reset();
      pendingQuestionRef.current = qa.questionText;
    } catch (err) {
      console.error('Failed to get next question:', err);
      setError('Failed to load next question');
    } finally {
      setLoading(false);
    }
  }

  async function speakQuestion(text: string) {
    if (!('speechSynthesis' in window)) return;
    
    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        startRecording();
        questionStartTimeRef.current = Date.now();
        setShowWaveform(true);
        resolve();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        startRecording();
        questionStartTimeRef.current = Date.now();
        setShowWaveform(true);
        resolve();
      };
      speechSynthesis.speak(utterance);
    });
  }

  async function handleSubmitAnswer() {
    if (!currentQuestion || !interview) return;
    
    const { metrics } = await stopRecording();
    setShowWaveform(false);
    
    const cameraMetrics = getCameraMetrics ? getCameraMetrics() : null;
    
    const responseTimeSeconds = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
    const wordCount = transcript.trim().split(/\s+/).filter(w => w.length > 0).length;
    const wpm = responseTimeSeconds > 0 ? Math.round((wordCount / responseTimeSeconds) * 60) : 0;
    
    const metricsWithWpm = { ...metrics, wpm };

    if (!transcript.trim()) {
      setError('Please provide an answer');
      setShowWaveform(true);
      startRecording();
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await interviewApi.submitAnswer(interview.id, {
        questionAnswerId: currentQuestion.id,
        transcript,
        voiceMetrics: JSON.stringify(metricsWithWpm),
        cameraMetrics: cameraMetrics ? JSON.stringify(cameraMetrics) : undefined,
        responseTimeSeconds,
        silenceDurationSeconds: Math.round(metrics.totalPauseDuration / 1000)
      });
      
      const updated = await interviewApi.get(interview.id);
      setInterview(updated);
      const unanswered = updated.questionAnswers.find(q => q.status === 'PENDING' || q.status === 'ASKED');
      if (unanswered) {
        setCurrentQuestion(unanswered);
        reset();
        pendingQuestionRef.current = unanswered.questionText;
      } else {
        setCompleted(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit answer');
      setShowWaveform(true);
      startRecording();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!interview) return;
    try {
      await interviewApi.complete(interview.id);
      navigate(`/report/${interview.id}`);
    } catch (err) {
      setError('Failed to complete interview');
    }
  }

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-lg font-medium">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-slate-300">Interview not found</h2>
        </div>
      </div>
    );
  }

  const answeredCount = interview.questionAnswers.filter(q => q.status === 'ANSWERED' || q.status === 'SCORED').length;
  const progress = interview.questionAnswers.length > 0
    ? Math.round((answeredCount / interview.questionAnswers.length) * 100)
    : 0;

  const currentIndex = currentQuestion ? currentQuestion.questionIndex : 0;
  const totalQuestions = interview.questionAnswers.length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Camera Self-View (floating) */}
      {interview.cameraEnabled && cameraActive && stream && (
        <div className="fixed top-20 right-4 z-50" aria-label="Camera preview">
          <div className="relative glass-strong rounded-xl overflow-hidden shadow-2xl border-slate-700/50">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-52 h-39 rounded-xl"
              aria-hidden="true"
            />
            <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-slate-950/80 backdrop-blur text-white text-xs flex items-center justify-between border-t border-slate-700/50">
              <span className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span>Camera Active</span>
              </span>
              <button
                onClick={stopCamera}
                className="px-2 py-1 text-red-400 hover:text-red-300 text-xs transition-colors"
                title="Stop camera"
                aria-label="Stop camera"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{interview.roleName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-slate-400">
              <span className="px-3 py-1 text-sm font-medium bg-slate-800 rounded-full border border-slate-700/50">{interview.level.replace('_', ' ')}</span>
              <span className="px-3 py-1 text-sm font-medium bg-slate-800 rounded-full border border-slate-700/50">{interview.type.replace('_', ' ')}</span>
              <span className="px-3 py-1 text-sm font-medium bg-slate-800 rounded-full border border-slate-700/50">{interview.durationMinutes} min</span>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Progress</span>
              <span className="text-sm font-semibold text-blue-500">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 text-right">Question {Math.min(currentIndex + 1, totalQuestions)} of {totalQuestions}</p>
          </div>
        </header>

        {/* Timer */}
        {interview.durationMinutes && (
          <div className={`mb-6 flex items-center justify-between p-4 glass rounded-xl border ${timeRemaining < 120 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700/50'}`}>
            <div className="flex items-center space-x-2">
              <svg className={`w-5 h-5 ${timeRemaining < 120 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-sm font-medium ${timeRemaining < 120 ? 'text-red-400' : 'text-slate-300'}`}>
                Time Remaining: <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </span>
            </div>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${timeRemaining < 120 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`}
                style={{ width: `${(timeRemaining / (interview.durationMinutes * 60)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 glass rounded-xl border-red-500/30 bg-red-500/10 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 text-sm">{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 text-sm">Dismiss</button>
          </div>
        )}

        {completed ? (
          // Completed State
          <div className="card text-center animate-in fade-in duration-500">
            <div className="mx-auto w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Interview Complete!</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">You've answered all questions. Your personalized report is being generated with detailed feedback and scores.</p>
            <button
              onClick={handleComplete}
              className="btn-primary w-full sm:w-auto"
            >
              View Report
            </button>
          </div>
        ) : currentQuestion ? (
          // Question State
          <>
            {/* Question Card */}
            <article className="card mb-6 animate-in slide-in-from-right duration-500 border-l-4 border-blue-500">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-blue-500 font-bold text-lg">Q{currentQuestion.questionIndex + 1}</span>
                  </div>
                  <div>
                    {currentQuestion.isFollowUp && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        <span>Follow-up</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {speaking && (
                    <div className="speaking-indicator">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      <span className="text-sm font-medium">AI Speaking...</span>
                    </div>
                  )}
                  {isRecording && (
                    <div className="recording-indicator">
                      <span className="recording-dot" aria-hidden="true" />
                      <span className="text-sm font-medium">Recording</span>
                      <span className="px-2 py-0.5 text-xs font-mono bg-red-500/20 text-red-400 rounded">LIVE</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <p className="text-lg sm:text-xl text-white leading-relaxed whitespace-pre-wrap">{currentQuestion.questionText}</p>
              </div>
            </article>

            {/* Answer Section */}
            <article className="card mb-6 animate-in slide-in-from-right duration-500 delay-100">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-slate-300">Your Answer</label>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <span>{transcript.length} chars</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full" />
                  <span>{isRecording ? 'Voice active' : 'Click mic to record'}</span>
                </div>
              </div>

              {/* Waveform Visualization */}
              {showWaveform && (
                <div className="mb-4 h-24 glass rounded-xl p-2 relative overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    aria-label={isRecording ? "Voice waveform visualization" : "Audio visualization"}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isRecording && (
                      <div className="flex items-center space-x-2 text-blue-500/50">
                        <span className="recording-dot" />
                        <span className="text-sm font-medium">Speak now...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                className="input-field font-mono text-sm"
                placeholder={speaking ? "AI is speaking..." : isRecording ? "Listening... (speak or type)" : "Click the microphone button to start recording"}
                disabled={speaking}
                aria-label="Your answer"
              />

              {/* Voice Metrics Live Preview */}
              {voiceMetrics && isRecording && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass rounded-xl p-3">
                    <p className="text-xs text-slate-500">Avg Volume</p>
                    <p className="text-lg font-bold text-emerald-500">
                      {voiceMetrics.volume.length > 0 
                        ? (voiceMetrics.volume.slice(-20).reduce((a,b)=>a+b,0)/Math.min(20,voiceMetrics.volume.length)*100).toFixed(0) 
                        : 0}%
                    </p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-xs text-slate-500">Pauses</p>
                    <p className="text-lg font-bold text-blue-500">{voiceMetrics.pauseCount}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-xs text-slate-500">Total Pause</p>
                    <p className="text-lg font-bold text-amber-500">{Math.round(voiceMetrics.totalPauseDuration/1000)}s</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-xs text-slate-500">WPM</p>
                    <p className="text-lg font-bold text-white">{voiceMetrics.wpm || 0}</p>
                  </div>
                </div>
              )}

              {/* Manual Record Button */}
              {!isRecording && !speaking && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center space-x-3 px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-blue-500/50 rounded-xl text-white font-medium transition-all duration-200"
                    aria-label="Start voice recording"
                  >
                    <span className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path fill="none" d="M0 0h24v24H0z"/></svg>
                    </span>
                    <span className="text-lg">Click to Speak</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  onClick={() => {
                    if (currentQuestion && interview) {
                      getNextQuestion();
                    }
                  }}
                  disabled={submitting || speaking}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Skip Question
                </button>
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || !transcript.trim() || speaking}
                  className="btn-primary w-full sm:w-auto"
                >
                  {submitting ? (
                    <span className="flex items-center space-x-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      <span>Submitting...</span>
                    </span>
                  ) : (
                    'Submit Answer'
                  )}
                </button>
              </div>
            </article>

            {/* Previous Answers */}
            {interview.questionAnswers.filter(q => q.userTranscript).length > 0 && (
              <section className="animate-in fade-in duration-500 delay-200">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Previous Answers</span>
                </h2>
                <div className="space-y-3">
                  {interview.questionAnswers
                    .filter(q => q.userTranscript)
                    .map((qa) => (
                      <article key={qa.id} className="card-hover group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-blue-500">Q{qa.questionIndex + 1}</span>
                            {qa.isFollowUp && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">Follow-up</span>
                            )}
                          </div>
                          {(qa.status === 'SCORED' || qa.status === 'ANSWERED') && (
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-sm font-bold px-2 py-1 rounded ${
                                (qa.totalScore ?? 0) >= 70 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                (qa.totalScore ?? 0) >= 50 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}>
                                {qa.totalScore ?? 0}/100
                              </span>
                              {qa.feedback && <p className="text-xs text-slate-400">{qa.feedback}</p>}
                            </div>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm mb-3 line-clamp-1">{qa.questionText}</p>
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                          <p className="text-white text-sm leading-relaxed">{qa.userTranscript}</p>
                        </div>
                        {qa.feedback && (
                          <p className="mt-3 text-sm text-slate-400 italic">{qa.feedback}</p>
                        )}
                      </article>
                    ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="card text-center">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading next question...</p>
          </div>
        )}
      </main>
    </div>
  );
}