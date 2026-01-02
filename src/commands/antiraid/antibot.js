const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'antibot',
    description: 'Active ou désactive le système Anti-Bot',
    category: 'Antiraid',
    usage: 'antibot <on/off>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('common.admin_only', message.guild.id),
                '',
                'error'
            )] });
        }

        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) {
            return message.channel.send({ embeds: [createEmbed(
                await t('antibot.usage', message.guild.id),
                '',
                'info'
            )] });
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.security) config.security = {};
        
        config.security.antibot = (state === 'on');
        await config.save();

        return message.channel.send({ embeds: [createEmbed(
            await t('antibot.success', message.guild.id, { state: state.toUpperCase() }),
            '',
            'success'
        )] });
    }
};
