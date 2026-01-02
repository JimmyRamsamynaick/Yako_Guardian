const { sendV2Message } = require('../../utils/componentUtils');
const BotOwner = require('../../database/models/BotOwner');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'owner',
    description: 'Gère les owners du bot',
    category: 'Owner',
    aliases: ['unowner'],
    async run(client, message, args) {
        // Security check
        if (!await isBotOwner(message.author.id)) return;

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        const sub = args[0]?.toLowerCase();
        const rootOwnerId = process.env.OWNER_ID ? process.env.OWNER_ID.trim() : null;

        // --- CLEAR OWNERS ---
        if (commandName === 'owner' && sub === 'clear') {
            if (rootOwnerId && message.author.id !== rootOwnerId) {
                return sendV2Message(client, message.channel.id, await t('owner.root_owner_only', message.guild.id), []);
            }
            
            // Confirm button could be added here for UX, but simple command for now
            const deleted = await BotOwner.deleteMany({});
            return sendV2Message(client, message.channel.id, await t('owner.owners_cleared', message.guild.id, { count: deleted.deletedCount }), []);
        }

        // --- UNOWNER (Remove) ---
        if (commandName === 'unowner') {
            const targetId = args[0]?.replace(/[<@!>]/g, '');
            if (!targetId || !targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, await t('owner.usage_unowner', message.guild.id), []);

            if (rootOwnerId && targetId === rootOwnerId) return sendV2Message(client, message.channel.id, await t('owner.remove_root_error', message.guild.id), []);

            const deleted = await BotOwner.findOneAndDelete({ userId: targetId });
            if (!deleted) return sendV2Message(client, message.channel.id, await t('owner.not_owner', message.guild.id), []);

            return sendV2Message(client, message.channel.id, await t('owner.unowner_success', message.guild.id, { user: `<@${targetId}>` }), []);
        }

        // --- OWNER ADD ---
        if (commandName === 'owner' && sub) {
            let targetId = null;

            if (sub === 'add' && args[1]) {
                targetId = args[1].replace(/[<@!>]/g, '');
            } else if (sub.match(/^\d+$/) || sub.startsWith('<@')) {
                targetId = sub.replace(/[<@!>]/g, '');
            }

            if (targetId) {
                if (await isBotOwner(targetId)) return sendV2Message(client, message.channel.id, await t('owner.already_owner', message.guild.id), []);

                await BotOwner.create({ userId: targetId, addedBy: message.author.id });
                return sendV2Message(client, message.channel.id, await t('owner.owner_added', message.guild.id, { user: `<@${targetId}>` }), []);
            }
        }

        // --- OWNER DEL/REMOVE ---
        if (commandName === 'owner' && (sub === 'del' || sub === 'remove') && args[1]) {
             const targetId = args[1].replace(/[<@!>]/g, '');
             if (!targetId.match(/^\d+$/)) return sendV2Message(client, message.channel.id, await t('owner.usage_owner_del', message.guild.id), []);

             if (rootOwnerId && targetId === rootOwnerId) return sendV2Message(client, message.channel.id, await t('owner.remove_root_error', message.guild.id), []);

             const deleted = await BotOwner.findOneAndDelete({ userId: targetId });
             if (!deleted) return sendV2Message(client, message.channel.id, await t('owner.not_owner', message.guild.id), []);

             return sendV2Message(client, message.channel.id, await t('owner.unowner_success', message.guild.id, { user: `<@${targetId}>` }), []);
        }

        // --- OWNER LIST (Default) ---
        const owners = await BotOwner.find();
        const rootOwner = rootOwnerId ? `<@${rootOwnerId}> (Root)` : await t('owner.owner_root_none', message.guild.id);
        
        let content = await t('owner.owner_list_title', message.guild.id, { rootOwner });
        if (owners.length === 0) content += await t('owner.owner_list_empty', message.guild.id);
        else content += owners.map(o => `• <@${o.userId}> (Ajouté par <@${o.addedBy}>)`).join('\n');

        return sendV2Message(client, message.channel.id, content, []);
    }
};
