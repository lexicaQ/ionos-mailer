import { NextResponse, NextRequest } from 'next/server';
import { extractCompanyFromEmail } from '@/lib/company-scraper';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const companyName = await extractCompanyFromEmail(email);

        return NextResponse.json({ companyName });
    } catch (error) {
        console.error("Preview API Error:", error);
        return NextResponse.json({ error: "Failed to extract company" }, { status: 500 });
    }
}
