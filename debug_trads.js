const { t } = require('./src/utils/i18n');
const fr = require('./src/locales/fr.json');

console.log("Direct JSON check:");
console.log(fr.tickets?.handler?.dashboard_categories_title);

console.log("\ni18n t() check:");
(async () => {
    // Mocking guildId as 'test' - i18n will default to 'fr' if no DB entry found or if DB fails (wait, DB might fail if not mocked)
    // Actually i18n requires DB connection.
    // Let's modify i18n to be testable or just check the logic.
    
    // We can just check if getNestedValue works on the loaded JSON.
    function getNestedValue(obj, path) {
        return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
    }
    
    const val = getNestedValue(fr, 'tickets.handler.dashboard_categories_title');
    console.log(`getNestedValue result: ${val}`);

    // Let's try to call t() if we can mock the DB, but simpler to just test the logic that relies on the file.
})();
