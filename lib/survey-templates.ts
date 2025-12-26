/**
 * Survey template generator for email campaigns
 * Creates HTML email templates with interactive survey buttons
 */

export interface SurveyTemplateParams {
    content: string
    trackingBaseUrl: string
    jobId: string
}

/**
 * Generates a complete HTML email with survey buttons
 * Uses table-based layout for maximum email client compatibility
 */
export function generateSurveyEmailHTML(params: SurveyTemplateParams): string {
    const { content, trackingBaseUrl, jobId } = params

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <!-- Main Content Container -->
    <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;" cellpadding="0" cellspacing="0">
        <tr>
            <td style="padding: 30px;">
                <!-- User Content -->
                <div style="color: #333333; line-height: 1.6; margin-bottom: 30px;">
                    ${content}
                </div>

                <!-- Survey Section -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin-top: 30px;">
                    <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Ihre Meinung ist uns wichtig!</h3>
                    
                    <!-- Survey Buttons -->
                    <table role="presentation" style="width: 100%;" cellpadding="0" cellspacing="0">
                        <tr>
                            <!-- YES Button -->
                            <td align="center" style="padding: 8px;">
                                <a href="${trackingBaseUrl}/api/survey/respond/${jobId}?choice=yes"
                                   style="display: inline-block; padding: 14px 24px; background-color: #22c55e;
                                          color: #ffffff; text-decoration: none; border-radius: 6px;
                                          font-weight: 600; font-size: 15px; min-width: 140px; text-align: center;">
                                    ✓ Ja, interessiert!
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <!-- MAYBE Button -->
                            <td align="center" style="padding: 8px;">
                                <a href="${trackingBaseUrl}/api/survey/respond/${jobId}?choice=maybe"
                                   style="display: inline-block; padding: 14px 24px; background-color: #f59e0b;
                                          color: #ffffff; text-decoration: none; border-radius: 6px;
                                          font-weight: 600; font-size: 15px; min-width: 140px; text-align: center;">
                                    🤔 Überlege noch
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <!-- NO Button -->
                            <td align="center" style="padding: 8px;">
                                <a href="${trackingBaseUrl}/api/survey/respond/${jobId}?choice=no"
                                   style="display: inline-block; padding: 14px 24px; background-color: #ef4444;
                                          color: #ffffff; text-decoration: none; border-radius: 6px;
                                          font-weight: 600; font-size: 15px; min-width: 140px; text-align: center;">
                                    ✗ Kein Interesse
                                </a>
                            </td>
                        </tr>
                    </table>
                    
                    <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280; text-align: center;">
                        Ihre Antwort hilft uns, unsere Angebote zu verbessern.
                    </p>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>`
}

/**
 * Survey template placeholder that gets replaced during email sending
 */
export const SURVEY_PLACEHOLDER = '[IONOS_SURVEY_TEMPLATE]'

/**
 * Checks if email body contains survey template placeholder
 */
export function hasSurveyTemplate(body: string): boolean {
    return body.includes(SURVEY_PLACEHOLDER)
}

/**
 * Gets the survey template HTML snippet for editor insertion
 */
export function getSurveyTemplateSnippet(): string {
    return `<div style="padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px dashed #cbd5e1;">
    <p style="margin: 0; font-weight: 600; color: #64748b;">
        📊 Umfrage-Buttons werden beim Versand hier eingefügt
    </p>
    <p style="margin: 5px 0 0 0; font-size: 12px; color: #94a3b8;">
        Ja / Vielleicht / Nein
    </p>
    ${SURVEY_PLACEHOLDER}
</div>`
}
