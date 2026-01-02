
const fs = require('fs');
const path = require('path');

const locales = {
    fr: require('./src/locales/fr.json'),
    en: require('./src/locales/en.json')
};

function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => prev ? prev[curr] : null, obj);
}

function t(key, lang) {
    let text = getNestedValue(locales[lang], key);
    if (!text) return key;
    return text;
}

const keysToCheck = [
    "tickets.handler.dashboard_categories_title",
    "tickets.handler.btn_add_cat",
    "tickets.handler.btn_del_cat"
];

console.log("Checking FR keys:");
keysToCheck.forEach(key => {
    console.log(`${key}: ${t(key, 'fr')}`);
});

console.log("\nChecking EN keys:");
keysToCheck.forEach(key => {
    console.log(`${key}: ${t(key, 'en')}`);
});
