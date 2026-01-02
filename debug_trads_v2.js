const path = require('path');
const fr = require('./src/locales/fr.json');

function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
}

const keys = [
    "tickets.handler.dashboard_categories_title",
    "tickets.handler.btn_add_cat",
    "tickets.handler.btn_del_cat",
    "tickets.handler.btn_refresh"
];

console.log("--- DEBUG TRADS ---");
keys.forEach(k => {
    const val = getNestedValue(fr, k);
    console.log(`${k}: ${val}`);
});
