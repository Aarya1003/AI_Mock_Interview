import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { rolesApi, interviewApi } from '../services/interview';
import type { Role, RolesResponse, CreateInterviewRequest } from '../types';
import { useCamera } from '../hooks/useCamera';
import { ApiError } from '../services/api';

export function Setup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [roles, setRoles] = useState<RolesResponse>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Form state
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [level, setLevel] = useState<'FRESHER' | 'ONE_TO_THREE_YEARS' | 'THREE_PLUS_YEARS'>('FRESHER');
  const [type, setType] = useState<'TECHNICAL' | 'HR_BEHAVIOURAL' | 'MIXED'>('MIXED');
  const [duration, setDuration] = useState<15 | 30 | 45>(30);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  const isPro = user?.plan === 'PRO';
  const maxDuration = isPro ? 45 : 15;

  // Camera hook for testing
  const { videoRef, stream, isActive, error: cameraError, startCamera, stopCamera } = useCamera();

  // Handle retake query params
  useEffect(() => {
    const isRetake = searchParams.get('retake') === 'true';
    if (isRetake) {
      const roleName = searchParams.get('roleName') || '';
      const customRoleParam = searchParams.get('customRole') || '';
      const levelParam = searchParams.get('level');
      const typeParam = searchParams.get('type');
      const durationParam = searchParams.get('durationMinutes');

      if (customRoleParam) {
        setCustomRole(customRoleParam);
      }
      if (levelParam) {
        setLevel(levelParam as 'FRESHER' | 'ONE_TO_THREE_YEARS' | 'THREE_PLUS_YEARS');
      }
      if (typeParam) {
        setType(typeParam as 'TECHNICAL' | 'HR_BEHAVIOURAL' | 'MIXED');
      }
      if (durationParam) {
        setDuration(parseInt(durationParam) as 15 | 30 | 45);
      }
      if (roleName && !customRoleParam) {
        setTimeout(() => {
          const allRoles = Object.values(roles).flat();
          const matched = allRoles.find(r => r.name === roleName);
          if (matched) setSelectedRole(matched);
        }, 100);
      }
    }
  }, [searchParams, roles]);

  useEffect(() => {
    loadRoles();
  }, []);

  async function loadRoles() {
    try {
      const data = await rolesApi.list();
      setRoles(data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!selectedRole && !customRole.trim()) {
      setError('Please select a role or enter a custom role');
      setSubmitting(false);
      return;
    }

    try {
      const payload: CreateInterviewRequest = {
        roleId: selectedRole?.id ?? 1,
        customRole: customRole.trim() || undefined,
        level,
        type,
        durationMinutes: duration,
        cameraEnabled,
      };
      const interview = await interviewApi.create(payload);
      navigate(`/interview/${interview.id}`);
    } catch (err: any) {
      if (err instanceof ApiError && (
        err.code === 'PLAN_LIMIT_REACHED' ||
        err.userMessage?.includes('free trial') ||
        err.userMessage?.includes('free plan')
      )) {
        setShowUpgradeModal(true);
      } else {
        setError(err.userMessage || err.message || 'Failed to create interview');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const allRoles = Object.values(roles).flat();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-lg font-medium">Loading roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Interview Setup</h1>
        <p className="mt-2 text-slate-400">Configure your mock interview session</p>
      </div>

      {error && (
        <div className="mb-6 p-4 glass rounded-xl border-red-500/30 bg-red-500/10 text-red-300 text-sm animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Selection */}
        <article className="card">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center space-x-2">
            <span className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold">1</span>
            <span>Select Role</span>
          </h2>
          
          <div className="space-y-6">
            {Object.entries(roles).map(([category, categoryRoles]) => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{category}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => { setSelectedRole(role); setCustomRole(''); }}
                      className={`p-4 text-left rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedRole?.id === role.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700/50 hover:border-blue-500/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-medium text-white">{role.name}</div>
                      <div className="text-sm text-slate-400 mt-1">{role.topics.slice(0, 3).join(', ')}...</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-slate-700/50">
              <label className="block text-sm font-medium text-slate-400 mb-2">Or enter a custom role</label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => { setCustomRole(e.target.value); setSelectedRole(null); }}
                placeholder="e.g., DevOps Engineer, Product Designer..."
                className="input-field"
              />
            </div>
          </div>
        </article>

        {/* Experience Level & Interview Type */}
        <article className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold">2</span>
                <span>Experience Level</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'FRESHER' as const, label: 'Fresher', desc: '0 years experience' },
                  { value: 'ONE_TO_THREE_YEARS' as const, label: '1-3 Years', desc: 'Junior to Mid-level' },
                  { value: 'THREE_PLUS_YEARS' as const, label: '3+ Years', desc: 'Senior level' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLevel(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      level === opt.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700/50 hover:border-blue-500/30 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-medium text-white">{opt.label}</div>
                    <div className="text-sm text-slate-400 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold">3</span>
                <span>Interview Type</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'TECHNICAL' as const, label: 'Technical', desc: 'Code, systems, algorithms', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
                  { value: 'HR_BEHAVIOURAL' as const, label: 'HR/Behavioural', desc: 'Soft skills, situations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                  { value: 'MIXED' as const, label: 'Mixed', desc: 'Balanced technical & HR', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" /></svg> },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col items-center space-y-2 ${
                      type === opt.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700/50 hover:border-blue-500/30 hover:bg-white/5'
                    }`}
                  >
                    <span className="text-blue-400">{opt.icon}</span>
                    <div className="font-medium text-white">{opt.label}</div>
                    <div className="text-xs text-slate-400 text-center">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Duration & Camera */}
        <article className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold">4</span>
                <span>Duration</span>
              </h2>
              {!isPro && (
                <div className="mb-4 p-3 glass rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-center space-x-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <div>
                    <strong>Free Plan:</strong> Limited to 15 minutes max.{' '}
                    <Link to="/billing" className="underline hover:text-amber-400 ml-2">Upgrade to Pro</Link> for 30-45 min sessions.
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 15 as const, label: '15 min', desc: 'Quick practice', questions: '~3 questions' },
                  { value: 30 as const, label: '30 min', desc: 'Standard session', questions: '~6 questions', proOnly: true },
                  { value: 45 as const, label: '45 min', desc: 'Deep dive (Pro only)', questions: '~9 questions', proOnly: true },
                ].map((opt) => {
                  const disabled = !isPro && opt.proOnly;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => !disabled && setDuration(opt.value)}
                      disabled={disabled}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${
                        duration === opt.value && !disabled
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-700/50 hover:border-blue-500/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="font-medium text-white">{opt.label}</div>
                      <div className="text-sm text-slate-400 mt-1">{opt.desc}</div>
                      <div className="text-xs text-slate-500 mt-1">{opt.questions}</div>
                      {disabled && (
                        <div className="flex items-center space-x-1 mt-2 text-xs text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v2" /></svg>
                          <span>Pro</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                <span className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 font-bold">5</span>
                <span>Camera</span>
              </h2>
              <label className="flex items-start space-x-4 cursor-pointer mb-6 group">
                <input
                  type="checkbox"
                  checked={cameraEnabled}
                  onChange={(e) => setCameraEnabled(e.target.checked)}
                  className="w-5 h-5 mt-0.5 text-blue-500 border-slate-700/50 rounded focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 accent-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-white">Enable camera during interview</div>
                  <div className="text-sm text-slate-400 mt-1">Video is processed locally only, never uploaded or stored</div>
                </div>
              </label>

              {cameraEnabled && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="glass rounded-xl p-4">
                    <h3 className="font-medium text-white mb-4">Camera Test</h3>
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="btn-primary w-full sm:w-auto"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        Start Camera Test
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full max-w-xs h-auto rounded-xl bg-slate-950 border border-slate-700/50"
                          />
                          <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur text-white text-xs px-2 py-1 rounded-full border border-slate-700/50">
                            Live Preview
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 text-sm">
                          <span className={`flex items-center space-x-1 ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span>{isActive ? 'Camera Active' : 'Camera Off'}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => { stopCamera(); }}
                            className="btn-ghost"
                          >
                            Stop Test
                          </button>
                        </div>
                        {cameraError && <p className="text-sm text-red-400">{cameraError}</p>}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div className="p-3 glass rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-sm flex items-center space-x-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      <span>Camera test successful! Your camera will be active during the interview.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full sm:w-auto py-4 text-lg"
          >
            {submitting ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                <span>Creating Interview...</span>
              </span>
            ) : (
              'Start Interview →'
            )}
          </button>
        </div>
      </form>
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="card max-w-md w-full mx-4 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h2 className="text-xl font-bold text-white mb-2">Free Trial Limit Reached</h2>
            <p className="text-slate-400 mb-6">
              You've used your 1 free interview this month.
              Upgrade to Pro for unlimited interviews,
              30-45 minute sessions, and detailed AI analysis.
            </p>
            <div className="bg-slate-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-white mb-3">Pro Plan includes:</p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Unlimited interviews per month</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> 30 and 45-minute sessions</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Detailed AI performance reports</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Voice & camera analytics</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Score trend tracking</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Interview comparison</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpgradeModal(false)} className="btn-secondary flex-1">
                Maybe Later
              </button>
              <a href="/billing" className="btn-primary flex-1">
                Upgrade to Pro →
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}