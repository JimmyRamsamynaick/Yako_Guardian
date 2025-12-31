const { sendV2Message } = require('../../utils/componentUtils');

module.exports = {
    name: 'unmassiverole',
    description: 'Retirer un rôle à tous les membres',
    category: 'Rôles',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission Administrateur requise.", []);
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const type = args[1] ? args[1].toLowerCase() : 'all'; // all, humans, bots

        if (!role) {
            return sendV2Message(client, message.channel.id, "**Utilisation:** `+unmassiverole <@role> [all/humans/bots]`", []);
        }

        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Rôle trop élevé.", []);
        }

        await sendV2Message(client, message.channel.id, `⏳ Retrait du rôle ${role.name} en cours...`, []);

        let members;
        await message.guild.members.fetch();

        if (type === 'humans') {
            members = message.guild.members.cache.filter(m => !m.user.bot && m.roles.cache.has(role.id));
        } else if (type === 'bots') {
            members = message.guild.members.cache.filter(m => m.user.bot && m.roles.cache.has(role.id));
        } else {
            members = message.guild.members.cache.filter(m => m.roles.cache.has(role.id));
        }

        let count = 0;
        let errors = 0;

        for (const [id, member] of members) {
            try {
                await member.roles.remove(role);
                count++;
                await new Promise(r => setTimeout(r, 200)); 
            } catch (e) {
                errors++;
            }
        }

        sendV2Message(client, message.channel.id, `✅ Terminé ! Rôle retiré à ${count} membres. (Échecs: ${errors})`, []);
    }
};