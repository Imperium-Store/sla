const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const config = require(path.join(__dirname, "..", "Config.json"));

module.exports = {
  commandBase: {
    slashData: new SlashCommandBuilder()
      .setName("help")
      .setDescription("[STAFF] Painel de ajuda do bot"),
    allowedRoles: config.useCommandRoles,
    async execute(interaction) {
      interaction.reply({
        content: `
        ## Informações sobre Comandos\n
        - **/relatorio**
          - _Usado para auxilio em relatórios de tickets de denúncia_
        - **/revisao**
          - _Usado para auxilio em relatório de tickets de revisão_
        `,
        ephemeral: true,
      });
    },
  },
};
