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

interface InstanceHealth {
  id: number
  organization_id: number
  org_name: string
  status: string
  cpu_usage: string
  memory_usage: string
  latency: string
  uptime: string
  server_id: string
  last_heartbeat: string
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [instances, setInstances] = useState<InstanceHealth[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHealthStatus()
  }, [])

  const fetchHealthStatus = async () => {
    try {
      setLoading(true)
      
      // Fetch Core Services Status
      const { data: serviceData, error: serviceError } = await supabase
        .from('monitoring_status')
        .select('*')
        .order('service_name', { ascending: true })

      if (serviceError) throw serviceError
      setServices(serviceData || [])

      // Fetch Individual Organization Instance Health
      const { data: instanceData, error: instanceError } = await supabase
        .from('instance_health')
        .select('*')
        .order('org_name', { ascending: true })

      if (instanceError) throw instanceError
      setInstances(instanceData || [])

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

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-600" /> Client Organization Instances
          </h3>
          <span className="text-xs text-zinc-400 font-medium">Monitoring {instances.length} active deployments</span>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {loading ? (
            <div className="p-12 text-center text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Scanning organization nodes...
            </div>
          ) : instances.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 italic">
              No organization instances have reported health data yet.
            </div>
          ) : (
            instances.map((inst) => (
              <div key={inst.id} className="p-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    inst.status === 'operational' ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {inst.status === 'operational' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-zinc-900 dark:text-white">{inst.org_name}</p>
                       <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono tracking-tighter">{inst.server_id}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1">
                        <div className={`h-1.5 w-1.5 rounded-full ${inst.status === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {inst.status}
                      </p>
                      <span className="text-[10px] text-zinc-400 font-medium">• Last pulse: {new Date(inst.last_heartbeat).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-8 items-center">
                  <div className="grid grid-cols-2 gap-4 mr-4 border-r border-zinc-100 dark:border-zinc-800 pr-8">
                     <div className="text-right">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">CPU</p>
                        <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{inst.cpu_usage || '0%'}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">RAM</p>
                        <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{inst.memory_usage || '0MB'}</p>
                     </div>
                  </div>
                  <div className="text-right sr-only sm:not-sr-only">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5 tracking-tighter">Availability</p>
                    <p className="text-sm font-black text-green-600">{inst.uptime}</p>
                  </div>
                  <div className="text-right w-16">
                    <p className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5 tracking-tighter">Ping</p>
                    <p className="text-sm font-black text-zinc-900 dark:text-white">{inst.latency}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {!loading && instances.length > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800 text-center text-[10px] text-zinc-400 font-medium italic">
            Monitoring heartbeats across dedicated organization clusters
          </div>
        )}
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
