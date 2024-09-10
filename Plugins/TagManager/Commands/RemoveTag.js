const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const config = require(path.join(__dirname, "..", "Config.json"));

module.exports = {
    commandBase: {
        slashData: new SlashCommandBuilder()
            .setName("removetag")
            .setDescription("[STAFF] Remove TAG de um usuário")
            .addUserOption(option =>
                option.setName("usuario")
                    .setDescription("O usuário para remover o cargo")
                    .setRequired(true))
            .addRoleOption(option =>
                option.setName("cargo")
                    .setDescription("O cargo a ser removido do usuário")
                    .setRequired(true)),
        allowedRoles: config.useCommandRoles,
        async execute(interaction) {
            const userId = interaction.user.id;
            const member = interaction.guild.members.cache.get(userId);

            const user = interaction.options.getUser("usuario");
            const role = interaction.options.getRole("cargo");
            const targetMember = interaction.guild.members.cache.get(user.id);
            const logChannel = interaction.guild.channels.cache.get(config.logChannelId);

            if (!targetMember) {
                return interaction.reply({ content: "Usuário não encontrado no servidor.", ephemeral: true });
            }

            const memberRoles = member.roles.cache;
            let canRemove = false;

            for (const [roleId, allowedRoles] of Object.entries(config.rolePermissionsRemove)) {
                if (memberRoles.has(roleId) && allowedRoles.includes(role.id)) {
                    canRemove = true;
                    break;
                }
            }

            if (!canRemove) {
                return interaction.reply({ content: "Você não tem permissão para remover este cargo.", ephemeral: true });
            }

            try {
                await targetMember.roles.remove(role);
                await interaction.reply({ content: `Cargo <@&${role.id}> removido do usuário <@${user.id}>.`, ephemeral: true });

                if (logChannel) {
                    logChannel.send(`O usuário <@${user.id}> teve o cargo <@&${role.id}> removido por <@${interaction.user.id}>.`);
                }
            } catch (error) {
                console.error(error);
                interaction.reply({ content: "Ocorreu um erro ao tentar remover o cargo.", ephemeral: true });
            }
        }
    }
}