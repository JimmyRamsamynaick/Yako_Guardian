const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'unban',
    description: 'Débannit un ou plusieurs utilisateurs (ID)',
    category: 'Moderation',
    usage: 'unban <id> [raison] | unban <id1>,, <id2> [raison]',
    examples: ['unban 123456789012345678', 'unban 123456789,, 987654321 Mistake'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const fullContent = args.join(' ');
        let idsToUnban = [];
        let reason = await t('moderation.reason_none', message.guild.id);

        if (fullContent.includes(',,')) {
            const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
            
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                // Try to extract ID from part
                let idMatch = part.match(/^(\d{17,19})/);
                
                if (idMatch) {
                    idsToUnban.push(idMatch[1]);
                    // Check for reason in the last part if it has extra text
                    if (i === parts.length - 1 && part.length > idMatch[1].length) {
                        const remainder = part.substring(idMatch[1].length).trim();
                        if (remainder) reason = remainder;
                    }
                } else if (i === parts.length - 1 && idsToUnban.length > 0) {
                     reason = part;
                }
            }
        } else {
            if (args[0].match(/^\d{17,19}$/)) {
                idsToUnban.push(args[0]);
                if (args.length > 1) reason = args.slice(1).join(' ');
            }
        }

        if (idsToUnban.length === 0) {
            return sendV2Message(client, message.channel.id, await t('moderation.id_invalid', message.guild.id), []);
        }

        const summary = [];

        for (const userId of idsToUnban) {
            try {
                // Check if ban exists
                const ban = await message.guild.bans.fetch(userId).catch(() => null);
                if (!ban) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: userId, error: await t('moderation.not_banned', message.guild.id) }));
                    continue;
                }

                await message.guild.members.unban(userId, reason);
                await addSanction(message.guild.id, userId, message.author.id, 'unban', reason);
                summary.push(await t('moderation.unban_success', message.guild.id, { user: ban.user ? ban.user.tag : userId }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: userId, error: await t('moderation.error_internal', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: idsToUnban.length }), []);
        }
        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};
