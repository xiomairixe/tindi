import { supabase } from './supabase'

/**
 * Core logger — lahat ng event types dumaan dito.
 * Tumatawag sa 'track-event' Edge Function para makuha ang tunay na
 * IP address, device/browser/OS, at approximate location server-side.
 * Silent-fails (console.error lang) para hindi masira ang UX.
 */
export async function logAnalyticsEvent(eventType, options = {}) {
  try {
    let userId = options.userId || null
    let email = options.email || null

    // kung walang binigay na userId/email, subukan kunin sa kasalukuyang session
    if (!userId || !email) {
      const { data } = await supabase.auth.getUser()
      userId = userId || data?.user?.id || null
      email = email || data?.user?.email || null
    }

    const { error } = await supabase.functions.invoke('track-event', {
      body: {
        event_type: eventType,
        user_id: userId,
        email,
        page_path: options.pagePath ?? (typeof window !== 'undefined' ? window.location.pathname : null),
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        metadata: options.metadata || {},
      },
    })

    if (error) throw error
  } catch (err) {
    // hindi natin i-throw, tracking lang ito, hindi dapat sumira ng app
    console.error('Analytics tracking error:', err)
  }
}

/** Tawagin sa landing page (o kahit anong page na gusto mong i-track) */
export function trackPageView(pagePath, metadata) {
  return logAnalyticsEvent('page_view', { pagePath, metadata })
}

/** Tawagin pagkatapos ng login attempt, success man o hindi */
export function trackLogin(email, success, metadata) {
  return logAnalyticsEvent(success ? 'login' : 'login_failed', { email, metadata })
}

/** Tawagin pagkatapos magtagumpay ang registration */
export function trackRegistration(email, metadata) {
  return logAnalyticsEvent('registration', { email, metadata })
}   