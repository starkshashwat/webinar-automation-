export function trackCtaClick(webinarId?: string, attendeeId?: string, url?: string) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Resolve registration / attendee ID from parameter or localStorage
    let registrationId: string | null = attendeeId || null;
    
    if (!registrationId && webinarId) {
      registrationId = localStorage.getItem(`moya_attendee_${webinarId}`);
    }

    if (!registrationId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key && 
          key.startsWith('moya_attendee_') && 
          !key.startsWith('moya_attendee_name_') && 
          !key.startsWith('moya_attendance_session_') &&
          !key.startsWith('moya_private_channel_')
        ) {
          registrationId = localStorage.getItem(key);
          if (registrationId) break;
        }
      }
    }

    const payload = JSON.stringify({
      registration_id: registrationId || undefined,
      webinar_id: webinarId || undefined,
      url: url || undefined,
      event_type: 'CTA_CLICK',
      timestamp: new Date().toISOString()
    });

    // 2. Use sendBeacon for guaranteed delivery even when user navigates or opens new tab
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/conversion', blob);
    } else {
      fetch('/api/analytics/conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch((err) => console.warn('[Analytics CTA Track Error]:', err));
    }
  } catch (e) {
    console.warn('[Analytics Tracker Exception]:', e);
  }
}
