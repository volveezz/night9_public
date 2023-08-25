import { ActivityType, ChannelType, Client, Collection, GatewayIntentBits, Partials, } from "discord.js";
import { join, resolve } from "path";
import checkClanActivitiesPeriodically from "../core/periodicActivityChecker.js";
import handleMemberStatistics from "../core/statisticsChecker/userStatisticsManagement.js";
import tokenManagment from "../core/tokenManagement.js";
import fetchNewsArticles from "../utils/api/bungieRssFetcher.js";
import { fetchGlobalAlerts } from "../utils/api/globalAlertsFetcher.js";
import { voiceChannelJoinTimestamps } from "../utils/discord/userActivityHandler.js";
import { clanOnlineMemberActivityChecker } from "../utils/general/activityCompletionChecker.js";
import getFiles from "../utils/general/fileReader.js";
import raidFireteamChecker from "../utils/general/raidFunctions/raidFireteamChecker.js";
import { loadNotifications } from "../utils/general/raidFunctions/raidNotifications.js";
import cacheRaidMilestones from "../utils/general/raidMilestones.js";
import { pause } from "../utils/general/utilities.js";
import { restoreFetchedPGCRs } from "../utils/logging/activityLogger.js";
import { lastAlertKeys, processedRssLinks } from "../utils/persistence/dataStore.js";
import VoteSystem from "./VoteSystem.js";
const __dirname = resolve();
const directory = process.env.NODE_ENV === "development" && process.env.LOCAL_ENV === "true" ? "src" : "dist";
export class ExtendedClient extends Client {
    commands = new Collection();
    buttons = new Collection();
    autocomplete = new Collection();
    guild;
    intervalId;
    activities = [
        { name: "🔁 Подготовка рейдов", type: ActivityType.Custom },
        { name: "🔁 Обновление статистики", type: ActivityType.Custom },
        { name: "🔁 Загрузка свежих данных", type: ActivityType.Custom },
        { name: "🔁 Устранение ошибок", type: ActivityType.Custom },
        { name: "🔁 Благодарность меценатам", type: ActivityType.Custom },
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
        this.start();
    }
    async start() {
        await this.login(process.env.TOKEN);
        this.user.setPresence({
            activities: [this.activities[Math.floor(Math.random() * this.activities.length)]],
            status: "idle",
        });
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
        return (this.guild || this.guilds.cache.get(process.env.GUILD_ID));
    }
    getCachedMembers() {
        return (this.guild || this.guilds.cache.get(process.env.GUILD_ID)).members.cache;
    }
    async getAsyncMember(id) {
        return this.guild?.members.fetch(id);
    }
    getCachedTextChannel(id) {
        return (this.guild || this.guilds.cache.get(process.env.GUILD_ID)).channels.cache.get(id);
    }
    async getAsyncTextChannel(id) {
        const guild = this.getCachedGuild() || this.guilds.cache.get(process.env.GUILD_ID) || (await this.guilds.fetch(process.env.GUILD_ID));
        return (this.getCachedTextChannel(id) || guild.channels.cache.get(id) || guild.channels.fetch(id));
    }
    async getAsyncMessage(inputChannel, messageId) {
        const resolvedChannel = typeof inputChannel === "string" ? await this.getAsyncTextChannel(inputChannel) : inputChannel;
        try {
            return resolvedChannel.messages.cache.get(messageId) || (await resolvedChannel.messages.fetch(messageId));
        }
        catch (error) {
            console.error(`Error fetching message: ${messageId} in channel: ${resolvedChannel?.name || inputChannel}${resolvedChannel && resolvedChannel.id ? ` with ID: ${resolvedChannel.id}` : ""}`, error);
            return null;
        }
    }
    async importFile(filePath) {
        return (await import(filePath))?.default;
    }
    async registerCommands({ global, commands }) {
        if (global) {
            this.application.commands.set(commands);
        }
        else {
            (this.guild || this.guilds.cache.get(process.env.GUILD_ID))?.commands.set(commands);
        }
    }
    async loadCommands() {
        const guildCommands = [];
        const globalCommands = [];
        const commandFiles = await getFiles(join(__dirname, `${directory}/commands/`));
        const commandReading = commandFiles.map((filePath) => {
            return this.importFile(`../commands/${filePath}`).then((command) => {
                if (!command) {
                    console.error("[Error code: 1132] Command file not valid", { filePath });
                    return;
                }
                if (!command.name) {
                    console.error("[Error code: 1135] Unable to find command name for", { filePath });
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
        const eventFiles = await getFiles(join(__dirname, `${directory}/events/`));
        const eventPromises = eventFiles.map((filePath) => {
            return this.importFile(`../events/${filePath}`).then((event) => {
                if (!event) {
                    console.error("[Error code: 1805] Event file not valid", { filePath });
                    return;
                }
                this.on(event.event, event.run);
            });
        });
        await Promise.all(eventPromises);
    }
    async loadButtons() {
        const buttonFiles = await getFiles(join(__dirname, `${directory}/buttons/`));
        const buttonReading = buttonFiles.map((filePath) => {
            return this.importFile(`../buttons/${filePath}`).then((button) => {
                if (!button) {
                    console.error("[Error code: 1140] Button file not valid", { filePath });
                    return;
                }
                this.buttons.set(button.name, button);
            });
        });
        await Promise.all(buttonReading);
    }
    async loadAutocompletions() {
        const autocompleteFiles = await getFiles(join(__dirname, `${directory}/autocompletions/`));
        const autocompleteReading = autocompleteFiles.map((filePath) => {
            return this.importFile(`../autocompletions/${filePath}`).then((autocomplete) => {
                if (!autocomplete) {
                    console.error("[Error code: 1141] Autocomplete file not valid", { filePath });
                    return;
                }
                console.debug("Autocomplete loaded", autocomplete.name);
                this.autocomplete.set(autocomplete.name, autocomplete);
                if (autocomplete.aliases) {
                    autocomplete.aliases.forEach((alias) => {
                        this.autocomplete.set(alias, autocomplete);
                    });
                }
            });
        });
        await Promise.all(autocompleteReading);
    }
    registerModules() {
        this.once("ready", async (client) => {
            this.guild = await this.fetchGuild(client);
            this.loadComponents().then(() => {
                if (process.env.NODE_ENV !== "development") {
                    this.loadProdComponents();
                }
                console.info(`\x1b[32m${this.user.username} online since ${new Date().toLocaleString()}\x1b[0m`);
                setTimeout(() => {
                    this.loadDelayedComponents();
                    fetchNewsArticles();
                }, 1000 * 30);
                VoteSystem.getInstance().init();
                this.fetchMembersAndMessages();
            });
        });
    }
    async fetchGuild(client) {
        const guild = await client.guilds.fetch(process.env.GUILD_ID);
        await guild.members.fetch();
        return guild;
    }
    loadComponents() {
        return Promise.all([this.loadButtons(), this.loadEvents(), this.loadCommands(), this.loadAutocompletions()]);
    }
    async loadProdComponents() {
        await pause(5000);
        tokenManagment();
        clanOnlineMemberActivityChecker();
        checkClanActivitiesPeriodically();
        handleMemberStatistics();
        this.startUpdatingPresence();
        restoreFetchedPGCRs();
    }
    loadDelayedComponents() {
        this.importFile("../core/guildNicknameManagement.js");
        cacheRaidMilestones();
        raidFireteamChecker();
        loadNotifications();
        fetchGlobalAlerts();
    }
    async fetchMembersAndMessages() {
        await pause(1000 * 2);
        this.guild.channels.cache.forEach(async (channel) => {
            if (channel.type === ChannelType.GuildVoice && channel.id !== this.guild.afkChannelId) {
                channel.members.forEach((member) => {
                    if (member.user.bot)
                        return;
                    voiceChannelJoinTimestamps.set(member.id, Date.now());
                });
            }
            if (channel.isTextBased()) {
                setTimeout(async () => {
                    if (channel.id === process.env.ENGLISH_NEWS_CHANNEL_ID) {
                        channel.messages.fetch({ limit: 100 }).then((channelMessages) => {
                            const twitterMessages = channelMessages.filter((m) => m.author.id === this.user.id && m.embeds?.[0]?.author?.url != null);
                            const alertMessages = channelMessages.filter((m) => m.author.id === this.user.id && m.embeds?.[0]?.title?.startsWith("D2-"));
                            twitterMessages.forEach((message) => processedRssLinks.add(message.embeds[0].author.url));
                            alertMessages.forEach((message) => lastAlertKeys.add(message.embeds[0].title));
                        });
                    }
                    else {
                        try {
                            await channel.messages.fetch({ limit: 15 });
                        }
                        catch (error) {
                            console.error(`[Error code: 1991] Looks like channel ${channel.name} was deleted during caching messages. Error: ${error.code}`);
                        }
                    }
                }, 10000 * Math.random());
            }
        });
    }
}
//# sourceMappingURL=client.js.map