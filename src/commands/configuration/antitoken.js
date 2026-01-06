const { db } = require('../../database');
const ms = require('ms');
const { createEmbed } = require('../../utils/design');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'antitoken',
    description: 'Protège le serveur contre les raids de tokens (faux comptes)',
    category: 'Antiraid',
    run: async (client, message, args) => {
        const { getGuildConfig } = require('../../utils/mongoUtils'); // Need this to get config state
        const config = await getGuildConfig(message.guild.id);
        
        if (!config.settings) config.settings = {}; // Assuming structure, checking db update below uses 'guild_settings' table direct update?
        // Wait, the code uses db.prepare UPDATE guild_settings directly.
        // I need to fetch current state to display it.
        // Let's use the db object already imported.
        
        const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(message.guild.id);
        const currentLevel = settings?.antitoken_level || 'off';
        const limit = settings?.antitoken_limit || 0;
        const time = settings?.antitoken_time || 0;
        
        if (!args[0]) {
            const status = currentLevel === 'off' ? '❌ OFF' : (currentLevel === 'lock' ? '🔒 LOCK' : '✅ ON');
            const limitStr = (limit > 0 && time > 0) ? `${limit}/${ms(time)}` : 'Non défini';
            
            const description = (await t('antitoken.menu_description', message.guild.id))
                .replace('{status}', status)
                .replace('{limit}', limitStr);

            return message.channel.send({ embeds: [createEmbed(
                await t('antitoken.menu_title', message.guild.id),
                description,
                'info'
            )] });
        }

        const arg = args[0].toLowerCase();

        if (['on', 'off', 'lock'].includes(arg)) {
            db.prepare('UPDATE guild_settings SET antitoken_level = ? WHERE guild_id = ?').run(arg, message.guild.id);
            return message.channel.send({ embeds: [createEmbed(await t('antitoken.state_success', message.guild.id, { state: arg }), '', 'success')] });
        }

        // Handle limit configuration: 5/10s
        if (arg.includes('/')) {
            const [count, duration] = arg.split('/');
            const timeMs = ms(duration);
            
            if (!count || !timeMs) return message.channel.send({ embeds: [createEmbed(await t('antitoken.invalid_format', message.guild.id), '', 'error')] });

            db.prepare('UPDATE guild_settings SET antitoken_limit = ?, antitoken_time = ? WHERE guild_id = ?')
              .run(parseInt(count), timeMs, message.guild.id);
            
            return message.channel.send({ embeds: [createEmbed(await t('antitoken.config_success', message.guild.id, { count, duration }), '', 'success')] });
        }
    }
};
