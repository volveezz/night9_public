import { ActivityType, ChannelType, Client, Collection, GatewayIntentBits, GuildMember, Partials, TextChannel, } from "discord.js";
import { join, resolve } from "path";
import { pathToFileURL } from "url";
import checkClanActivitiesPeriodically from "../core/periodicActivityChecker.js";
import handleMemberStatistics from "../core/statisticsChecker/userStatisticsManagement.js";
import tokenManagment from "../core/tokenManagement.js";
import fetchNewsArticles from "../utils/api/bungieRssFetcher.js";
import { fetchGlobalAlerts } from "../utils/api/globalAlertsFetcher.js";
import { voiceChannelJoinTimestamps } from "../utils/discord/userActivityHandler.js";
import { clanOnlineMemberActivityChecker } from "../utils/general/activityCompletionChecker.js";
import { updateActivityCache } from "../utils/general/cacheAvailableActivities.js";
import cacheRaidMilestones from "../utils/general/cacheRaidMilestones.js";
import getFiles from "../utils/general/fileReader.js";
import raidFireteamCheckerSystem from "../utils/general/raidFunctions/raidFireteamChecker/raidFireteamChecker.js";
import { loadNotifications } from "../utils/general/raidFunctions/raidNotifications.js";
import restoreDataFromRedis from "../utils/general/redisData/restoreDataFromRedis.js";
import { pause } from "../utils/general/utilities.js";
import { restoreFetchedPGCRs } from "../utils/logging/activityLogger.js";
import { LFGController } from "./LFGController.js";
import VoteSystem from "./VoteSystem.js";
const __dirname = resolve();
const directory = process.env.NODE_ENV === "development" && process.env.LOCAL_ENV === "true" ? "src" : "dist";
export class ExtendedClient extends Client {
    commands = new Collection();
    buttons = new Collection();
    autocomplete = new Collection();
    guild;
    activities = [
        { name: "🔁 Подготовка рейдов", type: ActivityType.Custom },
        { name: "🔁 Обновление статистики", type: ActivityType.Custom },
        { name: "🔁 Загрузка свежих данных", type: ActivityType.Custom },
        { name: "🔁 Синхронизация данных", type: ActivityType.Custom },
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
        const seqPromise = import(`../utils/persistence/sequelize.js`);
        await Promise.all([this.login(process.env.TOKEN), seqPromise]);
        this.user.setPresence({
            activities: [this.activities[Math.floor(Math.random() * this.activities.length)]],
            status: "idle",
        });
        this.registerModules();
    }
    startUpdatingPresence() {
        this.updatePresence();
        const updateInterval = setInterval(() => {
            this.updatePresence();
        }, 60000);
        setTimeout(() => {
            const checkInterval = setInterval(() => {
                if (!this.user.presence.activities[0].name.startsWith("🔁")) {
                    clearInterval(updateInterval);
                    clearInterval(checkInterval);
                }
            }, 3333);
        }, 1000 * 90);
    }
    updatePresence() {
        const activity = this.activities[Math.floor(Math.random() * this.activities.length)];
        this.user.setPresence({
            status: "dnd",
            activities: [activity],
        });
    }
    async getGuild(guild) {
        if (guild)
            return guild;
        return this.guild || this.guilds.cache.get(process.env.GUILD_ID) || this.guilds.fetch(process.env.GUILD_ID);
    }
    getCachedGuild(guild) {
        if (guild)
            return guild;
        return (this.guild || this.guilds.cache.get(process.env.GUILD_ID));
    }
    async getMember(memberOrId) {
        if (!memberOrId) {
            console.debug(`[Error code: 2053] No data provided for member. Returning null`);
            throw { errorType: "MEMBER_NOT_FOUND" };
        }
        if (memberOrId instanceof GuildMember)
            return memberOrId;
        const guild = await this.getGuild();
        const memberId = typeof memberOrId === "string" ? memberOrId : memberOrId.user.id;
        const cachedMember = guild.members.cache.get(memberId);
        if (cachedMember)
            return cachedMember;
        console.debug(`[Error code: 2033] Member not found in cache: ${memberId}`);
        const fetchedMember = await guild.members.fetch(memberId).catch(() => null);
        if (fetchedMember)
            return fetchedMember;
        console.error(`[Error code: 2034] Member not found: ${memberId}`);
        throw { errorType: "MEMBER_NOT_FOUND" };
    }
    getCachedMembers() {
        return (this.guild || this.guilds.cache.get(process.env.GUILD_ID)).members.cache;
    }
    async getTextChannel(channelOrId) {
        if (channelOrId instanceof TextChannel)
            return channelOrId;
        const channelId = typeof channelOrId === "string" ? channelOrId : channelOrId.id;
        const guild = await this.getGuild();
        const cachedTextChannel = guild.channels.cache.get(channelId);
        if (cachedTextChannel)
            return cachedTextChannel;
        console.debug(`[Error code: 2035] Text channel not found in cache: ${channelId}`);
        const fetchedTextChannel = await guild.channels.fetch(channelId).catch(() => null);
        if (fetchedTextChannel)
            return fetchedTextChannel;
        console.error(`[Error code: 2036] Text channel not found: ${channelId}`);
        throw { errorType: "CHANNEL_NOT_FOUND" };
    }
    getCachedTextChannel(channelOrId) {
        if (channelOrId instanceof TextChannel)
            return channelOrId;
        const channelId = typeof channelOrId === "string" ? channelOrId : channelOrId.id;
        return this.getCachedGuild().channels.cache.get(channelId);
    }
    async getAsyncMessage(inputChannel, messageId) {
        const resolvedChannel = typeof inputChannel === "string" ? await this.getTextChannel(inputChannel) : inputChannel;
        try {
            return resolvedChannel.messages.cache.get(messageId) || (await resolvedChannel.messages.fetch(messageId));
        }
        catch (error) {
            console.error(`[Error code: 2004] Error fetching message: ${messageId} in channel: ${resolvedChannel?.name || inputChannel}${resolvedChannel && resolvedChannel.id ? ` with ID: ${resolvedChannel.id}` : ""}`, error);
            return null;
        }
    }
    async importFile(filePath) {
        try {
            const fileUrl = pathToFileURL(filePath);
            const module = await import(fileUrl.toString());
            return module.default || module;
        }
        catch (error) {
            console.error("[Error code: 2062] Failed to import file", { filePath }, error);
        }
    }
    async registerCommands({ global, commands }) {
        try {
            if (global) {
                await this.application.commands.set(commands);
            }
            else {
                const targetGuild = this.guild || this.guilds.cache.get(process.env.GUILD_ID);
                if (!targetGuild) {
                    console.error("[Error code: 2063] Target guild is undefined, failed to set guild-specific commands");
                    return;
                }
                await targetGuild.commands.set(commands);
            }
        }
        catch (error) {
            console.error("[Error code: 2064] Failed to register commands", error);
        }
    }
    async loadCommands() {
        try {
            const commandFiles = await getFiles(join(__dirname, `${directory}/commands/`));
            const commandReadingPromises = commandFiles.map((filePath) => this.importFile(filePath));
            const commandStructs = await Promise.all(commandReadingPromises);
            const guildCommands = [];
            const globalCommands = [];
            for (const command of commandStructs) {
                if (!command || !command.name) {
                    console.error("[Error code: 1132] Command file not valid", { filePath: command.filePath });
                    continue;
                }
                const contexts = [command.userContextMenu, command.messageContextMenu, command].filter(Boolean);
                for (const context of contexts) {
                    this.commands.set(context.name, command);
                    (command.global ? globalCommands : guildCommands).push(context);
                }
            }
            await Promise.all([
                this.registerCommands({ global: true, commands: globalCommands }),
                this.registerCommands({ global: false, commands: guildCommands }),
            ]);
        }
        catch (error) {
            console.error("[Error code: 2059] Failed to load commands", error);
        }
    }
    async loadEvents() {
        const eventFiles = await getFiles(join(__dirname, `${directory}/events/`));
        const eventPromises = eventFiles.map(async (filePath) => {
            const event = await this.importFile(filePath);
            if (!event) {
                console.error("[Error code: 1805] Event file not valid", { filePath });
                return;
            }
            this.on(event.event, event.run);
        });
        await Promise.all(eventPromises);
    }
    async loadButtons() {
        const buttonFiles = await getFiles(join(__dirname, `${directory}/buttons/`));
        const buttonReading = buttonFiles.map(async (filePath) => {
            const button = await this.importFile(filePath);
            if (!button) {
                console.error("[Error code: 1140] Button file not valid", { filePath });
                return;
            }
            this.buttons.set(button.name, button);
        });
        await Promise.all(buttonReading);
    }
    async loadAutocompletions() {
        const autocompleteFiles = await getFiles(join(__dirname, `${directory}/autocompletions/`));
        const autocompleteReading = autocompleteFiles.map(async (filePath) => {
            const autocomplete = await this.importFile(filePath);
            if (!autocomplete) {
                console.error("[Error code: 1141] Autocomplete file not valid", { filePath });
                return;
            }
            this.autocomplete.set(autocomplete.name, autocomplete);
            if (autocomplete.aliases) {
                for (let i = 0; i < autocomplete.aliases.length; i++) {
                    this.autocomplete.set(autocomplete.aliases[i], autocomplete);
                }
            }
        });
        await Promise.all(autocompleteReading);
    }
    registerModules() {
        this.once("ready", async (client) => {
            this.guild = await this.fetchGuild(client);
            await this.loadComponents();
            if (process.env.NODE_ENV !== "development") {
                this.loadProdComponents();
            }
            console.info(`\x1b[32m${this.user.username} online since ${new Date().toLocaleString()}\x1b[0m`);
            Promise.allSettled([
                restoreDataFromRedis(),
                VoteSystem.getInstance().init(),
                LFGController.getInstance().init(),
                this.fetchMembersAndMessages(),
                updateActivityCache(),
            ]);
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
        this.startUpdatingPresence();
        await pause(1000);
        tokenManagment();
        await pause(1000);
        clanOnlineMemberActivityChecker();
        await pause(1000);
        checkClanActivitiesPeriodically();
        await pause(1000);
        handleMemberStatistics();
        await pause(1000);
        restoreFetchedPGCRs();
        await pause(1000);
        loadNotifications();
        await pause(2000);
        cacheRaidMilestones();
        await pause(2000);
        if (process.env.NODE_ENV === "production") {
            await pause(2000);
            raidFireteamCheckerSystem();
            await pause(1000);
            this.importFile("../utils/api/rssHandler.js");
            await pause(1000 * 15);
            this.importFile("../core/guildNicknameManagement.js");
            await pause(2000);
            setTimeout(() => {
                fetchGlobalAlerts();
                fetchNewsArticles();
            }, 1000 * 60);
        }
    }
    async fetchMembersAndMessages() {
        await pause(1000);
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
                    try {
                        await channel.messages.fetch({ limit: 15 });
                    }
                    catch (error) {
                        console.error(`[Error code: 1991] Looks like channel ${channel.name} was deleted during caching messages. Error: ${error.code}`);
                    }
                }, 10000 * Math.random());
            }
        });
    }
}
//# sourceMappingURL=client.js.map