"use client"

import { CreditCard, Search, Filter, Calendar, Users, Shield, Copy, ExternalLink, MoreVertical, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

interface License {
  id: number
  license_key: string
  status: string
  expiry_date: string
  max_users: number
  organization: {
    name: string
    plan: string
  }
}

export default function LicensesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLicenses()
  }, [])

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select(`
          id,
          license_key,
          status,
          expiry_date,
          max_users,
          organization:organizations (
            name,
            plan
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const formattedData = (data as any[])?.map(item => ({
        ...item,
        organization: Array.isArray(item.organization) ? item.organization[0] : item.organization
      }))
      
      setLicenses(formattedData || [])
    } catch (error) {
      console.error('Error fetching licenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeCount = licenses.filter(l => l.status === 'active').length
  const expiredCount = licenses.filter(l => l.status === 'expired').length
  
  // Simplified "expiring soon" check (within 30 days)
  const expiringSoonCount = licenses.filter(l => {
    const expiry = new Date(l.expiry_date)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return l.status === 'active' && expiry < thirtyDaysFromNow && expiry > new Date()
  }).length

  const filteredLicenses = licenses.filter(l => 
    l.license_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.organization?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">License Management</h1>
          <p className="text-zinc-500">Monitor and manage product activation keys across all organizations.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
          <CreditCard className="h-4 w-4" /> Issue New License
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
          <h2 className="text-3xl font-black">{activeCount}</h2>
          <p className="text-zinc-500 text-sm">Active Licenses</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">EXPIRING</span>
          </div>
          <h2 className="text-3xl font-black">{expiringSoonCount}</h2>
          <p className="text-zinc-500 text-sm">Expiring Next 30 Days</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-50 rounded-lg"><AlertCircle className="h-5 w-5 text-red-600" /></div>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">EXPIRED</span>
          </div>
          <h2 className="text-3xl font-black">{expiredCount}</h2>
          <p className="text-zinc-500 text-sm">Expired Licenses</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by license key or organization..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-50 transition">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">License Key</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading licenses...
                  </td>
                </tr>
              ) : filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    No licenses found.
                  </td>
                </tr>
              ) : (
                filteredLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group text-sm">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">{license.license_key}</span>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(license.license_key)
                            alert('Copied to clipboard!')
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-50 rounded transition-all"
                        >
                          <Copy className="h-3 w-3 text-blue-600" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{license.organization?.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold uppercase tracking-wider">
                        {license.organization?.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-zinc-600">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        {new Date(license.expiry_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5 w-32">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span>0</span>
                          <span className="text-zinc-400">/ {license.max_users}</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full bg-blue-500" 
                            style={{ width: '0%' }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        license.status === 'active' ? 'bg-green-100 text-green-700' : 
                        license.status === 'expiring-soon' ? 'bg-amber-100 text-amber-700' : 
                        'bg-red-100 text-red-700'
                      }`}>
                        {license.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition">
                        <MoreVertical className="h-4 w-4 text-zinc-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
