const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ChannelType } = require("discord.js");
const path = require("path");
const fs = require("fs");
const config = require(path.join(__dirname, "..", "Config.json"));
const databasePath = path.join(__dirname, "..", "Database.json");

const readDatabase = () => {
    if (!fs.existsSync(databasePath)) {
        return {};
    }
    const data = fs.readFileSync(databasePath);
    return JSON.parse(data);
};

const writeDatabase = (data) => {
    fs.writeFileSync(databasePath, JSON.stringify(data, null, 2));
};

module.exports = {
    commandBase: {
        slashData: new SlashCommandBuilder()
            .setName("iniciar_aula")
            .setDescription("[PROFESSOR] Inicia uma aula, cria a sala e move os alunos para ela")
            .addChannelOption(option =>
                option
                    .setName("aguardando")
                    .setDescription("Canal onde os alunos estão aguardando")
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName("curso")
                    .setDescription("Nome do curso que será aplicado")
                    .setRequired(true)
            ),
        allowedRoles: config.useCommandRoles,
        async execute(interaction) {
            const allowedChannelId = config.usecommandChannel;

            if (interaction.channel.id !== allowedChannelId) {
                return interaction.reply({
                    content: `Este comando só pode ser executado em <#${config.usecommandChannel}>`,
                    ephemeral: true,
                });
            }

            const aguardando = interaction.options.getChannel("aguardando");
            const curso = interaction.options.getString("curso");
            const categoryId = config.categoriaSalas;

            const category = interaction.guild.channels.cache.get(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                return interaction.reply({
                    content: "A categoria especificada para a sala de aula não foi encontrada.",
                    ephemeral: true,
                });
            }

            const now = new Date();
            const timestamp = Math.floor(now.getTime() / 1000);
            const salaDeAula = await interaction.guild.channels.create({
                name: `${curso}`,
                type: ChannelType.GuildVoice,
                parent: categoryId,
                userLimit: 0
            });


            const professor = interaction.member;
            try {
                await professor.voice.setChannel(salaDeAula);
            } catch (error) {
                console.error(`Falha ao mover o professor ${professor.user.tag}:`, error);
                return interaction.reply({
                    content: "Falha ao mover o professor para a sala de aula.",
                    ephemeral: true,
                });
            }

            const membersToMove = aguardando.members;
            const alunosPresentes = [];

            for (const member of membersToMove.values()) {
                if (!member.user.bot && member.user.id !== interaction.user.id) {
                    try {
                        await member.voice.setChannel(salaDeAula);
                        alunosPresentes.push(`<@${member.user.id}>`);
                    } catch (error) {
                        console.error(`Falha ao mover o membro ${member.user.tag}:`, error);
                    }
                }
            }

            const database = readDatabase();
            database[salaDeAula.id] = {
                curso,
                professor: interaction.user.tag,
                inicio: now.toISOString(),
                alunos: alunosPresentes,
                messageId: null
            };
            writeDatabase(database);

            const embed = new EmbedBuilder()
                .setDescription(
                    `# AULA EM ANDAMENTO\n`
                )
                .addFields(
                    { name: 'Curso', value: curso, inline: true },
                    { name: 'Professor', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Sala de Aula', value: `<#${salaDeAula.id}>`, inline: false },
                    { name: 'Inicio', value: `<t:${timestamp}:F>`, inline: false },
                    { name: 'Alunos Presentes', value: alunosPresentes.length > 0 ? alunosPresentes.join('\n') : 'Nenhum aluno presente.', inline: false }
                )
                .setColor(0xffea00);

            const button = new ButtonBuilder()
                .setCustomId(`encerrar_aula_${salaDeAula.id}`)
                .setEmoji("🔒")
                .setLabel('Encerrar Aula')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder().addComponents(button);
            const sentMessage = await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                ephemeral: false,
                fetchReply: true,
            });

            database[salaDeAula.id].messageId = sentMessage.id;
            writeDatabase(database);
        }
    }
}