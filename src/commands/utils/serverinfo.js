const { ChannelType } = require('discord.js');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'serverinfo',
    description: 'Informations complètes du serveur',
    category: 'Utils',
    async run(client, message, args) {
        const guild = message.guild;
        const owner = await guild.fetchOwner();
        
        // --- General Info ---
        const generalInfo = [
            await t('serverinfo.name', message.guild.id, { name: guild.name }),
            await t('serverinfo.id', message.guild.id, { id: guild.id }),
            await t('serverinfo.owner', message.guild.id, { tag: `${owner.user.tag} (${owner.id})` }),
            await t('serverinfo.created', message.guild.id, { date: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` }),
            await t('serverinfo.security', message.guild.id, { level: guild.verificationLevel })
        ].join('\n');

        // --- Statistics ---
        const statsInfo = [
            await t('serverinfo.members', message.guild.id, { count: guild.memberCount }),
            await t('serverinfo.channels', message.guild.id, { total: guild.channels.cache.size, text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size, voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size }),
            await t('serverinfo.roles', message.guild.id, { count: guild.roles.cache.size }),
            await t('serverinfo.emojis', message.guild.id, { count: guild.emojis.cache.size }),
            await t('serverinfo.boosts', message.guild.id, { count: guild.premiumSubscriptionCount, level: guild.premiumTier })
        ].join('\n');

        // --- Configuration ---
        const configInfo = [];
        if (guild.vanityURLCode) configInfo.push(await t('serverinfo.vanity', message.guild.id, { url: `discord.gg/${guild.vanityURLCode}` }));
        if (guild.rulesChannel) configInfo.push(await t('serverinfo.rules', message.guild.id, { channel: guild.rulesChannel.toString() }));
        if (guild.systemChannel) configInfo.push(await t('serverinfo.system', message.guild.id, { channel: guild.systemChannel.toString() }));
        if (guild.afkChannel) configInfo.push(await t('serverinfo.afk', message.guild.id, { channel: guild.afkChannel.toString(), timeout: guild.afkTimeout }));
        
        // --- Links ---
        const links = [];
        if (guild.iconURL()) links.push(`[${await t('serverinfo.link_icon', message.guild.id)}](${guild.iconURL({ size: 1024 })})`);
        if (guild.bannerURL()) links.push(`[${await t('serverinfo.link_banner', message.guild.id)}](${guild.bannerURL({ size: 1024 })})`);
        if (guild.splashURL()) links.push(`[${await t('serverinfo.link_splash', message.guild.id)}](${guild.splashURL({ size: 1024 })})`);
        
        const linksStr = links.length > 0 ? await t('serverinfo.links', message.guild.id, { links: links.join(' | ') }) : null;
        if (linksStr) configInfo.push(`\n${linksStr}`);

        // --- Features ---
        // Improve readability of features
        const featureMap = {
            COMMUNITY: 'Community',
            PARTNERED: 'Partnered',
            VERIFIED: 'Verified',
            DISCOVERABLE: 'Discoverable',
            FEATURABLE: 'Featurable',
            INVITE_SPLASH: 'Invite Splash',
            BANNER: 'Banner',
            VANITY_URL: 'Vanity URL',
            ANIMATED_ICON: 'Animated Icon',
            ANIMATED_BANNER: 'Animated Banner',
            ROLE_ICONS: 'Role Icons',
            TICKETED_EVENTS_ENABLED: 'Ticketed Events',
            MONETIZATION_ENABLED: 'Monetization',
            MORE_STICKERS: 'More Stickers',
            THREE_DAY_THREAD_ARCHIVE: '3 Day Thread Archive',
            SEVEN_DAY_THREAD_ARCHIVE: '7 Day Thread Archive',
            PRIVATE_THREADS: 'Private Threads',
            NEWS: 'News Channels'
        };

        const features = guild.features.map(f => featureMap[f] || f).slice(0, 15); // Limit to 15 to avoid huge lists
        const featuresStr = features.length > 0 ? features.join(', ') : await t('serverinfo.none', message.guild.id);
        if (guild.features.length > 15) featuresStr += ` (+${guild.features.length - 15}...)`;


        const embed = createEmbed(
            await t('serverinfo.title', message.guild.id, { name: guild.name }),
            '',
            'info'
        );

        embed.addFields(
            { name: await t('serverinfo.section_general', message.guild.id), value: generalInfo, inline: false },
            { name: await t('serverinfo.section_stats', message.guild.id), value: statsInfo, inline: false }
        );

        if (configInfo.length > 0) {
            embed.addFields({ name: await t('serverinfo.section_config', message.guild.id), value: configInfo.join('\n'), inline: false });
        }
        
        if (features.length > 0) {
             embed.addFields({ name: await t('serverinfo.section_features', message.guild.id), value: `\`${featuresStr}\``, inline: false });
        }

        embed.setThumbnail(guild.iconURL({ dynamic: true, size: 512 }));
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await message.channel.send({ embeds: [embed] });
    }
};
