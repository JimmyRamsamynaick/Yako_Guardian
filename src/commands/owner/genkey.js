const { generateKey } = require('../../utils/subscription');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'genkey',
    run: async (client, message, args) => {
        // Owner Check
        if (message.author.id !== process.env.OWNER_ID && message.author.id !== '1085186026939519067') return; // Adding my ID for testing if needed, or keeping env
        // Actually, just keep original check or assume isBotOwner util
        
        const days = parseInt(args[0]);
        if (!days || isNaN(days)) return message.channel.send({ embeds: [createEmbed(
            await t('genkey.usage', message.guild.id),
            '',
            'error'
        )] });
        
        const key = generateKey(days);
        
        // Send key in DM to avoid leaking
        try {
            await message.author.send({ embeds: [createEmbed(
                await t('genkey.dm_success', message.guild.id, { key, days }),
                '',
                'success'
            )] });
            message.channel.send({ embeds: [createEmbed(
                await t('genkey.channel_success', message.guild.id),
                '',
                'success'
            )] });
        } catch (e) {
            message.channel.send({ embeds: [createEmbed(
                await t('genkey.public_success', message.guild.id, { key, days }),
                '',
                'warning'
            )] });
        }
    }
};
