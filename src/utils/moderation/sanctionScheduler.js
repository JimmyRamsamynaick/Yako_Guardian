const Sanction = require('../../database/models/Sanction');
const { getGuildConfig } = require('../mongoUtils');
const logger = require('../logger');

const checkSanctions = async (client) => {
    try {
        const expiredSanctions = await Sanction.find({
            active: true,
            expiresAt: { $lt: new Date() }
        });

        for (const sanction of expiredSanctions) {
            const guild = client.guilds.cache.get(sanction.guildId);
            if (!guild) continue;

            if (sanction.type === 'tempban') {
                await guild.members.unban(sanction.userId, await t('sanction.expired_tempban', guild.id)).catch(err => logger.error(`Failed to unban ${sanction.userId} in ${guild.name}: ${err.message}`));
            } else if (sanction.type === 'tempmute') {
                // Remove Mute Role if exists
                const config = await getGuildConfig(guild.id);
                const roleId = config.moderation?.muteRole;
                if (roleId) {
                    const member = await guild.members.fetch(sanction.userId).catch(() => null);
                    if (member) {
                        await member.roles.remove(roleId, await t('sanction.expired_tempmute', guild.id)).catch(err => logger.error(`Failed to remove mute role from ${sanction.userId} in ${guild.name}: ${err.message}`));
                    }
                }
            } else if (sanction.type === 'tempcmute') {
                // Remove Channel Mute
                const channel = guild.channels.cache.get(sanction.channelId);
                if (channel) {
                    const member = await guild.members.fetch(sanction.userId).catch(() => null);
                    if (member) {
                         await channel.permissionOverwrites.delete(member, await t('sanction.expired_tempcmute', guild.id)).catch(err => logger.error(`Failed to remove tempcmute from ${sanction.userId} in ${guild.name}: ${err.message}`));
                    }
                }
            }

            sanction.active = false;
            await sanction.save();
        }
    } catch (err) {
        logger.error('Error in sanction scheduler:', err);
    }
};

module.exports = { checkSanctions };
