import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import 'dotenv/config';

// The tutorial used 'model: "openai/gpt-4.1"', but typical AI SDK usage requires a provider instance or specific string format.
// The string "openai/gpt-4.1" implies using the OpenAI provider via the AI Gateway mapping.
// However, the AI SDK usually requires importing the specific provider or using registry.
// Given the tutorial context "Install the AI SDK and AI Gateway packages", it implies Vercel AI SDK Core.
// But the snippet `model: 'openai/gpt-4.1'` suggests using the registry string directly if `ai` supports it, OR configuring a custom base URL.
// The provided key looks like a Vercel AI Gateway key.
// Let's assume standard AI SDK usage where we might need to configure the openai provider with the gateway URL.
// BUT the tutorial snippet was very specific:
/*
  const result = streamText({
    model: 'openai/gpt-4.1', ...
*/
// This implies the `ai` package handles the string if mapped.
// Wait, `model` in `streamText` usually expects a Model ID object, NOT a string, unless using the `experimental_ ...` or registry.
// In Vercel AI SDK 3.0+, `model` MUST be a model object defined by a provider, e.g. `openai('gpt-4')`.
// Passing a string directly suggests the user might be using a wrapper or specific version.
// HOWEVER, let's follow the code exactly as provided in the prompt, but importing `openai` from `@ai-sdk/openai` is properly safer.
// Re-reading user prompt:
// import { streamText } from 'ai';
// model: 'openai/gpt-4.1'
// This string usage is valid in some contexts (like `ai`'s unified registry).
// I will try to follow the code EXACTLY.

async function main() {
    // To use string 'openai/gpt-4.1', we likely effectively need the registry or it might fail if not configured.
    // But let's try exactly what they pasted first.
    // Actually, 'openai/gpt-4.1' is likely a custom model ID mapped in the AI Gateway.

    // We need to define the model properly. The sdk 'ai' exports `streamText`.
    // If `model` is a string, it might throw "model must be a LanguageModel...".
    // Let's modify it slightly to be standard Vercel AI SDK compliant if possible, OR try to find if `openai` provider is auto-injected.
    // Standard way:
    // import { openai } from '@ai-sdk/openai';
    // model: openai('gpt-4')

    // Checks on `pnpm install ai dotenv tsx @types/node`. It didn't install `@ai-sdk/openai`.
    // The user prompt *didn't* say `install @ai-sdk/openai`.
    // This implies `ai` might have it bundled or they are using a specific version/feature.
    // If I run it and it fails, I will know.
    // I will write the file EXACTLY as requested.

    const result = streamText({
        model: 'openai/gpt-4.1' as any, // Cast to any to avoid TS error if types are strict
        prompt: 'Invent a new holiday and describe its traditions.',
    });

    for await (const textPart of result.textStream) {
        process.stdout.write(textPart);
    }

    console.log();
    console.log('Token usage:', await result.usage);
    console.log('Finish reason:', await result.finishReason);
}

main().catch(console.error);
