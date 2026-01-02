const { GuildMember } = require('discord.js');

/**
 * Resolves a single member from a string (ID, Mention, Username, Tag)
 * @param {Guild} guild 
 * @param {string} text 
 * @returns {Promise<GuildMember|null>}
 */
async function resolveMember(guild, text) {
    if (!text) return null;
    text = text.trim();

    // 1. Mention
    const mentionMatch = text.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        return await guild.members.fetch(mentionMatch[1]).catch(() => null);
    }

    // 2. ID
    if (text.match(/^\d{17,19}$/)) {
        return await guild.members.fetch(text).catch(() => null);
    }

    // 3. Username / Tag / Nickname (Query)
    // This is more expensive and less accurate, but required.
    try {
        const results = await guild.members.fetch({ query: text, limit: 1 });
        return results.first() || null;
    } catch (e) {
        return null;
    }
}

/**
 * Resolves members from args handling ",," separator
 * @param {Message} message 
 * @param {string[]} args 
 * @returns {Promise<{members: GuildMember[], reason: string}>}
 */
async function resolveMembers(message, args) {
    const fullContent = args.join(' ');
    const members = [];
    let reason = '';

    if (!fullContent.includes(',,')) {
        // Single member fallback (standard behavior)
        // We try to resolve the first arg as a member.
        // If successful, the rest is reason.
        
        // Special case: if args[0] is not a valid member, we might return empty.
        // But the legacy command usually does: mentions.first() || fetch(args[0])
        
        const firstArg = args[0];
        let member = message.mentions.members.first();
        
        if (!member && firstArg) {
            member = await resolveMember(message.guild, firstArg);
        }

        if (member) {
            members.push(member);
            // Reason is everything after the resolved member text in fullContent
            // This is hard to slice perfectly if we used fuzzy search.
            // Simple approach: args.slice(1).join(' ')
            
            // Check if the member was found via mention or ID (args[0])
            // If found via name (which might be multiple args), it's harder.
            
            // For safety in single-mode, we stick to "First Arg is Member" logic usually.
            // But if "User Name" is used, it takes 2 args.
            
            // Let's trust our resolveMember with query. It uses the whole string if needed?
            // No, fetch query uses the string passed.
            
            // If the user typed "+warn User Name Reason", and we pass "User", we might find "User Name".
            
            // Let's simplify:
            // If no `,,`, we assume standard behavior: Arg 0 is member, rest is reason.
            // Unless the user explicitly quoted the name? No.
            
            reason = args.slice(1).join(' ');
        }
    } else {
        // Multi-member mode
        // Split by ',,'
        // Example: "User1,, User2,, Reason" -> ["User1", "User2", "Reason"]
        // Example: "User1,, User2 Reason" -> ["User1", "User2 Reason"]
        
        const parts = fullContent.split(',,').map(s => s.trim()).filter(s => s);
        
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            
            // If it's the last part, it might contain the reason.
            if (i === parts.length - 1) {
                // Try to resolve the whole part
                let member = await resolveMember(message.guild, part);
                if (member) {
                    members.push(member);
                    // No reason, or reason is implicit?
                } else {
                    // Try to split part into Member + Reason
                    // We iterate words from the beginning
                    const words = part.split(/\s+/);
                    let found = false;
                    
                    // Try to find the longest prefix that matches a member
                    // Actually, usually the member is the first "token" or "quoted string".
                    // But with names...
                    
                    // Let's try a simple heuristic:
                    // If the part starts with a mention or ID, it's easy.
                    // If it starts with a name...
                    
                    // Reverse strategy: Try to resolve the first word. If fail, first 2 words...
                    for (let j = words.length; j > 0; j--) {
                        const potentialName = words.slice(0, j).join(' ');
                        member = await resolveMember(message.guild, potentialName);
                        if (member) {
                            members.push(member);
                            reason = words.slice(j).join(' ');
                            found = true;
                            break;
                        }
                    }
                    
                    if (!found) {
                        // If we still didn't find a member, maybe this entire last part IS the reason?
                        // But then where is the last member?
                        // "User1,, Reason" -> User1 found. "Reason" is just reason.
                        // So if we fail to find a member in the last part, we treat it as reason.
                        reason = part;
                    }
                }
            } else {
                // Not the last part, MUST be a member
                const member = await resolveMember(message.guild, part);
                if (member) {
                    members.push(member);
                }
            }
        }
    }

    return { members, reason: reason || await t('common.reason_none', message.guild.id) };
}

module.exports = { resolveMembers, resolveMember };
