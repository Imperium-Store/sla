const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const config = require(path.join(__dirname, "..", "Config.json"));

module.exports = {
    commandBase: {
        slashData: new SlashCommandBuilder()
            .setName("addtag")
            .setDescription("[STAFF] Adiciona TAG a um usuário")
            .addUserOption(option =>
                option.setName("usuario")
                    .setDescription("O usuário para adicionar o cargo")
                    .setRequired(true))
            .addRoleOption(option =>
                option.setName("cargo")
                    .setDescription("O cargo a ser adicionado ao usuário")
                    .setRequired(true)),
        allowedRoles: config.useCommandRoles,
        async execute(interaction) {
            const user = interaction.options.getUser("usuario");
            const role = interaction.options.getRole("cargo");
            const targetMember = interaction.guild.members.cache.get(user.id);
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);

            if (!targetMember) {
                return interaction.reply({ content: "Usuário não encontrado no servidor.", ephemeral: true });
            }

            const memberRoles = member.roles.cache;
            let canAssign = false;

            for (const [roleId, allowedRoles] of Object.entries(config.rolePermissions)) {
                if (memberRoles.has(roleId) && allowedRoles.includes(role.id)) {
                    canAssign = true;
                    break;
                }
            }

            if (!canAssign) {
                return interaction.reply({ content: "Você não tem permissão para adicionar este cargo.", ephemeral: true });
            }

            try {
                await targetMember.roles.add(role);
                await interaction.reply({ content: `Cargo <@&${role.id}> adicionado ao usuário <@${user.id}>.`, ephemeral: true });

                if (logChannel) {
                    logChannel.send(`O usuário <@${user.id}> recebeu o cargo <@&${role.id}> adicionado por <@${interaction.user.id}>.`);
                }
            } catch (error) {
                console.error(error);
                interaction.reply({ content: "Ocorreu um erro ao tentar adicionar o cargo.", ephemeral: true });
            }
        }
    }
}