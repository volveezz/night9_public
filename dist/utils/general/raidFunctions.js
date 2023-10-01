import { ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes, } from "discord.js";
import { Op } from "sequelize";
import { RaidNames } from "../../configs/Raids.js";
import colors from "../../configs/colors.js";
import destinyRaidsChallenges from "../../configs/destinyRaidsChallenges.js";
import icons from "../../configs/icons.js";
import raidsGuide from "../../configs/raidGuideData.js";
import { dlcRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import { GetManifest } from "../api/ManifestManager.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { getEndpointStatus } from "../api/statusCheckers/statusTracker.js";
import { completedRaidsData } from "../persistence/dataStore.js";
import { RaidEvent } from "../persistence/sequelizeModels/raidEvent.js";
import { addButtonsToMessage } from "./addButtonsToMessage.js";
import nameCleaner from "./nameClearer.js";
import { convertModifiersPlaceholders } from "./raidFunctions/convertModifiersPlaceholders.js";
import { raidEmitter } from "./raidFunctions/raidEmitter.js";
import { clearNotifications } from "./raidFunctions/raidNotifications.js";
const blockedModifierHashesArray = [
    1123720291, 1783825372, 782039530, 2006149364, 197794292, 3307318061, 438106166, 2288210988, 3282103678, 3119632620,
];
const raidsWithoutData = new Set();
function getDefaultRaidActionsComponents() {
    return [
        new ButtonBuilder().setCustomId("raidButton_action_join").setLabel("Записаться").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("raidButton_action_leave").setLabel("Выйти").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("raidButton_action_alt").setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
    ];
}
export function generateRaidCompletionText(clears = 0) {
    const baseText = `**${clears}** закрыт`;
    let ending = "ий";
    if (clears === 1) {
        ending = "ие";
    }
    else if (clears >= 2 && clears <= 4) {
        ending = "ия";
    }
    return baseText + ending;
}
const MASTER_DIFFICULTY_COLOR = "#FF063A";
export function getRaidDetails(raid, difficulty = 1) {
    switch (raid) {
        case RaidNames.ce: {
            return {
                raid,
                raidName: difficulty != 1 ? "Крах Кроты: Мастер" : "Крах Кроты",
                maxDifficulty: 2,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035262421606502/Crotas-End-PGCR.webp",
                raidColor: (difficulty >= 2 ? MASTER_DIFFICULTY_COLOR : "#5da75c"),
                channelName: "-крах-кроты",
                requiredRole: null,
                milestoneHash: 540415767,
            };
        }
        case RaidNames.ron:
            return {
                raid,
                raidName: difficulty === 2 ? "Источник кошмаров: Мастер" : "Источник кошмаров",
                maxDifficulty: 2,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035263210135572/Root-of-Nightmares-PGCR.webp",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#ffa8ae"),
                channelName: "-источник-кошмаров",
                requiredRole: dlcRoles.lightfall,
                milestoneHash: 3699252268,
            };
        case RaidNames.kf:
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Гибель короля: Мастер" : "Гибель короля",
                maxDifficulty: 2,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035263948333056/Kings-Fall-PGCR.webp",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#a02200"),
                channelName: "-гибель-короля",
                requiredRole: null,
                milestoneHash: 292102995,
            };
        case RaidNames.votd:
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Клятва послушника: Мастер" : "Клятва послушника",
                maxDifficulty: 2,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035263608598550/Vow-of-the-Disciple-PGCR.webp",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#52E787"),
                channelName: "-клятва-послушника",
                requiredRole: dlcRoles.theWitchQueen,
                milestoneHash: 2136320298,
            };
        case RaidNames.vog:
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Хрустальный чертог: Мастер" : "Хрустальный чертог",
                maxDifficulty: 2,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035262794903603/Vault-of-Glass-PGCR.webp",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#52E787"),
                channelName: "-хрустальный-чертог",
                requiredRole: null,
                milestoneHash: 1888320892,
            };
        case RaidNames.dsc:
            return {
                raid: raid,
                raidName: "Склеп Глубокого камня",
                maxDifficulty: 1,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035265131130940/Deep-Stone-Crypt-PGCR.webp",
                raidColor: "#29ACFF",
                channelName: "-склеп-глубокого-камня",
                requiredRole: dlcRoles.beyondLight,
                milestoneHash: 541780856,
            };
        case RaidNames.gos:
            return {
                raid: raid,
                raidName: "Сад спасения",
                maxDifficulty: 1,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035264330018976/Garden-of-Salvation-PGCR.webp",
                raidColor: "#45FFA2",
                channelName: "-сад-спасения",
                requiredRole: dlcRoles.shadowkeep,
                milestoneHash: 2712317338,
            };
        case RaidNames.lw:
            return {
                raid: raid,
                raidName: "Последнее желание",
                maxDifficulty: 1,
                raidBanner: "https://cdn.discordapp.com/attachments/1134620378615001178/1158035264736862208/Last-Wish-PGCR.webp",
                raidColor: "#79A1FF",
                channelName: "-последнее-желание",
                requiredRole: dlcRoles.forsaken,
                milestoneHash: 3181387331,
            };
    }
}
export async function getRaidDatabaseInfo(raidId, interaction) {
    if (raidId === null) {
        const raidData = await RaidEvent.findAll({
            where: { creator: interaction.user.id },
        });
        if (!raidData || !raidData[0] || !raidData[0]?.creator) {
            throw { name: "У вас нет прав для изменения какого-либо рейда" };
        }
        else if (raidData[1] !== undefined) {
            throw {
                name: "Укажите нужный рейд в параметре id-рейда",
                description: `Id рейдов доступные для вас: ${raidData.map((raidData) => raidData.id).join(", ")}`,
            };
        }
        else {
            if (raidData[0].creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                const displayName = (client.getCachedMembers().get(raidData[0].creator)?.displayName ||
                    client.users.cache.get(raidData[0].creator)?.username);
                throw {
                    name: "Недостаточно прав",
                    description: `Управление рейдом ${raidId} доступно лишь ${nameCleaner(displayName)}`,
                };
            }
            else {
                return raidData[0];
            }
        }
    }
    else {
        const raidData = await RaidEvent.findByPk(raidId);
        if (raidData === null || !raidData?.creator) {
            throw { errorType: "RAID_NOT_FOUND" };
        }
        else if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
            const creatorMember = client.getCachedMembers().get(raidData.creator);
            const displayName = creatorMember && nameCleaner(creatorMember.displayName, true);
            throw { errorType: "ACTIVITY_MISSING_PERMISSIONS", errorData: { displayName }, interaction };
        }
        else {
            return raidData;
        }
    }
}
export async function updateRaidMessage(options) {
    const { raidEvent, interaction, returnComponents } = options;
    const { id, messageId, joined, raid: raidName, alt, hotJoined, difficulty: raidDifficulty } = raidEvent;
    const raidChannel = client.getCachedTextChannel(process.env.RAID_CHANNEL_ID);
    const raidMessage = interaction instanceof ButtonInteraction ? interaction.message : await client.getAsyncMessage(raidChannel, messageId);
    if (!raidMessage || !raidMessage.embeds || !raidMessage.embeds[0]) {
        console.error("[Error code: 1803]", raidMessage);
        return;
    }
    const embed = EmbedBuilder.from(raidMessage.embeds[0]);
    const cleanMemberName = async (id) => nameCleaner((await client.getMember(id))?.displayName || "неизвестный пользователь", true);
    const [joinedUsersText, hotJoinedUsersText, altUsersText] = await Promise.all([
        generateJoinedAdvancedRoster(joined, raidName, cleanMemberName, id, raidEvent),
        generateUsersRoster(hotJoined, cleanMemberName),
        generateUsersRoster(alt, cleanMemberName),
    ]);
    let components = updateComponents(embed, raidMessage, joined, raidName, raidDifficulty, interaction);
    if (components.length === 0) {
        components = getDefaultRaidActionsComponents();
    }
    updateEmbedFields(embed, joined, hotJoined, alt, joinedUsersText, hotJoinedUsersText, altUsersText);
    if (returnComponents) {
        return { embeds: [embed], components };
    }
    const messageOptions = { embeds: [embed], components: addButtonsToMessage(components) };
    if (interaction instanceof ButtonInteraction) {
        return await interaction.message.edit(messageOptions);
    }
    else {
        return await raidMessage.edit(messageOptions);
    }
}
async function generateJoinedAdvancedRoster(users, raidName, cleanMemberName, id, raidEvent) {
    if (!users || users.length < 1)
        return "Никого";
    const joinedUsersText = await Promise.all(users.map(async (userId, index) => {
        const userName = await cleanMemberName(userId);
        const raidClears = completedRaidsData.get(userId);
        if (raidClears) {
            const clearsText = generateRaidCompletionText(raidClears[raidName]);
            const masterClearsText = raidClears[raidName + "Master"] ? ` (+**${raidClears[raidName + "Master"]}** на мастере)` : "";
            return `⁣　${index + 1}. **${userName}** — ${clearsText}${masterClearsText}`;
        }
        else if (!raidsWithoutData.has(id)) {
            raidsWithoutData.add(id);
            setTimeout(async () => {
                await updateRaidMessage({ raidEvent });
                raidsWithoutData.delete(id);
            }, 1000 * 60 * 5);
        }
        return `⁣　${index + 1}. **${userName}**`;
    }));
    return joinedUsersText.join("\n");
}
async function generateUsersRoster(users, cleanMemberName) {
    if (!users || users.length < 1)
        return "Никого";
    return (await Promise.all(users.map(async (userId) => await cleanMemberName(userId)))).join(", ");
}
function updateComponents(embed, raidMessage, joined, raidName, raidDifficulty, interaction) {
    let components = [];
    if (joined && joined.length >= 6) {
        embed.setColor(colors.invisible);
        components = raidMessage.components[0].components.map((button) => {
            const btn = ButtonBuilder.from(button);
            if (button.customId === "raidButton_action_join") {
                btn.setLabel("В запас").setStyle(ButtonStyle.Primary);
            }
            return btn;
        });
    }
    else if (embed.data.color == null || embed.data.color === 2829617) {
        embed.setColor(getRaidDetails(raidName, raidDifficulty).raidColor);
        components = raidMessage.components[0].components.map((button) => {
            const btn = ButtonBuilder.from(button);
            if (button.customId === "raidButton_action_join") {
                btn.setLabel("Записаться").setStyle(ButtonStyle.Success);
            }
            return btn;
        });
    }
    else if (components.length === 0 && !interaction) {
        components = getDefaultRaidActionsComponents();
    }
    return components;
}
function updateEmbedFields(embed, joined, hotJoined, alt, joinedUsersText, hotJoinedUsersText, altUsersText) {
    const isDescription = embed.data.fields?.findIndex((d) => d.name.startsWith("Описание")) ? 1 : 0;
    const findFieldIndex = (fieldName) => {
        const index = embed.data.fields.findIndex((d) => d.name.startsWith(fieldName));
        if (index === -1) {
            if (fieldName === "Участник")
                return 2 + isDescription;
            if (fieldName === "Замена")
                return findFieldIndex("Возможно") === -1 ? 3 + isDescription : findFieldIndex("Возможно");
            if (fieldName === "Возможно")
                return 4 + isDescription;
            return 5;
        }
        else {
            return index;
        }
    };
    updateField(embed, "Участник", joined, joinedUsersText, findFieldIndex);
    updateField(embed, "Замена", hotJoined, hotJoinedUsersText, findFieldIndex);
    updateField(embed, "Возможно", alt, altUsersText, findFieldIndex);
}
function updateField(embed, fieldName, users, usersText, findFieldIndex) {
    const fieldIndex = findFieldIndex(fieldName);
    if (users.length && users.length >= 1) {
        const nameText = (() => {
            switch (fieldName) {
                case "Участник":
                    return `${fieldName}${users.length === 1 ? "" : "и"}: ${users.length}/6`;
                case "Возможно":
                    return `Возможно буд${users.length === 1 ? "ет" : "ут"}: ${users.length}`;
                default:
                    return `${fieldName}: ${users.length}`;
            }
        })();
        embed.spliceFields(fieldIndex, fieldIndex !== -1 ? 1 : 0, {
            name: nameText,
            value: usersText,
        });
    }
    else {
        embed?.spliceFields(fieldIndex, fieldIndex !== -1 ? 1 : 0);
    }
}
export async function raidChallenges({ raidData, raidEvent, privateChannelMessage }) {
    const { difficulty, time: startTime } = raidEvent;
    if (difficulty > 2 || getEndpointStatus("account") !== 1)
        return null;
    const barrierEmoji = "<:barrier:1090473007471935519>";
    const overloadEmoji = "<:overload:1090473013398491236>";
    const unstoppableEmoji = "<:unstoppable:1090473011175489687>";
    let milestoneRequest, manifest;
    try {
        milestoneRequest = (await sendApiRequest("/Platform/Destiny2/3/Profile/4611686018488674684/Character/2305843009489394188/?components=202")).progressions.data.milestones;
        manifest = await GetManifest("DestinyActivityModifierDefinition");
    }
    catch (error) {
        console.error("[Error code: 2002]", error);
        return;
    }
    const raidMilestone = milestoneRequest[raidData.milestoneHash];
    if (!raidMilestone?.activities)
        return null;
    const raidChallengesArray = [];
    const raidModifiersArray = [];
    const raidDataChallanges = destinyRaidsChallenges[raidData.raid];
    const embed = EmbedBuilder.from(privateChannelMessage.embeds[0]);
    const activityIndex = raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0;
    const activityModifiers = raidMilestone.activities[activityIndex]?.modifierHashes;
    if (!raidMilestone ||
        activityModifiers === undefined ||
        activityModifiers.filter((modifier) => !blockedModifierHashesArray.includes(modifier)).length === 0) {
        embed.data.fields[0].name = "**Испытания рейда**";
        embed.data.fields[0].value = "⁣　⁣*отсутствуют*";
        await privateChannelMessage.edit({ embeds: [embed] });
        return;
    }
    activityModifiers.forEach((modifierHash) => {
        const modifier = manifest[modifierHash];
        const modifierName = modifier.displayProperties.name;
        const manifestModifierDescription = modifier.displayProperties.description.toLowerCase();
        const modifierDescription = manifestModifierDescription.endsWith(".")
            ? manifestModifierDescription.slice(0, -1)
            : manifestModifierDescription;
        if (blockedModifierHashesArray.includes(modifierHash) || (difficulty !== 1 && modifierHash === 97112028))
            return;
        const modifierEndTime = new Date(raidMilestone.endDate).getTime();
        if (manifestModifierDescription.toLowerCase().startsWith("вас ждет испытание")) {
            const challenge = (modifierEndTime > startTime * 1000
                ? raidDataChallanges.find((a) => a.hash === modifierHash)
                : raidDataChallanges.find((a) => a.hash === modifierHash)?.encounter === raidDataChallanges.length
                    ? raidDataChallanges.find((a) => a.encounter === 1)
                    : raidDataChallanges.find((a) => a.encounter === raidDataChallanges.find((a) => a.hash === modifierHash).encounter + 1));
            raidChallengesArray.push(`⁣　⁣**${manifest[challenge.hash].displayProperties.name}**, ${challenge.encounter} этап: ${challenge.description}`);
        }
        else if (modifierEndTime > startTime * 1000) {
            const predefinedModifierDescription = findModifierDescription(modifierHash);
            if (predefinedModifierDescription)
                return raidModifiersArray.push(predefinedModifierDescription);
            raidModifiersArray.push(`⁣　⁣**${convertModifiersPlaceholders(modifierName)}:** ${convertModifiersPlaceholders(modifierDescription)}`);
        }
    });
    function findModifierDescription(modifier) {
        switch (modifier) {
            case 2116552995:
                return "⁣　⁣**Модификаторы «Мастер»:** больше воителей и щитов";
            case 1990363418:
                return `⁣　⁣**Противники-воители:** ${barrierEmoji}барьерные и ${overloadEmoji}перегруженные воители`;
            case 438106166:
                return `⁣　⁣**Противники-воители:** ${barrierEmoji}барьерные и ${unstoppableEmoji}неудержимые воители`;
            case 4226469317:
                return "⁣　⁣**Сверхзаряженное оружие:** используется оружие со сверхзарядами, кинетический урон повышен при соответствии подкласса эффекту мощи";
            default:
                return null;
        }
    }
    embed.data.fields[0].name =
        raidChallengesArray.length > 0
            ? `**Испытани${raidChallengesArray.length === 1 ? "е" : "я"} ${new Date(raidMilestone.endDate).getTime() > startTime * 1000 ? "этой" : "следующей"} недели**`
            : raidModifiersArray.length > 0
                ? `**Модификатор${raidModifiersArray.length === 1 ? "" : "ы"} рейда**`
                : "Объявление";
    embed.data.fields[0].value = `${raidChallengesArray.join("\n")}${raidModifiersArray.length > 0
        ? `${raidChallengesArray.length > 0 ? `\n\n**Модификатор${raidModifiersArray.length === 1 ? "" : "ы"} рейда**` : ""}\n`
        : ""}${raidModifiersArray.join("\n")}${raidChallengesArray.length === 0 && raidModifiersArray.length === 0
        ? "⁣　⁣Продается __утепленный__ гараж в восточном ГК. ***Дешево***. За подробностями в личку <@298353895258980362>, торопитесь!"
        : ""}`;
    return privateChannelMessage.edit({ embeds: [embed] });
}
export async function checkRaidTimeConflicts(userId, raidEvent) {
    const member = await client.getMember(userId);
    const { time: targetRaidTime } = raidEvent;
    const conflictingRaids = await RaidEvent.findAll({
        where: {
            time: targetRaidTime,
            [Op.or]: [{ joined: { [Op.contains]: [member.id] } }, { hotJoined: { [Op.contains]: [member.id] } }],
        },
        attributes: ["id", "messageId", "joined", "hotJoined", "raid"],
    });
    if (conflictingRaids.length > 1) {
        const userJoinedRaidsList = conflictingRaids
            .sort((a, b) => a.id - b.id)
            .map((raidData, i) => {
            return `${i + 1}. [${raidData.id}-${raidData.raid}](https://discord.com/channels/${process.env.GUILD_ID}/${process.env
                .RAID_CHANNEL_ID}/${raidData.messageId}) - ${raidData.joined.includes(member.id) ? "участником" : "запасным участником"}`;
        })
            .join("\n⁣　⁣");
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: "Вы записались на несколько рейдов в одно время", iconURL: icons.error })
            .setDescription(`Рейды, на которые вы записаны <t:${targetRaidTime}:R>:\n　${userJoinedRaidsList}`);
        try {
            await member.send({ embeds: [embed] });
        }
        catch (error) {
            if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                const raidChannel = await client.getTextChannel(raidEvent.channelId);
                await raidChannel.send({ content: `<@${member.id}>`, embeds: [embed] });
            }
            else {
                console.error("[Error code: 1962] Received error while sending message to user", error);
            }
        }
    }
}
export async function removeRaid(raid, interaction, requireMessageReply = true, mainInteraction) {
    const deletionResult = await RaidEvent.destroy({ where: { id: raid.id }, limit: 1 });
    const privateRaidChannel = await client.getTextChannel(raid.channelId);
    const raidMessage = await client.getAsyncMessage(process.env.RAID_CHANNEL_ID, raid.messageId).catch((e) => {
        console.error("[Error code: 1697] Not found raid message", raid.id, e);
    });
    const interactingMember = interaction ? await client.getMember(interaction.user.id) : null;
    const editMessageReply = async (embed) => {
        if (!interaction || !interaction.channel || !interaction.channel.isDMBased() || !requireMessageReply)
            return;
        const message = mainInteraction?.message;
        await message.edit({ embeds: [embed], components: [] });
        return;
    };
    if (deletionResult === 1) {
        if (privateRaidChannel) {
            const deletionReason = interaction
                ? `${nameCleaner(interactingMember.displayName)} removed the raid using the button`
                : `Raid ${raid.id} was deleted by system`;
            try {
                await privateRaidChannel.delete(deletionReason);
            }
            catch (e) {
                console.error("[Error code: 1665]", e);
            }
        }
        try {
            await raidMessage?.delete();
        }
        catch (e) {
            console.error("[Error code: 1667]", e);
        }
        raidEmitter.emit("deleted", raid);
        clearNotifications(raid.id);
        if (!interaction)
            return;
        const successEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setAuthor({ name: `Рейд ${raid.id}-${raid.raid} удален`, iconURL: icons.success });
        if (mainInteraction)
            mainInteraction.deleteReply().catch((e) => {
                return console.error("[Error code: 1684]", e);
            });
        return await editMessageReply(successEmbed);
    }
    else {
        console.error(`[Error code: 1423] Error during raid removal ${raid.id}`, deletionResult, raid);
        if (!interaction)
            return;
        const errorEmbed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: "Произошла ошибка во время удаления", iconURL: icons.error })
            .setDescription(`Удалено ${deletionResult} рейдов`);
        return await editMessageReply(errorEmbed);
    }
}
export function getRaidNameFromHash(activityHash) {
    switch (activityHash) {
        case 4179289725:
        case 4103176774:
        case 156253568:
            return RaidNames.ce;
        case 1507509200:
            return "ceMaster";
        case 2381413764:
        case 1191701339:
            return RaidNames.ron;
        case 2918919505:
            return "ronMaster";
        case 1374392663:
        case 1063970578:
            return RaidNames.kf;
        case 2964135793:
        case 3257594522:
            return "kfMaster";
        case 1441982566:
            return RaidNames.votd;
        case 4217492330:
        case 3889634515:
            return "votdMaster";
        case 910380154:
        case 3976949817:
            return RaidNames.dsc;
        case 3458480158:
        case 2497200493:
        case 2659723068:
        case 3845997235:
        case 1042180643:
        case 3823237780:
            return RaidNames.gos;
        case 3881495763:
        case 1485585878:
        case 3711931140:
            return RaidNames.vog;
        case 1681562271:
        case 3022541210:
            return "vogMaster";
        case 2122313384:
        case 1661734046:
            return RaidNames.lw;
        default:
            console.error(`[Error code: 1669] Found unknown raidId ${activityHash}`);
            return "unknown";
    }
}
export async function sendUserRaidGuideNoti(user, raidName, raidChannelId) {
    if (!(raidName in raidsGuide))
        return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: "Ознакомьтесь с текстовым прохождением рейда перед его началом", iconURL: icons.notify })
        .setColor(colors.serious);
    const components = [
        new ButtonBuilder().setCustomId(`raidGuide_${raidName}`).setLabel("Руководство по рейду").setStyle(ButtonStyle.Primary),
    ];
    try {
        user.send({ embeds: [embed], components: addButtonsToMessage(components) });
    }
    catch (error) {
        if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
            const member = await client.getMember(user.id);
            embed
                .setAuthor({
                name: `${nameCleaner(member.displayName || user.username)}, ознакомься с текстовым прохождением рейда перед его началом`,
            })
                .setDescription("Вы закрыли доступ к своим личным сообщениям\nДля лучшего опыта на сервере, пожалуйста, откройте доступ к личным сообщениям в настройках Discord");
            const raidChannel = await client.getTextChannel(raidChannelId);
            await raidChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: addButtonsToMessage(components) });
        }
    }
    return;
}
//# sourceMappingURL=raidFunctions.js.map