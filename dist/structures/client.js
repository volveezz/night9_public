import { ActivityType, Client, Collection, GatewayIntentBits, Partials, } from "discord.js";
import { join, resolve } from "path";
import { guildId } from "../configs/ids.js";
import periodicDestinyActivityChecker from "../core/periodicActivityChecker.js";
import tokenManagment from "../core/tokenManagement.js";
import handleMemberStatistics from "../core/userStatisticsManagement.js";
import { clanOnlineMemberActivityChecker } from "../utils/general/activityCompletionChecker.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import getFiles from "../utils/general/fileReader.js";
import { cacheRaidMilestones } from "../utils/general/raidMilestones.js";
const __dirname = resolve();
export class ExtendedClient extends Client {
    commands = new Collection();
    buttons = new Collection();
    autocomplete = new Collection();
    guild;
    intervalId;
    activities = [
        { name: "🔁 Hunting for loot", type: ActivityType.Listening, url: undefined },
        { name: "🔁 Fighting the Darkness", type: ActivityType.Playing, url: undefined },
        { name: "🔁 Dancing with Witness", type: ActivityType.Playing, url: undefined },
        { name: "🔁 Protecting the Last City", type: ActivityType.Competing, url: undefined },
        { name: "🔁 Fighting the Vex", type: ActivityType.Watching, url: undefined },
        {
            name: "🔁 Looking for the Traveler",
            type: ActivityType.Streaming,
            url: "https://www.youtube.com/watch?v=pLBhEAo2wXc",
        },
    ];
    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.MessageContent,
            ],
            partials: [Partials.GuildMember, Partials.Channel, Partials.Message, Partials.User],
        });
    }
    async start() {
        await this.login(process.env.TOKEN).then((r) => {
            this.registerModules();
        });
    }
    startUpdatingPresence() {
        this.updatePresence();
        this.intervalId = setInterval(() => {
            this.updatePresence();
        }, 60000);
    }
    updatePresence() {
        const activity = this.activities[Math.floor(Math.random() * this.activities.length)];
        this.user.setPresence({
            status: "dnd",
            activities: [activity],
        });
    }
    stopUpdatingPresence() {
        this.user.setPresence({ status: "online" });
        global.clearInterval(this.intervalId);
    }
    getCachedGuild() {
        return (this.guild || this.guilds.cache.get(guildId));
    }
    getCachedMembers() {
        return (this.guild || this.guilds.cache.get(guildId)).members.cache;
    }
    getCachedTextChannel(id) {
        return (this.guild || this.guilds.cache.get(guildId)).channels.cache.get(id);
    }
    async importFile(filePath) {
        return (await import(filePath))?.default;
    }
    async registerCommands({ global, commands }) {
        if (global) {
            this.application.commands.set(commands);
        }
        else {
            (this.guild || this.guilds.cache.get(guildId))?.commands.set(commands);
        }
    }
    async registerModules() {
        const guildCommands = [];
        const globalCommands = [];
        const commandFiles = getFiles(join(__dirname, "dist/commands/"));
        const commandReading = commandFiles.map(async (filePath) => {
            const command = await this.importFile(`../commands/${filePath}`);
            if (!command)
                return console.error(`[Error code: 1132] Command file not valid`, { filePath });
            if (!command.name)
                return console.error(`[Error code: 1135] Unable to find command name for`, { filePath });
            if (command.userContextMenu) {
                this.commands.set(command.userContextMenu.name, command);
                if (command.global) {
                    globalCommands.push(command.userContextMenu);
                }
                else {
                    guildCommands.push(command.userContextMenu);
                }
            }
            if (command.messageContextMenu) {
                this.commands.set(command.messageContextMenu.name, command);
                if (command.global) {
                    globalCommands.push(command.messageContextMenu);
                }
                else {
                    guildCommands.push(command.messageContextMenu);
                }
            }
            this.commands.set(command.name, command);
            if (command.global)
                return globalCommands.push(command);
            guildCommands.push(command);
        });
        this.on("ready", async (client) => {
            await client.guilds.fetch().then((r) => {
                r.forEach((guild) => {
                    guild.fetch().then(async (guildFetched) => {
                        if (guildFetched.id === guildId)
                            this.guild = guildFetched;
                        await guildFetched.members.fetch();
                        guildFetched.channels.fetch();
                    });
                });
            });
            this.startUpdatingPresence();
            const eventFiles = getFiles(join(__dirname, "dist/events/"));
            eventFiles.forEach(async (filePath) => {
                const event = await this.importFile(`../events/${filePath}`);
                if (!event)
                    return console.error(`[Error code: 1137] Event file not valid`, { filePath });
                this.on(event.event, event.run);
            });
            if (process.env.DEV_BUILD !== "dev") {
                periodicDestinyActivityChecker();
                tokenManagment();
                handleMemberStatistics();
            }
            const buttonFiles = getFiles(join(__dirname, "dist/buttons/"));
            buttonFiles.forEach(async (filePath) => {
                const button = await this.importFile(`../buttons/${filePath}`);
                if (!button)
                    return console.error(`[Error code: 1140] Button file not valid`, { filePath });
                this.buttons.set(button.name, button);
            });
            const autocompleteFiles = getFiles(join(__dirname, "dist/autocompletions"));
            autocompleteFiles.forEach(async (filePath) => {
                const autocomplete = await this.importFile(`../autocompletions/${filePath}`);
                if (!autocomplete)
                    return console.error(`[Error code: 1141] Autocomplete file not valid`, { filePath });
                this.autocomplete.set(autocomplete.name, autocomplete);
            });
            console.log(`${this.user.username} online since ${new Date().toLocaleString()}`);
            await Promise.all(commandReading).then((r) => {
                this.registerCommands({ global: true, commands: globalCommands });
                this.registerCommands({ global: false, commands: guildCommands });
            });
            setTimeout(() => {
                cacheRaidMilestones();
            }, 30 * 1000);
            clanOnlineMemberActivityChecker();
            setInterval(() => {
                const time = Math.floor(this.uptime / 1000);
                console.log(`Client uptime: ${convertSeconds(time, "en")}`);
            }, 1000 * 60 * 30);
        });
    }
}
