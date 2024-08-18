const { ActivityType, Events } = require("discord.js");

module.exports = {
    name: Events.ClientReady,
    async execute(client) {
        const statusList = [
            { type: ActivityType.Playing, name: "Imperium Store" },
        ];

        let currentIndex = 0;

        const botPresence = () => {
            const status = statusList[currentIndex];
            client.user.setPresence({
                activities: [{ name: status.name, type: status.type }],
                status: "online"
            });

            currentIndex = (currentIndex + 1) % statusList.length;
            setTimeout(botPresence, 10000);
        };

        botPresence();

        console.log(`[PLATFORM] ${client.user.username} conectado`);
    }
}
