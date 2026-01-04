const fs = require('fs');

function checkFile(file, logFile) {
    let output = `Checking ${file}...\n`;
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
        
        output += `Results for ${file}:\n`;
        let found = false;
        for (const [sig, linesFound] of Object.entries(keyCounts)) {
            if (linesFound.length > 1) {
                const [indent, key] = sig.split(':');
                // If indentation is small (2 or 4), it's likely a section or command.
                // If indentation is large, it's a property.
                // We want to see all duplicates to debug the 92 warnings.
                // But "usage", "description" will appear many times.
                // However, they should only appear once PER OBJECT.
                // My script checks file-wide, so it will report "usage" appearing 100 times.
                // That's useless.
                
                // We need to detect duplicates IN THE SAME SCOPE.
                // A simple scope tracker based on indentation might work.
                // If we see a key with indentation N, it belongs to the object started at indentation < N.
                // But without full parsing, we can just check if we see the same key twice with same indentation *close to each other* or *between braces*.
                
                // Better heuristic: 
                // Since I know I have duplicate SECTIONS (e.g. "slowmode": { ... } appearing twice at root level),
                // those will have indentation 4.
                
                if (indent <= 4) {
                     output += `Key "${key}" (indent ${indent}) appears on lines: ${linesFound.join(', ')}\n`;
                     found = true;
                }
            }
        }
        if (!found) output += "No top-level or section duplicates found (checked indent <= 4).\n";
    } catch (e) {
        output += `Error reading ${file}: ${e.message}\n`;
    }
    fs.appendFileSync(logFile, output);
}

const logFile = 'duplicates_report.txt';
if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
checkFile('src/locales/fr.json', logFile);
checkFile('src/locales/en.json', logFile);
