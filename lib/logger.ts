import { supabase } from "./supabase"

export async function logAdminAction(
  action: string, 
  details: string, 
  organizationId?: number | null, 
  performedBy?: string
) {
  try {
    const { error } = await supabase.from('admin_logs').insert([
      { 
        action, 
        details, 
        organization_id: organizationId, 
        performed_by: performedBy || 'System'
      }
    ])
    if (error) {
      console.error('Supabase logging error:', error)
    }
  } catch (err) {
    console.error('Failed to log admin action:', err)
  }
}
