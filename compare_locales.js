const fs = require('fs');
const path = require('path');

const frPath = path.join(__dirname, 'src', 'locales', 'fr.json');
const enPath = path.join(__dirname, 'src', 'locales', 'en.json');

function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(flattenKeys(obj[key], prefix + key + '.'));
        } else {
            keys.push(prefix + key);
        }
    }
    return keys;
}

try {
    const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

    const frKeys = new Set(flattenKeys(fr));
    const enKeys = new Set(flattenKeys(en));

    const missingInFr = [...enKeys].filter(k => !frKeys.has(k));
    const missingInEn = [...frKeys].filter(k => !enKeys.has(k));

    console.log(`Missing in FR (${missingInFr.length}):`);
    missingInFr.slice(0, 20).forEach(k => console.log(`  - ${k}`));
    if (missingInFr.length > 20) console.log(`  ... and ${missingInFr.length - 20} more`);

    console.log(`\nMissing in EN (${missingInEn.length}):`);
    missingInEn.slice(0, 20).forEach(k => console.log(`  - ${k}`));
    if (missingInEn.length > 20) console.log(`  ... and ${missingInEn.length - 20} more`);

} catch (e) {
    console.error(e);
}
