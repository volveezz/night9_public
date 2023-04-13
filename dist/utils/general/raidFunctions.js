import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, } from "discord.js";
import { Op } from "sequelize";
import { raidAnnounceSet } from "../../commands/raid.js";
import { RaidButtons } from "../../configs/Buttons.js";
import { RaidNames } from "../../configs/Raids.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import destinyRaidsChallenges from "../../configs/destinyRaidsChallenges.js";
import icons from "../../configs/icons.js";
import { guildId, ids } from "../../configs/ids.js";
import raidsGuide from "../../configs/raidguide.json" assert { type: "json" };
import { dlcRoles, statusRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import { fetchRequest } from "../api/fetchRequest.js";
import { CachedDestinyActivityModifierDefinition } from "../api/manifestHandler.js";
import { RaidEvent } from "../persistence/sequelize.js";
import { addButtonComponentsToMessage } from "./addButtonsToMessage.js";
import { completedRaidsData } from "./destinyActivityChecker.js";
import nameCleaner from "./nameClearer.js";
import { getRandomGIF, getRandomRaidGIF } from "./utilities.js";
const blockedModifierHashesArray = [1123720291, 1783825372, 782039530, 2006149364, 197794292, 3307318061, 438106166];
export function generateRaidClearsText(clears = 0) {
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
export function getRaidData(raid, difficulty = 1) {
    switch (raid) {
        case "ron":
            return {
                raid,
                raidName: difficulty === 2 ? "Источник кошмаров: Мастер" : "Источник кошмаров",
                maxDifficulty: 2,
                raidBanner: "https://images.contentstack.io/v3/assets/blte410e3b15535c144/bltd95f9a53ce953669/63ffd4b9a7d98e0267ed24eb/Fp_5gnkX0AULoRF.jpg",
                raidColor: (difficulty === 2 ? "#FF063A" : "#ffa8ae"),
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
                raidColor: (difficulty === 2 ? "#FF063A" : "#a02200"),
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
                raidColor: (difficulty === 2 ? "#FF063A" : "#52E787"),
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
                raidColor: (difficulty === 2 ? "#FF063A" : "#52E787"),
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
    return {
        raid: RaidNames.kf,
        raidName: "",
        maxDifficulty: 0,
        raidBanner: "",
        raidColor: "#000000",
        channelName: "",
        requiredRole: null,
        milestoneHash: 0,
    };
}
export async function getRaidDatabaseInfo(raidId, interaction) {
    if (raidId === null) {
        const raidData = await RaidEvent.findAll({
            where: { creator: interaction.user.id },
        });
        if (!raidData || !raidData[0] || !raidData[0]?.creator) {
            throw { name: `У вас нет прав для изменения какого-либо рейда` };
        }
        else if (raidData[1] !== undefined) {
            throw {
                name: "Укажите нужный рейд в параметре id_рейда",
                description: `Id рейдов доступные для вас: ${raidData.map((raidData) => raidData.id).join(", ")}`,
            };
        }
        else {
            if (raidData[0].creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                throw {
                    name: "Недостаточно прав",
                    description: `Управление рейдом ${raidId} доступно лишь ${nameCleaner((interaction.guild.members.cache.get(raidData[0].creator)?.displayName ||
                        client.users.cache.get(raidData[0].creator)?.username))}`,
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
            throw { errorType: UserErrors.RAID_NOT_FOUND };
        }
        else {
            if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                throw { errorType: UserErrors.RAID_MISSING_PERMISSIONS };
            }
            else {
                return raidData;
            }
        }
    }
}
export async function updateRaidMessage(raidDbData, interaction) {
    let msg = client.getCachedTextChannel(ids.raidChnId).messages.cache.get(raidDbData.messageId) ||
        (await client.getCachedTextChannel(ids.raidChnId).messages.fetch(raidDbData.messageId));
    let components = [];
    if (!msg || !msg.embeds || !msg.embeds[0]) {
        try {
            msg = await (await (interaction?.guild || client.getCachedGuild()).channels.fetch(ids.raidChnId)).messages.fetch(raidDbData.messageId);
        }
        catch (error) {
            return console.error(`[Error code: 1037] Error during updateRaidMessage`, msg);
        }
        if (!msg)
            return console.error(`[Error code: 1219] Error during updateRaidMessage`, msg);
    }
    const embed = EmbedBuilder.from(msg.embeds[0]);
    const clearMemberName = (id) => nameCleaner(client.getCachedMembers().get(id)?.displayName || "неизвестный пользователь", true);
    const joined = raidDbData.joined && raidDbData.joined.length >= 1
        ? raidDbData.joined
            .map((data, index) => {
            const raidClears = completedRaidsData.get(data);
            return `⁣　${index + 1}. **${clearMemberName(data)}**${raidClears
                ? ` — ${generateRaidClearsText(raidClears[raidDbData.raid])}${raidClears[raidDbData.raid + "Master"] ? ` (+**${raidClears[raidDbData.raid + "Master"]}** на мастере)` : ""}`
                : ""}`;
        })
            .join("\n")
        : "Никого";
    const hotJoined = raidDbData.hotJoined && raidDbData.hotJoined.length >= 1
        ? raidDbData.hotJoined.map((data) => clearMemberName(data)).join(", ")
        : "Никого";
    const alt = raidDbData.alt && raidDbData.alt.length >= 1 ? raidDbData.alt.map((data) => clearMemberName(data)).join(", ") : "Никого";
    if (raidDbData.joined.length && raidDbData.joined.length === 6) {
        embed.setColor(colors.invisible);
        components = msg.components[0].components.map((button) => {
            const btn = ButtonBuilder.from(button);
            if (button.customId === RaidButtons.join) {
                btn.setLabel("В запас").setStyle(ButtonStyle.Primary);
            }
            return btn;
        });
    }
    else if (embed.data.color == null || embed.data.color === 2829617) {
        embed.setColor(getRaidData(raidDbData.raid, raidDbData.difficulty).raidColor);
        components = msg.components[0].components.map((button) => {
            const btn = ButtonBuilder.from(button);
            if (button.customId === RaidButtons.join) {
                btn.setLabel("Записаться").setStyle(ButtonStyle.Success);
            }
            return btn;
        });
    }
    else if (components.length === 0 && !interaction) {
        components = [
            new ButtonBuilder().setCustomId(RaidButtons.join).setLabel("Записаться").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(RaidButtons.leave).setLabel("Выйти").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(RaidButtons.alt).setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
        ];
    }
    const isDescription = embed.data.fields?.findIndex((d) => d.name.startsWith("Описание")) ? 1 : 0;
    const findK = (k) => {
        const index = embed.data.fields.findIndex((d) => d.name.startsWith(k));
        if (index === -1) {
            if (k === "Участник")
                return 2 + isDescription;
            if (k === "Замена")
                return findK("Возможно") === -1 ? 3 + isDescription : findK("Возможно");
            if (k === "Возможно")
                return 4 + isDescription;
            return 5;
        }
        else {
            return index;
        }
    };
    if (raidDbData.joined.length && raidDbData.joined.length >= 1) {
        embed.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0, {
            name: `Участник${raidDbData.joined.length === 1 ? "" : "и"}: ${raidDbData.joined.length}/6`,
            value: joined,
        });
    }
    else {
        embed?.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0);
    }
    if (raidDbData.hotJoined.length && raidDbData.hotJoined.length >= 1) {
        embed?.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0, {
            name: `Замена: ${raidDbData.hotJoined.length}`,
            value: hotJoined,
        });
    }
    else {
        embed?.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0);
    }
    if (raidDbData.alt.length && raidDbData.alt.length >= 1) {
        embed?.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0, {
            name: `Возможно буд${raidDbData.alt.length === 1 ? "ет" : "ут"}: ${raidDbData.alt.length}`,
            value: alt,
        });
    }
    else {
        embed?.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0);
    }
    if (!interaction)
        return { embeds: [embed], components };
    const edits = components.length === 0 ? { embeds: [embed] } : { embeds: [embed], components: await addButtonComponentsToMessage(components) };
    if (interaction instanceof ButtonInteraction) {
        await interaction.message.edit(edits);
    }
    else {
        await msg.edit(edits);
    }
}
export async function raidChallenges(raidData, inChnMsg, startTime, difficulty) {
    if (difficulty > 2)
        return null;
    const barrierEmoji = `<:barrier:1090473007471935519>`;
    const overloadEmoji = `<:overload:1090473013398491236>`;
    const unstoppableEmoji = `<:unstoppable:1090473011175489687>`;
    const milestoneRequest = (await fetchRequest("Platform/Destiny2/3/Profile/4611686018488674684/Character/2305843009489394188/?components=202")).progressions.data.milestones;
    const raidMilestone = milestoneRequest[raidData.milestoneHash];
    const manifest = CachedDestinyActivityModifierDefinition;
    const raidChallengesArray = [];
    const raidModifiersArray = [];
    const raidDataChallanges = destinyRaidsChallenges[raidData.raid];
    const embed = EmbedBuilder.from(inChnMsg.embeds[0]);
    if (!raidMilestone ||
        raidMilestone.activities[raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0]?.modifierHashes === undefined) {
        embed.data.fields[0].name = `**Испытания рейда**`;
        embed.data.fields[0].value = `⁣　⁣*отсутствуют*`;
        return inChnMsg.edit({ embeds: [embed] });
    }
    raidMilestone.activities[raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0].modifierHashes.forEach((modifier) => {
        if (blockedModifierHashesArray.includes(modifier) || (difficulty !== 1 && modifier === 97112028))
            return;
        if (manifest[modifier].displayProperties.description.toLowerCase().startsWith("вас ждет испытание")) {
            const challenge = new Date(raidMilestone.endDate).getTime() > startTime * 1000
                ? raidDataChallanges.find((a) => a.hash === modifier)
                : raidDataChallanges.find((a) => a.hash === modifier)?.encounter === raidDataChallanges.length
                    ? raidDataChallanges.find((a) => a.encounter === 1)
                    : raidDataChallanges.find((a) => a.encounter === raidDataChallanges.find((a) => a.hash === modifier).encounter + 1);
            raidChallengesArray.push("⁣　⁣**" +
                manifest[challenge?.hash].displayProperties.name +
                `**, ${challenge.encounter} этап: ${challenge.description.toLowerCase()}`);
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
            default:
                return null;
        }
    }
    embed.data.fields[0].name =
        raidChallengesArray.length > 0
            ? `**Испытани${raidChallengesArray.length === 1 ? "е" : "я"} ${new Date(raidMilestone.endDate).getTime() > startTime * 1000 ? "этой" : "следующей"} недели**`
            : raidModifiersArray.length > 0
                ? `**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда**`
                : "Объявление";
    embed.data.fields[0].value = `${raidChallengesArray.join("\n")}${raidModifiersArray.length > 0
        ? `${raidChallengesArray.length > 0 ? `\n\n**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда**` : ""}\n`
        : ""}${raidModifiersArray.join("\n")}${raidChallengesArray.length === 0 && raidModifiersArray.length === 0
        ? "⁣　⁣Продается __утепленный__ гараж в восточном ГК. ***Дешево***. За подробностями в личку <@298353895258980362>, торопитесь!"
        : ""}`;
    return inChnMsg.edit({ embeds: [embed] });
}
export async function updatePrivateRaidMessage({ raidEvent, retry }) {
    if (!raidEvent) {
        console.error(`[Error code: 1051] raidDataInChnMsg, no raidData info`);
        return null;
    }
    if (retry) {
        raidEvent = await RaidEvent.findByPk(raidEvent.id);
        if (!raidEvent)
            return null;
    }
    const inChnMsgPromise = client.getCachedTextChannel(raidEvent.channelId).messages.fetch(raidEvent.inChannelMessageId);
    async function raidUserDataManager(discordId) {
        const raidUserData = completedRaidsData.get(discordId);
        const member = client.getCachedMembers().get(discordId);
        if (!raidUserData) {
            if (!retry && member?.roles.cache.has(statusRoles.verified)) {
                setTimeout(() => {
                    if (raidEvent == null)
                        return;
                    updatePrivateRaidMessage({ raidEvent, retry: true });
                    updateRaidMessage(raidEvent);
                }, 1000 * 60 * 5);
            }
            if (member?.roles.cache.has(statusRoles.verified)) {
                return `⁣　<@${discordId}> не закеширован`;
            }
            else if (!member) {
                return `⁣　<@${discordId}> не найден на сервере`;
            }
            else {
                return `⁣　<@${discordId}> не зарегистрирован`;
            }
        }
        const raidClears = [];
        if (raidUserData.ron > 0)
            raidClears.push(`${raidUserData.ron}${raidUserData.ronMaster > 0 ? `(${raidUserData.ronMaster})` : ""} ИК`);
        if (raidUserData.kf > 0)
            raidClears.push(`${raidUserData.kf}${raidUserData.kfMaster > 0 ? `(${raidUserData.kfMaster})` : ""} ГК`);
        if (raidUserData.votd > 0)
            raidClears.push(`${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП`);
        if (raidUserData.vog > 0)
            raidClears.push(`${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ`);
        if (raidUserData.dsc > 0)
            raidClears.push(`${raidUserData.dsc} СГК`);
        if (raidUserData.gos > 0)
            raidClears.push(`${raidUserData.gos} СС`);
        if (raidUserData.lw > 0)
            raidClears.push(`${raidUserData.lw} ПЖ`);
        return `⁣　**${nameCleaner(member?.displayName || member?.user.username || "неизвестный пользователь", true)}** ${raidClears.length > 0
            ? `завершил: ${raidClears.join(", ")}`
            : raidUserData?.totalRaidCount === 0
                ? `не проходил ранее рейды`
                : `не проходил доступные на данный момент рейды`}`;
    }
    const joined = raidEvent.joined.map(async (userId) => raidUserDataManager(userId));
    const hotJoined = raidEvent.hotJoined.map(async (userId) => raidUserDataManager(userId));
    const alt = raidEvent.alt.map(async (userId) => raidUserDataManager(userId));
    const inChnMsg = await inChnMsgPromise;
    if (!inChnMsg || !inChnMsg.embeds || !inChnMsg.embeds[0]) {
        return console.error(`[Error code: 1208] raidDataInChnMsg`, raidEvent.channelId, raidEvent.inChannelMessageId, inChnMsg, inChnMsg?.embeds);
    }
    const embed = EmbedBuilder.from(inChnMsg.embeds[0]);
    embed.spliceFields(1, 3);
    if (raidEvent.joined.length > 0)
        embed.spliceFields(1, 0, { name: "Закрытия рейдов у основной группы", value: (await Promise.all(joined)).join("\n") });
    if (raidEvent.hotJoined.length > 0)
        embed.spliceFields(2, 0, { name: "Закрытия рейдов у запасных участников", value: (await Promise.all(hotJoined)).join("\n") });
    if (raidEvent.alt.length > 0)
        embed.spliceFields(3, 0, { name: "Закрытия рейдов у возможных участников", value: (await Promise.all(alt)).join("\n") });
    return await inChnMsg.edit({ embeds: [embed] });
}
export function timeConverter(str, timezoneOffset = 3) {
    if (!str || str.length === 0)
        return 0;
    if (!isNaN(+str) && str.length === 10)
        return +str;
    if (str.length > 20) {
        const parts = str.replace(/\s+/g, " ").split(/[ ,г.]/);
        if (parts.length <= 1)
            throw { errorType: UserErrors.RAID_TIME_ERROR };
        const day = parseInt(parts[2]);
        const month = new Date().getMonth();
        const time = parts.pop().split(":");
        const hours = parseInt(time[0]);
        const minutes = parseInt(time[1]) ?? 0;
        const date = new Date();
        date.setMonth(month, day);
        date.setHours(hours, minutes, 0, 0);
        date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
        if (date < new Date())
            date.setDate(date.getDate() + 1);
        return Math.round(date.getTime() / 1000);
    }
    const date = new Date();
    const parts = str.replace(/\s+/, " ").split(" ");
    for (let part of parts) {
        const datePart = part.match(/\d+[\.\/]\d+/);
        const timePart = part.match(/\d+:\d+/);
        if (datePart) {
            const [day, month] = datePart[0].split(/[\.\/]/);
            date.setMonth(parseInt(month) - 1, parseInt(day) ?? new Date().getDate());
        }
        else if (timePart) {
            const [hours, minutes] = timePart[0].split(":");
            date.setHours(parseInt(hours), parseInt(minutes) ?? 0);
        }
        else {
            const hour = parseInt(part);
            if (hour) {
                date.setHours(hour, 0);
            }
        }
    }
    date.setSeconds(0, 0);
    date.setTime(date.getTime() - timezoneOffset * 60 * 60 * 1000);
    if (date < new Date())
        date.setDate(date.getDate() + 1);
    return Math.round(date.getTime() / 1000);
}
export async function raidAnnounceSystem(raidData) {
    if (process.env.DEV_BUILD === "dev") {
        return;
    }
    if (raidData.time >= 2147483647) {
        console.error(`[Error code: 1656] Received too big number (${raidData.time}) for raidAnnounce of ${raidData.id}`, raidData);
        return;
    }
    if (raidAnnounceSet.has(raidData.id)) {
        return;
    }
    raidAnnounceSet.add(raidData.id);
    const timeUntilRaid = raidData.time - Math.floor(Date.now() / 1000);
    const timeUntilAnnouncement = timeUntilRaid - 60 * 15;
    if (timeUntilAnnouncement > 0) {
        setTimeout(() => raidAnnounce(raidData), timeUntilAnnouncement * 1000);
    }
}
async function raidAnnounce(oldRaidData) {
    const raidData = await RaidEvent.findByPk(oldRaidData.id);
    if (!raidData || (raidData && raidData.time !== oldRaidData.time))
        return;
    const raidInfo = getRaidData(raidData.raid, raidData.difficulty);
    const guild = (client.getCachedGuild() || client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId)));
    const raidMembers = raidData.joined.map(async (userId) => {
        return guild.members.cache.get(userId) || (await guild.members.fetch(userId));
    });
    const raidMembersNames = (await Promise.all(raidMembers))
        .sort((a) => (a.id === raidData.creator ? 1 : 0))
        .map((member, index) => {
        const raidClears = completedRaidsData.get(member.id);
        return `⁣　${index + 1}. **${nameCleaner(member.displayName, true)}**${raidClears
            ? ` — ${generateRaidClearsText(raidClears[raidData.raid])}${raidClears[raidData.raid + "Master"] ? ` (+**${raidClears[raidData.raid + "Master"]}** на мастере)` : ""}`
            : ""}`;
    });
    const embed = new EmbedBuilder()
        .setColor(raidInfo ? raidInfo.raidColor : colors.default)
        .setTitle("Уведомление о скором рейде")
        .setThumbnail(raidInfo?.raidBanner ?? null)
        .setTimestamp(raidData.time * 1000)
        .setDescription(`Рейд [${raidData.id}-${raidData.raid}](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.messageId}) начнется в течение ${Math.trunc((raidData.time - Math.trunc(Date.now() / 1000)) / 60)} минут!`)
        .addFields([
        {
            name: "Состав группы:",
            value: raidMembersNames.join("\n") || "⁣　*никого*",
        },
    ]);
    try {
        embed.setImage((await getRandomRaidGIF()) || (await getRandomGIF("raid time")));
    }
    catch (error) {
        console.error(`[Error code: 1631] Error during adding image to the notify message`, error);
    }
    const raidVoiceChannels = guild.channels.cache
        .filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid"))
        .reverse();
    const components = [];
    for await (const [_, chn] of raidVoiceChannels) {
        if (chn.userLimit === 0 || chn.userLimit - 6 > chn.members.size || chn.members.has(raidData.creator)) {
            const invite = await chn.createInvite({ reason: "Raid automatic invite", maxAge: 60 * 120 });
            invite
                ? components.push(new ButtonBuilder({
                    style: ButtonStyle.Link,
                    url: invite.url,
                    label: `Перейти ${chn.members.has(raidData.creator) ? "к создателю рейда" : "в рейдовый канал"}`,
                }))
                : "";
            break;
        }
    }
    raidMembers.forEach(async (member) => {
        (await member).send({
            embeds: [embed],
            components: [
                {
                    type: ComponentType.ActionRow,
                    components,
                },
            ],
        });
    });
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
            return `${i + 1}. [${raidData.id}-${raidData.raid}](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.messageId}) - ${raidData.joined.includes(member.id) ? "участником" : "запасным участником"}`;
        })
            .join("\n⁣　⁣");
        const embed = new EmbedBuilder()
            .setColor(colors.error)
            .setAuthor({ name: `Вы записались на несколько рейдов в одно время`, iconURL: icons.error })
            .setDescription(`Рейды, на которые вы записаны <t:${targetRaidTime}:R>:\n　${userJoinedRaidsList}`);
        await member.send({ embeds: [embed] });
    }
}
export async function removeRaid(raid, interaction, requireMessageReply = true, mainInteraction) {
    const deletionResult = await RaidEvent.destroy({ where: { id: raid.id }, limit: 1 });
    const guild = client.getCachedGuild() || (await client.guilds.fetch(guildId));
    const privateRaidChannel = guild.channels.cache.get(raid.channelId) || (await guild.channels.fetch(raid.channelId));
    const mainRaidChannel = (guild.channels.cache.get(ids.raidChnId) || (await guild.channels.fetch(ids.raidChnId)));
    const raidMessage = mainRaidChannel.messages.cache.get(raid.messageId) ||
        (await mainRaidChannel.messages.fetch(raid.messageId).catch((e) => {
            `[Error code: 1697] Not found raid message`;
        }));
    const interactingMember = interaction
        ? guild.members.cache.get(interaction.user.id) || (await guild.members.fetch(interaction.user.id))
        : null;
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
                console.error(`[Error code: 1665]`, e);
            }
        }
        try {
            await raidMessage?.delete();
        }
        catch (e) {
            console.error(`[Error code: 1667]`, e);
        }
        if (!interaction)
            return;
        const successEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setAuthor({ name: `Рейд ${raid.id}-${raid.raid} удален`, iconURL: icons.success });
        if (mainInteraction)
            mainInteraction.deleteReply().catch((e) => {
                return console.error(`[Error code: 1684]`, e);
            });
        return await editMessageReply(successEmbed);
    }
    else {
        console.error(`[Error code: 1423] Error during raid removal ${raid.id}`, deletionResult, raid);
        if (!interaction)
            return;
        const errorEmbed = new EmbedBuilder()
            .setColor("DarkGreen")
            .setTitle(`Произошла ошибка во время удаления`)
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
export async function sendUserRaidGuideNoti(user, raidName) {
    if (!(raidName in raidsGuide))
        return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: `Ознакомьтесь с текстовым прохождением рейда перед его началом`, iconURL: icons.notify })
        .setColor(colors.serious);
    const components = [
        new ButtonBuilder().setCustomId(`raidGuide_${raidName}`).setLabel(`Инструкция по рейду`).setStyle(ButtonStyle.Primary),
    ];
    return await user.send({ embeds: [embed], components: await addButtonComponentsToMessage(components) });
}
