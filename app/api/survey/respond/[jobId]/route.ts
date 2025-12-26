import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    const { searchParams } = new URL(req.url)
    const choice = searchParams.get('choice')

    // Await params in Next.js 15+
    const { jobId } = await params

    // Validate choice
    if (!choice || !['yes', 'maybe', 'no'].includes(choice)) {
        return new Response(getErrorHTML(), {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
    }

    try {
        // Update job with survey response
        await prisma.emailJob.update({
            where: { id: jobId },
            data: {
                surveyResponse: choice,
                respondedAt: new Date()
            }
        })

        // Return beautiful confirmation page
        return new Response(getConfirmationHTML(choice), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
    } catch (error) {
        console.error('Survey response error:', error)
        return new Response(getErrorHTML(), {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        })
    }
}

function getConfirmationHTML(choice: string): string {
    const messages = {
        yes: {
            emoji: '🎉',
            text: 'Vielen Dank für Ihr Interesse!',
            subtext: 'Wir freuen uns über Ihre positive Rückmeldung.',
            color: '#22c55e'
        },
        maybe: {
            emoji: '💭',
            text: 'Nehmen Sie sich Zeit zum Überlegen!',
            subtext: 'Wir sind für Sie da, wenn Sie soweit sind.',
            color: '#f59e0b'
        },
        no: {
            emoji: '👋',
            text: 'Danke für Ihre Rückmeldung!',
            subtext: 'Wir respektieren Ihre Entscheidung.',
            color: '#ef4444'
        }
    }

    const msg = messages[choice as keyof typeof messages]

    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Umfrage-Antwort erhalten</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: scale(0.8);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-10px);
            }
        }

        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            padding: 20px;
        }

        .card {
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            text-align: center;
            animation: fadeIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
        }

        .emoji {
            font-size: 80px;
            margin-bottom: 25px;
            animation: fadeIn 0.8s ease-out 0.2s backwards, float 2s ease-in-out 0.8s infinite;
        }

        .title {
            font-size: 28px;
            color: ${msg.color};
            font-weight: 700;
            margin-bottom: 12px;
            animation: fadeIn 1s ease-out 0.4s backwards;
        }

        .subtext {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.5;
            animation: fadeIn 1.2s ease-out 0.6s backwards;
        }

        .checkmark {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: ${msg.color};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 30px auto 0;
            animation: fadeIn 1.4s ease-out 0.8s backwards;
        }

        .checkmark::after {
            content: '✓';
            color: white;
            font-size: 32px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="emoji">${msg.emoji}</div>
        <div class="title">${msg.text}</div>
        <div class="subtext">${msg.subtext}</div>
        <div class="checkmark"></div>
    </div>
</body>
</html>`
}

function getErrorHTML(): string {
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fehler</title>
    <style>
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            padding: 20px;
        }
        .card {
            background: white;
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 400px;
        }
        .emoji {
            font-size: 60px;
            margin-bottom: 20px;
        }
        .text {
            font-size: 20px;
            color: #ef4444;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="emoji">❌</div>
        <div class="text">Ungültige Anfrage</div>
    </div>
</body>
</html>`
}
