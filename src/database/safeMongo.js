/**
 * src/database/safeMongo.js
 *
 * Empêche les Uncaught Exception mongoose (buffering / timeouts).
 * Important: les méthodes qui renvoient une Query restent chaînable (.lean(), .select(), etc.).
 * On wrap seulement exec/then, pas le retour immédiat en Promise.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let installed = false;

function isMongoReady() {
    return mongoose.connection.readyState === 1;
}

function isCollectionMethod(name) {
    return [
        'findOne',
        'findOneAndUpdate',
        'findOneAndDelete',
        'findOneAndRemove',
        'findOneAndReplace',
        'find',
        'deleteOne',
        'deleteMany',
        'remove',
        'updateOne',
        'updateMany',
        'aggregate',
        'countDocuments',
        'estimatedDocumentCount',
        'count',
        'insertMany',
        'create',
        'bulkWrite',
        'distinct',
        'replaceOne'
    ].includes(name);
}

function getFallback(methodName) {
    switch (methodName) {
        case 'find':
        case 'aggregate':
        case 'insertMany':
        case 'distinct':
        case 'bulkWrite':
        case 'create':
            return [];
        case 'deleteOne':
        case 'deleteMany':
        case 'remove':
            return { acknowledged: true, deletedCount: 0 };
        case 'updateOne':
        case 'updateMany':
        case 'replaceOne':
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        case 'countDocuments':
        case 'estimatedDocumentCount':
        case 'count':
            return 0;
        case 'findOne':
        case 'findOneAndUpdate':
        case 'findOneAndDelete':
        case 'findOneAndRemove':
        case 'findOneAndReplace':
        case 'save':
            return null;
        default:
            return null;
    }
}

const lastLogByKey = new Map();
const MIN_LOG_INTERVAL_MS = 15000;

function throttledWarn(key, message) {
    const now = Date.now();
    const last = lastLogByKey.get(key) || 0;
    if (now - last < MIN_LOG_INTERVAL_MS) return;
    lastLogByKey.set(key, now);
    logger.warn(`[safeMongo] ${message}`);
}

async function runSafe(methodName, label, promise) {
    if (!isMongoReady()) {
        throttledWarn(`${label}:${methodName}:notready`, `Mongo pas prêt → skip ${label}.${methodName}()`);
        return getFallback(methodName);
    }

    try {
        const withMaxTime = typeof promise?.maxTimeMS === 'function'
            ? promise.maxTimeMS(3000)
            : promise;

        return await Promise.race([
            Promise.resolve(withMaxTime),
            new Promise((_, reject) => {
                const t = setTimeout(() => {
                    reject(new Error(`${label}.${methodName}() timed out after 4500ms`));
                }, 4500);
                if (typeof t.unref === 'function') t.unref();
            })
        ]);
    } catch (err) {
        throttledWarn(
            `${label}:${methodName}:${String(err?.message || 'err').slice(0, 40)}`,
            `Echec ${label}.${methodName}() → fallback : ${err?.message || err}`
        );
        return getFallback(methodName);
    }
}

/**
 * Keep Query chainable (.lean / .select / .limit) and only wrap execution.
 */
function wrapQuery(query, methodName, label) {
    if (!query || query.__safeMongoWrapped) return query;
    query.__safeMongoWrapped = true;

    if (typeof query.exec === 'function') {
        const origExec = query.exec.bind(query);
        query.exec = function (...args) {
            try {
                return runSafe(methodName, label, Promise.resolve(origExec(...args)));
            } catch (e) {
                throttledWarn(`${label}:${methodName}:exec`, `${label}.${methodName}.exec() throw: ${e.message}`);
                return Promise.resolve(getFallback(methodName));
            }
        };
    }

    return query;
}

function patchModel(Model) {
    const label = Model?.modelName || 'Model';
    for (const methodName of Object.getOwnPropertyNames(Object.getPrototypeOf(Model))) {
        if (!isCollectionMethod(methodName)) continue;
        if (typeof Model[methodName] !== 'function') continue;
        if (Model[methodName].__safeMongoPatched) continue;

        const original = Model[methodName].bind(Model);

        const patched = function (...args) {
            let result;
            try {
                result = original(...args);
            } catch (e) {
                throttledWarn(`${label}:${methodName}:throw`, `${label}.${methodName}() a throw synchrone : ${e.message}`);
                return Promise.resolve(getFallback(methodName));
            }

            // Query mongoose → garder le chaînage (.lean etc.)
            if (result && typeof result.lean === 'function' && typeof result.exec === 'function') {
                return wrapQuery(result, methodName, label);
            }

            // Aggregate / Promise directe
            if (result && typeof result.then === 'function') {
                return runSafe(methodName, label, result);
            }

            return result;
        };
        patched.__safeMongoPatched = true;
        Model[methodName] = patched;
    }
}

function patchDocumentPrototype() {
    const DocProto = mongoose.Document?.prototype;
    if (!DocProto || DocProto.__safeMongoPatched) return;
    DocProto.__safeMongoPatched = true;

    for (const methodName of ['save', 'deleteOne', 'remove']) {
        const original = DocProto[methodName];
        if (typeof original !== 'function') continue;
        DocProto[methodName] = function (...args) {
            try {
                const result = original.apply(this, args);
                if (result && typeof result.then === 'function') {
                    return runSafe(methodName, this?.constructor?.modelName || 'Document', result);
                }
                return result;
            } catch (e) {
                throttledWarn(`Document:${methodName}:throw`, `Document.${methodName}() a throw synchrone : ${e.message}`);
                return Promise.resolve(getFallback(methodName));
            }
        };
        DocProto[methodName].__safeMongoPatched = true;
    }
}

function install() {
    if (installed) return;
    installed = true;

    patchDocumentPrototype();

    for (const M of Object.values(mongoose.models || {})) {
        try { patchModel(M); } catch (_) { /* ignore */ }
    }

    const origModel = mongoose.model.bind(mongoose);
    mongoose.model = function (name, schema, collectionName, skipInit) {
        const M = skipInit !== undefined
            ? origModel(name, schema, collectionName, skipInit)
            : collectionName !== undefined
                ? origModel(name, schema, collectionName)
                : origModel(name, schema);
        try { patchModel(M); } catch (_) { /* ignore */ }
        return M;
    };

    logger.info('[safeMongo] Installé : queries chaînable + timeout/fallback à l\'exécution.');
}

module.exports = {
    install,
    runSafe,
    getFallback
};
