"use client"

import { ShieldCheck, ShieldAlert, CreditCard, Calendar, Activity, Users, Settings, ToggleLeft, ToggleRight, Edit, ArrowLeft, MoreHorizontal, Ban, Trash2, Loader2, RefreshCw, X } from "lucide-react"
import Link from "next/link"
import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { deleteClerkOrganization } from "@/app/actions/clerk"

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
  const { id } = use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")
  const [org, setOrg] = useState<Organization | null>(null)
  const [license, setLicense] = useState<License | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newPlan, setNewPlan] = useState("")

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

      // 2. Delete Supabase Org (Cascade should handle licenses)
      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

      if (error) throw error;

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
            <button className={`${org.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition`}>
              <Ban className="h-4 w-4" /> {org.status === 'active' ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 space-x-8">
        {["Overview", "License", "Features", "Monitoring"].map((tab) => (
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
                      <span className="font-bold">0 / {license.max_users}</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `0%` }} />
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
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <h4 className="font-bold mb-2 flex items-center gap-2 text-sm uppercase">
              <Calendar className="h-4 w-4" /> Renewal
            </h4>
            <p className="text-3xl font-black mb-1">{daysLeft > 0 ? `${daysLeft} Days` : 'Expired'}</p>
            <p className="text-blue-100 text-xs">Based on current {org.plan} plan</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800">
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
    </>
  )
}
