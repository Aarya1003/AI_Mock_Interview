import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { interviewApi } from '../services/interview';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, BarChart, Bar, Cell
} from 'recharts';
import type { Interview, Report } from '../types';

export function Report() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  async function loadReport() {
    try {
      const data = await interviewApi.get(parseInt(id!));
      setInterview(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }

  function parseJson<T>(json: string | null): T | null {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-lg font-medium">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!interview || !interview.report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center animate-in fade-in duration-500">
          <div className="mx-auto w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Report Not Available</h1>
          <p className="text-slate-400 mb-6">The interview may not be completed yet or the report hasn't been generated.</p>
          <Link to="/dashboard" className="btn-primary inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const report = interview.report;
  const strengths = parseJson<string[]>(report.strengths) || [];
  const improvements = parseJson<string[]>(report.improvements) || [];
  const fillerWords = parseJson<Record<string, number>>(report.fillerWordCounts) || {};
  const cameraMetrics = parseJson<{ summary?: any; perQuestion?: any[] }>(report.cameraMetrics) || {};
  const confidenceTimeline = parseJson<Array<{ questionIndex: number; score: number; isFollowUp: boolean }>>(report.confidenceTimeline) || [];
  const paceTimeline = parseJson<Array<{ questionIndex: number; wpm: number; isFollowUp: boolean }>>(report.paceTimeline) || [];

  const scoreItems = [
    { label: 'Correctness & Depth', key: 'scoreCorrectnessDepth', score: report.scoreCorrectnessDepth, max: 40, color: 'emerald', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Structure & Clarity', key: 'scoreStructureClarity', score: report.scoreStructureClarity, max: 15, color: 'blue', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg> },
    { label: 'Confidence & Tone', key: 'scoreConfidenceTone', score: report.scoreConfidenceTone, max: 20, color: 'purple', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
    { label: 'Fluency', key: 'scoreFluency', score: report.scoreFluency, max: 15, color: 'amber', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> },
    { label: 'Composure', key: 'scoreComposure', score: report.scoreComposure, max: 10, color: 'red', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
  ];

  const colorMap = {
    emerald: '#10B981',
    blue: '#3B82F6',
    purple: '#A855F7',
    amber: '#F59E0B',
    red: '#EF4444',
  };

  // Comparison with previous
  const comparison = report.comparisonWithPrevious || '';
  const improved = comparison.includes('improved');
  const declined = comparison.includes('declined');

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-500">
        {/* Header */}
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Interview Report</h1>
            <p className="mt-1 text-slate-400">{interview.roleName} • {interview.level.replace('_', ' ')} • {interview.type.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent">{report.totalScore}/100</div>
            <div className="text-sm text-slate-400">Overall Score</div>
            {comparison && (
              <div className={`mt-2 flex items-center justify-end space-x-1 text-sm ${improved ? 'text-emerald-400' : declined ? 'text-red-400' : 'text-slate-400'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={improved ? "M5 10l7-7m0 0l7 7m-7-7v18" : declined ? "M19 14l-7 7m0 0l-7-7m7 7V4" : "M5 12h14"} />
                </svg>
                <span>{comparison}</span>
              </div>
            )}
          </div>
        </header>

        {/* Score Ring */}
        <section className="card mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex justify-center md:justify-start">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="10"
                />
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.totalScore / 100) * 282.7} 282.7`}
                  className="animate-in duration-1000"
                  style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-semibold text-white mb-4">Score Breakdown</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {scoreItems.map((item) => (
                  <div key={item.label} className="glass rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {item.score !== null ? `${item.score}/${item.max}` : '—'}
                    </div>
                    <div className="text-xs text-slate-400 truncate">{item.label}</div>
                    {item.score !== null && (
                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto max-w-xs">
                        <div 
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ 
                            width: `${(item.score / item.max) * 100}%`,
                            backgroundColor: colorMap[item.color as keyof typeof colorMap]
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Score Bars with Animation */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Dimension Scores</h2>
          <div className="space-y-3">
            {scoreItems.map((item) => (
              <div key={item.label} className="glass rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-2xl`} style={{ color: colorMap[item.color as keyof typeof colorMap] }}>{item.icon}</span>
                    <span className="text-sm font-medium text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-sm font-mono text-white">
                    {item.score !== null ? `${item.score}/${item.max}` : '—'}
                  </span>
                </div>
                {item.score !== null && (
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(item.score / item.max) * 100}%`,
                        backgroundColor: colorMap[item.color as keyof typeof colorMap]
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Timelines */}
        {(confidenceTimeline.length > 0 || paceTimeline.length > 0) && (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold text-white mb-6">Performance Timelines</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {confidenceTimeline.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Confidence Trend</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={confidenceTimeline} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="confidenceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="questionIndex" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} domain={[0, 20]} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} labelStyle={{ color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#confidenceGrad)" />
                        <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {paceTimeline.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Speaking Pace (WPM)</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paceTimeline} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="questionIndex" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#334155' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }} labelStyle={{ color: '#f8fafc' }} />
                        <Bar dataKey="wpm" fill="#10b981" radius={[4, 4, 0, 0]}>
                          {paceTimeline.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Strengths & Improvements */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <article className="card">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>Top Strengths</span>
            </h2>
            <ul className="space-y-3">
              {strengths.length > 0 ? strengths.map((s, i) => (
                <li key={i} className="flex items-start space-x-3 p-3 glass rounded-xl border-emerald-500/20">
                  <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-white">{s}</span>
                </li>
              )) : (
                <li className="text-slate-500 text-center py-4">No strengths recorded</li>
              )}
            </ul>
          </article>

          <article className="card">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>Areas for Improvement</span>
            </h2>
            <ul className="space-y-3">
              {improvements.length > 0 ? improvements.map((s, i) => (
                <li key={i} className="flex items-start space-x-3 p-3 glass rounded-xl border-amber-500/20">
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                  <span className="text-white">{s}</span>
                </li>
              )) : (
                <li className="text-slate-500 text-center py-4">No improvements recorded</li>
              )}
            </ul>
          </article>
        </section>

        {/* Filler Words */}
        {Object.keys(fillerWords).length > 0 && (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Filler Word Analysis</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(fillerWords).map(([word, count]) => (
                <span key={word} className="px-3 py-1.5 glass rounded-full text-sm text-white border-slate-700/50">
                  {word}: {count}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Camera Metrics */}
        {interview.cameraEnabled && cameraMetrics.summary && (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <span>Camera Analysis</span>
            </h2>
            <p className="text-sm text-slate-400 mb-6">Video processed locally only. No video was uploaded or stored.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass rounded-xl p-4">
                <div className="text-sm text-slate-400">Face Detected</div>
                <div className="mt-1 text-2xl font-bold text-emerald-400">
                  {(cameraMetrics.summary.faceDetectionRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500">
                  {cameraMetrics.summary.faceDetectedFrames} / {cameraMetrics.summary.totalFrames} frames
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-sm text-slate-400">Looking Away</div>
                <div className="mt-1 text-2xl font-bold text-amber-400">
                  {(cameraMetrics.summary.lookingAwayRate * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-slate-500">
                  {cameraMetrics.summary.lookingAwayFrames} / {cameraMetrics.summary.totalFrames} frames
                </div>
              </div>
              <div className="glass rounded-xl p-4">
                <div className="text-sm text-slate-400">Total Frames</div>
                <div className="mt-1 text-2xl font-bold text-white">
                  {cameraMetrics.summary.totalFrames}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Per-Question Feedback */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Per-Question Feedback</h2>
          <div className="space-y-4">
            {interview.questionAnswers
              .filter(q => q.status === 'ANSWERED' || q.status === 'SCORED')
              .map((qa) => (
                <article key={qa.id} className="glass rounded-xl p-5 border-slate-700/50">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <span className="font-medium text-white">Question {qa.questionIndex + 1}</span>
                    <div className="flex items-center space-x-3 text-sm">
                      {qa.totalScore !== null && qa.totalScore > 0 && (
                        <span className="font-medium text-emerald-400">Score: {qa.totalScore}/100</span>
                      )}
                      {qa.isFollowUp && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs border border-purple-500/30">Follow-up</span>}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-400 mb-1">Question:</p>
                    <p className="text-white">{qa.questionText}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-400 mb-1">Your Answer:</p>
                    <p className="text-white bg-slate-800/50 p-4 rounded-xl">{qa.userTranscript || 'No answer recorded'}</p>
                  </div>

                  {qa.feedback && (
                    <div className="mb-4 p-4 glass rounded-xl border-blue-500/20 bg-blue-500/5">
                      <p className="text-sm font-medium text-blue-400 mb-1">Feedback:</p>
                      <p className="text-white">{qa.feedback}</p>
                    </div>
                  )}

                  {qa.strongAnswerPoints && (
                    <div className="p-4 glass rounded-xl border-emerald-500/20 bg-emerald-500/5">
                      <p className="text-sm font-medium text-emerald-400 mb-1">Strong Answer Should Include:</p>
                      <p className="text-white">{qa.strongAnswerPoints}</p>
                    </div>
                  )}
                </article>
              ))}
          </div>
        </section>

        {/* LLM Summary */}
        {report.llmSummary && (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">AI Summary</h2>
            <blockquote className="prose prose-invert max-w-none text-slate-300 border-l-4 border-blue-500 pl-4 italic">
              {report.llmSummary}
            </blockquote>
          </section>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-slate-800">
          <Link to="/dashboard" className="btn-secondary w-full sm:w-auto">
            Back to Dashboard
          </Link>
          <Link to="/setup" className="btn-primary w-full sm:w-auto">
            New Interview
          </Link>
        </div>
      </main>
    </div>
  );
}