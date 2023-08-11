import { ButtonBuilder, ButtonInteraction, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes, } from "discord.js";
import { Op } from "sequelize";
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
import { RaidEvent } from "../persistence/sequelize.js";
import { addButtonsToMessage } from "./addButtonsToMessage.js";
import nameCleaner from "./nameClearer.js";
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
        case "ce": {
            return {
                raid,
                raidName: difficulty != 1 ? "Конец Кроты: Режим состязания" : "Конец Кроты",
                maxDifficulty: 3,
                raidBanner: "https://cdn.discordapp.com/attachments/679191036849029167/1134306618213937263/ce.jpg",
                raidColor: (difficulty >= 2 ? MASTER_DIFFICULTY_COLOR : "#5da75c"),
                channelName: "-конец-кроты",
                requiredRole: null,
                milestoneHash: 999999999,
            };
        }
        case "ron":
            return {
                raid,
                raidName: difficulty === 2 ? "Источник кошмаров: Мастер" : "Источник кошмаров",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_root_of_nightmares.jpg",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#ffa8ae"),
                channelName: "-источник-кошмаров",
                requiredRole: dlcRoles.lf,
                milestoneHash: 3699252268,
            };
        case "kf":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Гибель короля: Мастер" : "Гибель короля",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_kings_fall.jpg",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#a02200"),
                channelName: "-гибель-короля",
                requiredRole: null,
                milestoneHash: 292102995,
            };
        case "votd":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Клятва послушника: Мастер" : "Клятва послушника",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_nemesis.jpg",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#52E787"),
                channelName: "-клятва-послушника",
                requiredRole: dlcRoles.twq,
                milestoneHash: 2136320298,
            };
        case "vog":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Хрустальный чертог: Мастер" : "Хрустальный чертог",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/vault_of_glass.jpg",
                raidColor: (difficulty === 2 ? MASTER_DIFFICULTY_COLOR : "#52E787"),
                channelName: "-хрустальный-чертог",
                requiredRole: null,
                milestoneHash: 1888320892,
            };
        case "dsc":
            return {
                raid: raid,
                raidName: "Склеп Глубокого камня",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/europa-raid-deep-stone-crypt.jpg",
                raidColor: "#29ACFF",
                channelName: "-склеп-глубокого-камня",
                requiredRole: dlcRoles.bl,
                milestoneHash: 541780856,
            };
        case "gos":
            return {
                raid: raid,
                raidName: "Сад спасения",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_garden_of_salvation.jpg",
                raidColor: "#45FFA2",
                channelName: "-сад-спасения",
                requiredRole: dlcRoles.sk,
                milestoneHash: 2712317338,
            };
        case "lw":
            return {
                raid: raid,
                raidName: "Последнее желание",
                maxDifficulty: 1,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_beanstalk.jpg",
                raidColor: "#79A1FF",
                channelName: "-последнее-желание",
                requiredRole: dlcRoles.frs,
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
            throw { errorType: "RAID_MISSING_PERMISSIONS" };
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
    const cleanMemberName = async (id) => nameCleaner((await client.getAsyncMember(id))?.displayName || "неизвестный пользователь", true);
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
            if (raidName === "ce") {
                return `⁣　${index + 1}. **${userName}** — ${raidClears["totalRaidClears"]} закрытий всех рейдов`;
            }
            else {
                const clearsText = generateRaidCompletionText(raidClears[raidName]);
                const masterClearsText = raidClears[raidName + "Master"] ? ` (+**${raidClears[raidName + "Master"]}** на мастере)` : "";
                return `⁣　${index + 1}. **${userName}** — ${clearsText}${masterClearsText}`;
            }
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
    if (joined && joined.length === 6) {
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
    if (difficulty === 3 || (raidData.raid === "ce" && startTime >= 1693591200 && startTime <= 1693764000)) {
        const embed = EmbedBuilder.from(privateChannelMessage.embeds[0]);
        embed.data.fields[0].name = "**Модификатор рейда**";
        embed.data.fields[0].value = "⁣　⁣**Режим состязания**: задание фиксированной сложности. Испытайте свои силы";
        await privateChannelMessage.edit({ embeds: [embed] });
        return;
    }
    if (difficulty > 2 || getEndpointStatus("account") !== 1)
        return null;
    const barrierEmoji = "<:barrier:1090473007471935519>";
    const overloadEmoji = "<:overload:1090473013398491236>";
    const unstoppableEmoji = "<:unstoppable:1090473011175489687>";
    const milestoneRequest = (await sendApiRequest("/Platform/Destiny2/3/Profile/4611686018488674684/Character/2305843009489394188/?components=202")).progressions.data.milestones;
    const raidMilestone = milestoneRequest[raidData.milestoneHash];
    const manifest = await GetManifest("DestinyActivityModifierDefinition");
    const raidChallengesArray = [];
    const raidModifiersArray = [];
    const raidDataChallanges = destinyRaidsChallenges[raidData.raid];
    const embed = EmbedBuilder.from(privateChannelMessage.embeds[0]);
    if (!raidMilestone ||
        raidMilestone.activities[raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0]?.modifierHashes === undefined) {
        embed.data.fields[0].name = "**Испытания рейда**";
        embed.data.fields[0].value = "⁣　⁣*отсутствуют*";
        await privateChannelMessage.edit({ embeds: [embed] });
        return;
    }
    raidMilestone.activities[raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0].modifierHashes.forEach((modifier) => {
        if (blockedModifierHashesArray.includes(modifier) || (difficulty !== 1 && modifier === 97112028))
            return;
        if (manifest[modifier].displayProperties.description.toLowerCase().startsWith("вас ждет испытание")) {
            const challenge = (new Date(raidMilestone.endDate).getTime() > startTime * 1000
                ? raidDataChallanges.find((a) => a.hash === modifier)
                : raidDataChallanges.find((a) => a.hash === modifier)?.encounter === raidDataChallanges.length
                    ? raidDataChallanges.find((a) => a.encounter === 1)
                    : raidDataChallanges.find((a) => a.encounter === raidDataChallanges.find((a) => a.hash === modifier).encounter + 1));
            raidChallengesArray.push("⁣　⁣**" + manifest[challenge.hash].displayProperties.name + `**, ${challenge.encounter} этап: ${challenge.description}`);
        }
        else if (new Date(raidMilestone.endDate).getTime() > startTime * 1000) {
            const modifierDescription = findModifierDescription(modifier);
            if (modifierDescription)
                return raidModifiersArray.push(modifierDescription);
            const manifestModifierDescription = manifest[modifier].displayProperties.description.toLowerCase();
            raidModifiersArray.push(`⁣　⁣**${manifest[modifier].displayProperties.name}:** ${manifestModifierDescription.endsWith(".") ? manifestModifierDescription.slice(0, -1) : manifestModifierDescription}`);
        }
    });
    function findModifierDescription(modifier) {
        switch (modifier) {
            case 3303073618:
                return "⁣　⁣**Испытания рейда:** все испытания активированы";
            case 4038464106:
                return `⁣　⁣**Противники-воители:** ${barrierEmoji}барьерные, ${overloadEmoji}перегруженные и ${unstoppableEmoji}неудержимые воители`;
            case 2116552995:
                return "⁣　⁣**Модификаторы «Мастер»:** больше воителей и щитов";
            case 1990363418:
                return `⁣　⁣**Противники-воители:** ${barrierEmoji}барьерные и ${overloadEmoji}перегруженные воители`;
            case 438106166:
            case 1806568190:
                return `⁣　⁣**Противники-воители:** ${barrierEmoji}барьерные и ${unstoppableEmoji}неудержимые воители`;
            case 40182179:
                return `⁣　⁣**Противники-воители:** ${overloadEmoji}перегруженные и ${unstoppableEmoji}неудержимые воители`;
            case 4087563963:
                return "⁣　⁣**Модификаторы «Мастер»:** больше воителей, больше щитов, установлен порог максимального уровня силы";
            case 1057289452:
            case 4226469317:
                return "⁣　⁣**Сверхзаряженное оружие:** используется оружие со сверхзарядами, кинетический урон повышен при соответствии подкласса эффекту мощи";
            case 3810297122:
                return "⁣　⁣**Мощь Нити:** бонус к наносимому урону нитью";
            case 426976067:
                return "⁣　⁣**Мощь Солнца:** бонус к наносимому солнечному урону";
            case 2691200658:
                return "⁣　⁣**Мощь Молнии:** бонус к наносимому электрическому урону";
            case 3196075844:
                return "⁣　⁣**Мощь Пустоты:** бонус к наносимому пустотному урону";
            case 3809788899:
                return "⁣　⁣**Мощь Стазиса:** бонус к наносимому стазисному урону";
            case 2626834038:
                return "⁣　⁣**Сверхзаряженная плазменная винтовка:** плазменные винтовки наносят повышенный урон";
            case 3132780533:
                return "⁣　⁣**Сверхзаряженный дробовик:** дробовики наносят повышенный урон";
            case 1282934989:
                return "⁣　⁣**Сверхзаряженная снайперская винтовка:** снайперки наносят повышенный урон";
            case 2178457119:
                return "⁣　⁣**Сверхзаряженная лучевая винтовка:** лучевые наносят повышенный урон";
            case 3758645512:
                return "⁣　⁣**Сверхзаряженный гранатомет:** гранатометы наносят повышенный урон";
            case 95459596:
                return "⁣　⁣**Сверхзаряженная ракетная установка:** ракетницы наносят повышенный урон";
            case 1326581064:
                return "⁣　⁣**Сверхзаряженный меч:** мечи наносят повышенный урон";
            case 1326581064:
                return "⁣　⁣**Сверхзаряженная линейно-плазменная винтовка:** линейки наносят повышенный урон";
            case 1651706850:
                return "⁣　⁣**Враги со щитами:** в этом рейде встречаются электрические, солнечные и пустотные щиты";
            case 3230561446:
                return "⁣　⁣**Враги со щитами:** в этом рейде встречаются электрические и солнечные щиты";
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
export async function checkRaidTimeConflicts(interaction, raidEvent) {
    const member = client.getCachedMembers().get(interaction.user.id) || (await client.getCachedGuild().members.fetch(interaction.user.id));
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
                const raidChannel = await client.getAsyncTextChannel(raidEvent.channelId);
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
    const privateRaidChannel = await client.getAsyncTextChannel(raid.channelId);
    const raidMessage = await client.getAsyncMessage(process.env.RAID_CHANNEL_ID, raid.messageId).catch((e) => {
        console.error("[Error code: 1697] Not found raid message", raid.id, e);
    });
    const interactingMember = interaction ? await client.getAsyncMember(interaction.user.id) : null;
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
            .setColor("DarkGreen")
            .setTitle("Произошла ошибка во время удаления")
            .setDescription(`Удалено ${deletionResult} рейдов`);
        return await editMessageReply(errorEmbed);
    }
}
export function getRaidNameFromHash(activityHash) {
    switch (activityHash) {
        case 2381413764:
        case 1191701339:
            return "ron";
        case 2918919505:
            return "ronMaster";
        case 1374392663:
        case 1063970578:
            return "kf";
        case 2964135793:
        case 3257594522:
            return "kfMaster";
        case 1441982566:
            return "votd";
        case 4217492330:
        case 3889634515:
            return "votdMaster";
        case 910380154:
        case 3976949817:
            return "dsc";
        case 3458480158:
        case 2497200493:
        case 2659723068:
        case 3845997235:
            return "gos";
        case 3881495763:
        case 1485585878:
        case 3711931140:
            return "vog";
        case 1681562271:
        case 3022541210:
            return "vogMaster";
        case 2122313384:
        case 1661734046:
            return "lw";
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
            const member = await client.getAsyncMember(user.id);
            embed
                .setAuthor({
                name: `${nameCleaner(member.displayName || user.username)}, ознакомься с текстовым прохождением рейда перед его началом`,
            })
                .setDescription("Вы закрыли доступ к своим личным сообщениям\nДля лучшего опыта на сервере, пожалуйста, откройте доступ к личным сообщениям в настройках Discord");
            const raidChannel = await client.getAsyncTextChannel(raidChannelId);
            await raidChannel.send({ content: `<@${user.id}>`, embeds: [embed], components: addButtonsToMessage(components) });
        }
    }
    return;
}
//# sourceMappingURL=raidFunctions.js.map