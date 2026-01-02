const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const UserStrike = require('../../database/models/UserStrike');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'strikes',
    description: 'Affiche les strikes (avertissements) d\'un membre',
    category: 'Moderation',
    aliases: ['warnings', 'warns'],
    usage: 'strikes [user]',
    async run(client, message, args) {
        let target;
        if (args[0]) {
            if (message.mentions.users.size > 0) target = message.mentions.users.first();
            else target = await client.users.fetch(args[0]).catch(() => null);
        } else {
            target = message.author;
        }

        if (!target) return sendV2Message(client, message.channel.id, "❌ Utilisateur introuvable.", []);

        // Permission check: You can view your own, but need Perms to view others
        if (target.id !== message.author.id && !message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
             return sendV2Message(client, message.channel.id, "❌ Vous ne pouvez voir que vos propres avertissements.", []);
        }

        const data = await UserStrike.findOne({ guildId: message.guild.id, userId: target.id });
        
        if (!data || !data.strikes || data.strikes.length === 0) {
            return sendV2Message(client, message.channel.id, `✅ **${target.tag}** n'a aucun avertissement.`, []);
        }

        const embed = new EmbedBuilder()
            .setTitle(`Sanctions: ${target.tag}`)
            .setColor('#ff9900')
            .setThumbnail(target.displayAvatarURL())
            .setFooter({ text: `Total: ${data.strikes.length} strikes` });

        // Show last 10
        const recent = data.strikes.slice(-10).reverse();
        
        let desc = "";
        recent.forEach((s, i) => {
            const date = new Date(s.timestamp).toLocaleDateString();
            desc += `**#${data.strikes.length - i}** - \`${date}\`\nReason: ${s.reason}\nType: \`${s.type}\`\n\n`;
        });

        embed.setDescription(desc);

        return sendV2Message(client, message.channel.id, "", [embed]);
    }
};
