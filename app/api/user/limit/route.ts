
import { auth } from "@/auth";
import { checkUsageStatus } from "@/lib/usage-limit";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine IP and Hash
    const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";

    // We can't know the SMTP user here easily without input, 
    // unless we check ALL campaigns of this user to find distinct SMTP users?
    // Actually, `checkUsageStatus` logic allows optional IP/SMTP.
    // However, if we only pass UserID, we count usage by UserID.
    // If we want to warn them about IP limit, we need IP.
    // If we want to warn about SMTP limit, we need SMTP.

    // For the UI display, we primarily show "Account Usage".
    // But if their IP is blocked, they will fail to send anyway.
    // To show accurate "You have used X/100", we should try to sum up.

    // checkUsageStatus sums up usage matching UserID OR IP OR SMTP.
    // So passing IP is good. SMTP? We don't have it in this GET request.
    // But usually UserID is enough for the dashboard.
    // If they have multiple accounts, the IP check will catch them during Send.
    // Here we just show "Account Usage" roughly.

    try {
        const usage = await checkUsageStatus(session.user.id, ip);
        return NextResponse.json(usage);
    } catch (e) {
        console.error("Failed to check limit", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
