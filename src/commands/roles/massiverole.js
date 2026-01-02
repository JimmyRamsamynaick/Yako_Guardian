const { t } = require('../../utils/i18n');
const { createEmbed } = require('../../utils/design');

module.exports = {
    name: 'massiverole',
    description: 'Ajouter ou retirer un rôle à tous les membres',
    category: 'Rôles',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.permission_admin', message.guild.id), '', 'error')] });
        }

        let action = 'add';
        let roleArgIndex = 0;

        if (args[0] && ['add', 'remove'].includes(args[0].toLowerCase())) {
            action = args[0].toLowerCase();
            roleArgIndex = 1;
        }

        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[roleArgIndex]);
        const type = args[roleArgIndex + 1] ? args[roleArgIndex + 1].toLowerCase() : 'all'; // all, humans, bots

        if (!role) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.usage', message.guild.id), '', 'error')] });
        }

        // Check hierarchy
        if (role.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
            return message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.role_too_high', message.guild.id), '', 'error')] });
        }

        if (action === 'add') {
             await message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.processing_add', message.guild.id, { role: role.name }), '', 'info')] });
        } else {
             await message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.processing_remove', message.guild.id, { role: role.name }), '', 'info')] });
        }

        let members;
        await message.guild.members.fetch(); // Ensure cache is full

        if (type === 'humans') {
            members = message.guild.members.cache.filter(m => !m.user.bot);
        } else if (type === 'bots') {
            members = message.guild.members.cache.filter(m => m.user.bot);
        } else {
            members = message.guild.members.cache;
        }

        // Filter based on action
        if (action === 'add') {
            members = members.filter(m => !m.roles.cache.has(role.id));
        } else {
            members = members.filter(m => m.roles.cache.has(role.id));
        }

        let count = 0;
        let errors = 0;

        // Process in chunks to avoid rate limits
        for (const [id, member] of members) {
            try {
                if (action === 'add') {
                    await member.roles.add(role);
                } else {
                    await member.roles.remove(role);
                }
                count++;
                // Small delay to be safe
                await new Promise(r => setTimeout(r, 200)); 
            } catch (e) {
                errors++;
            }
        }

        if (action === 'add') {
             message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.success_add', message.guild.id, { count: count, errors: errors }), '', 'success')] });
        } else {
             message.channel.send({ embeds: [createEmbed(await t('roles.massiverole.success_remove', message.guild.id, { count: count, errors: errors }), '', 'success')] });
        }
    }
};