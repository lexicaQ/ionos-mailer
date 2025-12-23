import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// DELETE: Clear ONLY history (DIRECT campaigns), not all campaigns
// DELETE: Clear history. Supports deleting specific IDs or all DIRECT campaigns
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        let campaignIds: string[] = [];

        // Check if IDs are provided in body
        try {
            const body = await req.json();
            if (body.ids && Array.isArray(body.ids)) {
                campaignIds = body.ids;
            }
        } catch (e) {
            // No body or invalid JSON, fallback to default delete logic
        }

        let deleteQuery: any = {
            userId: session.user.id
        };

        if (campaignIds.length > 0) {
            // Delete specific campaigns
            deleteQuery.id = { in: campaignIds };
        } else {
            // Fallback: Delete all DIRECT campaigns
            deleteQuery.OR = [
                { host: "DIRECT" },
                { name: "DIRECT" }
            ];
        }

        const deleted = await prisma.campaign.deleteMany({
            where: deleteQuery
        });

        return NextResponse.json({ success: true, count: deleted.count });
    } catch (error) {
        console.error("Failed to clear history:", error);
        return NextResponse.json({ error: "Failed to clear history" }, { status: 500 });
    }
}
