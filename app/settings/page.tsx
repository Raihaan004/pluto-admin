"use client"

import { Settings, Save, Bell, Shield, Key, Globe, Loader2 } from "lucide-react"
import { useState } from "react"

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)

  const handleSave = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert("Settings saved successfully!")
    }, 1000)
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Platform Settings</h1>
          <p className="text-zinc-500">Configure global parameters and administrative defaults.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* General Section */}
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" /> General Defaults
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Default License Duration</label>
                  <select className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>12 Months</option>
                    <option>24 Months</option>
                    <option>Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">User Limit (Starter Plan)</label>
                  <input type="number" defaultValue={10} className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" /> Security & Access
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-sm">Two-Factor Authentication</p>
                  <p className="text-xs text-zinc-500">Enforce 2FA for all administrative accounts</p>
                </div>
                <div className="h-6 w-11 bg-blue-600 rounded-full relative cursor-pointer">
                   <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                <div>
                  <p className="font-semibold text-sm">Session Timeout</p>
                  <p className="text-xs text-zinc-500">Automatically logout inactive admins after 30 mins</p>
                </div>
                <div className="h-6 w-11 bg-zinc-300 dark:bg-zinc-700 rounded-full relative cursor-pointer">
                   <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <Key className="h-5 w-5" /> API Keys
            </h3>
            <p className="text-blue-100 text-sm mb-4">Manage credentials for external service integrations.</p>
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-bold transition">
              View API Keys
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Bell className="h-5 w-5 text-zinc-400" /> Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm">License Expiry Alerts</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm">System Outage Reports</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
