const fs = require('fs');
const path = require('path');

const files = ['src/locales/fr.json', 'src/locales/en.json'];
const keysToFlatten = ['roles', 'configuration', 'utils'];

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let modified = false;
        
        keysToFlatten.forEach(key => {
            if (data[key]) {
                console.log(`Flattening ${key} in ${file}`);
                Object.assign(data, data[key]);
                delete data[key];
                modified = true;
            }
        });
        
        // Add missing modmail permission
        if (data.modmail && !data.modmail.permission) {
             console.log(`Adding modmail.permission in ${file}`);
             data.modmail.permission = file.includes('fr') ? "❌ Permission Administrateur requise." : "❌ Administrator permission required.";
             modified = true;
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            console.log(`Successfully updated ${file}`);
        } else {
            console.log(`No changes needed for ${file}`);
        }
    } catch (err) {
        console.error(`Error processing ${file}:`, err);
    }
});
