'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Settings,
  Save,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Shield,
  DollarSign,
  Bell,
  AlertTriangle,
  Mail,
  Activity,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
} from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'
import {
  DashboardAnimationWrapper,
  DashboardAnimationItem,
} from '@/components/ui/DashboardAnimationWrapper'
import { cn } from '@/lib/utils'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState({
    id: '',
    platform_name: 'TURF GAMING',
    commission_percentage: 10,
    support_email: 'support@turfgaming.com',
    maintenance_mode: false,
    max_payout_limit: 100000,
    mfa_required: false,
    session_timeout_mins: 60,
    notify_on_new_turf: true,
    notify_on_new_booking: true,
    cancellation_policy: [
      { hours: 24, refund_percent: 100 },
      { hours: 12, refund_percent: 75 },
      { hours: 6, refund_percent: 50 },
    ],
    refund_expiration_days: 60,
  })

  // Email Configuration States
  const [emailForm, setEmailForm] = useState({
    sender_name: '',
    sender_email: '',
    reply_to_email: '',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    encryption_type: 'TLS',
    provider: 'smtp',
    is_enabled: true,
    is_verified: false,
    last_tested_at: '',
    last_test_status: '',
  })
  const [testingEmail, setTestingEmail] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  // Email Delivery Logs States
  const [logs, setLogs] = useState<any[]>([])
  const [logsSearch, setLogsSearch] = useState('')
  const [logsStatus, setLogsStatus] = useState('')
  const [logsPage, setLogsPage] = useState(1)
  const [logsTotalPages, setLogsTotalPages] = useState(1)
  const [logsCount, setLogsCount] = useState(0)
  const [logsMetrics, setLogsMetrics] = useState({
    sentToday: 0,
    failedToday: 0,
    successRate: 100,
    avgDeliveryTime: 0,
  })
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null)

  const [confirmModal, setConfirmModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
    fetchEmailSettings()
    fetchEmailLogs()
  }, [])

  useEffect(() => {
    fetchEmailLogs()
  }, [logsPage, logsStatus])

  async function fetchSettings() {
    setLoading(true)
    const { data } = await supabase.from('admin_settings').select('*').limit(1).single()
    if (data) {
      setForm((prev) => ({
        ...prev,
        id: data.id,
        platform_name: data.platform_name || 'TURF GAMING',
        commission_percentage: Number(data.commission_percentage || 10),
        support_email: data.support_email || 'support@turfgaming.com',
        maintenance_mode: data.maintenance_mode || false,
        max_payout_limit: data.max_payout_limit ?? 100000,
        mfa_required: data.mfa_required ?? false,
        session_timeout_mins: data.session_timeout_mins ?? 60,
        notify_on_new_turf: data.notify_on_new_turf ?? true,
        notify_on_new_booking: data.notify_on_new_booking ?? true,
        cancellation_policy: data.cancellation_policy || [
          { hours: 24, refund_percent: 100 },
          { hours: 12, refund_percent: 75 },
          { hours: 6, refund_percent: 50 },
        ],
        refund_expiration_days: data.refund_expiration_days || 60,
      }))
    }
    setLoading(false)
  }

  async function fetchEmailSettings() {
    try {
      const res = await fetch('/api/admin/email-settings')
      const result = await res.json()
      if (result.success && result.data) {
        setEmailForm({
          ...result.data,
          smtp_password: result.data.smtp_password || '',
          smtp_port: result.data.smtp_port || 587,
        })
      }
    } catch (err) {
      console.error('Error fetching email settings:', err)
    }
  }

  async function fetchEmailLogs() {
    setIsRefreshingLogs(true)
    try {
      const url = `/api/admin/email-logs?page=${logsPage}&limit=10&search=${encodeURIComponent(logsSearch)}&status=${logsStatus}`
      const res = await fetch(url)
      const result = await res.json()
      if (result.success && result.data) {
        setLogs(result.data.logs || [])
        setLogsTotalPages(result.data.pagination?.pages || 1)
        setLogsCount(result.data.pagination?.total || 0)
        if (result.data.metrics) {
          setLogsMetrics(result.data.metrics)
        }
      }
    } catch (err) {
      console.error('Error fetching email logs:', err)
    } finally {
      setIsRefreshingLogs(false)
    }
  }

  const handleSaveEmailSettings = async () => {
    setSavingEmail(true)
    try {
      const res = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      const result = await res.json()
      if (result.success) {
        setToast('Email configuration saved successfully!')
        setTimeout(() => setToast(null), 3000)
        await fetchEmailSettings()
      } else {
        alert('Error: ' + result.error?.message)
      }
    } catch (err) {
      alert('Failed to save email settings.')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingEmail(true)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm),
      })
      const result = await res.json()
      if (result.success) {
        setToast('SMTP connection verified successfully!')
        setTimeout(() => setToast(null), 3000)
      } else {
        alert('Connection test failed: ' + result.error?.message)
      }
      await fetchEmailSettings()
    } catch (err) {
      alert('Failed to test email connection.')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleRetryEmail = async (logId: string) => {
    setRetryingLogId(logId)
    try {
      const res = await fetch('/api/admin/email-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logId }),
      })
      const result = await res.json()
      if (result.success) {
        setToast('Email retry triggered successfully!')
        setTimeout(() => setToast(null), 3000)
        await fetchEmailLogs()
      } else {
        alert('Retry failed: ' + result.error?.message)
      }
    } catch (err) {
      alert('Failed to retry email delivery.')
    } finally {
      setRetryingLogId(null)
    }
  }

  const handleSaveSettings = async () => {
    setConfirmModal(false)
    setSaving(true)
    setToast(null)

    const { error } = await supabase
      .from('admin_settings')
      .update({
        platform_name: form.platform_name,
        commission_percentage: form.commission_percentage,
        support_email: form.support_email,
        maintenance_mode: form.maintenance_mode,
        max_payout_limit: form.max_payout_limit,
        mfa_required: form.mfa_required,
        session_timeout_mins: form.session_timeout_mins,
        notify_on_new_turf: form.notify_on_new_turf,
        notify_on_new_booking: form.notify_on_new_booking,
        cancellation_policy: form.cancellation_policy,
        refund_expiration_days: form.refund_expiration_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id)

    if (!error) {
      await logAdminAction(
        'Platform Settings Updated',
        'settings',
        form.id,
        `Commission set to ${form.commission_percentage}%, Maintenance mode set to ${form.maintenance_mode}`
      )
      setToast('System settings updated successfully!')
      setTimeout(() => setToast(null), 3000)
    } else {
      alert('Error updating settings: ' + error.message)
    }
    setSaving(false)
  }

  return (
    <DashboardAnimationWrapper className="p-8 space-y-6 w-full">
      {/* Header */}
      <DashboardAnimationItem>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure global application parameters, commissions, security, and alert gates.
        </p>
      </DashboardAnimationItem>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-sm">Loading global settings...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Toast Notification */}
          {toast && (
            <DashboardAnimationItem className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {toast}
            </DashboardAnimationItem>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Section */}
            <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Settings className="w-4 h-4 text-green-400" /> General Settings
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={form.platform_name}
                    onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={form.support_email}
                    onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </DashboardAnimationItem>

            {/* Payments & Commission Section */}
            <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <DollarSign className="w-4 h-4 text-green-400" /> Commission & Settlements
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Commission Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={form.commission_percentage}
                    onChange={(e) =>
                      setForm({ ...form, commission_percentage: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Max Payout Limit (Per Batch)
                  </label>
                  <input
                    type="number"
                    value={form.max_payout_limit}
                    onChange={(e) => setForm({ ...form, max_payout_limit: Number(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>

                {/* Refund & Cancellation policy */}
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Cancellation Policy Rules
                  </h4>
                  {Array.isArray(form.cancellation_policy) &&
                    form.cancellation_policy.map((rule: any, index: number) => (
                      <div key={index} className="flex gap-3 items-center">
                        <div className="flex-1 flex gap-1.5 items-center">
                          <span className="text-[10px] text-gray-500">Hours &gt;=</span>
                          <input
                            type="number"
                            value={rule.hours}
                            onChange={(e) => {
                              const newPolicy = [...(form.cancellation_policy || [])]
                              if (newPolicy[index]) {
                                newPolicy[index].hours = Number(e.target.value)
                                setForm({ ...form, cancellation_policy: newPolicy })
                              }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                        <div className="flex-1 flex gap-1.5 items-center">
                          <span className="text-[10px] text-gray-500">Refund %</span>
                          <input
                            type="number"
                            value={rule.refund_percent}
                            onChange={(e) => {
                              const newPolicy = [...(form.cancellation_policy || [])]
                              if (newPolicy[index]) {
                                newPolicy[index].refund_percent = Number(e.target.value)
                                setForm({ ...form, cancellation_policy: newPolicy })
                              }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-green-500"
                          />
                        </div>
                      </div>
                    ))}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Refund Expiration Window (Days)
                    </label>
                    <input
                      type="number"
                      value={form.refund_expiration_days}
                      onChange={(e) =>
                        setForm({ ...form, refund_expiration_days: Number(e.target.value) })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>
            </DashboardAnimationItem>

            {/* Security Section */}
            <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Shield className="w-4 h-4 text-green-400" /> Security Controls
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Require Multi-Factor (MFA)</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Enforce MFA verification on all admin logins.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.mfa_required}
                    onChange={(e) => setForm({ ...form, mfa_required: e.target.checked })}
                    className="rounded border-white/10 bg-white/5 text-green-600 focus:ring-0"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Session Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={form.session_timeout_mins}
                    onChange={(e) =>
                      setForm({ ...form, session_timeout_mins: Number(e.target.value) })
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            </DashboardAnimationItem>

            {/* Notifications Section */}
            <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
                <Bell className="w-4 h-4 text-green-400" /> System Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      Alert on new Turf Registrations
                    </h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Notify admin email when a turf awaits verification.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.notify_on_new_turf}
                    onChange={(e) => setForm({ ...form, notify_on_new_turf: e.target.checked })}
                    className="rounded border-white/10 bg-white/5 text-green-600 focus:ring-0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Alert on booking issues</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Alert admin instantly on payment/double-booking logs.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.notify_on_new_booking}
                    onChange={(e) => setForm({ ...form, notify_on_new_booking: e.target.checked })}
                    className="rounded border-white/10 bg-white/5 text-green-600 focus:ring-0"
                  />
                </div>
              </div>
            </DashboardAnimationItem>
          </div>

          {/* Maintenance Mode Toggle */}
          <DashboardAnimationItem className="bg-[#0a0f0a] border border-red-500/20 rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Maintenance Mode Gate
              </h4>
              <p className="text-xs text-gray-400">
                Offline blocking gateway for all customer booking channels and owner consoles.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenance_mode}
                onChange={(e) => setForm({ ...form, maintenance_mode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
            </label>
          </DashboardAnimationItem>

          <DashboardAnimationItem className="flex justify-end pt-4 border-b border-white/5 pb-6">
            <button
              onClick={() => setConfirmModal(true)}
              disabled={saving}
              className="px-6 py-2.5 bg-green-500 text-black rounded-xl text-xs font-bold hover:bg-green-400 transition-all flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Save className="w-4.5 h-4.5" />
              )}
              Save Platform Settings
            </button>
          </DashboardAnimationItem>

          {/* Email Settings Configuration */}
          <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-4 mt-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-400" /> Email Configuration
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Connection Status:</span>
                <span
                  className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    emailForm.is_verified
                      ? 'bg-green-500/10 text-green-400'
                      : emailForm.last_tested_at
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                  )}
                >
                  {emailForm.is_verified
                    ? '🟢 Connected'
                    : emailForm.last_tested_at
                      ? `🔴 Connection Failed (${emailForm.last_test_status})`
                      : '🔴 Not Configured'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Sender Name
                </label>
                <input
                  type="text"
                  value={emailForm.sender_name}
                  onChange={(e) => setEmailForm({ ...emailForm, sender_name: e.target.value })}
                  placeholder="TRUF GAMING"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Sender Email
                </label>
                <input
                  type="email"
                  value={emailForm.sender_email}
                  onChange={(e) => setEmailForm({ ...emailForm, sender_email: e.target.value })}
                  placeholder="3shanmukhkadali@gmail.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Reply-To Email (Optional)
                </label>
                <input
                  type="email"
                  value={emailForm.reply_to_email || ''}
                  onChange={(e) => setEmailForm({ ...emailForm, reply_to_email: e.target.value })}
                  placeholder="reply@trufgaming.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Email Provider
                </label>
                <select
                  value={emailForm.provider}
                  onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500 [&>option]:bg-[#060d06] [&>option]:text-white"
                >
                  <option value="smtp">SMTP (Gmail, Outlook, custom)</option>
                  <option value="resend">Resend (Simulated)</option>
                  <option value="sendgrid">SendGrid (Simulated)</option>
                  <option value="ses">Amazon SES (Simulated)</option>
                  <option value="mailgun">Mailgun (Simulated)</option>
                </select>
              </div>

              {emailForm.provider === 'smtp' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={emailForm.smtp_host || ''}
                      onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                      placeholder="smtp.gmail.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={emailForm.smtp_port || ''}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, smtp_port: Number(e.target.value) })
                      }
                      placeholder="587"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={emailForm.smtp_username || ''}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, smtp_username: e.target.value })
                      }
                      placeholder="3shanmukhkadali@gmail.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={emailForm.smtp_password || ''}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, smtp_password: e.target.value })
                      }
                      placeholder="••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Encryption
                    </label>
                    <select
                      value={emailForm.encryption_type || 'TLS'}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, encryption_type: e.target.value })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-green-500 [&>option]:bg-[#060d06] [&>option]:text-white"
                    >
                      <option value="TLS">TLS</option>
                      <option value="SSL">SSL</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingEmail || !emailForm.sender_email}
                className="px-4 py-2 border border-white/10 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                {testingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Activity className="w-3.5 h-3.5" />
                )}
                Test Connection
              </button>

              <button
                type="button"
                onClick={handleSaveEmailSettings}
                disabled={savingEmail || !emailForm.sender_email}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-green-500 text-black hover:bg-green-400 transition-colors flex items-center gap-1.5"
              >
                {savingEmail ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Configuration
              </button>
            </div>
          </DashboardAnimationItem>

          {/* Email Delivery Logs & Analytics */}
          <DashboardAnimationItem className="bg-[#0a0f0a] border border-white/8 rounded-2xl p-6 space-y-6 mt-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2">
              <Activity className="w-4 h-4 text-green-400" /> Email Delivery Logs & Analytics
            </h3>

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: 'Sent Today',
                  value: logsMetrics.sentToday,
                  icon: Check,
                  color: 'text-green-400',
                },
                {
                  label: 'Failed Today',
                  value: logsMetrics.failedToday,
                  icon: AlertCircle,
                  color: 'text-red-400',
                },
                {
                  label: 'Success Rate',
                  value: `${logsMetrics.successRate}%`,
                  icon: Activity,
                  color: 'text-green-400',
                },
                {
                  label: 'Avg Delivery Latency',
                  value: `${logsMetrics.avgDeliveryTime} ms`,
                  icon: RefreshCw,
                  color: 'text-emerald-400',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="p-2 bg-white/5 rounded-lg">
                    <Icon className={cn('w-4 h-4', color)} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                      {label}
                    </p>
                    <p className="text-sm font-bold text-white mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search recipient or subject..."
                  value={logsSearch}
                  onChange={(e) => setLogsSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchEmailLogs()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
                />
              </div>

              <select
                value={logsStatus}
                onChange={(e) => {
                  setLogsStatus(e.target.value)
                  setLogsPage(1)
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500 [&>option]:bg-[#060d06] [&>option]:text-white"
              >
                <option value="">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setLogsPage(1)
                  fetchEmailLogs()
                }}
                disabled={isRefreshingLogs}
                className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-gray-400 font-semibold uppercase tracking-wider">
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Subject</th>
                    <th className="p-3">Template</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Time</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-gray-300">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-6 text-gray-500">
                        No email logs matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-3 font-medium text-white">{log.recipient}</td>
                        <td className="p-3 max-w-[150px] truncate" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="p-3 text-gray-500">{log.template}</td>
                        <td className="p-3 text-gray-500 uppercase">{log.provider}</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                              log.status === 'Sent'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            )}
                            title={log.error_message || undefined}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('en-US', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          {new Date(log.created_at).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="p-3 text-right">
                          {log.status === 'Failed' ? (
                            <button
                              type="button"
                              onClick={() => handleRetryEmail(log.id)}
                              disabled={retryingLogId === log.id}
                              className="px-2 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ml-auto"
                            >
                              {retryingLogId === log.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              Retry
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/5 text-gray-500 text-[10px] font-bold rounded-lg ml-auto">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logsTotalPages > 1 && (
              <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
                <span>
                  Showing page {logsPage} of {logsTotalPages} ({logsCount} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logsPage === 1}
                    onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsPage === logsTotalPages}
                    onClick={() => setLogsPage((p) => Math.min(logsTotalPages, p + 1))}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </DashboardAnimationItem>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c120c] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                Confirm Settings Update
              </h3>
            </div>

            <p className="text-sm text-gray-300">
              Are you sure you want to update platform configurations?
              {form.maintenance_mode && (
                <strong className="text-red-400 block mt-2 font-semibold">
                  ⚠️ WARNING: Turning on Maintenance Mode will block customer bookings!
                </strong>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/5 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500 text-black hover:bg-green-400 transition-colors"
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardAnimationWrapper>
  )
}
