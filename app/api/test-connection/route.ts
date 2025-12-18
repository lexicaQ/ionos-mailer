import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
    try {
        const { host, port, user, pass, secure } = await req.json();

        if (!host || !user || !pass) {
            return NextResponse.json({ success: false, error: "Host, user and password are required." }, { status: 400 });
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
            return NextResponse.json({ success: true, message: "Connection successfully established!" });
        } catch (verifyError: any) {
            console.error("SMTP Verify Error:", verifyError);

            let errorMessage = verifyError.message;
            if (verifyError.responseCode === 535) {
                errorMessage = "Login failed. Incorrect password or username.";
            } else if (verifyError.code === 'ECONNREFUSED') {
                errorMessage = "Connection refused. Wrong host or port?";
            } else if (verifyError.code === 'ETIMEDOUT') {
                errorMessage = "Timeout. Firewall blocking port " + port + "?";
            }

            return NextResponse.json({ success: false, error: errorMessage, details: verifyError }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
