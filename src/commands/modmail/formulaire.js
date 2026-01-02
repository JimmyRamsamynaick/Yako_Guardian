const Form = require('../../database/models/Form');
const { sendV2Message, createV2Payload } = require('../../utils/componentUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { t } = require('../../utils/i18n');

module.exports = {
    name: 'formulaire',
    description: 'Système de formulaires interactifs',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, await t('formulaire.permission', message.guild.id), []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;
        const formId = args[1];

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                await t('formulaire.usage', message.guild.id), 
                []
            );
        }

        if (sub === 'create') {
            if (!formId) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.missing_id', message.guild.id), []);
            
            const existing = await Form.findOne({ guild_id: message.guild.id, form_id: formId });
            if (existing) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.exists', message.guild.id), []);

            // Start creation flow via Button -> Modal
            // We can't open a Modal from a Message directly (needs interaction).
            // So we send a button "Configurer le formulaire".
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_config_${formId}`).setLabel(await t('modmail.formulaire.btn_config', message.guild.id)).setStyle(ButtonStyle.Primary)
            );

            return sendV2Message(client, message.channel.id, await t('modmail.formulaire.config_msg', message.guild.id, { id: formId }), [row]);
        }

        if (sub === 'delete') {
            if (!formId) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.missing_id', message.guild.id), []);
            await Form.deleteOne({ guild_id: message.guild.id, form_id: formId });
            return sendV2Message(client, message.channel.id, await t('modmail.formulaire.deleted', message.guild.id, { id: formId }), []);
        }

        if (sub === 'list') {
            const forms = await Form.find({ guild_id: message.guild.id });
            if (forms.length === 0) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.list_empty', message.guild.id), []);
            
            const list = forms.map(f => `- **${f.form_id}**: ${f.title} (${f.questions.length} questions)`).join('\n');
            return sendV2Message(client, message.channel.id, await t('modmail.formulaire.list_title', message.guild.id, { list }), []);
        }

        if (sub === 'post') {
            if (!formId) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.missing_id', message.guild.id), []);
            const form = await Form.findOne({ guild_id: message.guild.id, form_id: formId });
            if (!form) return sendV2Message(client, message.channel.id, await t('modmail.formulaire.not_found', message.guild.id), []);

            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]) || message.channel;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_start_${formId}`).setLabel(form.title).setStyle(ButtonStyle.Success).setEmoji('📝')
            );

            await targetChannel.send({ content: await t('modmail.formulaire.post_content', message.guild.id, { title: form.title }), components: [row] });
            return sendV2Message(client, message.channel.id, await t('modmail.formulaire.posted', message.guild.id, { channel: targetChannel }), []);
        }
    }
};