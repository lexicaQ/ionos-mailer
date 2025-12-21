import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// DELETE: Clear ONLY history (DIRECT campaigns), not all campaigns
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Delete only DIRECT campaigns (history), NOT background campaigns
        const deleted = await prisma.campaign.deleteMany({
            where: {
                userId: session.user.id,
                OR: [
                    { host: "DIRECT" },  // Legacy Direct Sends
                    { name: "DIRECT" }   // New Direct Sends
                ]
            }
        });

        return NextResponse.json({ success: true, count: deleted.count });
    } catch (error) {
        console.error("Failed to clear history:", error);
        return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
    }
}
