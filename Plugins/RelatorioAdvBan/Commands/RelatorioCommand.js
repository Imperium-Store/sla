const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require(path.join(__dirname, "..", "Config.json"));
const dbPath = path.join(__dirname, "..", "Database.json");

module.exports = {
  commandBase: {
    slashData: new SlashCommandBuilder()
      .setName("relatorio")
      .setDescription("[STAFF] Relatorio ADV/BAN")
      .addStringOption((option) =>
        option
          .setName("denunciado")
          .setDescription("Usuário denúnciado (menção ou ID)")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("punicao")
          .setDescription("Punição")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("resultado")
          .setDescription("Veredito sobre este ticket")
          .setRequired(true)
          .addChoices(
            { name: 'Aprovado', value: 'Aprovado' },
            { name: 'Negado', value: 'Negado' },
            { name: 'n/a', value: 'n/a' }
          )
      ),
    allowedRoles: config.useCommandRoles,
    async execute(interaction) {
      const extractNicknameId = (nickname) => {
        const nicknameIdMatch = nickname.match(/#(\d+)$/);
        return nicknameIdMatch ? nicknameIdMatch[1] : "";
      };

      const formatUser = async (input) => {
        const mentionMatch = input.match(/<@!?(\d+)>/);
        if (mentionMatch) {
          const userId = mentionMatch[1];
          try {
            const member = await interaction.guild.members.fetch(userId);
            const nickname = member.displayName;
            const nicknameId = extractNicknameId(nickname);
            return `${member} | ${nicknameId}`;
          } catch (error) {
            return input;
          }
        } else if (input.includes("#")) {
          const [name, id] = input.split("#");
          return `${id.trim()} | ${name.trim()}`;
        }
        return input;
      };

      const denunciante = "n/a";

      const usuario = await formatUser(
        interaction.options.getString("denunciado")
      );
      const punicao = interaction.options.getString("punicao");
      const resultado = interaction.options.getString("resultado");
      const ticket = interaction.channel.name;
      const staff = interaction.user.id;

      const categoryId = config.ticketsCategory;
      if (interaction.channel.parentId !== categoryId) {
        await interaction.reply({
          content: "Você não pode executar este comando aqui!",
          ephemeral: true,
        });
        return;
      }

      let database = {};
      if (fs.existsSync(dbPath)) {
        database = JSON.parse(fs.readFileSync(dbPath, "utf8"));
      }

      if (
        !database[interaction.channel.id] ||
        !database[interaction.channel.id].tempData
      ) {
        database[interaction.channel.id] = {
          tempData: {
            usuario,
            punicao,
            ticket,
            resultado,
            denunciante,
            staff,
            itens_looteados: usuario === 'n/a' ? "n/a" : null,
            devolver_itens_para: usuario === 'n/a' ? "n/a" : null,
            multa_loot: usuario === 'n/a' ? "n/a" : null,
          },
          ...database[interaction.channel.id],
        };
      } else {
        database[interaction.channel.id].tempData = {
          usuario,
          punicao,
          ticket,
          resultado,
          denunciante,
          staff,
          itens_looteados: usuario === 'n/a' ? "n/a" : null,
          devolver_itens_para: usuario === 'n/a' ? "n/a" : null,
          multa_loot: usuario === 'n/a' ? "n/a" : null,
        };
      }

      fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));

      const modal1 = new ModalBuilder()
        .setCustomId("advertencia-modal-1")
        .setTitle("Relatório de ADV/BAN");

      modal1.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("Motivo")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("provas")
            .setLabel("Provas")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      if (usuario !== 'n/a') {
        modal1.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("itens_looteados")
              .setLabel("Itens Looteados")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("devolver_itens_para")
              .setLabel("Devolução de Itens para")
              .setPlaceholder("INFORME O ID DE USUÁRIO DO DC")
              .setValue(denunciante)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("multa_loot")
              .setLabel("Multa por Loot Indevido")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
      }

      await interaction.showModal(modal1);
    },
  },
}