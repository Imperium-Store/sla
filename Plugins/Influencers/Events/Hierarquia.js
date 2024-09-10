const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const config = require(path.join(__dirname, "..", "Config.json"));

const hierarquiaChannelId = config.hierarchyChannel;
const hierarquiaRoles = config.hierarchyRoles;

const clearChannelMessages = async (channel) => {
    let fetched;
    do {
        fetched = await channel.messages.fetch({ limit: 100 });
        const deletableMessages = fetched.filter(msg => (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);
        if (deletableMessages.size === 0) break;
        try {
            await channel.bulkDelete(deletableMessages, true);
        } catch (error) {
            deletableMessages.forEach(async (msg) => {
                try {
                    await msg.delete();
                } catch (individualError) {

                }
            });
        }
    } while (fetched.size >= 2);
}

const createHierarchyEmbeds = async (guild) => {
    const embeds = [];
    const maxCharacters = 4000;

    for (const roleId of hierarquiaRoles) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;

        const membersWithRole = role.members.map(member => `<@${member.id}>`);
        let embedDescription = `# <@&${role.id}>\n\n`;

        for (let i = 0; i < membersWithRole.length; i += 1) {
            if ((embedDescription.length + membersWithRole[i].length) > maxCharacters) {
                embeds.push(new EmbedBuilder()
                    .setDescription(embedDescription)
                    .setColor(0x19d3e6));
                embedDescription = '';
            }
            embedDescription += membersWithRole[i] + '\n';
        }

        if (embedDescription.length > 0) {
            embeds.push(new EmbedBuilder()
                .setDescription(embedDescription)
                .setColor(0x19d3e6));
        }
    }

    return embeds;
}

const updateHierarchy = async (client) => {
    try {
        const hierarquiaChannel = await client.channels.fetch(hierarquiaChannelId);
        if (!hierarquiaChannel) return;

        const guild = hierarquiaChannel.guild;
        if (!guild) return;

        const hierarchyEmbeds = await createHierarchyEmbeds(guild);

        await clearChannelMessages(hierarquiaChannel);

        for (const embed of hierarchyEmbeds) {
            await hierarquiaChannel.send({ embeds: [embed] });
        }
    } catch (error) {

    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        await updateHierarchy(client);

        setInterval(async () => {
            try {
                await updateHierarchy(client);
            } catch (error) {

            }
        }, 10 * 60 * 1000); // Atualiza hierarquia a cada 10 minutos
    }
}