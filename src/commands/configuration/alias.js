const { sendV2Message } = require('../../utils/componentUtils');
const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'alias',
    description: 'Affiche les alias d\'une commande ou configure l\'affichage',
    category: 'Configuration',
    aliases: ['helpalias'],
    async run(client, message, args) {
        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();

        // --- HELPALIAS ---
        if (commandName === 'helpalias') {
             if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
                 return sendV2Message(client, message.channel.id, await t('alias.permission', message.guild.id), []);
             }

             const state = args[0];
             if (!state || !['on', 'off'].includes(state.toLowerCase())) {
                 return sendV2Message(client, message.channel.id, await t('alias.helpalias_usage', message.guild.id), []);
             }

             db.prepare('UPDATE guild_settings SET help_alias_enabled = ? WHERE guild_id = ?').run(state.toLowerCase(), message.guild.id);
             return sendV2Message(client, message.channel.id, await t('alias.helpalias_success', message.guild.id, { state: state.toUpperCase() }), []);
        }

        // --- ALIAS ---
        if (commandName === 'alias') {
            const cmdName = args[0];
            if (!cmdName) {
                return sendV2Message(client, message.channel.id, await t('alias.usage', message.guild.id), []);
            }

            const command = client.commands.get(cmdName) || client.commands.find(c => c.aliases && c.aliases.includes(cmdName));
            if (!command) {
                return sendV2Message(client, message.channel.id, await t('alias.not_found', message.guild.id, { command: cmdName }), []);
            }

            const aliases = command.aliases && command.aliases.length > 0 ? command.aliases.map(a => `\`${a}\``).join(', ') : await t('alias.none', message.guild.id);
            return sendV2Message(client, message.channel.id, await t('alias.list', message.guild.id, { command: command.name, aliases }), []);
        }
    }
};
