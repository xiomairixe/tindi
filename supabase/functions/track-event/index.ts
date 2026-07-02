// @ts-nocheck
// ↑ Deno-specific imports/globals (Deno.serve, https:// imports) confuse VS Code's
// default TS server. Safe to ignore — the Supabase Edge Runtime compiles this fine.
// For proper editor support instead, install the "Deno" VS Code extension and add
// a .vscode/settings.json with { "deno.enable": true, "deno.enablePaths": ["./supabase/functions"] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { UAParser } from 'https://esm.sh/ua-parser-js@1.0.37'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { event_type, user_id, email, page_path, referrer, metadata } = body

    if (!event_type) {
      return new Response(JSON.stringify({ error: 'event_type is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Extract real client IP from request headers ──
    // x-forwarded-for can contain a chain: "client, proxy1, proxy2" — first entry is the real client
    const forwardedFor = req.headers.get('x-forwarded-for') || ''
    const ip = forwardedFor.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || null

    // ── Parse User-Agent for device/browser/OS ──
    const uaString = req.headers.get('user-agent') || ''
    const parser = new UAParser(uaString)
    const uaResult = parser.getResult()
    const deviceType = uaResult.device.type || 'desktop' // ua-parser-js leaves this blank for regular desktops
    const browser = uaResult.browser.name
      ? `${uaResult.browser.name} ${uaResult.browser.version || ''}`.trim()
      : null
    const os = uaResult.os.name
      ? `${uaResult.os.name} ${uaResult.os.version || ''}`.trim()
      : null

    // ── Best-effort geo lookup (skip for local/private IPs) ──
    let city = null
    let country = null
    const isPrivateIp =
      !ip || ip === '127.0.0.1' || ip === '::1' ||
      ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')

    if (!isPrivateIp) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`)
        if (geoRes.ok) {
          const geo = await geoRes.json()
          if (!geo.error) {
            city = geo.city || null
            country = geo.country_name || null
          }
        }
      } catch (_) {
        // geo lookup is best-effort, never block the event on failure
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabase.from('analytics_events').insert({
      event_type,
      user_id: user_id || null,
      email: email || null,
      page_path: page_path || null,
      referrer: referrer || req.headers.get('referer') || null,
      user_agent: uaString || null,
      ip_address: ip,
      device_type: deviceType,
      browser,
      os,
      city,
      country,
      metadata: metadata || {},
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('track-event error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})