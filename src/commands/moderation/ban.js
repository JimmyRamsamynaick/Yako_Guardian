const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const { addSanction } = require('../../utils/moderation/sanctionUtils');
const { checkUsage } = require('../../utils/moderation/helpUtils');

module.exports = {
    name: 'ban',
    description: 'Bannit un ou plusieurs membres (ou ID)',
    category: 'Moderation',
    usage: 'ban <user> [raison] | ban <user1>,, <user2> [raison]',
    examples: ['ban @user Spam', 'ban 123456789012345678 Spam', 'ban @user1,, @user2 Spam'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return sendV2Message(client, message.channel.id, await t('common.permission_missing', message.guild.id, { perm: 'BanMembers' }), []);
        }

        if (!await checkUsage(client, message, module.exports, args)) return;

        const fullContent = args.join(' ');
        let usersToBan = [];
        let reason = await t('moderation.reason_none', message.guild.id);

        if (fullContent.includes(',,')) {
            // Multi-ban
            const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
            
            // Logic: try to resolve each part as user. 
            // The last part might contain the reason if it doesn't resolve to a user?
            // Or we assume the reason is NOT supported in multi-ban via ,, easily unless last part logic is strict.
            // Let's stick to resolveMembers logic: Last part is split into User + Reason if possible.
            
            for (let i = 0; i < parts.length; i++) {
                let part = parts[i];
                let partReason = "";

                // Attempt to resolve User from part
                let user = await resolveUser(client, part);

                if (!user && i === parts.length - 1) {
                    // Try splitting last part
                    const lastSpaceIndex = part.indexOf(' ');
                    if (lastSpaceIndex !== -1) {
                        const potentialId = part.substring(0, lastSpaceIndex);
                        user = await resolveUser(client, potentialId);
                        if (user) {
                            partReason = part.substring(lastSpaceIndex + 1);
                            if (reason === await t('moderation.reason_none', message.guild.id)) reason = partReason; // Use global reason
                        }
                    }
                }

                if (user) {
                    usersToBan.push(user);
                } else if (i === parts.length - 1 && usersToBan.length > 0) {
                     // If last part didn't resolve, maybe it's the reason for previous users?
                     reason = part;
                }
            }
        } else {
            // Single ban
            const targetUser = await resolveUser(client, args[0]);
            if (targetUser) {
                usersToBan.push(targetUser);
                if (args.length > 1) reason = args.slice(1).join(' ');
            }
        }

        if (usersToBan.length === 0) {
             return sendV2Message(client, message.channel.id, await t('moderation.user_not_found', message.guild.id), []);
        }

        const summary = [];

        for (const targetUser of usersToBan) {
            // Check member permissions if in guild
            const member = await message.guild.members.fetch(targetUser.id).catch(() => null);

            if (member) {
                if (!member.bannable) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.hierarchy_bot', message.guild.id) }));
                    continue;
                }
                if (member.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                    summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.role_hierarchy', message.guild.id) }));
                    continue;
                }
            }

            try {
                await targetUser.send(await t('moderation.ban_dm_reason', message.guild.id, { guild: message.guild.name, reason })).catch(() => {});
                await message.guild.members.ban(targetUser.id, { reason });

                // Log sanction
                await addSanction(message.guild.id, targetUser.id, message.author.id, 'ban', reason);
                summary.push(await t('moderation.ban_success', message.guild.id, { user: targetUser.tag, reason }));
            } catch (err) {
                console.error(err);
                summary.push(await t('moderation.error_summary', message.guild.id, { user: targetUser.tag, error: await t('moderation.ban_fail', message.guild.id) }));
            }
        }

        const summaryText = summary.join('\n');
        if (summaryText.length > 2000) {
             return sendV2Message(client, message.channel.id, await t('moderation.action_performed_bulk', message.guild.id, { count: usersToBan.length }), []);
        }
        return sendV2Message(client, message.channel.id, summaryText || await t('moderation.no_action', message.guild.id), []);
    }
};

async function resolveUser(client, text) {
    if (!text) return null;
    text = text.trim();
    const mentionMatch = text.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return await client.users.fetch(mentionMatch[1]).catch(() => null);
    if (text.match(/^\d{17,19}$/)) return await client.users.fetch(text).catch(() => null);
    return null; // Don't support username search for bans to avoid accidents
}
