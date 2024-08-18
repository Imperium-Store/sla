const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder } = require("discord.js");
const { readdirSync, existsSync } = require("node:fs");
const path = require("path");
const config = require("./BotSetup.json");
const rest = new REST({ version: "10" }).setToken(config.token);

const client = new Client({
    intents: Object.values(GatewayIntentBits),
    partials: Object.values(Partials),
    shards: "auto",
});

client.commands = new Collection();
client.commandAliases = new Collection();
client.slashCommands = new Collection();
client.slashDatas = [];

const pluginFolders = readdirSync("./Plugins");

pluginFolders.forEach(pluginFolder => {
    const pluginPath = path.join(__dirname, "Plugins", pluginFolder);

    const commandsPath = path.join(pluginPath, "Commands");
    if (existsSync(commandsPath) && readdirSync(commandsPath, { withFileTypes: true }).some(dirent => dirent.isFile())) {
        readdirSync(commandsPath).forEach(file => {
            const command = require(path.join(commandsPath, file));
            if (command && command.commandBase && command.commandBase.slashData) {
                const slashCommand = command.commandBase;
                if (typeof slashCommand.slashData.toJSON === "function") {
                    client.slashDatas.push(slashCommand.slashData.toJSON());
                    client.slashCommands.set(slashCommand.slashData.name, slashCommand);
                }
            }
        });
    }

    const eventsPath = path.join(pluginPath, "Events");
    if (existsSync(eventsPath) && readdirSync(eventsPath, { withFileTypes: true }).some(dirent => dirent.isFile())) {
        readdirSync(eventsPath).forEach(file => {
            const event = require(path.join(eventsPath, file));
            client.on(event.name, (...args) => event.execute(...args));
        });
    }
});

client.once("ready", async () => {
    try {
        const globalCommands = await rest.get(Routes.applicationCommands(config.client_id));
        await Promise.all(globalCommands.map(cmd => rest.delete(Routes.applicationCommand(config.client_id, cmd.id))));

        const guilds = await client.guilds.fetch();
        for (const guild of guilds.values()) {
            const guildId = guild.id;
            const guildCommands = await rest.get(Routes.applicationGuildCommands(config.client_id, guildId));
            await Promise.all(guildCommands.map(cmd => rest.delete(Routes.applicationGuildCommand(config.client_id, guildId, cmd.id))));
            await rest.put(Routes.applicationGuildCommands(config.client_id, guildId), { body: client.slashDatas });

            // Evitar rate Limit
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error("Ocorreu um erro durante o registro de comandos: ", error);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) {
        console.error(`Comando não encontrado: ${interaction.commandName}`);
        return;
    }

    const allowedRoles = command.allowedRoles || [];
    const allowedUsers = command.allowedUsers || [];
    const userRoles = interaction.member.roles.cache;
    const hasPermission = allowedRoles.some(role => userRoles.has(role));
    const hasUser = allowedUsers.includes(interaction.user.id);

    if (!hasPermission) {
      if (!hasUser) {
        const noPermissionEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setDescription("## Você não tem permissão para usar este comando!");

        await interaction.reply({
          embeds: [noPermissionEmbed],
          ephemeral: true,
        });
        return;
      }
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);

        const executedCommandError = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription("## Ocorreu um erro, tente novamente mais tarde.");
        await interaction.reply({ embeds: [executedCommandError], ephemeral: true });
    }
});

// Anti Crash loggers
process.on("unhandledRejection", e => {
    console.log(e);
});
process.on("uncaughtException", e => {
    console.log(e);
});
process.on("uncaughtExceptionMonitor", e => {
    console.log(e);
});

client.login(config.token);