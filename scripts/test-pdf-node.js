const fs = require('fs');
const path = require('path');

// Mock request/response for testing logic in isolation if possible, 
// but here we just want to test the PDF extraction logic directly.

async function testPDF() {
    try {
        console.log('Testing PDF extraction...');
        // We can't easily import the route handler function directly because it expects NextRequest
        // But we can replicate the logic to test the library import

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        console.log('PDF.js imported successfully');

        const workerPath = path.resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
        console.log('Worker path set to:', workerPath);

        // precise minimal PDF binary
        const pdfData = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello test@example.com World) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000256 00000 n\n0000000343 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n436\n%%EOF');

        const data = new Uint8Array(pdfData);

        const loadingTask = pdfjsLib.getDocument({
            data,
            disableFontFace: true,
            isEvalSupported: false
        });

        const pdf = await loadingTask.promise;
        console.log(`PDF loaded. Pages: ${pdf.numPages}`);

        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');

        console.log('Extracted text:', text);

        if (text.includes('test@example.com')) {
            console.log('✅ SUCCESS: Email found in PDF');
        } else {
            console.error('❌ FAILURE: Email not found');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ CRASH:', error);
        process.exit(1);
    }
}

testPDF();
