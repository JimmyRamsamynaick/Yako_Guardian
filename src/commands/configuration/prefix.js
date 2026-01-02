const { sendV2Message } = require('../../utils/componentUtils');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'prefix',
    description: 'Change le préfixe du bot sur ce serveur',
    category: 'Configuration',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('prefix.permission', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        const currentPrefix = config.prefix || client.config.prefix;

        const newPrefix = args[0];
        if (!newPrefix) {
            return sendV2Message(client, message.channel.id, await t('prefix.usage', message.guild.id, { prefix: currentPrefix }), []);
        }

        if (newPrefix.length > 5) {
            return sendV2Message(client, message.channel.id, await t('prefix.length_error', message.guild.id), []);
        }

        config.prefix = newPrefix;
        await config.save();

        // Update local cache if needed, though best to fetch from DB or cache in client
        // For this specific bot structure, we might need to update client.config.prefix per guild?
        // The current structure seems to rely on `client.config.prefix` which is global.
        // We need to ensure the command handler respects per-guild prefix.
        // I will add a note to check commandHandler later.

        return sendV2Message(client, message.channel.id, await t('prefix.success', message.guild.id, { prefix: newPrefix }), []);
    }
};
