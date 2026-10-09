import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from '../services/interview';
import type { SubscriptionResponse, PaymentResponse, BillingConfig } from '../types';

export function Billing() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [configRes, subRes, paymentsRes] = await Promise.all([
        interviewApi.getBillingConfig(),
        interviewApi.getSubscription().catch(() => null),
        interviewApi.getPayments().catch(() => []),
      ]);
      setConfig(configRes);
      setSubscription(subRes);
      setPayments(paymentsRes);
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planId: string) {
    setError('');
    setProcessing(true);
    try {
      const response = await interviewApi.createSubscription(planId);
      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start subscription');
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will lose Pro access at the end of the billing period.')) {
      return;
    }
    setError('');
    setProcessing(true);
    try {
      await interviewApi.cancelSubscription(subscription!.id);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-electric-500/30 border-t-electric-500 rounded-full animate-spin"></div>
          <p className="text-navy-400 text-lg font-medium">Loading billing...</p>
        </div>
      </div>
    );
  }

  const isPro = subscription?.plan === 'PRO';
  const currentPlan = isPro ? 'Pro' : 'Free';

  return (
    <div className="min-h-screen bg-navy-900">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-0 w-96 h-96 bg-electric-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-500">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-white">Billing & Subscription</h1>
          <p className="mt-2 text-navy-400">Manage your plan and payment settings</p>
        </header>

        {error && (
          <div className="mb-6 p-4 glass rounded-xl border-red-500/30 bg-red-500/10 text-red-300 text-sm animate-in slide-in-from-top-2">
            {error}
          </div>
        )}

        {/* Current Plan */}
        <section className="card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Current Plan</h2>
              <p className="mt-1 text-navy-400">
                {isPro ? 'Enjoying unlimited interviews and full reports' : 'Limited to 1 interview/month, 15 min max'}
              </p>
            </div>
            <div className="text-right sm:text-right">
              <span className={`inline-flex items-center px-4 py-2 rounded-xl font-medium text-lg ${isPro ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-navy-800 text-navy-300 border border-white/10'}`}>
                {currentPlan}
              </span>
              {subscription && (
                <div className="mt-3 text-sm text-navy-400 flex items-center justify-end gap-4">
                  {subscription.status === 'ACTIVE' && (
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span>Active</span>
                    </span>
                  )}
                  {subscription.status === 'PENDING' && (
                    <span className="flex items-center space-x-1 text-amber-400">
                      <span className="w-2 h-2 bg-amber-500 rounded-full" />
                      <span>Pending</span>
                    </span>
                  )}
                  {subscription.currentPeriodEnd && (
                    <span>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Plan Comparison */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <article className={`relative p-6 rounded-xl border-2 ${!isPro ? 'border-electric-500 bg-electric-500/10' : 'border-white/10'}`}>
              {!isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-electric-500 text-white text-sm font-medium rounded-full">
                  Current
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white">Free</h3>
                <div className="mt-2 text-4xl font-bold text-white">₹0<span className="text-xl font-normal text-navy-400">/month</span></div>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  '1 interview per month',
                  '15 minutes max duration',
                  'Basic report only',
                  'No history access',
                  'Community support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-navy-300">
                    <svg className="w-5 h-5 text-emerald-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                disabled={!isPro || processing}
                onClick={() => handleSubscribe(config?.plans?.pro_monthly?.id || 'plan_pro_monthly')}
                className="btn-secondary w-full opacity-50 cursor-not-allowed"
              >
                Current Plan
              </button>
            </article>

            {/* Pro Plan */}
            <article className={`relative p-6 rounded-xl border-2 ${isPro ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10'}`}>
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-sm font-medium rounded-full">
                  Current
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white">Pro</h3>
                <div className="mt-2 text-4xl font-bold text-white">₹999<span className="text-xl font-normal text-navy-400">/month</span></div>
                <p className="text-sm text-navy-400 mt-1">Or ₹9,999/year (save 17%)</p>
              </div>
              <ul className="space-y-3 mb-6">
                {[
                  'Unlimited interviews',
                  'Up to 45 minutes duration',
                  'Full detailed reports',
                  'Complete history & trends',
                  'Priority email support',
                  'Camera analysis included'
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-sm text-navy-300">
                    <svg className="w-5 h-5 text-emerald-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(config?.plans?.pro_monthly?.id || 'plan_pro_monthly')}
                disabled={isPro || processing}
                className={isPro ? 'btn-secondary w-full' : 'btn-primary w-full'}
              >
                {isPro ? 'Current Plan' : processing ? 'Processing...' : 'Upgrade to Pro'}
              </button>
            </article>
          </div>
        </section>

        {/* Subscription Details */}
        {subscription && (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Subscription Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="glass rounded-xl p-4">
                <p className="text-navy-400">Status</p>
                <p className="font-medium text-white capitalize mt-1">{subscription.status.toLowerCase()}</p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-navy-400">Period</p>
                <p className="font-medium text-white mt-1">
                  {subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : '—'}
                  {' '}→{' '}
                  {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-navy-400">Auto-renew</p>
                <p className="font-medium text-white mt-1">{subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}</p>
              </div>
            </div>
            {isPro && subscription.status === 'ACTIVE' && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="mt-4 btn-secondary bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 w-full sm:w-auto"
              >
                Cancel Subscription
              </button>
            )}
          </section>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <section className="card">
            <h2 className="text-xl font-semibold text-white mb-6">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase tracking-wider">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-navy-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-navy-400">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-white">₹{(payment.amount / 100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-navy-400">{payment.paymentMethod || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                          payment.status === 'CAPTURED' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                          payment.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-navy-800 text-navy-300 border-white/10'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}