/**
 * Regex to capture placeholders with optional "at " or "bei " prefix.
 * Captures:
 * 1. The full match including prefix (implicitly via replace match)
 * We treat the prefix + placeholder as a single unit to replace.
 * 
 * Matches:
 * - "at XXX"
 * - "bei XXX"
 * - "XXX" (no prefix)
 * - "{{Company}}"
 * - "at {{Company}}"
 * etc.
 */
export const PLACEHOLDER_REGEX = /((?:at\s+|bei\s+)?(?:XXX|xxx|{{Company}}|{{Firma}}|\[Company\]|\[Firma\]))/g;

/**
 * Replaces placeholders in text based on company availability.
 * 
 * Logic:
 * 1. If companyName is provided:
 *    - Keeps the prefix (at/bei) if it exists.
 *    - Replaces XXX with companyName.
 *    - Result: "at ExampleCorp"
 * 
 * 2. If companyName is NULL (generic domain):
 *    - Removes the ENTIRE matched phrase (prefix + placeholder).
 *    - Result: "" (Empty string) - effectively removing "at XXX" from the sentence.
 * 
 * @param text The text containing placeholders
 * @param companyName The company name (or null if generic/not found)
 * @returns The processed text
 */
export function replacePlaceholders(text: string, companyName: string | null): string {
    if (!text) return "";

    return text.replace(PLACEHOLDER_REGEX, (match) => {
        // match is the full string "at XXX" or "XXX"

        if (!companyName) {
            // Generic domain -> Remove entirely
            return "";
        }

        // Company found -> Keep prefix but replace placeholder part
        // We need to identify if there was a prefix to preserve it correct grammatically?
        // Actually, the user wants "at XXX" -> "at Company".
        // Use a simple replace on the match itself?
        // match could be "at XXX". match.replace(placeholder, company) -> "at Company".

        // Let's perform a sub-replace on the placeholder token itself.
        // We know the placeholder part is one of the list options.
        const tokenRegex = /(XXX|xxx|{{Company}}|{{Firma}}|\[Company\]|\[Firma\])/;
        return match.replace(tokenRegex, companyName);
    });
}
