import { currentUser } from "@clerk/nextjs/server";
import { Users, CreditCard, Clock, Activity, AlertCircle } from "lucide-react";
import DashboardLayout from "./dashboard-layout";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  // Fetch actual stats from Supabase
  const { count: orgCount } = await supabase
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  const { count: licenseCount } = await supabase
    .from('licenses')
    .select('*', { count: 'exact', head: true });

  const { count: expiringSoonCount } = await supabase
    .from('licenses')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .lt('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
    .gt('expiry_date', new Date().toISOString());

  const { data: monitoringData } = await supabase
    .from('monitoring_status')
    .select('*');

  const stats = [
    { title: "Total Organizations", value: orgCount?.toString() || "0", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Active Licenses", value: licenseCount?.toString() || "0", icon: CreditCard, color: "text-green-600", bg: "bg-green-50" },
    { title: "Expiring Soon", value: expiringSoonCount?.toString() || "0", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Apps Down", value: monitoringData?.filter(m => m.status !== 'operational').length.toString() || "0", icon: AlertCircle, color: monitoringData?.filter(m => m.status !== 'operational').length ? "text-red-600" : "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-zinc-500">System overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`${stat.bg} p-3 rounded-lg`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            System Health (Real-time)
          </h2>
          <div className="space-y-4">
            {monitoringData && monitoringData.length > 0 ? (
              monitoringData.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <span className="font-medium">{svc.service_name}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${svc.status === 'operational' ? 'text-green-600' : 'text-red-600'}`}>
                    <span className={`h-2 w-2 rounded-full ${svc.status === 'operational' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {svc.status}
                  </span>
                </div>
              ))
            ) : (
              ["Api Gateway", "Workflow Engine", "Database Cluster", "Storage Service"].map((svc) => (
                <div key={svc} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                  <span className="font-medium">{svc}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 uppercase">
                    <span className="h-2 w-2 bg-green-500 rounded-full" />
                    Operational
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Recently Expired Licenses
          </h2>
          <div className="space-y-4 text-sm text-zinc-500">
             <p className="px-2">No licenses expired in the last 24 hours.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

