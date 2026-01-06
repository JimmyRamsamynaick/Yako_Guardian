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

        const config = await getGuildConfig(message.guild.id);
        if (!config.security) config.security = {};

        const state = args[0]?.toLowerCase();
        if (!['on', 'off'].includes(state)) {
            const status = config.security.antibot ? '✅ ON' : '❌ OFF';
            const description = (await t('antibot.menu_description', message.guild.id)).replace('{status}', status);

            return message.channel.send({ embeds: [createEmbed(
                await t('antibot.menu_title', message.guild.id),
                description,
                'info'
            )] });
        }
        
        config.security.antibot = (state === 'on');
        await config.save();

        return message.channel.send({ embeds: [createEmbed(
            await t('antibot.success', message.guild.id, { state: state.toUpperCase() }),
            '',
            'success'
        )] });
    }
};
