import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { host, port, user, pass, secure } = await req.json();

        if (!host || !user || !pass) {
            return NextResponse.json({ success: false, error: "Host, User und Passwort sind erforderlich." }, { status: 400 });
        }

        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: secure,
            auth: {
                user,
                pass,
            },
            connectionTimeout: 5000,
        });

        // Verify connection
        try {
            await transporter.verify();
            return NextResponse.json({ success: true, message: "Verbindung erfolgreich hergestellt!" });
        } catch (verifyError: any) {
            console.error("SMTP Verify Error:", verifyError);

            let errorMessage = verifyError.message;
            if (verifyError.responseCode === 535) {
                errorMessage = "Login fehlgeschlagen. Passwort oder Benutzername falsch.";
            } else if (verifyError.code === 'ECONNREFUSED') {
                errorMessage = "Verbindung verweigert. Falscher Host oder Port?";
            } else if (verifyError.code === 'ETIMEDOUT') {
                errorMessage = "Zeitüberschreitung. Firewall blockiert Port " + port + "?";
            }

            return NextResponse.json({ success: false, error: errorMessage, details: verifyError }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
