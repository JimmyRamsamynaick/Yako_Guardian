const { PermissionsBitField } = require('discord.js');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'change',
    description: 'Modifie les permissions des commandes',
    category: 'Configuration',
    aliases: ['changeall'],
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild.ownerId) {
             return message.channel.send({ embeds: [createEmbed('Permission Manquante', await t('change.permission', message.guild.id), 'error')] });
        }

        const commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        // --- CHANGE COMMAND ---
        if (commandName === 'change') {
            const cmd = args[0];
            const perm = args[1];

            // +change reset
            if (cmd === 'reset') {
                db.prepare('DELETE FROM command_permissions WHERE guild_id = ?').run(message.guild.id);
                return message.channel.send({ embeds: [createEmbed('Succès', await t('change.reset_success', message.guild.id), 'success')] });
            }

            if (!cmd || !perm) {
                return message.channel.send({ embeds: [createEmbed('Usage', await t('change.usage', message.guild.id), 'info')] });
            }

            // Verify command exists
            const command = client.commands.get(cmd) || client.commands.find(c => c.aliases && c.aliases.includes(cmd));
            if (!command) {
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('change.not_found', message.guild.id, { command: cmd }), 'error')] });
            }

            // Verify permission validity
            let permValue = perm;
            if (perm !== '0' && perm !== '-1') {
                if (!PermissionsBitField.Flags[perm]) {
                     return message.channel.send({ embeds: [createEmbed('Erreur', await t('change.invalid_perm', message.guild.id, { perm: perm }), 'error')] });
                }
            }

            db.prepare(`
                INSERT INTO command_permissions (guild_id, command_name, permission)
                VALUES (?, ?, ?)
                ON CONFLICT(guild_id, command_name) DO UPDATE SET permission = ?
            `).run(message.guild.id, command.name, permValue, permValue);

            const displayPerm = permValue === '0' ? await t('change.perm_none', message.guild.id) : permValue === '-1' ? await t('change.perm_disabled', message.guild.id) : permValue;
            return message.channel.send({ embeds: [createEmbed('Succès', await t('change.success', message.guild.id, { command: command.name, perm: displayPerm }), 'success')] });
        }

        // --- CHANGEALL COMMAND ---
        if (commandName === 'changeall') {
            const oldPerm = args[0];
            const newPerm = args[1];

            if (!oldPerm || !newPerm) {
                return message.channel.send({ embeds: [createEmbed('Usage', await t('change.changeall_usage', message.guild.id), 'info')] });
            }

            // Verify validity
            if (newPerm !== '0' && newPerm !== '-1' && !PermissionsBitField.Flags[newPerm]) {
                return message.channel.send({ embeds: [createEmbed('Erreur', await t('change.invalid_target_perm', message.guild.id, { perm: newPerm }), 'error')] });
            }

            const changes = db.prepare('UPDATE command_permissions SET permission = ? WHERE guild_id = ? AND permission = ?').run(newPerm, message.guild.id, oldPerm);

            return message.channel.send({ embeds: [createEmbed('Succès', await t('change.changeall_success', message.guild.id, { count: changes.changes, old: oldPerm, new: newPerm }), 'success')] });
        }
    }
};
