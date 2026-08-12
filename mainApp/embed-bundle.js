const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', 'sn-react-modal', 'dist', 'peeklo_modal_bundle.js');
const bundle = fs.readFileSync(bundlePath, 'utf8');


const escaped = bundle
    .replace(/\\/g, '\\\\') 
    .replace(/`/g, '\\`')     
    .replace(/\${/g, '\\${'); 
const generatedContent = `(function process(request, response) {
    response.setContentType('application/javascript; charset=utf-8');
    var writer = response.getStreamWriter();

    try {
        // Bundle embedded as constant
        var BUNDLE = \`${escaped}\`;

        response.setHeader('Cache-Control', 'public, max-age=60');
        response.setStatus(200);
        writer.writeString(BUNDLE);
    } catch (error) {
        gs.error('Error in modal bundle handler: ' + error.message + '\\nStack: ' + error.stack);
        response.setStatus(500);
        writer.writeString("console.error('Failed to serve bundle');");
    }
})(request, response);
`;

const outputPath = path.join(__dirname, 'src', 'server', 'modal-bundle-get.js');
fs.writeFileSync(outputPath, generatedContent, 'utf8');

console.log('✓ Bundle embedded successfully');
console.log(`  Bundle size: ${bundle.length} characters`);
console.log(`  Output file: ${outputPath}`);

