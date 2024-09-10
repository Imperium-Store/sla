const fs = require('fs');
const path = require('path');
const { Events, EmbedBuilder } = require('discord.js');
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

const formatDuration = (duration) => {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours} horas, ${minutes} minutos e ${seconds} segundos`;
};

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        if (!customId.startsWith('encerrar_aula_')) return;
        const salaDeAulaId = customId.split('_')[2];
        const database = readDatabase();
        const aulaData = database[salaDeAulaId];

        if (!aulaData) {
            return interaction.reply({
                content: "Não foi possível encontrar informações sobre esta aula.",
                ephemeral: true,
            });
        }

        if (interaction.user.tag !== aulaData.professor) {
            return interaction.reply({
                content: "Apenas o professor que iniciou a aula pode encerrá-la.",
                ephemeral: true,
            });
        }

        const salaDeAula = await interaction.guild.channels.fetch(salaDeAulaId);
        const alunosPresentes = aulaData.alunos;
        const membrosAtuais = salaDeAula.members;

        membrosAtuais.forEach(member => {
            if (!member.user.bot && member.user.tag !== aulaData.professor && !alunosPresentes.includes(`<@${member.user.id}>`)) {
                alunosPresentes.push(`<@${member.user.id}>`);
            }
        });

        const now = new Date();
        const timestampEncerrada = Math.floor(now.getTime() / 1000);
        const timestampInicio = Math.floor(new Date(aulaData.inicio).getTime() / 1000);


        const duracaoAulaSegundos = timestampEncerrada - timestampInicio;
        const duracaoAula = formatDuration(duracaoAulaSegundos);

        const newEmbed = new EmbedBuilder()
            .setDescription(
                `# AULA ENCERRADA\n`
            )
            .addFields(
                { name: 'Curso', value: aulaData.curso, inline: false },
                { name: 'Professor', value: `<@${interaction.user.id}>`, inline: false },
                { name: 'Inicio', value: `<t:${timestampInicio}:F>`, inline: true },
                { name: 'Término', value: `<t:${timestampEncerrada}:F>`, inline: true },
                { name: 'Duração', value: duracaoAula, inline: false },
                { name: 'Alunos Presentes', value: alunosPresentes.length > 0 ? alunosPresentes.join('\n') : "Nenhum aluno presente.", inline: false }
            )
            .setColor(0x00ff44);

        for (const member of membrosAtuais.values()) {
            if (!member.user.bot) {
                await member.voice.disconnect();
            }
        }

        const message = await interaction.channel.messages.fetch(aulaData.messageId);
        await message.edit({
            embeds: [newEmbed],
            components: [],
        });

        await salaDeAula.delete().catch(console.error);
        await interaction.reply({
            content: 'A aula foi encerrada, o canal foi deletado e todos os alunos foram desconectados.',
            ephemeral: true,
        });
        delete database[salaDeAulaId];
        writeDatabase(database);
    }
}