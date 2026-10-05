const { PermissionsBitField } = require('discord.js');
const ms = require('ms');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { createEmbed } = require('../../utils/design');
const { buildAntiSpamConfig, PRESET_PATCHES } = require('../../antiSpam/SpamConfig');

const SAFE_PATH = /^[a-zA-Z0-9_.]+$/;
const LIST_KEYS = new Set([
    'trustedDomains',
    'blockedDomains',
    'suspiciousDomains',
    'ignoredUsers',
    'ignoredRoles',
    'ignoredChannels',
    'ignoredCategories',
    'ignoredPermissions',
    'antiSpamChannels'
]);

const PROHIBITED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const THRESHOLD_ALIAS = {
    warning: 'actions.warning.score',
    delete: 'actions.delete.score',
    timeout: 'actions.timeout.score',
    severe: 'actions.severe.score',
    suspicion: 'thresholds.suspicion',
    probable: 'thresholds.probable',
    severe_threshold: 'thresholds.severe'
};

function stripMentions(value = '') {
    return String(value).replace(/[<#@&>]/g, '').trim();
}

function parseValue(raw) {
    if (!raw) return raw;
    if (/^(on|true)$/i.test(raw)) return true;
    if (/^(off|false)$/i.test(raw)) return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    if (/^\d+(ms|s|m|h|d)$/i.test(raw)) {
        const parsed = ms(raw);
        if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('Durée invalide');
        return parsed;
    }
    if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) return JSON.parse(raw);
    return raw;
}

function setByPath(target, path, value) {
    if (!SAFE_PATH.test(path)) throw new Error('Chemin invalide');
    const parts = path.split('.');
    if (parts.some((part) => PROHIBITED_KEYS.has(part))) throw new Error('Chemin réservé');
    let cursor = target;
    while (parts.length > 1) {
        const key = parts.shift();
        cursor[key] = cursor[key] && typeof cursor[key] === 'object' && !Array.isArray(cursor[key]) ? cursor[key] : {};
        cursor = cursor[key];
    }
    cursor[parts[0]] = value;
}

function toggleList(anti, key, mode, value) {
    anti[key] = Array.isArray(anti[key]) ? anti[key] : [];
    const clean = stripMentions(value);
    anti[key] = mode === 'add'
        ? [...new Set([...anti[key], clean])]
        : anti[key].filter((entry) => entry !== clean);
}

function detectListKind(raw) {
    if (/^<#\d+>$/.test(raw) || /^\d{16,22}$/.test(raw) && raw.startsWith('1')) return 'ignoredChannels';
    if (/^<@&?\d+>$/.test(raw) || (/\d{16,22}$/.test(raw) && !raw.startsWith('1'))) {
        if (raw.includes('@&')) return 'ignoredRoles';
        if (raw.includes('@')) return 'ignoredUsers';
    }
    if (/\.\d+$/.test(raw) || raw.length > 22) return null;
    return null;
}

function send(message, title, content, type = 'info') {
    return message.channel.send({ embeds: [createEmbed(title, content, type)] });
}

module.exports = {
    name: 'antispam',
    description: 'Configure l\'anti-spam avancé',
    category: 'Moderation',
    usage: 'antispam <on|off|status|aide|debug|preset|timeout|bloquer|debloquer|...>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return send(message, 'Permission refusée', 'Administrator requis.', 'error');
        }

        const config = await getGuildConfig(message.guild.id);
        config.moderation ??= {};
        config.moderation.antispam ??= {};
        const anti = config.moderation.antispam;
        const sub = (args[0] || 'status').toLowerCase();
        const save = async () => {
            config.markModified('moderation');
            await config.save();
        };

        // --- Commandes ON / OFF
        if (sub === 'on' || sub === 'off' || sub === 'activer' || sub === 'desactiver' || sub === 'désactiver') {
            const enabled = sub === 'on' || sub === 'activer';
            anti.enabled = enabled;
            await save();
            return send(message, 'Anti-Spam', `Système ${enabled ? 'activé' : 'désactivé'}.`, enabled ? 'success' : 'warning');
        }

        // --- DEBUG
        if (sub === 'debug') {
            anti.debug = /^(on|true|oui|1)$/i.test(args[1] || 'off');
            await save();
            return send(message, 'Anti-Spam', `Mode debug ${anti.debug ? 'activé' : 'désactivé'}.`);
        }

        // --- PRESET
        if (sub === 'preset' || sub === 'mode') {
            const preset = String(args[1] || '').toLowerCase();
            if (!PRESET_PATCHES[preset]) {
                return send(message, 'Preset invalide', 'Utilise : `preset lenient`, `preset balanced`, `preset strict`.', 'error');
            }
            anti.profile = preset;
            await save();
            return send(message, 'Anti-Spam', `Preset appliqué : \`${preset}\`.`, 'success');
        }

        // --- DURÉES : timeout, severe
        if (sub === 'timeout' || sub === 'duree' || sub === 'durée') {
            const raw = args.slice(1).join(' ');
            if (!raw) {
                return send(message, 'Exemple', '`+antispam timeout 10m`  ·  `+antispam severe-duree 1h`');
            }
            const value = parseValue(raw);
            setByPath(anti, 'actions.timeout.durationMs', value);
            await save();
            return send(message, 'Anti-Spam', `Durée timeout : **${ms(value, { long: true })}**.`, 'success');
        }
        if (sub === 'severe-duree' || sub === 'severe-durée' || sub === 'duree-severe' || sub === 'durée-sévère') {
            const raw = args.slice(1).join(' ');
            if (!raw) return send(message, 'Exemple', '`+antispam severe-duree 1h`');
            const value = parseValue(raw);
            setByPath(anti, 'actions.severe.durationMs', value);
            await save();
            return send(message, 'Anti-Spam', `Durée action sévère : **${ms(value, { long: true })}**.`, 'success');
        }

        // --- SEUILS
        if (sub === 'seuil' || sub === 'seuils' || sub === 'threshold') {
            const field = String(args[1] || '').toLowerCase();
            const path = THRESHOLD_ALIAS[field];
            const rawValue = args[2];
            if (!path || !/^\d+$/.test(String(rawValue || ''))) {
                return send(message, 'Seuils disponibles', [
                    'Utilisation : `+antispam seuil <categorie> <score>`, score de 0 à 100.',
                    '',
                    'Catégories :',
                    '• `warning` → message d\'avertissement',
                    '• `delete` → suppression des messages',
                    '• `timeout` → timeout Discord',
                    '• `severe` → kick / ban / timeout long',
                    '',
                    'Exemples :',
                    '`+antispam seuil timeout 85`',
                    '`+antispam seuil delete 60`'
                ].join('\n'));
            }
            const numeric = Number(rawValue);
            if (numeric < 0 || numeric > 100) {
                return send(message, 'Valeur invalide', 'Le score doit être entre 0 et 100.', 'error');
            }
            setByPath(anti, path, numeric);
            await save();
            return send(message, 'Anti-Spam', `Seuil \`${field}\` mis à **${numeric}**.`, 'success');
        }

        // --- ACTION SEVERE
        if (sub === 'action-severe' || sub === 'action-sévère' || sub === 'severe' || sub === 'sévère') {
            const mode = String(args[1] || '').toLowerCase();
            if (!['kick', 'ban', 'timeout', 'off', 'désactiver', 'desactiver'].includes(mode)) {
                return send(message, 'Exemples', '`+antispam action-severe kick` · `ban` · `timeout` · `off`.');
            }
            if (mode === 'off' || mode === 'désactiver' || mode === 'desactiver') {
                setByPath(anti, 'actions.severe.enabled', false);
                await save();
                return send(message, 'Anti-Spam', 'Action sévère désactivée.', 'warning');
            }
            setByPath(anti, 'actions.severe.enabled', true);
            setByPath(anti, 'actions.severe.type', mode);
            await save();
            return send(message, 'Anti-Spam', `Action sévère : **${mode.toUpperCase()}**.`, 'success');
        }

        // --- DOMAINES
        if (sub === 'bloquer' || sub === 'block') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam bloquer grabify.link`');
            toggleList(anti, 'blockedDomains', 'add', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Domaine bloqué : \`${stripMentions(args[1])}\`.`, 'success');
        }
        if (sub === 'debloquer' || sub === 'débloquer' || sub === 'unblock') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam debloquer grabify.link`');
            toggleList(anti, 'blockedDomains', 'del', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Domaine retiré de la liste bloquée : \`${stripMentions(args[1])}\`.`, 'success');
        }
        if (sub === 'suspecter' || sub === 'suspicious') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam suspecter bit.ly`');
            toggleList(anti, 'suspiciousDomains', 'add', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Domaine marqué suspect : \`${stripMentions(args[1])}\`.`, 'success');
        }
        if (sub === 'faire-confiance' || sub === 'trust' || sub === 'confiance') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam faire-confiance youtube.com`');
            toggleList(anti, 'trustedDomains', 'add', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Domaine de confiance : \`${stripMentions(args[1])}\`.`, 'success');
        }

        // --- IGNORE
        if (sub === 'ignorer' || sub === 'ignore') {
            if (!args[1]) return send(message, 'Exemples', [
                '`+antispam ignorer #salon`',
                '`+antispam ignorer @role`',
                '`+antispam ignorer @user`',
                '`+antispam ignorer channel ID_CATEGORIE`',
                '`+antispam ignorer role @Role`',
                '`+antispam ignorer permission ManageMessages`'
            ].join('\n'));
            const subkind = String(args[1] || '').toLowerCase();
            if (['channel', 'salon', 'role', 'user', 'categorie', 'catégorie', 'category', 'permission', 'perm'].includes(subkind)) {
                const map = {
                    channel: 'ignoredChannels', salon: 'ignoredChannels',
                    role: 'ignoredRoles',
                    user: 'ignoredUsers',
                    categorie: 'ignoredCategories', catégorie: 'ignoredCategories', category: 'ignoredCategories',
                    permission: 'ignoredPermissions', perm: 'ignoredPermissions'
                };
                if (!args[2]) return send(message, 'Valeur manquante', 'Indique une ID, une mention ou un nom de permission.');
                toggleList(anti, map[subkind], 'add', args[2]);
                await save();
                return send(message, 'Anti-Spam', `Ajouté à \`${map[subkind]}\` : \`${stripMentions(args[2])}\`.`, 'success');
            }
            const raw = args[1];
            const mentionMatch =
                /^<#\d+>$/.test(raw) ? 'ignoredChannels' :
                /^<@&\d+>$/.test(raw) ? 'ignoredRoles' :
                /^<@!?\d+>$/.test(raw) ? 'ignoredUsers' : null;
            if (!mentionMatch) return send(message, 'Impossible à deviner', 'Précise : `ignorer role @Role`  ·  `ignorer channel #salon`.');
            toggleList(anti, mentionMatch, 'add', raw);
            await save();
            return send(message, 'Anti-Spam', `Ajouté à \`${mentionMatch}\` : \`${stripMentions(raw)}\`.`, 'success');
        }

        if (sub === 'plus-ignorer' || sub === 'unignore') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam unignore role @Role` · `channel` · `user`.');
            const subkind = String(args[1] || '').toLowerCase();
            const map = {
                channel: 'ignoredChannels', salon: 'ignoredChannels',
                role: 'ignoredRoles',
                user: 'ignoredUsers',
                categorie: 'ignoredCategories', catégorie: 'ignoredCategories', category: 'ignoredCategories',
                permission: 'ignoredPermissions', perm: 'ignoredPermissions'
            };
            if (!map[subkind] || !args[2]) {
                return send(message, 'Syntaxe', '`+antispam unignore <channel|role|user|categorie|permission> <valeur>`');
            }
            toggleList(anti, map[subkind], 'del', args[2]);
            await save();
            return send(message, 'Anti-Spam', `Retiré de \`${map[subkind]}\` : \`${stripMentions(args[2])}\`.`, 'success');
        }

        // --- SALONS SPÉCIAUX
        if (sub === 'surveiller' || sub === 'channel-sensible' || sub === 'addchannel') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam surveiller #annonces`');
            toggleList(anti, 'antiSpamChannels', 'add', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Salon ajouté en mode sensible : \`${stripMentions(args[1])}\`.`, 'success');
        }
        if (sub === 'plus-surveiller' || sub === 'removechannel') {
            if (!args[1]) return send(message, 'Exemple', '`+antispam plus-surveiller #annonces`');
            toggleList(anti, 'antiSpamChannels', 'del', args[1]);
            await save();
            return send(message, 'Anti-Spam', `Salon retiré du mode sensible : \`${stripMentions(args[1])}\`.`, 'success');
        }

        // --- FENÊTRES BURST
        if (sub === 'fenetre' || sub === 'fenêtre' || sub === 'burst') {
            const kind = String(args[1] || '').toLowerCase();
            const count = Number(args[2]);
            const seconds = Number(args[3]);
            if (!['court', 'moyen', 'long', 'etendu', 'étendu', 'short', 'medium', 'long', 'extended'].includes(kind) || !(count > 0) || !(seconds > 0)) {
                return send(message, 'Syntaxe', [
                    'Définit X messages en Y secondes avant suspicion burst.',
                    '',
                    '`+antispam fenetre court 5 3` → 5 messages en 3 secondes',
                    '`+antispam fenetre moyen 15 10`',
                    '`+antispam fenetre long 30 30`',
                    '`+antispam fenetre etendu 60 120`'
                ].join('\n'));
            }
            const key = {
                court: 'short', moyen: 'medium', long: 'long', etendu: 'extended',
                short: 'short', medium: 'medium', extended: 'extended'
            }[kind];
            anti.windows ??= {};
            anti.windows[key] = { maxMessages: count, intervalMs: seconds * 1000 };
            await save();
            return send(message, 'Anti-Spam', `Fenêtre \`${key}\` : **${count} messages en ${seconds}s**.`, 'success');
        }

        // --- AIDE
        if (sub === 'aide' || sub === 'help' || sub === '?' || sub === 'status') {
            const live = buildAntiSpamConfig(config, message.channel.id);
            const lines = [
                `**État :** ${live.enabled ? '✅ Activé' : '❌ Désactivé'}`,
                `**Debug :** ${live.debug ? '✅' : '❌'}`,
                `**Preset :** \`${live.profile}\``,
                `**Seuils :** warning ${live.actions.warning.score} · delete ${live.actions.delete.score} · timeout ${live.actions.timeout.score} · severe ${live.actions.severe.score}`,
                `**Timeout :** ${ms(live.actions.timeout.durationMs, { long: true })}${live.actions.severe.enabled ? ` · Sévère : ${live.actions.severe.type} ${ms(live.actions.severe.durationMs, { long: true })}` : ''}`,
                `**Burst :** ${live.windows.short.maxMessages}/${Math.round(live.windows.short.intervalMs / 1000)}s · ${live.windows.medium.maxMessages}/${Math.round(live.windows.medium.intervalMs / 1000)}s · ${live.windows.long.maxMessages}/${Math.round(live.windows.long.intervalMs / 1000)}s`,
                `**Domaines :** trusted=${live.trustedDomains.length} · blocked=${live.blockedDomains.length} · suspicious=${live.suspiciousDomains.length}`,
                `**Salons sensibles :** ${live.antiSpamChannels.length}`,
                '',
                '__⚙️  Commandes simples__',
                '• `+antispam on|off`',
                '• `+antispam debug on|off`',
                '• `+antispam preset strict|balanced|lenient`',
                '• `+antispam seuil warning|delete|timeout|severe <score>`',
                '• `+antispam timeout 15m`',
                '• `+antispam action-severe kick|ban|timeout|off`',
                '• `+antispam bloquer grabify.link` · `debloquer` · `suspecter` · `faire-confiance`',
                '• `+antispam ignorer #salon` · `@role` · `@user`',
                '• `+antispam unignore role|channel|user|categorie|permission <valeur>`',
                '• `+antispam surveiller #salon` · `plus-surveiller`',
                '• `+antispam fenetre court 5 3`  (court / moyen / long / étendu)',
                '',
                '__🔧  Commandes avancées (mode power-user)__',
                '• `+antispam set actions.timeout.durationMs 15m`',
                '• `+antispam add blockedDomains grabify.link`',
                '• `+antispam del blockedDomains grabify.link`'
            ];
            return send(message, 'Anti-Spam avancé', lines.join('\n'), 'info');
        }

        // --- MODES VERBAUX EXISTANTS (compatibilité, dernière chance)
        if (sub === 'set' && args[1] && args[2]) {
            try {
                setByPath(anti, args[1], parseValue(args.slice(2).join(' ')));
                await save();
                return send(message, 'Anti-Spam', `Valeur mise à jour : \`${args[1]}\`.`, 'success');
            } catch (err) {
                return send(message, 'Erreur', 'Valeur ou chemin invalide.', 'error');
            }
        }

        if ((sub === 'add' || sub === 'del') && LIST_KEYS.has(args[1]) && args[2]) {
            toggleList(anti, args[1], sub === 'add' ? 'add' : 'del', args[2]);
            await save();
            return send(message, 'Anti-Spam', `Liste \`${args[1]}\` mise à jour.`, 'success');
        }

        // Fallback
        return send(message, 'Commande inconnue', [
            'Commande inconnue. Utilise :',
            '',
            '• `+antispam` → statut + aide',
            '• `+antispam aide` → aide complète',
            '',
            'ou les raccourcis : `on`, `off`, `preset`, `timeout`, `seuil`, `bloquer`, `faire-confiance`, `ignorer`, `surveiller`, `fenetre`…'
        ].join('\n'), 'warning');
    }
};
