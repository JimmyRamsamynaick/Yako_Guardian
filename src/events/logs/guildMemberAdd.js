const { sendLog } = require('../../utils/logManager');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'guildMemberAdd',
    async execute(client, member) {
        const description = await t('logs.descriptions.member_join', member.guild.id, { member: member, tag: member.user.tag });
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 1000 / 60 / 60 / 24);
        
        const fields = [
            { name: await t('logs.fields.account_age', member.guild.id), value: await t('logs.fields.days', member.guild.id, { count: accountAge }), inline: true },
            { name: await t('logs.fields.id', member.guild.id), value: member.id, inline: true }
        ];
        
        sendLog(member.guild, await t('logs.titles.member_join', member.guild.id), description, '#00FF00', fields, member.user);
    }
};
