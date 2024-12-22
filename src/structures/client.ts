import {
	APIInteractionGuildMember,
	ActivityOptions,
	ActivityType,
	ApplicationCommandDataResolvable,
	Client,
	ClientEvents,
	Collection,
	GatewayIntentBits,
	Guild,
	GuildBasedChannel,
	GuildMember,
	Partials,
	Snowflake,
	TextBasedChannel,
	TextChannel,
	User,
} from "discord.js";
import { schedule } from "node-cron";
import { join, resolve } from "path";
import UserErrors from "../configs/UserErrors.js";
import checkClanActivitiesPeriodically from "../core/periodicActivityChecker.js";
import { cacheDungeonRoles } from "../core/statisticsChecker/getDungeonRoleIds.js";
import handleMemberStatistics from "../core/statisticsChecker/userStatisticsManagement.js";
import tokenManagment from "../core/tokenManagement.js";
import { RegisterCommandOptions } from "../interfaces/RegisterCommand.js";
import { AutocompleteType } from "../types/autocomplete.js";
import { ButtonType } from "../types/button.js";
import { CommandType } from "../types/command.js";
import fetchNewsArticles from "../utils/api/bungieRssFetcher.js";
import { fetchGlobalAlerts } from "../utils/api/globalAlertsFetcher.js";
import { startRssFetcher } from "../utils/api/rssHandler.js";
import { cacheGuildsVoiceAndMessagesData } from "../utils/discord/initializeVoiceActivity.js";
import { fetchVexIncursionChannelMessages, removeNewsChannelOriginalButtons } from "../utils/discord/restoreMessageFunctions.js";
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
import { Event } from "./event.js";

const __dirname = resolve();
const directory = process.env.NODE_ENV! === "development" && process.env.LOCAL_ENV! === "true" ? "src" : "dist";

schedule(
	"57 20 * * 4",
	() => {
		process.exit(1);
	},
	{
		timezone: "GMT",
	}
);

export class ExtendedClient extends Client<true> {
	public commands: Collection<string, CommandType> = new Collection();
	public buttons: Collection<string, ButtonType> = new Collection();
	public autocomplete: Collection<string, AutocompleteType> = new Collection();

	private guild: Guild | undefined;
	private activities: ActivityOptions[] = [
		{ name: "🔁 Подготовка рейдов", type: ActivityType.Custom },
		{ name: "🔁 Обновление статистики", type: ActivityType.Custom },
		{ name: "🔁 Загрузка свежих данных", type: ActivityType.Custom },
		{ name: "🔁 Синхронизация данных", type: ActivityType.Custom },
		{ name: "🔁 Устранение ошибок", type: ActivityType.Custom },
		{ name: "🔁 Благодарность меценатам", type: ActivityType.Custom },
		{
			name: "🔁 Слежка за революцией",
			type: ActivityType.Streaming,
			url: "https://youtu.be/pLBhEAo2wXc?si=MNT4wpr-W4YXJ9r8&t=7",
		},
	];

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildPresences,
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

	public async start() {
		const sequelizeImport = import("../utils/persistence/sequelize.js");

		await Promise.all([this.login(process.env.TOKEN!), sequelizeImport]);

		this.registerModules();

		this.user.setPresence({
			status: "idle",
			activities: [this.activities[Math.floor(Math.random() * this.activities.length)]],
		});
	}

	public startUpdatingPresence() {
		// Run the function for the first time
		this.updatePresence();

		// Set an interval to run the function every 60 seconds
		const updateInterval = setInterval(() => {
			this.updatePresence();
		}, 60000);

		setTimeout(() => {
			const checkInterval = setInterval(() => {
				// If bot's status starts with reload emoji, stop all intervals to stop updating the bot's presence.
				if (!this.user.presence.activities[0].name.startsWith("🔁")) {
					clearInterval(updateInterval);
					clearInterval(checkInterval);
				}
			}, 3333);
		}, 1000 * 90);
	}

	public updatePresence() {
		// Select a random activity from the activities array
		const activity = this.activities[Math.floor(Math.random() * this.activities.length)];

		// Set the presence of the bot using the selected activity
		this.user.setPresence({
			status: "dnd",
			activities: [activity],
		});
	}

	public async getGuild(guild?: Guild | null): Promise<Guild> {
		if (guild) return guild;
		return this.guild || this.guilds.cache.get(process.env.GUILD_ID!) || this.guilds.fetch(process.env.GUILD_ID!);
	}

	public getCachedGuild(guild?: Guild | null): Guild {
		if (guild) return guild;

		return (this.guild || this.guilds.cache.get(process.env.GUILD_ID!))!;
	}

