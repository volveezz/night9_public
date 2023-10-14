import { ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, } from "discord.js";
import pkg from "lodash";
import { Op } from "sequelize";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import checkIfUserRecentlyCreatedActivity from "../utils/discord/checkRecentlyCreatedActivity.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { activityCache } from "../utils/general/cacheAvailableActivities.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { convertModifiersPlaceholders } from "../utils/general/raidFunctions/convertModifiersPlaceholders.js";
import convertTimeStringToNumber from "../utils/general/raidFunctions/convertTimeStringToNumber.js";
import { descriptionFormatter, escapeString } from "../utils/general/utilities.js";
import { bungieNames, userTimezones } from "../utils/persistence/dataStore.js";
import { LfgDatabase } from "../utils/persistence/sequelizeModels/lfgDatabase.js";
import notificationScheduler from "./notificationScheduler.js";
const { debounce } = pkg;
export class LFGController {
    imagesArray = [
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525099763748884/1330659.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525100510322688/1303098.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525098287341648/1303108.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525100103479316/1084102.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157526337502855258/1306194.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525099054903366/1306393.webp",
        "https://cdn.discordapp.com/attachments/1134620378615001178/1157525099390443692/1308368.webp",
    ];
    textChannel = null;
    localCache = {};
    syncCacheDebounced;
    static instance;
    constructor() {
        this.textChannel = client.getCachedTextChannel(process.env.PVE_PARTY_CHANNEL_ID);
        this.syncCacheDebounced = debounce(this.syncCacheToDb, 60000);
    }
    findAvailableLfgIdsForUser(userId) {
        const availableLfgIds = [];
        for (const lfgId in this.localCache) {
            const lfg = this.localCache[lfgId];
            if (!userId || lfg.creatorId === userId) {
                availableLfgIds.push(Number(lfgId));
            }
        }
        return availableLfgIds;
    }
    static getInstance() {
        if (!LFGController.instance) {
            LFGController.instance = new LFGController();
        }
        return LFGController.instance;
    }
    async saveToDatabaseFlush() {
        console.debug("Received a call. Beginning of lfg database synchronization");
        this.syncCacheDebounced.flush();
    }
    async syncCacheToDb() {
        console.debug("Syncing local cache to database");
        const cacheIds = Object.keys(this.localCache).map(Number);
        const dbRecords = await LfgDatabase.findAll({
            where: {
                id: {
                    [Op.in]: cacheIds,
                },
            },
        });
        const dbRecordMap = new Map();
        dbRecords.forEach((record) => {
            dbRecordMap.set(record.id, record);
        });
        for (const id in this.localCache) {
            console.debug(`Syncing LFG ${id} to database`);
            const cacheData = this.localCache[id];
            const dbRecord = dbRecordMap.get(Number(id));
            if (dbRecord) {
                dbRecord.joinedUsers = cacheData.joinedUsers;
                dbRecord.hotJoinedUsers = cacheData.hotJoinedUsers;
                dbRecord.userLimit = cacheData.userLimit;
                dbRecord.activityHash = cacheData.activityHash ?? null;
                dbRecord.activityName = cacheData.activityName ?? null;
                dbRecord.time = cacheData.time;
                dbRecord.creatorId = cacheData.creatorId;
                dbRecord.channelId = cacheData.channel?.id ?? null;
                dbRecord.messageId = cacheData.message?.id ?? null;
                dbRecord.requiredDLC = cacheData.requiredDLC;
                await dbRecord.save();
                console.debug(`Updated LFG ${id} in database`);
            }
        }
        console.debug("Syncing local cache to database completed successfully");
    }
    async init() {
        try {
            const lfgRecords = await LfgDatabase.findAll();
            const guild = await client.getGuild();
            lfgRecords.forEach(async (record) => {
                this.localCache[record.id] = {
                    guild,
                    description: null,
                    message: null,
                    channel: null,
                    joinmentState: false,
                    managementMessage: null,
                    activityHash: record.activityHash ?? null,
                    activityName: record.activityName ?? null,
                    requiredDLC: record.requiredDLC,
                    ...record.dataValues,
                };
                let message = null;
                let channel = null;
                if (process.env.NODE_ENV === "production") {
                    channel = await ((record.channelId && (await client.getTextChannel(record.channelId).catch(() => null))) ||
                        this.createLfgPrivateChannel(record));
                    message = await ((record.messageId &&
                        (await client.getAsyncMessage(this.textChannel, record.messageId).catch(() => null))) ||
                        this.sendLfgMessage({ lfg: record }));
                    if (!message) {
                        throw { errorType: "LFG_MESSAGE_NOT_FOUND" };
                    }
                }
                else {
                    message = record.messageId ? await client.getAsyncMessage(this.textChannel, record.messageId).catch(() => null) : null;
                    channel = record.channelId ? await client.getTextChannel(record.channelId).catch(() => null) : null;
                }
                if (!message && !channel && process.env.NODE_ENV !== "production") {
                    delete this.localCache[record.id];
                    return;
                }
                const descriptionField = message && message.embeds[0].fields.find((field) => field.name === "Описание");
                this.localCache[record.id].description = descriptionField?.value ?? null;
                this.localCache[record.id].message = message;
                this.localCache[record.id].channel = channel;
                this.localCache[record.id].joinmentState =
                    message &&
                        message.components[0].components.find((buttonC) => {
                            buttonC.customId.startsWith("lfgController_join");
                        })?.disabled
                        ? true
                        : false;
            });
            notificationScheduler.updateCache({ lfgCache: this.localCache });
            console.info("Initial sync with database completed successfully");
        }
        catch (error) {
            console.error("[Error code: 2048] Error during initial sync with database:", error);
        }
    }
    getCacheById(id) {
        return this.localCache[id];
    }
    generateMemberCountText(joinedUsers) {
        switch (joinedUsers) {
            case 1:
                return "Участник";
            case 2:
            case 3:
            case 4:
                return "Участника";
            default:
                return "Участников";
        }
    }
    generateLfgJoinedField(lfg) {
        if (lfg.joinedUsers.length === 0) {
            return {
                name: `${this.generateMemberCountText(0)}: 0/${lfg.userLimit}`,
                value: `⁣　*никого*`,
                inline: false,
            };
        }
        const cachedMembers = client.getCachedMembers();
        const joinedUsersMap = lfg.joinedUsers.map((userId, index) => {
            const member = cachedMembers.get(userId);
            return `⁣　${index + 1}. **${nameCleaner(member?.displayName || "неизвестный пользователь", true)}**${bungieNames.has(userId) ? ` - ${escapeString(bungieNames.get(userId))}` : ""}`;
        });
        const joinedUsers = joinedUsersMap.join("\n");
        return {
            name: `${this.generateMemberCountText(lfg.joinedUsers.length)}: ${lfg.joinedUsers.length}/${lfg.userLimit}`,
            value: joinedUsers,
            inline: false,
        };
    }
    generateChannelName(id, activityName) {
        const emoji = "💡｜";
        const separator = "-";
        let remainingLength = 19 - emoji.length - id.toString().length - separator.length;
        if (activityName.trim().length === 0) {
            return `${emoji}${id}${separator}активность`.toLowerCase();
        }
        const cleanedActivity = activityName
            .toLowerCase()
            .replace(/[/.]/g, " ")
            .replace(/[^\wа-яё \-]/gi, "")
            .trim()
            .replace(/\s+/g, " ");
        if (cleanedActivity.length <= remainingLength) {
            return cleanString(`${emoji}${id}${separator}${cleanedActivity}`).toLowerCase();
        }
        const words = cleanedActivity.split(/[ :]/).filter((word) => word);
        function abbreviate(word, maxLength) {
            if (word.length <= maxLength)
                return word;
            const vowels = ["а", "е", "ё", "и", "о", "у", "ы", "э", "ю", "я"];
            let abbreviation = word.slice(0, maxLength);
            while (vowels.includes(abbreviation[abbreviation.length - 1]) && abbreviation.length > 1)
                abbreviation = abbreviation.slice(0, -1);
            return abbreviation;
        }
        let result = [];
        for (const word of words) {
            let abbreviatedWord = abbreviate(word, 5);
            if (words.indexOf(word) === words.length - 1 && result.join(separator).length + abbreviatedWord.length + 1 <= remainingLength)
                abbreviatedWord = word;
            if (result.join(separator).length + abbreviatedWord.length + 1 <= remainingLength) {
                result.push(abbreviatedWord);
                remainingLength -= abbreviatedWord.length + separator.length;
            }
            else {
                const abbreviatedToFit = abbreviate(word, word.length === remainingLength + 1 ? remainingLength + 1 : remainingLength);
                if (abbreviatedToFit)
                    result.push(abbreviatedToFit);
                break;
            }
        }
        return cleanString(`${emoji}${id}${separator}${result.join(separator)}`).toLowerCase();
        function cleanString(str) {
            const pairs = [
                ["«", "»"],
                ["[", "]"],
                ["(", ")"],
            ];
            for (const [open, close] of pairs) {
                if ((str.includes(open) && !str.includes(close)) || (!str.includes(open) && str.includes(close))) {
                    str = str.replace(new RegExp(`[${open}${close}]`, "g"), "");
                }
            }
            str = str.replace(/[/<>\|&^@#$%*=+]/g, "-");
            str = str.replace(/[,.!]/g, "");
            return str.replace(/^-+|-+$|--+|-—-/g, "-").replace(/ /g, "-");
        }
    }
    async generateManagementMessageModifiersField(lfg) {
        const savedActivityDetails = lfg.activityHash && activityCache[lfg.activityHash];
        if (!savedActivityDetails || !savedActivityDetails.validModifiers)
            return null;
        const modifiersDefinition = await GetManifest("DestinyActivityModifierDefinition");
        let fields = [
            {
                name: "Модификаторы активности",
                value: "",
                inline: false,
            },
        ];
        for (const modifier of savedActivityDetails.validModifiers) {
            const modifierDefinition = modifiersDefinition[modifier];
            if (!modifierDefinition)
                continue;
            const modifierName = modifierDefinition.displayProperties.name;
            let modifierDescription = modifierDefinition.displayProperties.description;
            if (modifierDescription.endsWith(".")) {
                modifierDescription = modifierDescription.slice(0, -1);
            }
            modifierDescription = convertModifiersPlaceholders(modifierDescription)
                .replace(/^./, (match) => match.toLowerCase())
                .replace(/(?:\.)?\n+/g, ". ")
                .replace(/ +/g, " ");
            const newModifier = `⁣　⁣**${modifierName}**: ${modifierDescription}`;
            const currentFieldIndex = fields.length - 1;
            const newFieldValue = fields[currentFieldIndex].value ? fields[currentFieldIndex].value + "\n" + newModifier : newModifier;
            if (newFieldValue.length > 1024) {
                if (fields.length >= 3)
                    return fields;
                fields.push({ name: "⁣", value: "", inline: false });
                fields[fields.length - 1].value = newModifier;
            }
            else {
                fields[currentFieldIndex].value = newFieldValue;
            }
        }
        return fields.length === 1 && !fields[0].value.length ? null : fields;
    }
    async generateManagementMessage(lfg) {
        const lfgObject = this.localCache[lfg.id];
        const { joinmentState, id } = lfgObject;
        const embed = new EmbedBuilder().setColor(colors.deepBlue).setTitle("Управление сбором");
        const components = [
            joinmentState
                ? new ButtonBuilder()
                    .setCustomId("lfgManagement_unlock" + `_${id}`)
                    .setLabel("Открыть сбор")
                    .setStyle(ButtonStyle.Success)
                : new ButtonBuilder()
                    .setCustomId("lfgManagement_lock" + `_${id}`)
                    .setLabel("Закрыть сбор")
                    .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("lfgManagement_delete" + `_${id}`)
                .setLabel("Удалить сбор")
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId("lfgManagement_resendMainMessage" + `_${id}`)
                .setLabel("Переслать сообщение сбора")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId("lfgManagement_resendManagementMessage" + `_${id}`)
                .setLabel("Переслать сообщение для управления сбором")
                .setStyle(ButtonStyle.Secondary),
        ];
        const modifiersField = await this.generateManagementMessageModifiersField(lfg);
        if (modifiersField?.length) {
            try {
                embed.addFields(modifiersField);
            }
            catch (error) {
                console.error("[Error code: 2072] Failed to add modifiers field to embed", error);
            }
        }
        return {
            embeds: [embed],
            components: addButtonsToMessage(components),
        };
    }
    async sendOrUpdateManagementMessage(lfg) {
        const lfgObject = this.localCache[lfg.id];
        const { channel, managementMessage } = lfgObject;
        const messageOptions = await this.generateManagementMessage(lfg);
        let privateMessage;
        if (managementMessage) {
            privateMessage = await managementMessage.edit(messageOptions);
            console.debug("Updated management message");
        }
        else {
            const targetChannel = channel || (await this.createLfgPrivateChannel(lfg));
            privateMessage = await targetChannel.send({ ...messageOptions, allowedMentions: { parse: [] } });
            await privateMessage.pin("LFG Management message");
            console.debug("Sent new management message");
            lfgObject.managementMessage = privateMessage;
        }
    }
    async createLfgPrivateChannel(passedLfgObject) {
        const lfg = this.localCache[passedLfgObject.id];
        const { id, creatorId, guild, activityHash, activityName: userDefinedActivityName } = lfg;
        const member = await client.getMember(creatorId);
        const activityName = (activityHash && (await GetManifest("DestinyActivityDefinition"))[Number(activityHash)].displayProperties.name) ||
            userDefinedActivityName ||
            "активность";
        const channelName = this.generateChannelName(id, activityName);
        const channel = await guild.channels.create({
            name: channelName,
            parent: process.env.PVE_PARTY_CATEGORY,
            position: this.textChannel.rawPosition + 1,
            permissionOverwrites: [
                {
                    deny: "ViewChannel",
                    id: guild.roles.everyone,
                },
                {
                    allow: ["ViewChannel", "ManageMessages", "MentionEveryone"],
                    id: creatorId,
                },
            ],
            reason: `${nameCleaner(member.displayName)} created a new lfg`,
        });
        lfg.channel = channel;
        this.syncCacheDebounced();
        this.sendOrUpdateManagementMessage(lfg);
        return channel;
    }
    async checkUserPermissions(userIdOrMember, lfgId) {
        const lfg = this.localCache[lfgId];
        if (!lfg) {
            throw { errorType: "LFG_NOT_FOUND", errorData: [lfgId] };
        }
        const member = await client.getMember(userIdOrMember);
        if (!member) {
            throw { errorType: "MEMBER_NOT_FOUND" };
        }
        if (member.permissions.has("Administrator")) {
            return true;
        }
        if (lfg.creatorId !== (typeof userIdOrMember === "string" ? userIdOrMember : userIdOrMember.user.id)) {
            const creatorMember = client.getCachedMembers().get(lfg.creatorId);
            const displayName = creatorMember && nameCleaner(creatorMember.displayName, true);
            throw { errorType: "ACTIVITY_MISSING_PERMISSIONS", errorData: { displayName } };
        }
        return true;
    }
    async toggleLfgButtons(lfg, enable = false) {
        const lfgObject = this.localCache[typeof lfg === "number" ? lfg : lfg.id];
        lfgObject.joinmentState = enable;
        this.updateMessage(lfgObject);
    }
    async generateLfgPublicMessage(lfgInput) {
        const lfg = this.localCache[lfgInput.id];
        const { id, time, description, hotJoinedUsers, message, userLimit, joinedUsers, joinmentState } = lfg;
        const cachedMembers = client.getCachedMembers() || (await client.getMember(lfg.creatorId));
        const member = cachedMembers.get(lfg.creatorId);
        const manifest = await GetManifest("DestinyActivityDefinition");
        const activity = manifest[Number(lfg.activityHash)];
        const acitivtyIcon = activity && (activity.displayProperties.icon || activity.displayProperties.highResIcon);
        const authorIcon = acitivtyIcon?.length > 5 && acitivtyIcon !== "/img/misc/missing_icon_d2.png" ? `https://bungie.net${acitivtyIcon}` : undefined;
        const activityName = (activity && (activity.displayProperties.name || activity.originalDisplayProperties.name)) || lfg.activityName;
        if (!activityName) {
            throw { errorType: "LFG_ACTIVITY_NOT_FOUND", errorData: [activityName] };
        }
        const channel = lfg.channel || (await this.createLfgPrivateChannel(lfg));
        const embed = new EmbedBuilder()
            .setTitle(activityName)
            .setColor(joinedUsers.length === userLimit ? colors.invisible : colors.deepBlue)
            .addFields({
            name: "Id сбора",
            value: `[${id}](https://discord.com/channels/${process.env.GUILD_ID}/${channel.id})`,
            inline: true,
        }, {
            name: `Начало: <t:${time}:R>`,
            value: `<t:${time}>`,
            inline: true,
        }, ...(description ? [{ name: "Описание", value: descriptionFormatter(description), inline: false }] : []), this.generateLfgJoinedField(lfg))
            .setFooter({ text: `Создатель сбора: ${nameCleaner(member?.displayName || "не найден :(")}`, iconURL: authorIcon });
        if (hotJoinedUsers.length > 0) {
            const hotJoinedUsersNames = hotJoinedUsers.map((userId) => {
                const member = cachedMembers.get(userId);
                return member ? nameCleaner(member.displayName, true) : userId;
            });
            embed.addFields({ name: `На замене ${hotJoinedUsers.length}`, value: hotJoinedUsersNames.join("\n"), inline: true });
        }
        let thumbnailUrl;
        if (message && message.embeds[0]) {
            const imageUrl = message.embeds[0].image?.url;
            if (imageUrl)
                embed.setImage(imageUrl);
            thumbnailUrl = message.embeds[0].thumbnail?.url;
        }
        const placeholderImage = "https://bungie.net/img/theme/destiny/bgs/pgcrs/placeholder.jpg";
        if (!thumbnailUrl || (thumbnailUrl && !this.imagesArray.includes(thumbnailUrl) && !lfg.activityHash)) {
            thumbnailUrl = this.imagesArray[Math.floor(Math.random() * this.imagesArray.length)];
        }
        if (lfg.activityHash && activity) {
            const activityImage = activity.pgcrImage && `https://bungie.net${activity.pgcrImage}` !== placeholderImage
                ? `https://bungie.net${activity.pgcrImage}`
                : null;
            if (activityImage && (!thumbnailUrl || thumbnailUrl !== activityImage)) {
                thumbnailUrl = activityImage;
            }
        }
        if (!thumbnailUrl) {
            thumbnailUrl = message?.embeds[0]?.thumbnail?.url || this.imagesArray[Math.floor(Math.random() * this.imagesArray.length)];
        }
        if (thumbnailUrl)
            embed.setThumbnail(thumbnailUrl);
        const joinButton = new ButtonBuilder().setCustomId("lfgController_join" + `_${id}`).setDisabled(joinmentState ?? false);
        if (joinedUsers.length >= userLimit) {
            joinButton.setLabel("В запас").setStyle(ButtonStyle.Primary);
        }
        else {
            joinButton.setLabel("Записаться").setStyle(ButtonStyle.Success);
        }
        const components = addButtonsToMessage([
            joinButton,
            new ButtonBuilder()
                .setCustomId("lfgController_leave" + `_${id}`)
                .setLabel("Выйти")
                .setStyle(ButtonStyle.Danger),
        ]);
        return { embeds: [embed], components };
    }
    async sendLfgMessage({ lfg, mention, messageOptions }) {
        const lfgChannel = this.textChannel;
        let additionalOptions = { content: undefined };
        if (mention && lfg.requiredDLC && !checkIfUserRecentlyCreatedActivity(lfg.creatorId)) {
            const everyoneRole = client.getCachedGuild().roles.everyone;
            const isEveryoneRole = lfg.requiredDLC === everyoneRole.id;
            additionalOptions.content = isEveryoneRole ? everyoneRole.toString() : `<@&${lfg.requiredDLC}>`;
        }
        const message = await lfgChannel.send({ ...(messageOptions || (await this.generateLfgPublicMessage(lfg))), ...additionalOptions });
        if (!(lfg instanceof LfgDatabase)) {
            lfg.message = message;
            this.syncCacheDebounced();
        }
        return message;
    }
    async updateMessage(lfgObject) {
        const lfg = lfgObject instanceof LfgDatabase ? this.localCache[lfgObject.id] : lfgObject;
        const messageOptions = await this.generateLfgPublicMessage(lfg);
        if (!lfg.message) {
            await this.sendLfgMessage({ lfg, messageOptions });
        }
        if (!lfg.message) {
            throw { errorType: "LFG_MESSAGE_NOT_FOUND" };
        }
        await lfg.message.edit(messageOptions);
    }
    async createLFG({ activityName, activityHash, time, description, requiredDLC, userLimit: predefinedUserLimit, creatorId, guild, }) {
        const userLimit = (predefinedUserLimit || activityHash
            ? (await GetManifest("DestinyActivityDefinition"))[Number(activityHash)]?.matchmaking?.maxParty
            : 3) ?? 3;
        const lfgEvent = await LfgDatabase.create({
            activityHash,
            activityName,
            time,
            userLimit,
            requiredDLC,
            creatorId,
            joinedUsers: [creatorId],
        });
        this.localCache[lfgEvent.id] = {
            id: lfgEvent.id,
            joinedUsers: [creatorId],
            hotJoinedUsers: [],
            userLimit,
            activityHash: activityHash ?? null,
            description: description ?? null,
            activityName: activityName ?? null,
            time,
            creatorId,
            guild,
            requiredDLC,
            channel: null,
            message: null,
            joinmentState: false,
            managementMessage: null,
        };
        const privateLfgChannel = await this.createLfgPrivateChannel(lfgEvent);
        this.localCache[lfgEvent.id].channel = privateLfgChannel;
        const message = await this.sendLfgMessage({ lfg: lfgEvent, mention: true });
        this.localCache[lfgEvent.id].message = message;
        this.syncCacheDebounced();
        notificationScheduler.rescheduleNotificationDebounced();
        return true;
    }
    async addUserToLFG({ lfgId, userId, requesterId, requestedBy }) {
        const lfg = this.localCache[lfgId];
        if (!lfg) {
            throw { errorType: "LFG_NOT_FOUND", errorData: [lfgId] };
        }
        if (lfg.joinedUsers.includes(userId) || (lfg.hotJoinedUsers.includes(userId) && lfg.joinedUsers.length >= lfg.userLimit)) {
            throw { errorType: "LFG_ALREADY_JOINED" };
        }
        const member = client.getCachedMembers().get(userId);
        if (member && lfg.requiredDLC && !member.roles.cache.has(lfg.requiredDLC) && !requesterId && !requestedBy) {
            throw { errorType: "ACTIVITY_MISSING_DLC", errorData: [lfg.requiredDLC] };
        }
        const previousLFG = {
            ...lfg,
            joinedUsers: [...lfg.joinedUsers],
            hotJoinedUsers: [...lfg.hotJoinedUsers],
        };
        if (lfg.joinedUsers.length < lfg.userLimit) {
            lfg.joinedUsers.push(userId);
        }
        else {
            lfg.hotJoinedUsers.push(userId);
        }
        const channel = lfg.channel || (await this.createLfgPrivateChannel(lfg));
        const notificationMessage = this.sendJoinmentNotificationMessage({
            previousLFG,
            currentLFG: lfg,
            userOrMemberOrId: member || userId,
            requestedBy: requesterId === lfg.creatorId ? "creator" : requestedBy,
            notificationType: previousLFG.joinedUsers.length >= previousLFG.userLimit ? "hotJoinToJoin" : "join",
        });
        const permissionPromise = channel.permissionOverwrites.create(member || userId, { ViewChannel: true });
        await Promise.all([this.updateMessage(lfg), permissionPromise, notificationMessage]);
        this.syncCacheDebounced();
        notificationScheduler.rescheduleNotificationDebounced();
    }
    async moveHotJoinedToJoined(passedLfg, requiresUpdate = false) {
        if (passedLfg.hotJoinedUsers.length === 0 || passedLfg.joinedUsers.length >= passedLfg.userLimit)
            return;
        const lfg = passedLfg instanceof LfgDatabase ? this.localCache[passedLfg.id] : passedLfg;
        const lfgBefore = { ...lfg, joinedUsers: [...lfg.joinedUsers], hotJoinedUsers: [...lfg.hotJoinedUsers] };
        const movableUser = lfg.hotJoinedUsers.shift();
        if (!movableUser)
            return;
        lfg.joinedUsers.push(movableUser);
        this.sendJoinmentNotificationMessage({
            currentLFG: lfg,
            userOrMemberOrId: movableUser,
            notificationType: "join",
            requestedBy: "system",
            comment: "Пользователь перезаписан системой",
            previousLFG: lfgBefore,
        });
        if (requiresUpdate) {
            await this.updateMessage(lfg);
        }
    }
    resolveUserMovedState({ postMovementLFG, preMovementLFG, userId }) {
        let beforeState = "❌";
        let afterState = "❌";
        if (preMovementLFG?.joinedUsers?.includes(userId)) {
            beforeState = "[Участник]";
        }
        if (preMovementLFG?.hotJoinedUsers?.includes(userId)) {
            beforeState = "[Запас]";
        }
        if (postMovementLFG.joinedUsers.includes(userId)) {
            afterState = "[Участник]";
        }
        if (postMovementLFG.hotJoinedUsers.includes(userId)) {
            afterState = "[Запас]";
        }
        return `${beforeState} → ${afterState}`;
    }
    async sendJoinmentNotificationMessage({ currentLFG, userOrMemberOrId, notificationType, requestedBy, comment, previousLFG, }) {
        const lfg = currentLFG instanceof LfgDatabase ? this.localCache[currentLFG.id] : currentLFG;
        const member = userOrMemberOrId instanceof GuildMember
            ? userOrMemberOrId
            : await client.getMember(typeof userOrMemberOrId === "string" ? userOrMemberOrId : userOrMemberOrId.id);
        const memberDisplayName = nameCleaner(member.displayName);
        const embed = new EmbedBuilder().setAuthor({
            name: `${memberDisplayName}: ${this.resolveUserMovedState({
                preMovementLFG: previousLFG,
                postMovementLFG: currentLFG,
                userId: member.id,
            })}`,
            iconURL: member.user.displayAvatarURL(),
        });
        if (notificationType === "join") {
            embed.setColor(colors.success);
        }
        else if (notificationType === "leave") {
            embed.setColor(colors.error);
        }
        else {
            embed.setColor(colors.serious);
        }
        if (comment) {
            embed.setFooter({ text: comment });
        }
        else if (requestedBy === "admin") {
            embed.setFooter({
                text: `Пользователь ${notificationType !== "leave" ? "записан" : "исключен"} ${requestedBy === "admin" ? "администратором" : "создателем сбора"}`,
            });
        }
        await (lfg.channel || (await this.createLfgPrivateChannel(lfg))).send({ embeds: [embed] });
    }
    async removeUserFromLFG({ lfgId, requestedBy, userId, requesterId }) {
        const lfg = this.localCache[lfgId];
        if (!lfg) {
            throw { errorType: "LFG_NOT_FOUND", errorData: [lfgId] };
        }
        const previousLfg = { ...lfg, joinedUsers: [...lfg.joinedUsers], hotJoinedUsers: [...lfg.hotJoinedUsers] };
        if (lfg.joinedUsers.includes(userId)) {
            lfg.joinedUsers = lfg.joinedUsers.filter((joinedUserId) => joinedUserId !== userId);
            if (lfg.joinedUsers.length < lfg.userLimit && lfg.hotJoinedUsers.length > 0) {
                await this.moveHotJoinedToJoined(lfg);
            }
        }
        else if (lfg.hotJoinedUsers.includes(userId)) {
            lfg.hotJoinedUsers = lfg.hotJoinedUsers.filter((joinedUserId) => joinedUserId !== userId);
        }
        else {
            return;
        }
        const permissionPromise = (lfg.channel || (await this.createLfgPrivateChannel(lfg))).permissionOverwrites.delete(userId, `User ${requestedBy ? "was kicked" : "has left"} the LFG ${lfg.id}`);
        const notificationMessage = this.sendJoinmentNotificationMessage({
            notificationType: "leave",
            currentLFG: lfg,
            userOrMemberOrId: userId,
            requestedBy: requesterId === lfg.creatorId ? "creator" : requestedBy,
            previousLFG: previousLfg,
        });
        await Promise.all([permissionPromise, this.updateMessage(lfg), notificationMessage]);
        this.syncCacheDebounced();
        notificationScheduler.rescheduleNotificationDebounced();
    }
    async deleteLFG(lfgInput) {
        const lfgId = typeof lfgInput === "number" ? lfgInput : lfgInput.id;
        const lfg = this.localCache[lfgId];
        if (!lfg) {
            throw { errorType: "LFG_NOT_FOUND", errorData: [lfgId] };
        }
        const { message, channel } = lfg;
        if (message) {
            try {
                await message.delete();
            }
            catch (error) {
                console.error(`[Error code: 2046] Failed to delete LFG ${lfgId} message`, error);
            }
        }
        if (channel) {
            try {
                await channel.delete();
            }
            catch (error) {
                console.error(`[Error code: 2047] Failed to delete LFG ${lfgId} channel`, error);
            }
        }
        delete this.localCache[lfgId];
        await LfgDatabase.destroy({ where: { id: lfgId }, limit: 1 });
        notificationScheduler.rescheduleNotificationDebounced();
    }
    async editLFG({ lfgId, newActivity, newTime, newDescription, newUserLimit, newRequiredDLC, newCreator, comment, requestedBy, requesterId, }) {
        const lfg = this.localCache[lfgId];
        let changeLog = [];
        if (!lfg) {
            throw { errorType: "LFG_NOT_FOUND", errorData: [lfgId] };
        }
        if (newActivity) {
            const isHash = Number.isInteger(Number(newActivity));
            const manifest = await GetManifest("DestinyActivityDefinition");
            if ((isHash && newActivity !== lfg.activityHash) || (!isHash && newActivity !== lfg.activityName)) {
                const oldActivityName = (lfg.activityHash && manifest[Number(lfg.activityHash)]?.displayProperties?.name) || lfg.activityName;
                const newActivityName = (isHash && manifest[Number(newActivity)]?.displayProperties?.name) || newActivity;
                if (isHash) {
                    lfg.activityHash = newActivity;
                    lfg.activityName = null;
                }
                else {
                    lfg.activityName = newActivity;
                    lfg.activityHash = null;
                }
                try {
                    const newChannelName = this.generateChannelName(lfg.id, newActivityName || "активность");
                    (lfg.channel || (await this.createLfgPrivateChannel(lfg)))?.edit({ name: newChannelName });
                    this.sendOrUpdateManagementMessage(lfg);
                    changeLog.push({
                        name: "Активность изменена",
                        value: `- Ранее была: \`${oldActivityName}\`\n- Теперь: \`${newActivityName}\``,
                        inline: false,
                    });
                }
                catch (error) {
                    console.error("[Error code: 2070] Failed to update activity of the lfg", error);
                    changeLog.push({
                        name: "Активность не была изменена",
                        value: "Произошла ошибка при попытке изменить активность",
                        inline: false,
                    });
                }
            }
        }
        if (newTime) {
            const convertedTime = convertTimeStringToNumber(newTime, userTimezones.get(requesterId || lfg.creatorId));
            if (!convertedTime) {
                throw { errorType: "RAID_TIME_ERROR" };
            }
            else if (convertedTime !== lfg.time) {
                const oldTime = lfg.time;
                lfg.time = convertedTime;
                changeLog.push({
                    name: "Время старта перенесено",
                    value: `- С <t:${oldTime}>, <t:${oldTime}:R>\n- На <t:${convertedTime}>, <t:${convertedTime}:R>`,
                    inline: false,
                });
                notificationScheduler.rescheduleNotificationDebounced();
            }
        }
        if (newCreator && newCreator.id !== lfg.creatorId) {
            const oldCreator = lfg.creatorId;
            lfg.creatorId = newCreator.id;
            const cachedMembers = client.getCachedMembers();
            const currentCreator = cachedMembers.get(newCreator.id) || (await client.getMember(newCreator.id).catch(() => null));
            if (currentCreator && !currentCreator.user.bot) {
                const previousCreator = cachedMembers.get(oldCreator);
                changeLog.push({
                    name: "Создатель сбора изменен",
                    value: `${previousCreator?.displayName ? `- Последний: \`${nameCleaner(previousCreator?.displayName, true)}\`\n` : ""}- Текущий: \`${nameCleaner(currentCreator?.displayName || newCreator.username, true)}\``,
                    inline: false,
                });
            }
            else {
                lfg.creatorId = oldCreator;
            }
        }
        if (newDescription && newDescription !== lfg.description) {
            const oldDescription = lfg.description;
            lfg.description = newDescription === "-" || newDescription === "удалить" ? null : newDescription;
            if (lfg.description) {
                changeLog.push({
                    name: "Описание изменено",
                    value: `${oldDescription ? `- Было: \`${oldDescription.replaceAll("\n", "\\n")}\`\n` : ""}- Стало: \`${newDescription.replaceAll("\n", "\\n")}\``,
                    inline: false,
                });
            }
            else if (oldDescription) {
                changeLog.push({ name: "Описание удалено", value: `- Было: \`${oldDescription.replaceAll("\n", "\\n")}\``, inline: false });
            }
        }
        if (newUserLimit && newUserLimit > 1 && newUserLimit < 100 && newUserLimit !== lfg.userLimit) {
            const oldUserLimit = lfg.userLimit;
            lfg.userLimit = newUserLimit;
            changeLog.push({ name: "Лимит участников изменен", value: `- С: \`${oldUserLimit}\` на \`${newUserLimit}\``, inline: false });
        }
        if (newRequiredDLC && newRequiredDLC !== lfg.requiredDLC) {
            const oldRequiredDLC = lfg.requiredDLC;
            lfg.requiredDLC = newRequiredDLC !== (await client.getGuild()).roles.everyone.id ? newRequiredDLC : null;
            if (lfg.requiredDLC && oldRequiredDLC) {
                changeLog.push({
                    name: "Дополнение для записи изменено",
                    value: `- <@&${oldRequiredDLC}> заменено на <@&${newRequiredDLC}>`,
                    inline: false,
                });
            }
            else if (lfg.requiredDLC && !oldRequiredDLC) {
                changeLog.push({
                    name: "Дополнение для записи установелно",
                    value: `- Теперь требуется: <@&${newRequiredDLC}>`,
                    inline: false,
                });
            }
            else {
                changeLog.push({
                    name: "Дополнение для записи удалено",
                    value: `- Ранее требовалось: <@&${oldRequiredDLC}>`,
                    inline: false,
                });
            }
        }
        await this.updateMessage(lfg);
        this.syncCacheDebounced();
        if (changeLog.length > 0) {
            const embed = new EmbedBuilder().setTitle("Сбор был изменен").addFields(changeLog).setColor(colors.success);
            if (comment) {
                embed.setFooter({ text: comment });
            }
            else {
                const text = `Изменени${changeLog.length === 1 ? "е" : "я"} ${requestedBy === "system"
                    ? "системой"
                    : (requesterId && requesterId === lfg.creatorId) || requestedBy === "creator"
                        ? "создателем сбора"
                        : (requesterId && requesterId !== lfg.creatorId) || requestedBy === "admin"
                            ? "администратором"
                            : ""}`;
                text &&
                    embed.setFooter({
                        text,
                    });
            }
            (lfg.channel || (await this.createLfgPrivateChannel(lfg))).send({
                embeds: [embed],
                allowedMentions: { parse: [] },
            });
            return changeLog;
        }
        else {
            return [{ name: "Ничего не было изменено", value: "- Все поля остались прежними", inline: false }];
        }
    }
}
//# sourceMappingURL=LFGController.js.map