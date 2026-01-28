"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ClipboardList, Search, Calendar, User, Building, Info, RefreshCw } from "lucide-react"

interface AdminLog {
  id: number
  action: string
  details: string
  organization_id: number | null
  performed_by: string
  created_at: string
  organizations?: {
    name: string
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_logs')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.organizations?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Admin Logs
          </h1>
          <p className="text-muted-foreground">Track all changes and actions across the platform</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          title="Refresh Logs"
        >
          <RefreshCw className={loading ? "animate-spin h-5 w-5" : "h-5 w-5"} />
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search logs..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900 border-b text-xs font-semibold uppercase text-zinc-500">
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Performed By</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Loading logs...
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No logs found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-zinc-400" />
                        {log.organizations?.name || "Global / System"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-zinc-400" />
                        {log.performed_by}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2 text-sm max-w-md">
                        <Info className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                        <span className="truncate" title={log.details}>
                          {log.details}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
