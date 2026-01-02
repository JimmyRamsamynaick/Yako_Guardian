const { sendLog } = require('../../utils/logManager');
const { t } = require('../../utils/lang');

module.exports = {
    name: 'guildMemberRemove',
    async execute(client, member) {
        const description = await t('logs.descriptions.member_leave', member.guild.id, { member: member, tag: member.user.tag });
        
        const fields = [
            { name: await t('logs.fields.id', member.guild.id), value: member.id, inline: true }
        ];
        
        sendLog(member.guild, await t('logs.titles.member_leave', member.guild.id), description, '#FF0000', fields, member.user);
    }
};
