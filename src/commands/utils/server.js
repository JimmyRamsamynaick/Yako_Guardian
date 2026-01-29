const { createEmbed } = require('../../utils/design');
const { isBotOwner } = require('../../utils/ownerUtils');
const { t } = require('../../utils/i18n');
const serverInfoCommand = require('./serverinfo');

module.exports = {
    name: 'server',
    description: 'Commandes relatives au serveur',
    category: 'Utils',
    async run(client, message, args) {
        const sub = args[0]?.toLowerCase();
        
        // --- Redirect +server info to +serverinfo ---
        if (sub === 'info') {
            return serverInfoCommand.run(client, message, args);
        }

        // --- OWNER: LIST ---
        if (sub === 'list') {
            if (!await isBotOwner(message.author.id)) return;
            
            const guilds = client.guilds.cache.map(g => `• ${g.name} | ${g.memberCount} membres | ID: ${g.id}`).join('\n');
            const title = await t('server.list_title', message.guild.id, { count: client.guilds.cache.size });
            
            if (guilds.length > 4000) {
                 return message.channel.send({ embeds: [createEmbed(title, `${guilds.slice(0, 4000)}...`, 'info')] });
            }
            return message.channel.send({ embeds: [createEmbed(title, guilds, 'info')] });
        }

        if (sub === 'pic' || sub === 'icon') {
            const url = message.guild.iconURL({ size: 4096, extension: 'png' });
            if (!url) return message.channel.send({ embeds: [createEmbed(await t('server.no_icon', message.guild.id), '', 'error')] });
            const embed = createEmbed((await t('server.icon_title', message.guild.id)), '', 'info');
            embed.setImage(url);
            return message.channel.send({ embeds: [embed] });
        }
        
        if (sub === 'banner') {
            const url = message.guild.bannerURL({ size: 4096, extension: 'png' });
            if (!url) return message.channel.send({ embeds: [createEmbed(await t('server.no_banner', message.guild.id), '', 'error')] });
            const embed = createEmbed((await t('server.banner_title', message.guild.id)), '', 'info');
            embed.setImage(url);
            return message.channel.send({ embeds: [embed] });
        }

        // --- IMPROVED DEFAULT DISPLAY ---
        const embed = createEmbed(
            await t('server.title', message.guild.id),
            await t('server.description', message.guild.id),
            'info'
        );
        
        embed.addFields(
            { name: '🖼️ Icon', value: `\`+server pic\``, inline: true },
            { name: '🚩 Banner', value: `\`+server banner\``, inline: true },
            { name: 'ℹ️ Info', value: `\`+server info\``, inline: true }
        );
        
        if (await isBotOwner(message.author.id)) {
            embed.addFields({ name: '👑 Owner', value: `\`+server list\``, inline: true });
        }
        
        return message.channel.send({ embeds: [embed] });
    }
};
