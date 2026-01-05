const { createEmbed } = require('../../utils/design');
const { PermissionsBitField } = require('discord.js');
const { setBotActivity, setBotStatus } = require('../../utils/presenceUtils');
const { db } = require('../../database');
const { t } = require('../../utils/i18n');
const { isBotOwner } = require('../../utils/ownerUtils');

module.exports = {
    name: 'activity',
    description: 'Commandes de gestion d\'activité et de statut (Owner)',
    category: 'Owner',
    aliases: [
        'playto', 'play', 'watch', 'listen', 'stream', 'compet',
        'online', 'idle', 'dnd', 'invisible',
        'remove' // for +remove activity
    ],
    async run(client, message, args) {
        if (!await isBotOwner(message.author.id)) {
             return message.channel.send({ embeds: [createEmbed(await t('common.owner_only', message.guild.id), '', 'error')] });
        }

        let commandName = message.content.split(' ')[0].slice(client.config.prefix.length).toLowerCase();
        
        if (commandName === 'remove') {
            if (args[0]?.toLowerCase() === 'activity') {
                try {
                    db.prepare('UPDATE guild_settings SET bot_activity_type = NULL, bot_activity_text = NULL, bot_activity_url = NULL WHERE guild_id = ?').run(message.guild.id);
                    return message.channel.send({ embeds: [createEmbed(await t('activity.removed', message.guild.id), '', 'success')] });
                } catch (e) {
                    return message.channel.send({ embeds: [createEmbed(await t('activity.error', message.guild.id, { error: e.message }), '', 'error')] });
                }
            }
            return;
        }

        const statuses = ['online', 'idle', 'dnd', 'invisible'];
        if (statuses.includes(commandName)) {
            return await setBotStatus(client, message, commandName);
        }

        let typeStr;
        if (commandName === 'playto' || commandName === 'play') typeStr = 'play';
        else if (commandName === 'watch') typeStr = 'watch';
        else if (commandName === 'listen') typeStr = 'listen';
        else if (commandName === 'compet') typeStr = 'compete';
        else if (commandName === 'stream') typeStr = 'stream';

        if (typeStr) {
            const text = args.join(' ');
            
            let url = null;
            if (typeStr === 'stream') {
                const lastArg = args[args.length - 1];
                if (lastArg && lastArg.startsWith('http')) {
                    url = lastArg;
                } else {
                    url = 'https://www.twitch.tv/discord';
                }
            }

            if (!text) {
                return message.channel.send({ embeds: [createEmbed(await t('activity.usage', message.guild.id), '', 'info')] });
            }

            return await setBotActivity(client, message, typeStr, text, url);
        }
    }
};
