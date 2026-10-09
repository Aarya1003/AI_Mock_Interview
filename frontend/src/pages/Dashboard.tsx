import { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interviewApi } from '../services/interview';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import type { InterviewListItem, Interview } from '../types';
import { useAuth } from '../context/AuthContext';

export function Dashboard() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [retakingId, setRetakingId] = useState<number | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      loadInterviews();
    } else {
      navigate('/login');
    }
  }, [token, navigate]);

  async function loadInterviews() {
    try {
      const data = await interviewApi.list();
      setInterviews(data);
    } catch (err) {
      console.error('Failed to load interviews:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetake(interview: InterviewListItem) {
    setRetakingId(interview.id);
    try {
      const params = new URLSearchParams({
        retake: 'true',
        roleName: interview.roleName,
        customRole: interview.customRole || '',
        level: interview.level,
        type: interview.type,
        durationMinutes: interview.durationMinutes.toString(),
      });
      window.location.href = `/setup?${params.toString()}`;
    } catch (err) {
      console.error('Failed to start retake:', err);
    } finally {
      setRetakingId(null);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'PARTIAL': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'IN_PROGRESS': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SETUP': return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
      default: return 'bg-slate-700/50 text-slate-400 border-slate-600/50';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case 'PARTIAL': return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'IN_PROGRESS': return <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>;
      default: return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
    }
  }

  // Completed interviews with scores
  const completedInterviews = useMemo(() => 
    interviews.filter(i => (i.status === 'COMPLETED' || i.status === 'PARTIAL') && i.totalScore !== null)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  [interviews]);

  // Chart data
  const chartData = useMemo(() => completedInterviews.map((i, index) => ({
    date: i.createdAt,
    score: i.totalScore!,
    role: i.roleName,
    label: `${i.roleName} ${index + 1}`
  })), [completedInterviews]);

  // Stats
  const totalInterviews = interviews.length;
  const completedCount = interviews.filter(i => i.status === 'COMPLETED').length;
  const inProgressCount = interviews.filter(i => i.status === 'IN_PROGRESS').length;
  const avgScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((sum, i) => sum + (i.totalScore || 0), 0) / completedInterviews.length)
    : 0;
  const bestScore = completedInterviews.length > 0
    ? Math.max(...completedInterviews.map(i => i.totalScore || 0))
    : 0;
  const latestScore = completedInterviews.length > 0
    ? completedInterviews[completedInterviews.length - 1].totalScore
    : 0;
  const prevAvg = completedInterviews.length > 1
    ? Math.round(completedInterviews.slice(0, -1).reduce((sum, i) => sum + (i.totalScore || 0), 0) / (completedInterviews.length - 1))
    : 0;
  const trend = completedInterviews.length > 1 ? latestScore! - prevAvg : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-lg font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="mt-2 text-slate-400">Track your interview progress and improve over time</p>
          </div>
          <Link to="/setup" className="btn-primary w-full sm:w-auto flex items-center justify-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Interview</span>
          </Link>
        </header>

        {interviews.length === 0 ? (
          // Empty State
          <div className="card text-center animate-in fade-in duration-500">
            <div className="mx-auto w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No interviews yet</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">Start your first mock interview to practice and improve your skills with AI-powered feedback.</p>
            <Link to="/setup" className="btn-primary w-full sm:w-auto inline-flex">
              Create Interview
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 animate-in fade-in duration-500 delay-100">
              <StatCard 
                label="Total Interviews" 
                value={totalInterviews} 
                icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                color="blue"
              />
              <StatCard 
                label="Completed" 
                value={completedCount} 
                icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
                color="emerald"
              />
              <StatCard 
                label="In Progress" 
                value={inProgressCount} 
                icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                color="blue"
              />
              <StatCard 
                label="Average Score" 
                value={`${avgScore}/100`} 
                icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                color="purple"
                trend={completedInterviews.length > 1 ? { value: trend, label: 'vs previous avg' } : undefined}
              />
              <StatCard 
                label="Best Score" 
                value={`${bestScore}/100`} 
                icon={<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                color="amber"
              />
            </div>

            {/* Score Trend Chart */}
            {completedInterviews.length > 0 && (
              <section id="score-trend" className="card mb-10 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Score Trend</h2>
                  <span className="text-sm text-slate-400">{completedInterviews.length} interviews</span>
                </div>
                <div className="relative h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickLine={false}
                        axisLine={{ stroke: '#334155' }}
                        domain={[0, 100]}
                        tickCount={5}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                        }}
                        labelStyle={{ color: '#f8fafc' }}
                        itemStyle={{ color: '#3b82f6' }}
                        formatter={(value: number) => [`${value}/100`, 'Score']}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorScore)"
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  {chartData.slice(-3).map((d, i) => (
                    <span key={i} className="px-3 py-1.5 bg-slate-800 text-blue-400 rounded-lg text-sm font-medium border border-slate-700/50">
                      {d.label}: {d.score}/100
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Interview History */}
            <section id="history" className="card animate-in fade-in duration-500 delay-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h2 className="text-xl font-semibold text-white">Interview History</h2>
                <span className="text-sm text-slate-500">{interviews.length} total interviews</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Level</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {interviews.map((interview) => (
                      <tr key={interview.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => {
                        if (interview.status === 'COMPLETED' || interview.status === 'PARTIAL') {
                          window.location.href = `/report/${interview.id}#history`;
                        }
                      }}>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-white">{interview.roleName}</div>
                            {interview.customRole && <div className="text-sm text-slate-400">{interview.customRole}</div>}
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm text-slate-400">
                          {interview.level.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell text-sm text-slate-400">
                          {interview.type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell text-sm text-slate-400">
                          {interview.durationMinutes} min
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(interview.status)}`}>
                            {getStatusIcon(interview.status)}
                            <span>{interview.status}</span>
                          </span>
                          {interview.isPartial && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          {interview.totalScore !== null ? (
                            <span className={`font-semibold ${interview.totalScore >= 70 ? 'text-emerald-400' : interview.totalScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                              {interview.totalScore}/100
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell text-sm text-slate-500">
                          {formatDate(interview.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {interview.status === 'IN_PROGRESS' && (
                              <Link to={`/interview/${interview.id}`} className="btn-secondary text-sm px-4 py-2">
                                Continue
                              </Link>
                            )}
                            {interview.status === 'SETUP' && (
                              <Link to={`/interview/${interview.id}`} className="btn-primary text-sm px-4 py-2">
                                Start
                              </Link>
                            )}
                            {(interview.status === 'COMPLETED' || interview.status === 'PARTIAL') && (
                              <>
                                <Link to={`/report/${interview.id}`} className="btn-secondary text-sm px-4 py-2">
                                  View Report
                                </Link>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRetake(interview); }}
                                  disabled={retakingId === interview.id}
                                  className="btn-secondary text-sm px-4 py-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                >
                                  {retakingId === interview.id ? 'Starting...' : 'Retake'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Insights Section */}
            {completedInterviews.length > 0 && (
              <section className="card mt-10 animate-in fade-in duration-500 delay-400">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Quick Insights</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InsightCard
                    title="Most Practiced Role"
                    value={() => {
                      const roleCounts = completedInterviews.reduce((acc, i) => {
                        acc[i.roleName] = (acc[i.roleName] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                    }}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                  />
                  <InsightCard
                    title="Score Improvement"
                    value={() => {
                      if (completedInterviews.length < 2) return 'Need more data';
                      const diff = completedInterviews[completedInterviews.length - 1].totalScore! - completedInterviews[0].totalScore!;
                      return `${diff > 0 ? '+' : ''}${diff} points`;
                    }}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                  />
                  <InsightCard
                    title="Consistency"
                    value={() => {
                      if (completedInterviews.length < 3) return 'Need more data';
                      const scores = completedInterviews.map(i => i.totalScore!);
                      const max = Math.max(...scores);
                      const min = Math.min(...scores);
                      const range = max - min;
                      return `${Math.round(100 - (range / 100) * 100)}%`;
                    }}
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  trend?: { value: number; label: string };
}

function StatCard({ label, value, icon, color, trend }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  const bgColors = {
    blue: 'from-blue-500/30 to-blue-500/10',
    emerald: 'from-emerald-500/30 to-emerald-500/10',
    purple: 'from-purple-500/30 to-purple-500/10',
    amber: 'from-amber-500/30 to-amber-500/10',
  };

  return (
    <div className={`card-hover relative overflow-hidden ${colors[color]}`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${bgColors[color]} opacity-50`} />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`mt-1 text-sm ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)} {trend.label}
            </p>
          )}
        </div>
        <div className="text-3xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

interface InsightCardProps {
  title: string;
  value: () => string;
  icon: React.ReactNode;
}

function InsightCard({ title, value, icon }: InsightCardProps) {
  return (
    <div className="card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-1 text-lg font-bold text-white">{value()}</p>
        </div>
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500">
          {icon}
        </div>
      </div>
    </div>
  );
}