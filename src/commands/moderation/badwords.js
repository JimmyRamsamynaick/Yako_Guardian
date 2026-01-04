const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed, THEME } = require('../../utils/design');

module.exports = {
    name: 'badwords',
    description: 'badwords.description',
    category: 'Moderation',
    usage: 'badwords.usage',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(await t('common.permission_missing_title', message.guild.id), await t('common.admin_only', message.guild.id), 'error')] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.badwords) config.moderation.badwords = { enabled: false, list: [] };

        const sub = args[0]?.toLowerCase();

        if (!sub) {
             return message.channel.send({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('badwords.usage', message.guild.id), 'info')] });
        }

        const replyMsg = await message.channel.send({ embeds: [createEmbed(await t('moderation.badwords_title', message.guild.id), `${THEME.icons.loading} ${await t('common.processing', message.guild.id)}`, 'loading')] });

        if (['on', 'off'].includes(sub)) {
            config.moderation.badwords.enabled = (sub === 'on');
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.badwords_title', message.guild.id), await t('badwords.success_state', message.guild.id, { status: sub.toUpperCase() }), sub === 'on' ? 'success' : 'warning')] });
            return;
        }

        if (sub === 'list') {
            const list = config.moderation.badwords.list.join(', ') || await t('badwords.list_empty', message.guild.id);
            await replyMsg.edit({ embeds: [createEmbed(await t('badwords.list_embed_title', message.guild.id), await t('badwords.list_title', message.guild.id, { list }), 'info')] });
            return;
        }

        if (sub === 'add') {
            const word = args[1]?.toLowerCase();
            if (!word) {
                await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('badwords.specify_word', message.guild.id), 'error')] });
                return;
            }
            
            if (!config.moderation.badwords.list.includes(word)) {
                config.moderation.badwords.list.push(word);
                config.markModified('moderation');
                await config.save();
            }
            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.badwords_title', message.guild.id), await t('badwords.added', message.guild.id, { word }), 'success')] });
            return;
        }

        if (sub === 'del' || sub === 'remove') {
            const word = args[1]?.toLowerCase();
            if (!word) {
                await replyMsg.edit({ embeds: [createEmbed(await t('common.error_title', message.guild.id), await t('badwords.specify_word', message.guild.id), 'error')] });
                return;
            }
            
            config.moderation.badwords.list = config.moderation.badwords.list.filter(w => w !== word);
            config.markModified('moderation');
            await config.save();
            await replyMsg.edit({ embeds: [createEmbed(await t('moderation.badwords_title', message.guild.id), await t('badwords.removed', message.guild.id, { word }), 'success')] });
            return;
        }

        // Clear
        if (sub === 'clear') {
             config.moderation.badwords.list = [];
             config.markModified('moderation');
             await config.save();
             await replyMsg.edit({ embeds: [createEmbed(await t('common.success_title', message.guild.id), await t('badwords.cleared', message.guild.id), 'success')] });
             return;
        }

        await replyMsg.edit({ embeds: [createEmbed(await t('common.usage_title', message.guild.id), await t('badwords.usage', message.guild.id), 'warning')] });
    }
};
