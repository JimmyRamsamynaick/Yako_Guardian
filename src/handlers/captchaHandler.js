const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { getGuildConfig } = require('../utils/mongoUtils');
const { t } = require('../utils/i18n');
const { createEmbed } = require('../utils/design');

module.exports = {
    handleCaptchaInteraction: async (client, interaction) => {
        const { customId, user } = interaction;
        const parts = customId.split('_');
        const action = parts[1]; // start or submit
        const guildId = parts[2];
        const param = parts[3]; // diff (for start) or answer (for submit)

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return interaction.reply({ embeds: [createEmbed('❌ Guild not found.', '', 'error')], ephemeral: true });
        
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ embeds: [createEmbed('❌ You are not in this server.', '', 'error')], ephemeral: true });

        // Action: Start (Button Click)
        if (action === 'start') {
            const diff = param;
            if (diff === 'easy') {
                // Easy = Instant verify
                await verifyMember(client, interaction, member, guild);
            } else {
                // Medium/Hard = Modal
                const isHard = (diff === 'hard');
                const num1 = Math.floor(Math.random() * (isHard ? 50 : 10)) + 1;
                const num2 = Math.floor(Math.random() * (isHard ? 50 : 10)) + 1;
                const answer = num1 + num2;

                const modal = new ModalBuilder()
                    .setCustomId(`captcha_submit_${guildId}_${answer}`)
                    .setTitle('Captcha Verification');

                const input = new TextInputBuilder()
                    .setCustomId('captcha_answer')
                    .setLabel(`Combien font ${num1} + ${num2} ?`)
                    .setPlaceholder('Answer...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(input);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }
        } 
        // Action: Submit (Modal Submit)
        else if (action === 'submit') {
            const correctAnswer = param; 
            const userAnswer = interaction.fields.getTextInputValue('captcha_answer');

            if (userAnswer.trim() === correctAnswer) {
                await verifyMember(client, interaction, member, guild);
            } else {
                await interaction.reply({ embeds: [createEmbed('❌ Incorrect answer. Try again by clicking the button again.', '', 'error')], ephemeral: true });
            }
        }
    }
};

async function verifyMember(client, interaction, member, guild) {
    const config = await getGuildConfig(guild.id);
    
    // 1. Captcha Role
    if (config.security?.captcha?.roleId) {
        const role = guild.roles.cache.get(config.security.captcha.roleId);
        if (role) {
            await member.roles.add(role).catch(() => {});
        }
    }

    // 2. Welcome Role (Deferred Autorole)
    if (config.welcome?.roleId) {
        const role = guild.roles.cache.get(config.welcome.roleId);
        if (role) {
            await member.roles.add(role).catch(() => {});
        }
    }

    await interaction.reply({ embeds: [createEmbed(`✅ **Vérification réussie !** Bienvenue sur ${guild.name}.`, '', 'success')], ephemeral: true });
    
    // 3. Welcome Channel Message (Delayed)
    if (config.welcome?.enabled && config.welcome.channelId) {
         const channel = guild.channels.cache.get(config.welcome.channelId);
         if (channel && channel.isTextBased()) {
             let message = config.welcome.message || "Bienvenue {user} !";
             message = message
                 .replace(/{user}/g, member.toString())
                 .replace(/{server}/g, guild.name)
                 .replace(/{count}/g, guild.memberCount.toString());
             
             await channel.send({ embeds: [createEmbed(message, '', 'success')] });
         }
    }
    
    // 4. Welcome DM (Delayed)
    if (config.welcome?.dm) {
        try {
           let message = config.welcome.message || `Bienvenue sur ${guild.name} !`;
           message = message
               .replace(/{user}/g, member.toString())
               .replace(/{server}/g, guild.name)
               .replace(/{count}/g, guild.memberCount.toString());
           await member.send(message);
        } catch(e) {}
    }
}
