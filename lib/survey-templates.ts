/**
 * Survey Templates for Email Campaigns
 * Provides interactive survey buttons that can be embedded in emails
 */

export interface SurveyTemplate {
  id: string
  name: string
  description: string
  html: string  // Template with placeholders: {{TRACKING_URL_YES}}, {{TRACKING_URL_MAYBE}}, {{TRACKING_URL_NO}}
}

/**
 * Get survey tracking URL for a specific choice
 */
export function getSurveyTrackingUrl(trackingId: string, choice: string, baseUrl: string): string {
  return `${baseUrl}/api/track/survey/${trackingId}/${encodeURIComponent(choice)}`
}

/**
 * Process survey template - replaces placeholders with actual tracking URLs
 */
export function processSurveyTemplate(
  template: string,
  trackingId: string,
  baseUrl: string
): string {
  return template
    .replace(/\{\{TRACKING_URL_YES\}\}/g, getSurveyTrackingUrl(trackingId, 'yes', baseUrl))
    .replace(/\{\{TRACKING_URL_MAYBE\}\}/g, getSurveyTrackingUrl(trackingId, 'maybe', baseUrl))
    .replace(/\{\{TRACKING_URL_NO\}\}/g, getSurveyTrackingUrl(trackingId, 'no', baseUrl))
    .replace(/\{\{TRACKING_ID\}\}/g, trackingId)
    .replace(/\{\{BASE_URL\}\}/g, baseUrl)
}

/**
 * Default 3-Button Survey Template (English)
 * Modern horizontal layout with compact buttons
 */
export const DEFAULT_SURVEY_TEMPLATE = `
<div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0f9ff 100%); padding: 32px 24px; text-align: left; border-radius: 16px; margin: 24px auto; border: 2px solid #38bdf8; max-width: 600px; box-shadow: 0 8px 32px rgba(56, 189, 248, 0.15);">
  <p style="font-size: 18px; font-weight: 800; color: #0c4a6e; margin: 0 0 20px 0;">What do you think?</p>
  
  <p style="margin: 8px 0;">
    <a href="{{TRACKING_URL_YES}}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 15px; font-weight: 600;">
      ✓ Yes, I am interested
    </a>
  </p>
  
  <p style="margin: 8px 0;">
    <a href="{{TRACKING_URL_MAYBE}}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 15px; font-weight: 600;">
      ? Let me think about it
    </a>
  </p>
  
  <p style="margin: 8px 0;">
    <a href="{{TRACKING_URL_NO}}" target="_blank" style="color: #2563eb; text-decoration: underline; font-size: 15px; font-weight: 600;">
      × Not interested
    </a>
  </p>
</div>
`

/**
 * All available survey templates
 */
export const SURVEY_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'default',
    name: 'Interest Survey',
    description: '3 buttons: Yes, Maybe, No with gradient styling',
    html: DEFAULT_SURVEY_TEMPLATE
  }
]

/**
 * Generate the HTML confirmation page shown after clicking a survey button
 */
export function getConfirmationPageHtml(choice: string): string {
  const choiceConfig: Record<string, { icon: string; title: string; color: string; bgGradient: string }> = {
    yes: {
      icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
      title: 'Awesome!',
      color: '#22c55e',
      bgGradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    },
    maybe: {
      icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      title: 'No problem!',
      color: '#f97316',
      bgGradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
    },
    no: {
      icon: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      title: 'Understood!',
      color: '#ef4444',
      bgGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    }
  }

  const config = choiceConfig[choice] || choiceConfig.yes

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: ${config.bgGradient};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      padding: 60px 80px;
      border-radius: 24px;
      text-align: center;
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
      animation: popIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      max-width: 500px;
    }
    @keyframes popIn {
      0% { transform: scale(0.5) translateY(50px); opacity: 0; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    .icon {
      color: ${config.color};
      margin-bottom: 24px;
      animation: bounce 2s infinite;
    }
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-15px); }
      60% { transform: translateY(-7px); }
    }
    h1 {
      font-size: 36px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 12px;
    }
    p {
      font-size: 18px;
      color: #64748b;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      background: ${config.bgGradient};
      color: white;
      padding: 8px 20px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 24px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .sparkles {
      position: fixed;
      pointer-events: none;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      overflow: hidden;
    }
    .sparkle {
      position: absolute;
      width: 10px;
      height: 10px;
      background: white;
      border-radius: 50%;
      animation: sparkle 2s linear infinite;
      opacity: 0;
    }
    @keyframes sparkle {
      0% { transform: translateY(100vh) scale(0); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(-100vh) scale(1); opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="sparkles">
    ${Array.from({ length: 20 }, (_, i) =>
    `<div class="sparkle" style="left: ${Math.random() * 100}%; animation-delay: ${Math.random() * 2}s; animation-duration: ${2 + Math.random() * 2}s;"></div>`
  ).join('')}
  </div>
  <div class="card">
    <div class="icon">${config.icon}</div>
    <h1>${config.title}</h1>
    <p>Your response has been recorded.<br/>Thank you for your feedback!</p>
    <div class="badge">Response saved</div>
  </div>
</body>
</html>`
}
