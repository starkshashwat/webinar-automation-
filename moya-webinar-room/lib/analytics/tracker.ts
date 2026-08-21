export function trackCtaClick(webinarId?: string) {
  if (typeof window === 'undefined') return;

  try {
    // 1. Try to find registration ID from localStorage
    let registrationId: string | null = null;
    if (webinarId) {
      registrationId = localStorage.getItem(`moya_attendee_${webinarId}`);
    }

    if (!registrationId) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('moya_attendee_') && !key.startsWith('moya_attendee_name_')) {
          registrationId = localStorage.getItem(key);
          if (registrationId) break;
        }
      }
    }

    // 2. Fire and forget tracking POST request
    fetch('/api/analytics/conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_id: registrationId || undefined,
        event_type: 'CTA_CLICK'
      })
    }).catch((err) => console.warn('[Analytics CTA Track Error]:', err));
  } catch (e) {
    console.warn('[Analytics Tracker Exception]:', e);
  }
}
