const { PermissionsBitField } = require('discord.js');
const { getGuildConfig } = require('../../utils/mongoUtils');
const { t } = require('../../utils/i18n');
const { sendV2Message } = require('../../utils/componentUtils');
const ms = require('ms'); // Ensure ms is installed, usually is. If not, simple parser.

module.exports = {
    name: 'antispam',
    description: 'Configure le système anti-spam',
    category: 'Moderation',
    usage: 'antispam <on/off> ou <limit>/<time>',
    async run(client, message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return sendV2Message(client, message.channel.id, await t('common.admin_only', message.guild.id), []);
        }

        const config = await getGuildConfig(message.guild.id);
        if (!config.moderation) config.moderation = {};
        if (!config.moderation.antispam) config.moderation.antispam = { enabled: false, limit: 5, time: 5000 };

        const arg = args[0]?.toLowerCase();

        if (!arg) {
             return sendV2Message(client, message.channel.id, await t('antispam.usage', message.guild.id), []);
        }

        if (['on', 'off'].includes(arg)) {
            config.moderation.antispam.enabled = (arg === 'on');
            config.markModified('moderation');
            await config.save();
            return sendV2Message(client, message.channel.id, await t('antispam.success_state', message.guild.id, { status: arg.toUpperCase() }), []);
        }

        // Parse 5/5s
        if (arg.includes('/')) {
            const [limitStr, timeStr] = arg.split('/');
            const limit = parseInt(limitStr);
            
            // Basic time parser if ms not avail, but let's try assuming standard format
            // If user types "5s", we need to parse it.
            // Let's implement a simple time parser if needed, or assume ms package is there.
            // Looking at other files, `slowmode.js` might have time parsing.
            // Let's stick to simple regex for now.
            
            let time = 5000;
            const match = timeStr.match(/^(\d+)(s|m|h)?$/);
            if (match) {
                const val = parseInt(match[1]);
                const unit = match[2] || 's';
                if (unit === 's') time = val * 1000;
                else if (unit === 'm') time = val * 60 * 1000;
                else if (unit === 'h') time = val * 3600 * 1000;
            } else {
                 return sendV2Message(client, message.channel.id, await t('antispam.invalid_time', message.guild.id), []);
            }

            if (isNaN(limit) || limit < 1) return sendV2Message(client, message.channel.id, await t('antispam.invalid_limit', message.guild.id), []);

            config.moderation.antispam.limit = limit;
            config.moderation.antispam.time = time;
            config.moderation.antispam.enabled = true; // Auto enable on config
            config.markModified('moderation');
            await config.save();

            return sendV2Message(client, message.channel.id, await t('antispam.success_config', message.guild.id, { limit, time: timeStr }), []);
        }

        return sendV2Message(client, message.channel.id, await t('antispam.usage', message.guild.id), []);
    }
};
