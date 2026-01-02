const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'user',
    description: 'Informations globales d’un utilisateur',
    category: 'Utils',
    async run(client, message, args) {
        const userId = args[0]?.replace(/[<@!>]/g, '') || message.author.id;
        let user;
        try {
            user = await client.users.fetch(userId, { force: true });
        } catch {
            return message.channel.send({ embeds: [createEmbed(await t('userinfo.not_found', message.guild.id), '', 'error')] });
        }

        // Try to fetch member in current guild
        let member = null;
        try {
            member = await message.guild.members.fetch(userId).catch(() => null);
        } catch {}

        // Mutual Servers
        const mutualGuilds = [];
        for (const [id, guild] of client.guilds.cache) {
            if (guild.members.cache.has(user.id)) {
                mutualGuilds.push(guild.name);
            }
        }
        const mutualCount = mutualGuilds.length;
        const mutualList = mutualGuilds.slice(0, 5).join(', ') + (mutualCount > 5 ? ` (+${mutualCount - 5})` : '');

        // Badges
        const flags = user.flags.toArray();
        const flagMap = {
            Staff: 'Discord Staff',
            Partner: 'Partner',
            Hypesquad: 'HypeSquad Events',
            BugHunterLevel1: 'Bug Hunter I',
            BugHunterLevel2: 'Bug Hunter II',
            HypeSquadOnlineHouse1: 'Bravery',
            HypeSquadOnlineHouse2: 'Brilliance',
            HypeSquadOnlineHouse3: 'Balance',
            PremiumEarlySupporter: 'Early Supporter',
            TeamPseudoUser: 'Team User',
            VerifiedBot: 'Verified Bot',
            VerifiedDeveloper: 'Verified Dev',
            CertifiedModerator: 'Moderator',
            BotHTTPInteractions: 'HTTP Interactions',
            ActiveDeveloper: 'Active Dev'
        };
        const badges = flags.length ? flags.map(f => flagMap[f] || f).join(', ') : await t('userinfo.none', message.guild.id);

        // Links
        const links = [
            `[${await t('userinfo.avatar_link', message.guild.id)}](${user.displayAvatarURL({ size: 1024 })})`,
            user.banner ? `[${await t('userinfo.banner_link', message.guild.id)}](${user.bannerURL({ size: 1024 })})` : null
        ].filter(Boolean).join(' | ');

        // General Info Construction
        const generalInfo = [
            await t('userinfo.tag', message.guild.id, { tag: user.tag }),
            await t('userinfo.id', message.guild.id, { id: user.id }),
            await t('userinfo.created', message.guild.id, { date: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>` }),
            await t('userinfo.badges', message.guild.id, { badges: badges }),
            await t('userinfo.mutual_servers', message.guild.id, { count: mutualCount, guilds: mutualList || await t('userinfo.none', message.guild.id) }),
            await t('userinfo.bot', message.guild.id, { isBot: user.bot ? await t('userinfo.yes', message.guild.id) : await t('userinfo.no', message.guild.id) }),
            `\n🔗 ${links}`
        ].join('\n');

        const embed = createEmbed(
            await t('userinfo.title', message.guild.id, { username: user.username }),
            '', // We will use fields, but general info can go here or in a field. Let's use a field for structure.
            'info'
        );

        embed.addFields({ name: await t('userinfo.section_general', message.guild.id), value: generalInfo });

        // Server Info (if member)
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.id !== message.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => r.toString())
                .slice(0, 10);
            
            const rolesDisplay = roles.length ? roles.join(', ') + (member.roles.cache.size > 11 ? ` (+${member.roles.cache.size - 11})` : '') : await t('userinfo.none', message.guild.id);

            const serverInfo = [
                await t('userinfo.joined', message.guild.id, { date: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` }),
                await t('userinfo.roles', message.guild.id, { count: member.roles.cache.size - 1, roles: rolesDisplay })
            ].join('\n');

            embed.addFields({ name: await t('userinfo.section_server', message.guild.id), value: serverInfo });
        }

        embed.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }));
        if (user.banner) {
            embed.setImage(user.bannerURL({ size: 1024 }));
        }

        await message.channel.send({ embeds: [embed] });
    }
};
