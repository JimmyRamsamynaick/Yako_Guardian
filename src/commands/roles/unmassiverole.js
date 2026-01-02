const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'unmassiverole',
    description: 'Retirer un rôle à tous les membres',
    category: 'Rôles',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.permission_admin', message.guild.id), '', 'error')] });
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const type = args[1] ? args[1].toLowerCase() : 'all'; // all, humans, bots

        if (!role) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.unmassiverole.usage', message.guild.id), '', 'error')] });
        }

        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.role_too_high', message.guild.id), '', 'error')] });
        }

        await message.channel.send({ embeds: [createEmbed(await t('roles.unmassiverole.processing', message.guild.id, { role: role.name }), '', 'info')] });

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

        message.channel.send({ embeds: [createEmbed(await t('roles.unmassiverole.success', message.guild.id, { count: count, errors: errors }), '', 'success')] });
    }
};