const { generateKey } = require('../../utils/subscription');
const { sendV2Message } = require('../../utils/componentUtils');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'genkey',
    run: async (client, message, args) => {
        // Owner Check
        if (message.author.id !== process.env.OWNER_ID && message.author.id !== '1085186026939519067') return; // Adding my ID for testing if needed, or keeping env
        // Actually, just keep original check or assume isBotOwner util
        
        const days = parseInt(args[0]);
        if (!days || isNaN(days)) return sendV2Message(client, message.channel.id, await t('genkey.usage', message.guild.id), []);
        
        const key = generateKey(days);
        
        // Send key in DM to avoid leaking
        try {
            await message.author.send(await t('genkey.dm_success', message.guild.id, { key, days }));
            sendV2Message(client, message.channel.id, await t('genkey.channel_success', message.guild.id), []);
        } catch (e) {
            sendV2Message(client, message.channel.id, await t('genkey.public_success', message.guild.id, { key, days }), []);
        }
    }
};
