const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const config = require(path.join(__dirname, "..", "Config.json"));

module.exports = {
  commandBase: {
    slashData: new SlashCommandBuilder()
      .setName("ping")
      .setDescription("[STAFF] Mostra o ping atual do bot"),
    allowedRoles: config.useCommandRoles,
    async execute(interaction) {
      const start = Date.now();
      await interaction.reply({
        content: "Calculando o ping...",
        fetchReply: true,
        ephemeral: true
      });
      const end = Date.now();

      const latency = end - start;
      const apiPing = interaction.client.ws.ping;

      interaction.editReply({
        content: `O ping atual do bot é:\nLatência: **${latency}ms**\nAPI: **${apiPing}ms**`
      });
    },
  }
};