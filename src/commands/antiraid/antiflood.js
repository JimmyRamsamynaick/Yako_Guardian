const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'antiflood',
    description: 'Gère le système Anti-Flood (Join)',
    category: 'Antiraid',
    usage: 'antiflood join <on/off>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        const sub = args[0]?.toLowerCase();
        // User asked for +antiflood join <on/off>
        if (sub === 'join') {
            const state = args[1]?.toLowerCase();
            if (!['on', 'off'].includes(state)) {
                return message.channel.send({ embeds: [createEmbed(
                    await t('antiflood.usage', message.guild.id),
                    '',
                    'info'
                )] });
            }

            const config = await getGuildConfig(message.guild.id);
            if (!config.security) config.security = {};
            if (!config.security.antiflood) config.security.antiflood = {};

            config.security.antiflood.enabled = (state === 'on');
            await config.save();

            return message.channel.send({ embeds: [createEmbed(
                await t('antiflood.success', message.guild.id, { state: state.toUpperCase() }),
                '',
                'success'
            )] });
        }

        return message.channel.send({ embeds: [createEmbed(
            await t('antiflood.usage', message.guild.id),
            '',
            'info'
        )] });
    }
};