	public async getMember(memberOrId: string | GuildMember | User | APIInteractionGuildMember | null): Promise<GuildMember> {
		if (!memberOrId) {
			// console.debug(`[Error code: 2053] No data provided for member. Returning null`);
			throw { errorType: UserErrors.MEMBER_NOT_FOUND };
		}
		if (memberOrId instanceof GuildMember) return memberOrId;

		const guild = await this.getGuild();

		const memberId = typeof memberOrId === "string" ? memberOrId : memberOrId instanceof User ? memberOrId.id : memberOrId.user.id;

		const cachedMember = guild.members.cache.get(memberId);
		if (cachedMember) return cachedMember;

		// console.debug(`[Error code: 2033] Member not found in cache: ${memberId}`);

		const fetchedMember = await guild.members.fetch(memberId).catch(() => null);
		if (fetchedMember) return fetchedMember;

		console.error(`[Error code: 2034] Member not found: ${memberId}`);
		throw { errorType: UserErrors.MEMBER_NOT_FOUND };
	}

	public getCachedMembers(): Collection<string, GuildMember> {
		return (this.guild || this.guilds.cache.get(process.env.GUILD_ID!))!.members.cache;
	}

	public async getTextChannel(channelOrId: string | TextBasedChannel): Promise<TextChannel> {
		if (channelOrId instanceof TextChannel) return channelOrId;
		const channelId = typeof channelOrId === "string" ? channelOrId : channelOrId.id;

		const guild = await this.getGuild();

		const cachedTextChannel = guild.channels.cache.get(channelId) as TextChannel;

		if (cachedTextChannel) return cachedTextChannel;

		// console.debug(`[Error code: 2035] Text channel not found in cache: ${channelId}`);

		const fetchedTextChannel = await guild.channels.fetch(channelId).catch(() => null);
		if (fetchedTextChannel) return fetchedTextChannel as TextChannel;

		console.error(`[Error code: 2036] Text channel not found: ${channelId}`);
		throw { errorType: UserErrors.CHANNEL_NOT_FOUND };
	}

	public getCachedGuildChannel(channelOrId: string | GuildBasedChannel): GuildBasedChannel {
		if (typeof channelOrId !== "string") return channelOrId;
		const channelId = channelOrId;
		return this.getCachedGuild().channels.cache.get(channelId) as GuildBasedChannel;
	}

	public getCachedTextChannel(channelOrId: string | TextBasedChannel): TextChannel {
		if (channelOrId instanceof TextChannel) return channelOrId;
		const channelId = typeof channelOrId === "string" ? channelOrId : channelOrId.id;
		return this.getCachedGuild().channels.cache.get(channelId) as TextChannel;
	}

	public async getAsyncMessage(inputChannel: string | TextChannel, messageId: Snowflake) {
		const resolvedChannel = typeof inputChannel === "string" ? await this.getTextChannel(inputChannel) : inputChannel;
		try {
			return resolvedChannel.messages.cache.get(messageId) || (await resolvedChannel.messages.fetch(messageId));
		} catch (error) {
			console.error(
				`[Error code: 2004] Error fetching message: ${messageId} in channel: ${resolvedChannel?.name || inputChannel}${
					resolvedChannel && resolvedChannel.id ? ` with ID: ${resolvedChannel.id}` : ""
				}`,
				error
			);
			return null;
		}
	}

	private async importFile(filePath: string) {
		try {
			const absolutePath = resolve(__dirname, filePath);
			const moduleURL = new URL(`file://${absolutePath}`);
			const module = await import(moduleURL.href);
			return module.default || module;
		} catch (error) {
			console.error("[Error code: 2062] Failed to import", filePath, error);
		}
	}

	private async registerCommands({ global, commands }: RegisterCommandOptions) {
		try {
			if (global) {
				await this.application.commands.set(commands);
			} else {
				const targetGuild = this.guild || this.guilds.cache.get(process.env.GUILD_ID!);
				if (!targetGuild) {
					console.error("[Error code: 2063] Target guild is undefined, failed to set guild-specific commands");
					return;
				}
				await targetGuild.commands.set(commands);
			}
		} catch (error) {
			console.error("[Error code: 2064] Failed to register commands", error);
		}
	}

	private async loadCommands() {
		try {
			// Parallelize reading of commandFiles and importing of files
			const commandFiles = await getFiles(join(__dirname, `${directory}/commands/`));

			const commandReadingPromises = commandFiles.map((filePath) => this.importFile(filePath));

			// Destructure the commands into their respective categories in parallel.
			const commandStructs = await Promise.all(commandReadingPromises);
			const guildCommands: ApplicationCommandDataResolvable[] = [];
			const globalCommands: ApplicationCommandDataResolvable[] = [];

			for (const command of commandStructs) {
				if (!command || !command.name) {
					console.error("[Error code: 1132] Command file not valid", { filePath: command.filePath });
					continue; // Skip to the next iteration
				}

				// DRY principle: Handle userContextMenu, messageContextMenu, and the command in a unified manner
				const contexts = [command.userContextMenu, command.messageContextMenu, command].filter(Boolean);
				for (const context of contexts) {
					this.commands.set(context.name, command);
					(command.global ? globalCommands : guildCommands).push(context);
				}
			}

			// Registering both global and guild commands in parallel
			await Promise.all([
				this.registerCommands({ global: true, commands: globalCommands }),
				this.registerCommands({ global: false, commands: guildCommands }),
			]);
		} catch (error) {
			console.error("[Error code: 2059] Failed to load commands", error);
		}
	}

