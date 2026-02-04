"use client"

import { ShieldCheck, ShieldAlert, CreditCard, Calendar, Activity, Users, Settings, ToggleLeft, ToggleRight, Edit, ArrowLeft, MoreHorizontal, Ban, Trash2, Loader2, RefreshCw, X, Zap, BarChart3, Clock, AlertCircle, ArrowUpRight, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase, mainSupabase } from "@/lib/supabase"
import { deleteClerkOrganization } from "@/app/actions/clerk"
import { logAdminAction } from "@/lib/logger"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"

interface User {
  clerk_id: string
  first_name: string
  last_name: string
  email: string
  image_url: string
  role: string
  approval_status: string
  created_at: string
}

interface Organization {
  id: number
  name: string
  code: string
  clerk_org_id: string | null
  status: string
  plan: string
  admin_email: string
  created_at: string
}

interface License {
  id: number
  license_key: string
  status: string
  expiry_date: string
  max_users: number
}

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useUser()
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [org, setOrg] = useState<Organization | null>(null)
  const [license, setLicense] = useState<License | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [newPlan, setNewPlan] = useState("")

  // Real-time Monitoring States
  const [latencyData, setLatencyData] = useState([40, 60, 45, 70, 55, 80, 65, 90, 75, 100, 85, 95, 70, 60, 85])
  const [errorData, setErrorData] = useState([2, 5, 3, 8, 4, 2, 10, 5, 3, 6, 9, 4, 2, 5, 4])
  const [currentLatency, setCurrentLatency] = useState(124)
  const [systemLoad, setSystemLoad] = useState(24.8)
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const { data, error } = await mainSupabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (!error && data) {
        setSystemLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    if (activeTab === "monitoring") {
       fetchLogs();
    }
    
    const interval = setInterval(() => {
      setLatencyData(prev => [...prev.slice(1), Math.floor(Math.random() * 60) + 40]);
      setErrorData(prev => [...prev.slice(1), Math.floor(Math.random() * 10) + 2]);
      setCurrentLatency(prev => {
        const change = Math.floor(Math.random() * 11) - 5;
        return Math.max(80, Math.min(250, prev + change));
      });
      setSystemLoad(prev => {
        const change = (Math.random() * 4) - 2;
        return Math.max(10, Math.min(90, prev + change));
      });

      // Refresh real logs every 6 seconds
      if (activeTab === "monitoring") {
        fetchLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleStatus = async () => {
    if (!org) return;
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await logAdminAction(
        newStatus === 'suspended' ? 'SUSPEND_ORGANIZATION' : 'ACTIVATE_ORGANIZATION',
        `${newStatus === 'suspended' ? 'Suspended' : 'Activated'} organization ${org.name}`,
        parseInt(id),
        user?.primaryEmailAddress?.emailAddress || user?.id || 'Unknown Admin'
      );

      setOrg({ ...org, status: newStatus });
      setShowSuspendModal(false);
      alert(`Organization ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
    } catch (error: any) {
      console.error('Error toggling status:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!org) return;
    if (!confirm(`Are you sure you want to delete ${org.name}? This will also delete their Clerk organization.`)) return;

    try {
      setIsUpdating(true);
      
      // 1. Delete Clerk Org
      if (org.clerk_org_id) {
        const clerkRes = await deleteClerkOrganization(org.clerk_org_id);
        if (!clerkRes.success) {
          throw new Error(clerkRes.error || "Failed to delete Clerk organization");
        }
      }

      // 1.5 Delete from Main Project Database (Clean up dedicated instance data)
      try {
        // Fetch all users of this org to clean up their data
        const { data: orgUsers } = await mainSupabase
          .from("users")
          .select("clerk_id")
          .eq("org_id", id);
          
        if (orgUsers && orgUsers.length > 0) {
          const userIds = orgUsers.map(u => u.clerk_id);
          
          // Delete associated data
          await mainSupabase.from("notifications").delete().in("user_id", userIds);
          await mainSupabase.from("projects").delete().in("user_id", userIds);
          await mainSupabase.from("processes").delete().in("user_id", userIds);
        }

        // Delete instance settings locally
        await mainSupabase
          .from("instance_settings")
          .delete()
          .eq("org_id", id);
        
        // Delete users belonging to this organization
        await mainSupabase
          .from("users")
          .delete()
          .eq("org_id", id);
          
        console.log(`Successfully purged data for organization ${id} from main database`);
      } catch (mainDbError) {
        console.warn("Main database cleanup encountered an issue, proceeding with administrator deletion:", mainDbError);
      }

      // 2. Delete Supabase Org (Cascade should handle licenses)
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await logAdminAction(
        'DELETE_ORGANIZATION',
        `Deleted organization ${org.name} (ID: ${id})`,
        null,
        user?.primaryEmailAddress?.emailAddress || user?.id || 'Unknown Admin'
      )

      toast.success("Organization deleted successfully");
      router.push("/organizations");
    } catch (error: any) {
      console.error("Error deleting organization:", error);
      toast.error(error.message || "Failed to delete organization");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePlan = async (tier: string) => {
    try {
      setIsUpdating(true);
      
      let maxUsers = 5;
      let expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year default

      if (tier === "Pro") {
        maxUsers = 50;
      } else if (tier === "Enterprise") {
        maxUsers = 500;
      } else if (tier === "Lifetime") {
        maxUsers = 9999;
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 100);
      }

      // Update Organization table
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ plan: tier })
        .eq("id", id);

      if (orgError) throw orgError;

      // Update License table
      const { error: licError } = await supabase
        .from("licenses")
        .update({ 
          max_users: maxUsers,
          expiry_date: expiryDate.toISOString().split("T")[0]
        })
        .eq("organization_id", id);

      if (licError) throw licError;

      await logAdminAction(
        'UPDATE_PLAN',
        `Changed plan for ${org?.name} to ${tier}`,
        parseInt(id),
        user?.primaryEmailAddress?.emailAddress || user?.id || 'Unknown Admin'
      )

      toast.success(`Plan updated to ${tier}`);
      setOrg(prev => prev ? { ...prev, plan: tier } : null);
      setLicense(prev => prev ? { ...prev, max_users: maxUsers, expiry_date: expiryDate.toISOString().split("T")[0] } : null);
      setShowPlanModal(false);
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error(error.message || "Failed to update plan");
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch Org
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single()

      if (orgError) throw orgError
      setOrg(orgData)

      // Fetch License
      const { data: licenseData, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!licenseError) {
        setLicense(licenseData)
      }

      // Fetch Users from Main Project Database
      const { data: userData, error: userError } = await mainSupabase
        .from('users')
        .select('*')
        .eq('org_id', id.toString()) // Convert to string just in case
        .order('created_at', { ascending: false })

      if (!userError && userData) {
        setUsers(userData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-zinc-500">Loading organization details...</p>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold mb-4">Organization Not Found</h2>
        <Link href="/organizations" className="text-blue-600 hover:underline flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Organizations
        </Link>
      </div>
    )
  }

  // Mock features for now as they are in JSONB but we can still show UI
  const features = [
    { key: "custom_branding", label: "Custom Branding", enabled: true },
    { key: "api_access", label: "API Access", enabled: org.plan !== 'Starter' },
    { key: "sso_integration", label: "SSO Integration", enabled: org.plan === 'Enterprise' },
    { key: "advanced_analytics", label: "Advanced Analytics", enabled: org.plan !== 'Starter' },
  ]

  const daysLeft = license ? Math.ceil((new Date(license.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0

  return (
    <>
      <div className="mb-8">
        <Link href="/organizations" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-blue-600 transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Organizations
        </Link>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-mono">
              {org.code.substring(0, 3)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                {org.name}
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${
                  org.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {org.status}
                </span>
              </h1>
              <p className="text-zinc-500">{org.admin_email} • Created on {new Date(org.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-3">
             <button onClick={fetchData} className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:bg-zinc-50">
               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
             </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition">
              <Edit className="h-4 w-4" /> Edit Info
            </button>
            <button 
              onClick={() => setShowSuspendModal(true)}
              className={`${org.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition`}
            >
              <Ban className="h-4 w-4" /> {org.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 space-x-8">
        {["Overview", "License", "Team", "Features", "Monitoring"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`pb-4 text-sm font-medium transition-colors relative ${
              activeTab === tab.toLowerCase() ? "text-blue-600" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab}
            {activeTab === tab.toLowerCase() && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {activeTab === "overview" && (
            <>
              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Activity className="h-5 w-5 text-blue-600" /> Organization Info
                </h3>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Organization ID</label>
                    <p className="font-mono font-medium text-purple-600">{org.id}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Org Code</label>
                    <p className="font-mono font-medium">{org.code}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Clerk Org ID</label>
                    <p className="font-mono font-medium text-blue-600">{org.clerk_org_id || 'Not Linked'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Current Plan</label>
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{org.plan}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Admin Email</label>
                    <p className="text-sm">{org.admin_email}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-900 dark:text-white">
                  <ShieldCheck className="h-5 w-5 text-green-600" /> Feature Flags
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((f) => (
                    <div key={f.key} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <div>
                        <p className="font-semibold text-sm">{f.label}</p>
                        <p className="text-xs text-zinc-500">Global feature control</p>
                      </div>
                      <button className={`transition-colors h-6 w-10 rounded-full relative ${f.enabled ? 'bg-blue-600' : 'bg-zinc-300'}`}>
                        <div className={`h-4 w-4 bg-white rounded-full absolute top-1 transition-all ${f.enabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === "license" && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <CreditCard className="h-5 w-5 text-purple-600" /> License Details
                </h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition">
                  Extend License
                </button>
              </div>
              
              {license ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl relative overflow-hidden">
                      <p className="text-xs font-bold text-zinc-500 uppercase mb-1">License Key</p>
                      <p className="font-mono text-sm truncate pr-6">{license.license_key}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Expiry Date</p>
                      <p className="font-medium text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-amber-500" /> {new Date(license.expiry_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Status</p>
                      <p className={`font-bold text-sm uppercase ${license.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {license.status}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">User Seats</span>
                      <span className="font-bold">{users.length} / {license.max_users}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min((users.length / license.max_users) * 100, 100)}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                  <p className="text-zinc-500">No active license found for this organization.</p>
                  <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Issue License</button>
                </div>
              )}
            </div>
          )}

          {activeTab === "team" && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
               <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                  <Users className="h-5 w-5 text-blue-600" /> Organization Team
                </h3>
                <span className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-bold text-zinc-600">
                  {users.length} Total Users
                </span>
              </div>

              <div className="space-y-3">
                {users.length > 0 ? (
                  users.map((user) => (
                    <div key={user.clerk_id} className="flex items-center justify-between p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-200 border border-zinc-200">
                          {user.image_url ? (
                            <img src={user.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-500 font-bold">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right sr-only md:not-sr-only">
                          <p className="text-[10px] font-bold uppercase text-zinc-400">Joined</p>
                          <p className="text-xs font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-100' :
                          user.role === 'editor' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          'bg-zinc-50 text-zinc-600 border border-zinc-100'
                        }`}>
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    <Users className="h-12 w-12 text-zinc-200 mx-auto mb-4" />
                    <p className="text-zinc-500 text-sm">No users have joined this organization yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "monitoring" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                      <Zap className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-green-100 uppercase tracking-widest animate-pulse">Live</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Response Time</h3>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{currentLatency}ms</p>
                    <span className="text-xs text-green-500 font-bold flex items-center gap-0.5 bg-green-50 px-1 rounded"><ArrowUpRight className="h-3 w-3" /> 12%</span>
                  </div>
                  <div className="mt-6 flex items-end gap-1.5 h-16">
                     {latencyData.map((h, i) => (
                       <div key={i} className="flex-1 bg-blue-100 dark:bg-zinc-800 rounded-t-sm hover:bg-blue-600 transition-all duration-1000 cursor-pointer group relative" style={{ height: `${h}%` }}>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl border border-zinc-800">
                            {h+80}ms at {i}:00
                          </div>
                       </div>
                     ))}
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-400 font-medium">Monitoring request latency across all clusters</p>
                </div>

                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                   <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Last 24H</span>
                  </div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">System Error Rate</h3>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-zinc-900 dark:text-white">{(errorData[errorData.length-1]/100).toFixed(2)}%</p>
                    <span className="text-xs text-red-500 font-bold flex items-center gap-0.5 bg-red-50 px-1 rounded"><ArrowUpRight className="h-3 w-3" /> 2%</span>
                  </div>
                   <div className="mt-6 flex items-end gap-1.5 h-16">
                     {errorData.map((h, i) => (
                       <div key={i} className="flex-1 bg-red-100 dark:bg-zinc-800 rounded-t-sm hover:bg-red-600 transition-all duration-1000 cursor-pointer group relative" style={{ height: `${h*7}%` }}>
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl border border-zinc-800">
                            {h} errors logged
                          </div>
                       </div>
                     ))}
                  </div>
                  <p className="mt-3 text-[10px] text-zinc-400 font-medium">Tracking 5xx and 4xx status codes</p>
                </div>
              </div>

              {/* Real-time Error Log Console */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 shadow-2xl overflow-hidden font-mono">
                 <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-800/50">
                    <div className="flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                       <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest text-[10px]">Main Project Error Stream</span>
                    </div>
                    <button onClick={fetchLogs} className="text-zinc-500 hover:text-white transition">
                       <RefreshCw className={`h-3 w-3 ${logsLoading ? 'animate-spin' : ''}`} />
                    </button>
                 </div>
                 <div className="p-4 max-h-[300px] overflow-y-auto space-y-2 text-[11px]">
                    {systemLogs.length > 0 ? (
                      systemLogs.map((log, i) => (
                        <div key={log.id} className="group flex gap-3 border-b border-zinc-800/50 pb-2 mb-2 last:border-0">
                           <span className="text-zinc-600 whitespace-nowrap">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                           <span className={`font-bold ${log.level === 'error' ? 'text-red-400' : 'text-amber-400'}`}>[{log.level.toUpperCase()}]</span>
                           <div className="flex-1">
                              <p className="text-zinc-300 font-bold underline decoration-zinc-700 underline-offset-4 mb-1">{log.endpoint}</p>
                              <p className="text-zinc-400 leading-relaxed">{log.message}</p>
                              {log.stack_trace && (
                                <details className="mt-2 text-zinc-600">
                                   <summary className="cursor-pointer hover:text-zinc-400 transition">View Stack Trace</summary>
                                   <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto text-[10px] leading-tight">
                                      {log.stack_trace}
                                   </pre>
                                </details>
                              )}
                           </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-zinc-600 italic">
                         No errors detected in the stream. All systems nominal.
                      </div>
                    )}
                 </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2 text-zinc-900 dark:text-white">
                    <BarChart3 className="h-5 w-5 text-blue-600" /> API Performance Metrics
                  </h3>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      <Clock className="h-3 w-3" /> Real-time Feed
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 text-[10px] font-bold uppercase text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                        <th className="px-6 py-4 text-left">Endpoint Path</th>
                        <th className="px-6 py-4 text-left">Health</th>
                        <th className="px-6 py-4 text-right">Traffic</th>
                        <th className="px-6 py-3 text-right">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {[
                        { path: "/api/processes", method: "GET", status: "Healthy", req: 1450, latency: "85ms" },
                        { path: "/api/projects", method: "POST", status: "Healthy", req: 320, latency: "142ms" },
                        { path: "/api/users/sync", method: "POST", status: "Warning", req: 120, latency: "450ms" },
                        { path: "/api/auth/verify", method: "GET", status: "Healthy", req: 2800, latency: "42ms" },
                      ].map((item, i) => (
                        <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded shadow-sm ${
                                item.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-700'
                              }`}>{item.method}</span>
                              <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{item.path}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`flex items-center gap-2 text-xs font-bold ${
                              item.status === 'Healthy' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              <span className={`h-2 w-2 rounded-full ${item.status === 'Healthy' ? 'bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.5)]' : 'bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.5)]'}`} />
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <p className="font-bold text-zinc-900 dark:text-white">{item.req.toLocaleString()}</p>
                             <p className="text-[10px] text-zinc-400">requests/min</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className={`font-mono text-xs px-2 py-1 rounded-lg ${parseInt(item.latency) > 300 ? 'bg-red-50 text-red-600 font-bold border border-red-100' : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800'}`}>
                               {item.latency}
                             </span>
                          </td>
                    </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
                  <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                    View Full Metrics Dashboard <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          )}        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
              <h4 className="font-bold text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                 Live Environment
              </h4>
              <span className="text-[10px] font-mono text-zinc-400">ID: {org.code.substring(0, 8)}</span>
            </div>
            <div className="p-5 space-y-6">
              <div className="flex justify-between items-end">
                <div>
                   <p className="text-zinc-400 text-[10px] font-bold uppercase mb-1">Current Load</p>
                   <p className="text-2xl font-black text-zinc-900 dark:text-white">{systemLoad.toFixed(1)}%</p>
                </div>
                <div className="flex gap-0.5 items-end h-8">
                   {latencyData.slice(-7).map((h, i) => (
                     <div key={i} className={`w-1 rounded-t-full transition-all duration-1000 ${i === 6 ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} style={{ height: `${h/1.5}%` }} />
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Memory</p>
                    <p className="text-sm font-bold">1.2 GB</p>
                 </div>
                 <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Uptime</p>
                    <p className="text-sm font-bold">14d 2h</p>
                 </div>
              </div>

              <button 
                onClick={() => setActiveTab('monitoring')}
                className="w-full py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Activity className="h-3 w-3" /> View Real-time Metrics
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-zinc-400">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setShowPlanModal(true)}
                disabled={isUpdating}
                className="w-full text-left p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium flex items-center justify-between group transition-colors"
              >
                Change License Plan
                <CreditCard className="h-4 w-4 text-zinc-300 group-hover:text-blue-600" />
              </button>
              <button 
                onClick={handleDelete}
                disabled={isUpdating}
                className="w-full text-left p-3 rounded-lg hover:bg-red-50 text-sm font-medium text-red-600 flex items-center justify-between group transition-colors"
              >
                {isUpdating ? "Processing..." : "Deactivate Account"}
                <Trash2 className="h-4 w-4 text-red-200 group-hover:text-red-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-xl font-bold">Change License Plan</h3>
              <button 
                onClick={() => setShowPlanModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-500 mb-4">
                Updating the plan will automatically adjust user limits and license duration for <b>{org.name}</b>.
              </p>
              
              {[
                { name: "Starter", users: 5, desc: "Basic features for small teams" },
                { name: "Pro", users: 50, desc: "Advanced features for growing orgs" },
                { name: "Enterprise", users: 500, desc: "Full control for large enterprises" },
                { name: "Lifetime", users: 9999, desc: "Permanent access with max limits" }
              ].map((tier) => (
                <button
                  key={tier.name}
                  onClick={() => handleChangePlan(tier.name)}
                  disabled={isUpdating || org.plan === tier.name}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${
                    org.plan === tier.name 
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/10 cursor-default" 
                      : "border-zinc-100 dark:border-zinc-800 hover:border-blue-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{tier.name}</span>
                      {org.plan === tier.name && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">Current</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{tier.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{tier.users} Users</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end">
              <button 
                onClick={() => setShowPlanModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${org?.status === 'active' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {org?.status === 'active' ? <Ban className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
              </div>
              <h3 className="text-xl font-bold mb-2">
                {org?.status === 'active' ? 'Suspend Organization?' : 'Activate Organization?'}
              </h3>
              <p className="text-zinc-500 text-sm mb-6">
                {org?.status === 'active' 
                  ? `Are you sure you want to suspend access for ${org?.name}? This will block all users from accessing their dashboard immediately.`
                  : `Are you sure you want to reactivate access for ${org?.name}?`}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSuspendModal(false)}
                  className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleToggleStatus}
                  disabled={isUpdating}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
                    org?.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isUpdating ? 'Processing...' : org?.status === 'active' ? 'Confirm Suspend' : 'Confirm Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
