const fs = require('fs');
const path = require('path');

const frPath = path.join(__dirname, 'src', 'locales', 'fr.json');
const enPath = path.join(__dirname, 'src', 'locales', 'en.json');

function checkFile(file) {
    console.log(`Checking ${file}...`);
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return;
    }
    
    try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        const keyCounts = {};
        
        lines.forEach((line, idx) => {
            const match = line.match(/^(\s*)"([^"]+)":/);
            if (match) {
                const indent = match[1].length;
                const key = match[2];
                const signature = `${indent}:${key}`;
                if (!keyCounts[signature]) keyCounts[signature] = [];
                keyCounts[signature].push(idx + 1);
            }
        });
        
        console.log(`Results for ${path.basename(file)}:`);
        let count = 0;
        for (const [sig, linesFound] of Object.entries(keyCounts)) {
            if (linesFound.length > 1) {
                const [indent, key] = sig.split(':');
                if (parseInt(indent) <= 4) {
                     console.log(`Key "${key}" (indent ${indent}) appears on lines: ${linesFound.join(', ')}`);
                     count++;
                }
            }
        }
        if (count === 0) console.log("No top-level duplicates found.");
    } catch (e) {
        console.error(`Error reading ${file}: ${e.message}`);
    }
}

checkFile(frPath);
checkFile(enPath);
