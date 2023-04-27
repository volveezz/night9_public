import { ActivityType, Client, Collection, GatewayIntentBits, Partials, } from "discord.js";
import { join, resolve } from "path";
import { guildId } from "../configs/ids.js";
import periodicDestinyActivityChecker from "../core/periodicActivityChecker.js";
import tokenManagment from "../core/tokenManagement.js";
import handleMemberStatistics from "../core/userStatisticsManagement.js";
import { clanOnlineMemberActivityChecker } from "../utils/general/activityCompletionChecker.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import getFiles from "../utils/general/fileReader.js";
import updateRaidStatus from "../utils/general/raidFunctions/updateRaidStatus.js";
import { cacheRaidMilestones } from "../utils/general/raidMilestones.js";
import { restoreFetchedPGCRs } from "../utils/logging/activityLogger.js";
const __dirname = resolve();
export class ExtendedClient extends Client {
    commands = new Collection();
    buttons = new Collection();
    autocomplete = new Collection();
    guild;
    intervalId;
    activities = [
        { name: "🔁 Подготовка рейдов", type: ActivityType.Listening, url: undefined },
        { name: "🔁 Обновление статистики", type: ActivityType.Playing, url: undefined },
        { name: "🔁 Загрузка свежих данных", type: ActivityType.Playing, url: undefined },
        { name: "🔁 Устранение ошибок", type: ActivityType.Competing, url: undefined },
        { name: "🔁 Благодарность меценатам", type: ActivityType.Watching, url: undefined },
        {
            name: "🔁 Слежка за революцией",
            type: ActivityType.Streaming,
            url: "https://www.youtube.com/watch?v=pLBhEAo2wXc",
        },
    ];
    constructor() {
        super({
            intents: [
                GatewayIntentBits.GuildPresences,
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
        await this.login(process.env.TOKEN);
        this.registerModules();
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
    async getAsyncMember(id) {
        const guildMembers = (this.guild || (await this.guilds.fetch(guildId))).members;
        return guildMembers.cache.get(id) || (await guildMembers.fetch(id));
    }
    getCachedTextChannel(id) {
        return (this.guild || this.guilds.cache.get(guildId)).channels.cache.get(id);
    }
    async getAsyncTextChannel(id) {
        const guild = this.getCachedGuild() || this.guilds.cache.get(guildId) || (await this.guilds.fetch(guildId));
        return (this.getCachedTextChannel(id) || guild.channels.cache.get(id) || guild.channels.fetch(id));
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
    async loadCommands() {
        const guildCommands = [];
        const globalCommands = [];
        const commandFiles = getFiles(join(__dirname, "dist/commands/"));
        const commandReading = commandFiles.map((filePath) => {
            return this.importFile(`../commands/${filePath}`).then((command) => {
                if (!command) {
                    console.error(`[Error code: 1132] Command file not valid`, { filePath });
                    return;
                }
                if (!command.name) {
                    console.error(`[Error code: 1135] Unable to find command name for`, { filePath });
                    return;
                }
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
                if (command.global) {
                    return globalCommands.push(command);
                }
                guildCommands.push(command);
            });
        });
        await Promise.all(commandReading);
        await this.registerCommands({ global: true, commands: globalCommands });
        await this.registerCommands({ global: false, commands: guildCommands });
    }
    async loadEvents() {
        const eventFiles = getFiles(join(__dirname, "dist/events/"));
        const eventPromises = eventFiles.map((filePath) => {
            return this.importFile(`../events/${filePath}`).then((event) => {
                if (!event) {
                    console.error(`[Error code: 1137] Event file not valid`, { filePath });
                    return;
                }
                this.on(event.event, event.run);
            });
        });
        await Promise.all(eventPromises);
    }
    async loadButtons() {
        const buttonFiles = getFiles(join(__dirname, "dist/buttons/"));
        const buttonReading = buttonFiles.map((filePath) => {
            return this.importFile(`../buttons/${filePath}`).then((button) => {
                if (!button) {
                    console.error(`[Error code: 1140] Button file not valid`, { filePath });
                    return;
                }
                this.buttons.set(button.name, button);
            });
        });
        await Promise.all(buttonReading);
    }
    async loadAutocompletions() {
        const autocompleteFiles = getFiles(join(__dirname, "dist/autocompletions"));
        const autocompleteReading = autocompleteFiles.map((filePath) => {
            return this.importFile(`../autocompletions/${filePath}`).then((autocomplete) => {
                if (!autocomplete) {
                    console.error(`[Error code: 1141] Autocomplete file not valid`, { filePath });
                    return;
                }
                this.autocomplete.set(autocomplete.name, autocomplete);
            });
        });
        await Promise.all(autocompleteReading);
    }
    async registerModules() {
        this.on("ready", async (client) => {
            setInterval(() => {
                const time = Math.floor(this.uptime / 1000);
                console.log(`Client uptime: ${convertSeconds(time, "en")}`);
            }, 1000 * 60 * 30);
            const guilds = await client.guilds.fetch();
            const fetchGuildsPromises = guilds.map(async (guild) => {
                const guildFetched = await guild.fetch();
                if (guildFetched.id === guildId) {
                    this.guild = guildFetched;
                }
                await guildFetched.members.fetch();
                await guildFetched.channels.fetch();
            });
            await Promise.all(fetchGuildsPromises);
            this.loadButtons();
            this.loadEvents();
            this.loadCommands();
            this.loadAutocompletions();
            this.startUpdatingPresence();
            restoreFetchedPGCRs();
            this.importFile("../utils/api/rssHandler.js");
            if (process.env.DEV_BUILD !== "dev") {
                tokenManagment();
                clanOnlineMemberActivityChecker();
                periodicDestinyActivityChecker();
                handleMemberStatistics();
            }
            console.log(`${this.user.username} online since ${new Date().toLocaleString()}`);
            setTimeout(() => {
                cacheRaidMilestones();
                updateRaidStatus();
            }, 1000 * 30);
        });
    }
}
