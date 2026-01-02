const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'badwords',
    description: 'Gère les mots interdits',
    category: 'Moderation',
    usage: 'badwords <on/off> ou <add/del/list>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.badwords) config.moderation.badwords = { enabled: false, list: [] };

        const sub = args[0]?.toLowerCase();

        if (!sub) {
             return message.channel.send({ embeds: [createEmbed('Utilisation', await t('badwords.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed('BadWords', `${THEME.icons.loading} Traitement en cours...`, 'loading')] });

        if (['on', 'off'].includes(sub)) {
            config.moderation.badwords.enabled = (sub === 'on');
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed('BadWords', await t('badwords.success_state', message.guild.id, { status: sub.toUpperCase() }), sub === 'on' ? 'success' : 'warning')] });
            return;
        }

        if (sub === 'list') {
            const list = config.moderation.badwords.list.join(', ') || await t('badwords.list_empty', message.guild.id);
            await replyMsg.edit({ embeds: [createEmbed('Liste des Mots Interdits', await t('badwords.list_title', message.guild.id, { list }), 'info')] });
            return;
        }

        if (sub === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) {
                await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('badwords.specify_word', message.guild.id), 'error')] });
                return;
            }
            
            if (!config.moderation.badwords.list.includes(word)) {
                config.moderation.badwords.list.push(word);
                config.markModified('moderation');
                await config.save();
            }
            await replyMsg.edit({ embeds: [createEmbed('Succès', await t('badwords.added', message.guild.id, { word }), 'success')] });
            return;
        }

        if (sub === 'del' || sub === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) {
                await replyMsg.edit({ embeds: [createEmbed('Erreur', await t('badwords.specify_word', message.guild.id), 'error')] });
                return;
            }
            
            config.moderation.badwords.list = config.moderation.badwords.list.filter(w => w !== word);
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed('Succès', await t('badwords.removed', message.guild.id, { word }), 'success')] });
            return;
        }

        // Clear
        if (sub === 'clear') {
             config.moderation.badwords.list = [];
             config.markModified('moderation');
             await config.save();
             await replyMsg.edit({ embeds: [createEmbed('Succès', await t('badwords.cleared', message.guild.id), 'success')] });
             return;
        }

        await replyMsg.edit({ embeds: [createEmbed('Utilisation', await t('badwords.usage', message.guild.id), 'warning')] });
    }
};
