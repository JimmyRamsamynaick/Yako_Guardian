const Form = require('../../database/models/Form');
const { sendV2Message, createV2Payload } = require('../../utils/componentUtils');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: 'formulaire',
    description: 'Système de formulaires interactifs',
    category: 'Modmail',
    async run(client, message, args) {
        if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId) {
            return sendV2Message(client, message.channel.id, "❌ Permission Administrateur requise.", []);
        }

        const sub = args[0] ? args[0].toLowerCase() : null;
        const formId = args[1];

        if (!sub) {
            return sendV2Message(client, message.channel.id, 
                "**📝 SYSTÈME DE FORMULAIRES**\n\n" +
                "`+formulaire create <id>` : Créer un formulaire interactif.\n" +
                "`+formulaire delete <id>` : Supprimer un formulaire.\n" +
                "`+formulaire list` : Voir les formulaires.\n" +
                "`+formulaire post <id> [salon]` : Poster le bouton du formulaire.", 
                []
            );
        }

        if (sub === 'create') {
            if (!formId) return sendV2Message(client, message.channel.id, "❌ Précisez un ID unique pour ce formulaire (ex: `recrutement`).", []);
            
            const existing = await Form.findOne({ guild_id: message.guild.id, form_id: formId });
            if (existing) return sendV2Message(client, message.channel.id, "❌ Un formulaire avec cet ID existe déjà.", []);

            // Start creation flow via Button -> Modal
            // We can't open a Modal from a Message directly (needs interaction).
            // So we send a button "Configurer le formulaire".
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_config_${formId}`).setLabel('Configurer le Formulaire').setStyle(ButtonStyle.Primary)
            );

            return sendV2Message(client, message.channel.id, `Cliquez ci-dessous pour configurer le formulaire **${formId}**.`, [row]);
        }

        if (sub === 'delete') {
            if (!formId) return sendV2Message(client, message.channel.id, "❌ Précisez l'ID du formulaire.", []);
            await Form.deleteOne({ guild_id: message.guild.id, form_id: formId });
            return sendV2Message(client, message.channel.id, `✅ Formulaire **${formId}** supprimé.`, []);
        }

        if (sub === 'list') {
            const forms = await Form.find({ guild_id: message.guild.id });
            if (forms.length === 0) return sendV2Message(client, message.channel.id, "Aucun formulaire.", []);
            
            const list = forms.map(f => `- **${f.form_id}**: ${f.title} (${f.questions.length} questions)`).join('\n');
            return sendV2Message(client, message.channel.id, `**Formulaires:**\n${list}`, []);
        }

        if (sub === 'post') {
            if (!formId) return sendV2Message(client, message.channel.id, "❌ Précisez l'ID du formulaire.", []);
            const form = await Form.findOne({ guild_id: message.guild.id, form_id: formId });
            if (!form) return sendV2Message(client, message.channel.id, "❌ Formulaire introuvable.", []);

            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]) || message.channel;

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_start_${formId}`).setLabel(form.title).setStyle(ButtonStyle.Success).setEmoji('📝')
            );

            await targetChannel.send({ content: `**${form.title}**\nCliquez ci-dessous pour remplir le formulaire.`, components: [row] });
            return sendV2Message(client, message.channel.id, `✅ Formulaire posté dans ${targetChannel}.`, []);
        }
    }
};