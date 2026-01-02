const { sendV2Message } = require('../../utils/componentUtils');
const GlobalBlacklist = require('../../database/models/GlobalBlacklist');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'bl',
    description: 'Gère la blacklist globale',
    category: 'Owner',
    aliases: ['unbl', 'blinfo'],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0]?.toLowerCase();

        // --- UNBL ---
        if (commandName === 'unbl') {
            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, await t('bl.usage_unbl', message.guild.id), []);

            const deleted = await GlobalBlacklist.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, await t('bl.not_blacklisted', message.guild.id), []);

            return sendV2Message(client, message.channel.id, await t('bl.unbl_success', message.guild.id, { user: `<@${targetId}>` }), []);
        }

        // --- BL INFO ---
        if (commandName === 'blinfo') {
             const targetId = args[0]?.replace(/[<@!>]/g, '');
             if (!targetId) return sendV2Message(client, message.channel.id, await t('bl.usage_blinfo', message.guild.id), []);

             const bl = await GlobalBlacklist.findOne({ userId: targetId });
             if (!bl) return sendV2Message(client, message.channel.id, await t('bl.info_not_blacklisted', message.guild.id), []);

             return sendV2Message(client, message.channel.id, await t('bl.bl_info', message.guild.id, { 
                 user: `<@${bl.userId}>`,
                 reason: bl.reason,
                 moderator: `<@${bl.addedBy}>`,
                 date: bl.addedAt.toLocaleDateString()
             }), []);
        }

        // --- BL LIST ---
        if (commandName === 'bl' && (!sub || sub === 'list')) {
             if (sub && (sub.match(/^\d+$/) || sub.startsWith('<@'))) {
                 // Pass to ADD
             } else {
                 const bls = await GlobalBlacklist.find();
                 const count = bls.length;
                 let content = await t('bl.bl_header', message.guild.id, { count });
                 
                 if (count === 0) content += await t('bl.bl_empty', message.guild.id);
                 else {
                     content += bls.slice(0, 15).map(b => `• <@${b.userId}> | ${b.reason}`).join('\n');
                     if (count > 15) content += await t('bl.bl_more', message.guild.id, { count: count - 15 });
                 }
                 return sendV2Message(client, message.channel.id, content, []);
             }
        }

        // --- BL DEL/REMOVE ---
        if (commandName === 'bl' && (sub === 'del' || sub === 'remove') && args[1]) {
            const targetId = args[1].replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, await t('bl.usage_bl_del', message.guild.id), []);

            const deleted = await GlobalBlacklist.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, await t('bl.not_blacklisted', message.guild.id), []);

            return sendV2Message(client, message.channel.id, await t('bl.unbl_success', message.guild.id, { user: `<@${targetId}>` }), []);
        }

        // --- BL ADD ---
        if (commandName === 'bl') {
            let targetId = null;
            let reason = await t('common.reason_none', message.guild.id);

            if (sub === 'add' && args[1]) {
                targetId = args[1].replace(/[<@!>]/g, '');
                reason = args.slice(2).join(' ') || reason;
            } else if (sub && (sub.match(/^\d+$/) || sub.startsWith('<@'))) {
                targetId = sub.replace(/[<@!>]/g, '');
                reason = args.slice(1).join(' ') || reason;
            }

            if (targetId) {
                if (!targetId.match(/^\d+$/)) return; // Should not happen if regex passed

                if (await GlobalBlacklist.findOne({ userId: targetId })) return sendV2Message(client, message.channel.id, await t('bl.already_blacklisted', message.guild.id), []);
                
                await GlobalBlacklist.create({ userId: targetId, reason, addedBy: message.author.id });
                sendV2Message(client, message.channel.id, await t('bl.bl_added', message.guild.id, { user: `<@${targetId}>`, reason }), []);

                // Trigger Global Ban
                const banReason = await t('antiraid.reasons.global_blacklist', message.guild.id, { reason });
                client.guilds.cache.forEach(guild => {
                    guild.members.ban(targetId, { reason: banReason }).catch(() => {});
                });
                return;
            }
        }
    }
};
