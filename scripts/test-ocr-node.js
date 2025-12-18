const fs = require('fs');

async function testOCR() {
    try {
        console.log('Testing Image OCR...');
        const TesseractModule = await import('tesseract.js');
        console.log('Tesseract import keys:', Object.keys(TesseractModule));

        // Handle ESM/CJS interop
        const Tesseract = TesseractModule.default || TesseractModule;

        // We'll use a sample image URL since creating a binary image in script is hard
        // This tests the engine itself. 
        // Ideally we would use a local file, but downloading one is easier for a script.
        // Let's try to recognize a text image from a reliable source or use a simple base64 buffer.

        // Simple base64 image containing text (1x1 pixel won't work). 
        // Let's trust Tesseract documentation for buffer support.
        // We will mock the buffer with something valid if possible, or skip if too complex.
        // Instead, let's use the URL method which is supported by the same recognize function

        console.log('Running OCR on test image URL...');
        const result = await Tesseract.recognize(
            'https://tesseract.projectnaptha.com/img/eng_bw.png',
            'eng',
            { logger: m => console.log(`[OCR]: ${m.status} - ${(m.progress * 100).toFixed(0)}% `) }
        );

        console.log('OCR Result Length:', result.data.text.length);
        console.log('Text Snippet:', result.data.text.substring(0, 50));

        if (result.data.text.length > 0) {
            console.log('✅ SUCCESS: OCR extracted text');
        } else {
            console.error('❌ FAILURE: No text extracted');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ CRASH:', error);
        process.exit(1);
    }
}

testOCR();
