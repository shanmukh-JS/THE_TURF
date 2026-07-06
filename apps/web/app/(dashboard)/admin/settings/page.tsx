'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Save, ShieldAlert, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { logAdminAction } from '@/lib/admin/audit'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [form, setForm] = useState({
    id: '',
    platform_name: 'TRUF GAMING',
    commission_percentage: 10,
    support_email: 'support@trufgaming.com',
    maintenance_mode: false,
  })

  const [confirmModal, setConfirmModal] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setLoading(true)
    const { data } = await supabase.from('admin_settings').select('*').limit(1).single()
    if (data) {
      setForm({
        id: data.id,
        platform_name: data.platform_name,
        commission_percentage: Number(data.commission_percentage),
        support_email: data.support_email,
        maintenance_mode: data.maintenance_mode,
      })
    }
    setLoading(false)
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
    <div className="p-8 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">System Settings</h1>
        <p className="text-gray-400 mt-1">
          Configure global application parameters, commissions, and security gates.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <p className="text-sm">Loading global settings...</p>
        </div>
      ) : (
        <div className="bg-[#0c120c] border border-white/10 rounded-2xl p-6 space-y-6">
          {/* Toast Notification */}
          {toast && (
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              {toast}
            </div>
          )}

          {/* Form */}
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Platform Name
              </label>
              <input
                type="text"
                value={form.platform_name}
                onChange={(e) => setForm({ ...form, platform_name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Commission Percentage (%)
              </label>
              <input
                type="number"
                value={form.commission_percentage}
                onChange={(e) =>
                  setForm({ ...form, commission_percentage: Number(e.target.value) })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Support Contact Email
              </label>
              <input
                type="email"
                value={form.support_email}
                onChange={(e) => setForm({ ...form, support_email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500"
              />
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-white">Maintenance Mode</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Offline block page for all customers and owner dashboards.
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
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={() => setConfirmModal(true)}
              disabled={saving}
              className="px-6 py-2.5 bg-green-500 text-black rounded-xl text-sm font-bold hover:bg-green-400 transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Platform Settings
            </button>
          </div>
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
                <strong className="text-red-400 block mt-2">
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
    </div>
  )
}
