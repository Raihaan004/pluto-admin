"use client"

import { Activity, Server, Database, Globe, Cpu, MemoryStick as Memory, Share2, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"

interface ServiceStatus {
  id: number
  service_name: string
  status: string
  uptime: string
  latency: string
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealthStatus()
  }, [])

  const fetchHealthStatus = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('monitoring_status')
        .select('*')
        .order('service_name', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching health status:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">System Health</h1>
          <p className="text-zinc-500">Real-time infrastructure monitoring and service status.</p>
        </div>
        <button 
          onClick={fetchHealthStatus}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <HealthMetricCard title="CPU Usage" value="24%" subValue="Across 8 Nodes" icon={<Cpu className="text-blue-600" />} />
        <HealthMetricCard title="Memory Usage" value="4.2 GB" subValue="Of 16GB Total" icon={<Memory className="text-purple-600" />} />
        <HealthMetricCard title="Total Traffic" value="8.4k" subValue="Req/min" icon={<Share2 className="text-green-600" />} />
        <HealthMetricCard title="Error Rate" value="0.04%" subValue="-0.01% from yesterday" icon={<AlertTriangle className="text-amber-600" />} />
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="font-bold flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-600" /> Service Status
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Checking service availability...
            </div>
          ) : services.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No monitoring data available in the system.
            </div>
          ) : (
            services.map((s) => (
              <div key={s.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    s.status === 'operational' ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    {s.status === 'operational' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                  </div>
                  <div>
                    <p className="font-semibold">{s.service_name}</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide font-bold">{s.status}</p>
                  </div>
                </div>
                <div className="flex gap-12">
                  <div className="text-right">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Uptime</p>
                    <p className="text-sm font-medium">{s.uptime}</p>
                  </div>
                  <div className="text-right w-20">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">Latency</p>
                    <p className="text-sm font-medium">{s.latency}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function HealthMetricCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">{icon}</div>
      </div>
      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black">{value}</h3>
      <p className="text-xs text-zinc-400 mt-1">{subValue}</p>
    </div>
  )
}

function HealthMetricCard({ title, value, subValue, icon }: { title: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">{icon}</div>
      </div>
      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black">{value}</h3>
      <p className="text-xs text-zinc-400 mt-1">{subValue}</p>
    </div>
  )
}
