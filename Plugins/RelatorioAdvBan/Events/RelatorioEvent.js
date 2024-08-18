const {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require(path.join(__dirname, "..", "Config.json"));
const dbPath = path.join(__dirname, "..", "Database.json");
const lockFilePath = path.join(__dirname, "..", "Database.lock");
const { v4: uuid } = require("uuid");

const acquireLock = async () => {
  while (fs.existsSync(lockFilePath)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  fs.writeFileSync(lockFilePath, "locked");
};

const releaseLock = () => {
  if (fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
  }
};

const readDatabase = async () => {
  await acquireLock();
  try {
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      return data;
    }
  } catch (error) {
    console.error("Error reading database:", error);
  } finally {
    releaseLock();
  }
  return {};
};

const writeDatabase = async (database) => {
  await acquireLock();
  try {
    fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
  } catch (error) {
    console.error("Error writing to database:", error);
  } finally {
    releaseLock();
  }
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isModalSubmit()) {
        if (interaction.customId === "advertencia-modal-1") {
          const motivo = interaction.fields.getTextInputValue("motivo");
          const provas = interaction.fields.getTextInputValue("provas");
          const resolvidoPor = interaction.user.id;

          let itensLooteados = "n/a";
          let devolverItensPara = "n/a";
          let multaLoot = "n/a";

          if (interaction.fields.fields.find(field => field.customId === "itens_looteados")) {
            itensLooteados = interaction.fields.getTextInputValue("itens_looteados") || "n/a";
          }
          if (interaction.fields.fields.find(field => field.customId === "devolver_itens_para")) {
            devolverItensPara = interaction.fields.getTextInputValue("devolver_itens_para") || "n/a";
          }
          if (interaction.fields.fields.find(field => field.customId === "multa_loot")) {
            multaLoot = interaction.fields.getTextInputValue("multa_loot") || "n/a";
          }

          const database = await readDatabase();
          const channelData = database[interaction.channel.id] || {};

          const reportId = uuid().split("-").join('');

          const { usuario, punicao, ticket, resultado, denunciante, staff } = channelData.tempData;

          const embed = new EmbedBuilder()
            .setDescription("## Relatório de ADV/BAN")
            .addFields(
              { name: "Denunciado", value: `${usuario}`, inline: true },
              { name: "Punição", value: `${punicao}`, inline: true },
              { name: "Ticket", value: ticket, inline: true },
              { name: "Resultado", value: resultado, inline: false },
              { name: "Motivo", value: motivo, inline: false },
              { name: "Itens Looteados", value: itensLooteados, inline: true },
              {
                name: "Devolver Itens Para",
                value: devolverItensPara.toLowerCase() === "n/a" ? "n/a" : `<@${devolverItensPara}>`,
                inline: true,
              },
              {
                name: "Multa por Loot Indevido",
                value: `R$ ${multaLoot}`,
                inline: false,
              },
              {
                name: "Resolvido por",
                value: `<@${resolvidoPor}>`,
                inline: true,
              },
              {
                name: "Aprovado por",
                value:
                  "<a:2217salesforceload:1256072084476530710> Aguardando análise",
                inline: true,
              },
              { name: "Provas", value: provas, inline: false }
            )
            .setColor(0xffff00)
            .setFooter({
              text: "Bot desenvolvido por Imperium Store.",
              iconURL:
                "https://cdn.discordapp.com/attachments/1255724527661355039/1255724601707593789/imperium-store.png?ex=667ed4eb&is=667d836b&hm=e8eb5d5cba9b5173c601cf6ef576e61f4b050fbcf1c751075c4178525f97a769&",
            });

          const approveButton = new ButtonBuilder()
            .setCustomId(`approve-button-${reportId}`)
            .setLabel("Aprovar")
            .setStyle(ButtonStyle.Success);

          const rejectButton = new ButtonBuilder()
            .setCustomId(`reject-button-${reportId}`)
            .setLabel("Reprovar")
            .setStyle(ButtonStyle.Danger);

          const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel-button-${reportId}`)
            .setLabel("Cancelar")
            .setStyle(ButtonStyle.Secondary);

          const buttonRow = new ActionRowBuilder().addComponents(
            approveButton,
            rejectButton,
            cancelButton
          );

          const mentionRoles = config.mentionsRolesApprove
            .map((roleId) => `<@&${roleId}>`)
            .join(", ");

          await interaction.reply({
            content: "Relatório enviado, aguarde análise de um superior!",
            ephemeral: true,
          });

          await interaction.channel.send({
            content: mentionRoles,
            embeds: [embed],
            components: [buttonRow],
          });

          channelData[reportId] = {
            usuario,
            punicao,
            ticket,
            resultado,
            denunciante,
            staff,
            itens_looteados: itensLooteados,
            devolver_itens_para: devolverItensPara,
            multa_loot: multaLoot,
            resolvidoPor
          };

          delete channelData.tempData;

          database[interaction.channel.id] = channelData;

          await writeDatabase(database);
        }

        if (interaction.customId.startsWith("reject-modal")) {
          const reproveReason = interaction.fields.getTextInputValue("reprove_reason");

          const database = await readDatabase();
          const reportId = interaction.customId.split("-").at(-1); // pega o id do relatório pelo btn
          const tempData = database[interaction.channel.id][reportId];

          if (!tempData) {
            throw new Error(`Relatório ${reportId} não encontrado no canal ${interaction.channel.id}`);
          }

          await interaction.channel.send({
            content: `### <a:alerta:1256070354732974163> Relatório reprovado pelo seguinte motivo: ${reproveReason}\n||<@${tempData.staff}>||`,
          });

          const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0]);

          if (originalEmbed.data.fields) {
            originalEmbed.data.fields = originalEmbed.data.fields.map(
              (field) => {
                if (field.name === "Aprovado por") {
                  field.name = "Reprovado por";
                  field.value = `<@${interaction.user.id}>`;
                }
                return field;
              }
            );
          }

          originalEmbed.setColor(0xff0000);

          await interaction.update({
            embeds: [originalEmbed],
            components: [],
          });

          await interaction.followUp({
            content: "Relatório reprovado com sucesso!",
            ephemeral: true,
          });
        }
      }

      if (interaction.isButton()) {
        const database = await readDatabase();
        const reportId = interaction.customId.split("-").at(-1); // pega o id do relatório pelo btn
        const tempData = database[interaction.channel.id][reportId];
        if (tempData.devolver_itens_para !== "n/a") {
          tempData.devolver_itens_para = `<@${tempData.devolver_itens_para}>`;
        }

        if (
          interaction.customId.split("-").slice(0, -1).join("-") ===
          "approve-button"
        ) {
          const requiredRoles = config.rolesApprove;

          if (
            !requiredRoles.some((role) =>
              interaction.member.roles.cache.has(role)
            )
          ) {
            await interaction.reply({
              content: "Você não tem permissão para usar esta interação.",
              ephemeral: true,
            });
            return;
          }

          const embed = EmbedBuilder.from(interaction.message.embeds[0]);

          if (embed.data.fields) {
            embed.data.fields = embed.data.fields.map((field) => {
              if (field.name === "Aprovado por") {
                field.value = `<@${interaction.user.id}>`;
              }
              return field;
            });
          }

          embed.setColor(0x00ff00);

          const sendRelatoryButton = new ButtonBuilder()
            .setCustomId(`relatory-button-${reportId}`)
            .setLabel("Enviar relatório")
            .setStyle(ButtonStyle.Success);

          const buttonRow = new ActionRowBuilder().addComponents(
            sendRelatoryButton
          );

          await interaction.update({
            embeds: [embed],
            components: [buttonRow],
          });

          await interaction.channel.send({
            content: `### <a:check_green:1256068819890470964> <@${interaction.user.id}> fez análise do relatório e aprovou. <@${tempData.staff}> está autorizado a finalizar o ticket.`,
          });
        } else if (
          interaction.customId.split("-").slice(0, -1).join("-") ===
          "reject-button"
        ) {
          const requiredRoles = config.rolesApprove;

          if (
            !requiredRoles.some((role) =>
              interaction.member.roles.cache.has(role)
            )
          ) {
            await interaction.reply({
              content: "Você não tem permissão para usar esta interação.",
              ephemeral: true,
            });
            return;
          }

          const rejectModal = new ModalBuilder()
            .setCustomId(`reject-modal-${reportId}`)
            .setTitle("Reprovar relatório")
            .addComponents(
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId("reprove_reason")
                  .setLabel("Motivo")
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
              )
            );

          await interaction.showModal(rejectModal);
        } else if (
          interaction.customId.split("-").slice(0, -1).join("-") ===
          "cancel-button"
        ) {
          if (interaction.user.id !== tempData.resolvidoPor) {
            await interaction.reply({
              content: "Você não tem permissão para cancelar este relatório.",
              ephemeral: true,
            });
            return;
          }

          await interaction.message.delete();

          await interaction.reply({
            content: "Relatório cancelado.",
            ephemeral: true,
          });
        }

        if (
          interaction.customId.split("-").slice(0, -1).join("-") ===
          "relatory-button"
        ) {
          const embed = EmbedBuilder.from(interaction.message.embeds[0]);
          const channelLogsAdm = interaction.guild.channels.cache.get(
            config.logsRelatorioAdm
          );
          const reportChannel = interaction.guild.channels.cache.get(
            config.logsRelatorioTicket
          );

          const mappedObject = embed.data.fields.reduce((acc, item) => {
            const formattedName = item.name.replace(/\s+/g, "");
            acc[formattedName] = item.value;
            return acc;
          }, {});

          const handleTicketReportModel = (data) => {
            return `
${"``` ```"}
**RELATÓRIO DE ADV/BAN**\n
**DENUNCIADO:** ${data.Denunciado}
**PUNIÇÃO:** ${data["Punição"]}
**TICKET:** ${data.Ticket.split("・")[1] || data.Ticket}
**RESULTADO:** ${data.Resultado}
**MOTIVO:** ${data.Motivo}
**ITENS LOOTEADOS:** ${data.ItensLooteados}
**MULTA POR LOOT INDEVIDO:** ${data.MultaporLootIndevido}
**RESOLVIDO POR:** ${data.Resolvidopor}
**APROVADO POR:** ${data.Aprovadopor}
**PROVAS:** ${data.Provas}
`;
          };

          await reportChannel.send({
            content: handleTicketReportModel(mappedObject),
          });

          if (config.logsRelatorioAdm)
            await channelLogsAdm.send({ embeds: [embed] });

          const { devolver_itens_para } = tempData;

          if (mappedObject.DevolverItensPara.toLowerCase() !== "n/a") {
            const itensList = mappedObject.ItensLooteados.split("\n")
              .map((item) => item.trim())
              .filter((item) => item.length > 0)
              .map((item) => `\`${item}\``)
              .join(" ");

            const devolucaoChannel = interaction.guild.channels.cache.get(
              config.logsRelatorioDevolucao
            );

            await devolucaoChannel.send({
              content: `${"``` ```"}\n**:package: SOLICITAR DEVOLUÇÃO **\n\n> ID: ${devolver_itens_para}\n> ITEM: ${itensList}\n> MOTIVO: ${mappedObject.Motivo
                }\n> SOLICITADO POR: <@${interaction.user.id}>\n> PROVAS: ${mappedObject.Provas
                }\n`,
            });
          }

          const regex = /<@(\d+)>/;
          const userIdString = mappedObject.Denunciado.match(regex)
            ? mappedObject.Denunciado.match(regex)[1]
            : null;

          if (userIdString) {
            let findUser = interaction.guild.members.cache.find(
              (member) =>
                member.user.id === mappedObject.Denunciado.match(regex)[1]
            );

            if (findUser) {
              const relatorioAdvChannel = interaction.guild.channels.cache.get(
                config.logsRelatorioAdv
              );
              await relatorioAdvChannel.send({
                content: `${"``` ```"}\n**Aplicado por:** ${mappedObject.Resolvidopor
                  }\n**Denunciado:** ${mappedObject.Denunciado}\n**Motivo:** ${mappedObject.Motivo
                  }\n**Punição:** ${mappedObject["Punição"]}`,
              });
            }
          }

          await interaction.update({
            embeds: [embed],
            components: [],
          });

          await writeDatabase(database);

          await interaction.followUp({
            content:
              "Relatório do ticket enviado para o canal de relatórios. Pode encerrar o ticket!",
            ephemeral: true,
          });
        }
      }
    } catch (error) {
      console.error("Error handling interaction:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content:
            "Ocorreu um erro ao processar a interação. Por favor, tente novamente.",
          ephemeral: true,
        });
      }
    }
  }
}