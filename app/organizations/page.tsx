"use client"

import { Search, ShieldCheck, ShieldAlert, ExternalLink, Plus, Mail, Building, CreditCard, Calendar, Check, ArrowRight, ArrowLeft, Loader2, Trash2 } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { createClerkOrganization, deleteClerkOrganization } from "@/app/actions/clerk"

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

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    adminEmail: "",
    plan: "Pro",
    duration: "12",
  })

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations(data || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)

  const generateLicenseKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let key = "";
    for (let i = 0; i < 15; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const orgCode = formData.name.substring(0, 3).toUpperCase() + Math.floor(10 + Math.random() * 90)
      
      // 1. Create in Clerk first
      const clerkResult = await createClerkOrganization(formData.name, formData.adminEmail)
      
      if (!clerkResult.success) {
        throw new Error(clerkResult.error)
      }

      // 2. Create Organization in Supabase with clerk_org_id
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert([
          { 
            name: formData.name, 
            code: orgCode, 
            clerk_org_id: clerkResult.clerkOrgId,
            admin_email: formData.adminEmail,
            plan: formData.plan,
            status: 'active'
          }
        ])
        .select()
        .single()

      if (orgError) throw orgError

      // 2. Create License
      const licenseKey = generateLicenseKey()
      const expiryDate = new Date()
      
      if (formData.plan === 'Lifetime') {
        expiryDate.setFullYear(expiryDate.getFullYear() + 100) // 100 years for lifetime
      } else {
        expiryDate.setMonth(expiryDate.getMonth() + parseInt(formData.duration))
      }

      const { error: licenseError } = await supabase
        .from('licenses')
        .insert([
          {
            organization_id: orgData.id,
            license_key: licenseKey,
            expiry_date: expiryDate.toISOString(),
            status: 'active',
            max_users: formData.plan === 'Lifetime' ? 9999 : formData.plan === 'Enterprise' ? 500 : formData.plan === 'Pro' ? 100 : 10
          }
        ])

      if (licenseError) throw licenseError

      alert(`Organization Onboarded Successfully!\n\nOrg Code: ${orgCode}\nLicense Key: ${licenseKey}`)
      setShowCreateModal(false)
      setStep(1)
      setFormData({ name: "", adminEmail: "", plan: "Pro", duration: "12" })
      fetchOrganizations()
    } catch (error: any) {
      console.error('Error onboarding organization:', error)
      alert('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (orgId: number, clerkOrgId: string | null, orgName: string) => {
    if (!confirm(`Are you sure you want to delete ${orgName}? This will also delete its Clerk organization and all associated licenses.`)) {
      return
    }

    try {
      setLoading(true)

      // 1. Delete from Clerk if exists
      if (clerkOrgId) {
        const clerkResult = await deleteClerkOrganization(clerkOrgId)
        if (!clerkResult.success) {
          console.error("Clerk deletion failed:", clerkResult.error)
          // We continue to delete from DB even if Clerk fails (or handle as needed)
        }
      }

      // 2. Delete Licenses first (Foreign Key constraint)
      const { error: licenseError } = await supabase
        .from('licenses')
        .delete()
        .eq('organization_id', orgId)

      if (licenseError) throw licenseError

      // 3. Delete Organization
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', orgId)

      if (orgError) throw orgError

      alert("Organization deleted successfully")
      fetchOrganizations()
    } catch (error: any) {
      console.error("Error deleting organization:", error)
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Organizations</h1>
          <p className="text-zinc-500">Manage customers and access control.</p>
        </div>
        <button 
          onClick={() => {
            setStep(1)
            setShowCreateModal(true)
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Organization
        </button>
      </div>

      {/* Organizations Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-4 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 text-xs font-semibold uppercase text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4">Org Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading organizations...
                  </td>
                </tr>
              ) : organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    No organizations found. Create one to get started.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors text-zinc-700 dark:text-zinc-300">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-zinc-900 dark:text-white">{org.name}</span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs">{org.code}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.status === 'active' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {org.status === 'active' ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{org.plan}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-zinc-400">
                         <Link href={`/organizations/${org.id}`} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition" title="View Details">
                           <ExternalLink className="h-4 w-4" />
                         </Link>
                         <button 
                           onClick={() => handleDelete(org.id, org.clerk_org_id, org.name)}
                           className="p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 rounded-lg transition" 
                           title="Delete Organization"
                         >
                           <Trash2 className="h-4 w-4" />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboarding Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Onboard New Customer</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                  <span className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl font-light">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-8 space-y-6">
                {step === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Step 1: Organization Details</h3>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Organization Name</label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input 
                          type="text" 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Admin Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input 
                          type="email" 
                          required
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" 
                          placeholder="admin@example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Step 2: License & Plan</h3>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Subscription Plan</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                          <select 
                            value={formData.plan}
                            onChange={(e) => setFormData({...formData, plan: e.target.value})}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none pointer-events-auto cursor-pointer"
                          >
                            <option>Starter</option>
                            <option>Pro</option>
                            <option>Enterprise</option>
                            <option>Lifetime</option>
                          </select>
                        </div>
                      </div>
                      {formData.plan !== 'Lifetime' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">License Duration (Months)</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
                            <select 
                              value={formData.duration}
                              onChange={(e) => setFormData({...formData, duration: e.target.value})}
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm appearance-none pointer-events-auto cursor-pointer"
                            >
                              <option value="1">1 Month</option>
                              <option value="6">6 Months</option>
                              <option value="12">12 Months</option>
                              <option value="24">24 Months</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between border-t border-zinc-100 dark:border-zinc-800">
                {step > 1 ? (
                  <button type="button" onClick={handleBack} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-blue-600 transition">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                ) : <div />}
                
                {step < 2 ? (
                  <button type="button" onClick={handleNext} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    Next <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete & Onboard <Check className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
