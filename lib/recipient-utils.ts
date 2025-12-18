import { z } from "zod"

export interface RecipientStatus {
    email: string
    valid: boolean
    id: string
}

export function parseRecipients(input: string): RecipientStatus[] {
    // Split by comma, semicolon, newline, or space
    const rawItems = input.split(/[,;\n\s]+/).map(s => s.trim()).filter(Boolean);
    const uniqueItems = Array.from(new Set(rawItems));

    const emailSchema = z.string().email();

    return uniqueItems.map((item) => {
        const isValid = emailSchema.safeParse(item).success;
        return {
            email: item,
            valid: isValid,
            id: crypto.randomUUID(),
        };
    });
}
