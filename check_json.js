const fs = require('fs');

function checkJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        try {
            JSON.parse(content);
            console.log(`✅ ${filePath} is valid JSON.`);
        } catch (e) {
            console.error(`❌ ${filePath} is INVALID JSON: ${e.message}`);
        }
    } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
    }
}

checkJson('src/locales/fr.json');
checkJson('src/locales/en.json');
