const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'badwords',
    description: 'Gère les mots interdits',
    category: 'Moderation',
    usage: 'badwords <on/off> ou <add/del/list>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.badwords) config.moderation.badwords = { enabled: false, list: [] };

        const sub = args[0]?.toLowerCase();

        if (!sub) {
             return sendV2Message(client, message.channel.id, await t('badwords.usage', message.guild.id), []);
        }

        if (['on', 'off'].includes(sub)) {
            config.moderation.badwords.enabled = (sub === 'on');
            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, await t('badwords.success_state', message.guild.id, { status: sub.toUpperCase() }), []);
        }

        if (sub === 'list') {
            const list = config.moderation.badwords.list.join(', ') || "Aucun mot interdit.";
            return sendV2Message(client, message.channel.id, `**Mots interdits:**\n${list}`, []);
        }

        if (sub === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) return sendV2Message(client, message.channel.id, "❌ Précisez un mot.", []);
            
            if (!config.moderation.badwords.list.includes(word)) {
                config.moderation.badwords.list.push(word);
                config.markModified('moderation');
                await config.save();
            }
            return sendV2Message(client, message.channel.id, `✅ Mot ajouté: **${word}**`, []);
        }

        if (sub === 'del' || sub === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) return sendV2Message(client, message.channel.id, "❌ Précisez un mot.", []);
            
            config.moderation.badwords.list = config.moderation.badwords.list.filter(w => w !== word);
            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, `✅ Mot retiré: **${word}**`, []);
        }

        // Clear
        if (sub === 'clear') {
             config.moderation.badwords.list = [];
             config.markModified('moderation');
             await config.save();
             return sendV2Message(client, message.channel.id, `✅ Liste vidée.`, []);
        }

        return sendV2Message(client, message.channel.id, await t('badwords.usage', message.guild.id), []);
    }
};
