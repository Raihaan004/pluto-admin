
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Try Service Role Key first, fallback to Anon Key (if RLS is not enforced or configured for public read)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { license_key, org_code, server_id, app_version } = body

    if (!license_key || !org_code) {
      return NextResponse.json(
        { error: 'Missing license_key or org_code' },
        { status: 400 }
      )
    }

    // 1. Verify Organization and License
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select(`
        *,
        organizations (
          id,
          name,
          code,
          status,
          plan
        )
      `)
      .eq('license_key', license_key)
      .eq('status', 'active')
      .single()

    if (licenseError || !license) {
      return NextResponse.json(
        { error: 'Invalid or inactive license key' },
        { status: 401 }
      )
    }

    // Explicitly cast the joined data
    const organization = license.organizations as any;

    if (!organization || organization.code !== org_code) {
      return NextResponse.json(
        { error: 'Organization code does not match license' },
        { status: 401 }
      )
    }

    if (organization.status !== 'active') {
      return NextResponse.json(
        { error: 'Organization is not active' },
        { status: 403 }
      )
    }

    // 2. (Optional) Record the connection / activation
    // You might want to store the server_id or update a "last_connected" timestamp
    // For now, we'll just log it or update metadata in the license if needed
    
    // Example: Update license metadata with server info
    const currentFeatures = license.features || {}
    await supabase
      .from('licenses')
      .update({
        features: {
          ...currentFeatures,
          last_activated_at: new Date().toISOString(),
          activated_server: server_id,
          app_version: app_version
        }
      })
      .eq('id', license.id)

    // 3. Return Organization Details
    return NextResponse.json({
      status: 'verified',
      org_id: organization.id,
      org_name: organization.name,
      org_code: organization.code,
      plan: organization.plan,
      license_key: license.license_key
    })

  } catch (error: any) {
    console.error('License verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
