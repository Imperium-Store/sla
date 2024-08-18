const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const config = require(path.join(__dirname, "..", "Config.json"));

async function countMentions(
  interaction,
  channelId,
  userId,
  startDate,
  endDate
) {
  const channel = await interaction.guild.channels.fetch(channelId);
  if (!channel.isTextBased()) return;

  let count = 0;
  let lastId;

  while (true) {
    const options = { limit: 100 };

    if (lastId) {
      options.before = lastId;
    }

    const messages = await channel.messages.fetch(options);

    if (messages.size === 0) {
      break;
    }

    messages.forEach((message) => {
      const messageDate = message.createdAt;

      if (messageDate >= startDate && messageDate <= endDate) {
        if (message.mentions.users.has(userId)) {
          count++;
        }
      }
    });

    lastId = messages.last().id;
  }

  return count;
}

async function countSends(interaction, channelId, userId, startDate, endDate) {
  const channel = await interaction.guild.channels.fetch(channelId);
  if (!channel.isTextBased()) return;

  let count = 0;
  let lastId;

  while (true) {
    const options = { limit: 100 };

    if (lastId) {
      options.before = lastId;
    }

    const messages = await channel.messages.fetch(options);

    if (messages.size === 0) {
      break;
    }

    messages.forEach((message) => {
      const messageDate = message.createdAt;
      if (messageDate >= startDate && messageDate <= endDate) {
        if (message.author.id === userId) {
          count++;
        }
      }
    });
    lastId = messages.last().id;
  }
  return count;
}

module.exports = {
  commandBase: {
    slashData: new SlashCommandBuilder()
      .setName("contarmetas")
      .setDescription("[STAFF] Mostra os resultados de um staff")
      .addStringOption((option) =>
        option
          .setName("channelmentions")
          .setDescription("ID dos canais. EX: 123321, 321123...")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("channelauthor")
          .setDescription("ID dos canais. EX: 123321, 321123...")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("userid")
          .setDescription("ID do usuário sem menção! (Apenas ID do DC)")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("initialdate")
          .setDescription("Data de início (AAAA-MM-DD)")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("finishdate")
          .setDescription("Data de término (AAAA-MM-DD)")
          .setRequired(true)
      ),
    allowedRoles: config.allowedRoles,
    allowedUsers: config.allowedUsers,
    async execute(interaction) {
      let channelsMentions = interaction.options.getString("channelmentions");
      let channelsAuthor = interaction.options.getString("channelauthor");
      let userId = interaction.options.getString("userid");
      let initialDate = interaction.options.getString("initialdate");
      let finishDate = interaction.options.getString("finishdate");

      if (channelsMentions != "n/a") {
        channelsMentions = channelsMentions.replace(/[ ]/g, "").split(",");
      }

      if (channelsAuthor != "n/a") {
        channelsAuthor = channelsAuthor.replace(/[ ]/g, "").split(",");
      }

      const MOCK = {
        // userId: "579769867289362452", // natsu
        // channelMsgMention: [
        //   "1258678083096154132", // revisões aceitas
        //   "1267380375588569222", // revisões negadas
        // ],
        // channelMsgAuthor: [
        //   "1267384168287830046", // devoluções
        // ],
        initialDate: "2024-07-28",
        finishDate: "2024-07-29",
      };
      const resultsMentions = [];
      const resultsAuthor = [];

      await interaction.reply({
        content: "Iniciando contabilização dos dados, aguarde um momento...",
        ephemeral: true,
      });

      if (channelsMentions != "n/a" && channelsMentions.length > 0) {
        for await (let channelId of channelsMentions) {
          const res = await countMentions(
            interaction,
            channelId,
            userId,
            new Date(`${initialDate}T00:00:00Z`),
            new Date(`${finishDate}T23:59:00Z`)
          );

          resultsMentions.push(`<#${channelId}>: ${res}`);
        }
      }

      if (channelsAuthor != "n/a" && channelsAuthor.length > 0) {
        for await (let channelId of channelsAuthor) {
          const res = await countSends(
            interaction,
            channelId,
            userId,
            new Date(`${initialDate}T00:00:00Z`),
            new Date(`${finishDate}T23:59:00Z`)
          );

          resultsAuthor.push(`<#${channelId}>: ${res}`);
        }
      }

      const resultMessage = `
      # METAS CALCULADAS DE <@${userId}>\n
      ## RESULTADO POR MENÇÃO\n
      ${
        resultsMentions.length == 0
          ? "Não informado/encontrado!"
          : resultsMentions.join("\n")
      }
      \n## ENVIADO PELO USUÁRIO INFORMADO\n
      ${
        resultsAuthor.length == 0
          ? "Não informado/encontrado!"
          : resultsAuthor.join("\n")
      }
            `;
      await interaction.followUp({ content: resultMessage, ephemeral: true });
    },
  },
};