	private async loadEvents() {
		const eventFiles = await getFiles(join(__dirname, `${directory}/events/`));

		const eventPromises = eventFiles.map(async (filePath) => {
			const event: Event<keyof ClientEvents> = await this.importFile(filePath);
			if (!event) {
				console.error("[Error code: 1805] Event file not valid", { filePath });
				return;
			}
			this.on(event.event, event.run);
		});

		// Wait for all events to be loaded and registered
		await Promise.all(eventPromises);
	}

	private async loadButtons() {
		const buttonFiles = await getFiles(join(__dirname, `${directory}/buttons/`));

		const buttonReading = buttonFiles.map(async (filePath) => {
			const button: ButtonType = await this.importFile(filePath);

			if (!button) {
				console.error("[Error code: 1140] Button file not valid", filePath);
				return;
			}
			this.buttons.set(button.name, button);
		});

		// Wait for all buttons to be read and registered
		await Promise.all(buttonReading);
	}

	private async loadAutocompletions() {
		const autocompleteFiles = await getFiles(join(__dirname, `${directory}/autocompletions/`));

		const autocompleteReading = autocompleteFiles.map(async (filePath) => {
			const autocomplete: AutocompleteType = await this.importFile(filePath);
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

		// Wait for all autocompletions to be read and registered
		await Promise.all(autocompleteReading);
	}

	private registerModules() {
		this.once("ready", async (client) => {
			this.guild = await this.fetchGuild(client);

			await this.loadComponents();

			if (process.env.NODE_ENV! !== "development") {
				this.loadProdComponents();
			}

			console.info(`\x1b[32m${this.user.username} online since ${new Date().toLocaleString()}\x1b[0m`);

			// setTimeout(() => {
			// this.loadDelayedComponents();
			// }, 10 * 1000);

			await Promise.allSettled([
				cacheDungeonRoles(),
				restoreDataFromRedis(),
				VoteSystem.getInstance().init(),
				LFGController.getInstance().init(),
				cacheGuildsVoiceAndMessagesData(),
				updateActivityCache(),
			]);
		});
	}

	private async fetchGuild(client: Client<true>): Promise<Guild> {
		const guild = await client.guilds.fetch(process.env.GUILD_ID!);
		await guild.members.fetch();
		return guild;
	}

	private loadComponents() {
		return Promise.all([this.loadButtons(), this.loadEvents(), this.loadCommands(), this.loadAutocompletions()]);
	}

	private async loadProdComponents() {
		await pause(5000);

		this.startUpdatingPresence();
		await pause(1000);
		tokenManagment().catch((error) => console.error("Received an error from the main function 1", error));
		await pause(1000);
		clanOnlineMemberActivityChecker().catch((error) => console.error("Received an error from the main function 2", error));
		await pause(1000);
		checkClanActivitiesPeriodically().catch((error) => console.error("Received an error from the main function 3", error));
		await pause(1000);
		handleMemberStatistics().catch((error) => console.error("Received an error from the main function 4", error));
		await pause(1000);
		restoreFetchedPGCRs().catch((error) => console.error("Received an error from the main function 5", error));
		await pause(1000);
		loadNotifications().catch((error) => console.error("Received an error from the main function 6", error));

		await pause(2000);
		cacheRaidMilestones().catch((error) => console.error("Received an error from the main function 7", error));
		await pause(2000);

		await pause(2000);
		raidFireteamCheckerSystem().catch((error) => console.error("Received an error from the main function 8", error));
		await pause(1000);
		import("../core/guildNicknameManagement.js").catch((error) => console.error("Received an error from the main function 9", error));
		await pause(1000 * 15);
		startRssFetcher().catch((error) => console.error("Received an error from the main function 10", error));
		await pause(2000);
		removeNewsChannelOriginalButtons().catch((error) => console.error("Received an error from the main function 11", error));
		await pause(1000);
		fetchVexIncursionChannelMessages().catch((error) => console.error("Received an error from the main function 12", error));
		await pause(1000);

		setTimeout(() => {
			fetchGlobalAlerts();
			fetchNewsArticles().catch((error) => console.error("Received an error from the main function 13", error));
		}, 1000 * 60);
	}
}
