import { EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, ButtonInteraction, ChannelType, } from "discord.js";
import { chnFetcher, msgFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { db, auth_data, raids } from "../handlers/sequelize.js";
import { completedRaidsData } from "../features/full_checker.js";
import { dlcsRoles, statusRoles } from "../base/roles.js";
import { ids, guildId } from "../base/ids.js";
import { BotClient } from "../index.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { CachedDestinyActivityModifierDefinition } from "../handlers/manifestHandler.js";
import { gameRaidChallenges } from "../base/gameRaidChallenges.js";
import { Op } from "sequelize";
const noDataRaids = new Set();
export const raidBlacklist = new Map();
const raidAnnounceSet = new Set();
raids
    .findAll({
    where: {
        [Op.and]: [
            { time: { [Op.gt]: Math.trunc(new Date().getTime() / 1000) } },
            { time: { [Op.lt]: Math.trunc(new Date().getTime() / 1000 + 24 * 60 * 60) } },
        ],
    },
})
    .then((raids) => {
    raids.forEach((raidData) => raidAnnounceSystem(raidData));
});
async function raidChallenges(raidData, inChnMsg, startTime, difficulty) {
    if (difficulty > 2)
        return;
    const milestoneRequest = await fetchRequest("Platform/Destiny2/Milestones/");
    const raidMilestone = milestoneRequest[raidData.milestoneHash];
    const manifest = CachedDestinyActivityModifierDefinition;
    const raidChallengesArray = [];
    const raidModifiersArray = [];
    const raidDataChallanges = gameRaidChallenges(raidData.raid);
    raidDataChallanges.find((a) => a.hash === 5)?.description;
    raidMilestone?.activities[raidMilestone?.activities.length > 1 ? (difficulty === 1 ? 0 : 1) : 0].modifierHashes.forEach((modifier) => {
        if (modifier === 1123720291 ||
            modifier === 1783825372 ||
            modifier === 782039530 ||
            modifier === 2006149364 ||
            modifier === 197794292 ||
            modifier === 3307318061 ||
            (difficulty !== 1 && modifier === 97112028))
            return;
        if (String(manifest[modifier].displayProperties.description).toLowerCase().startsWith("вас ждет испытание")) {
            const challenge = new Date(raidMilestone.endDate).getTime() > startTime * 1000
                ? raidDataChallanges.find((a) => a.hash === modifier)
                : raidDataChallanges.find((a) => a.hash === modifier)?.encounter === raidDataChallanges.length
                    ? raidDataChallanges.find((a) => a.encounter === 1)
                    : raidDataChallanges.find((a) => a.encounter === raidDataChallanges.find((a) => a.hash === modifier).encounter + 1);
            raidChallengesArray.push("⁣　⁣**" + manifest[challenge?.hash].displayProperties.name + `**, ${challenge.encounter} этап: ${challenge.description.toLowerCase()}`);
        }
        else if (new Date(raidMilestone.endDate).getTime() > startTime * 1000) {
            if (modifier === 4038464106)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с барьерными, перегруженными и неудержимыми воителями");
            if (modifier === 2116552995)
                return raidModifiersArray.push("⁣　⁣**Модификаторы «Мастер»:** больше воителей и щитов");
            if (modifier === 1990363418)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с барьерными и перегруженными воителями");
            if (modifier === 40182179)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с перегруженными и неудержимыми воителями");
            raidModifiersArray.push("⁣　⁣**" + manifest[modifier].displayProperties.name + ":** " + String(manifest[modifier].displayProperties.description).toLowerCase());
        }
    });
    const embed = EmbedBuilder.from(inChnMsg.embeds[0]);
    embed.data.fields[0].name =
        raidChallengesArray.length > 0
            ? `**Испытани${raidChallengesArray.length === 1 ? "е" : "я"} ${new Date(raidMilestone.endDate).getTime() > startTime * 1000 ? "этой" : "следующей"} недели:**`
            : raidModifiersArray.length > 0
                ? `**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда:**`
                : "Объявление";
    embed.data.fields[0].value = `${raidChallengesArray.join("\n")}${raidModifiersArray.length > 0
        ? `${raidChallengesArray.length > 0 ? `\n\n**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда:**` : ""}\n`
        : ""}${raidModifiersArray.join("\n")}${raidChallengesArray.length === 0 && raidModifiersArray.length === 0
        ? "⁣　⁣Продается __утепленный__ гараж в восточном ГК. ***Дешево***. За подробностями в личку <@298353895258980362>"
        : ""}`;
    return inChnMsg.edit({ embeds: [embed] });
}
export async function raidDataInChnMsg(raidData) {
    if (!raidData)
        return console.error(`[Error code: 1051] raidDataInChnMsg, no raidData info`);
    if (noDataRaids.has(raidData)) {
        noDataRaids.delete(raidData);
        raidData = await raids.findOne({ where: { id: raidData.id } });
        if (!raidData)
            return;
    }
    const inChnMsgPromise = msgFetcher(raidData.chnId, raidData.inChnMsg);
    const guildMembers = BotClient.guilds.cache.get(guildId).members.cache;
    const getDiscordMember = (discordId) => guildMembers.get(discordId);
    function raidUserDataManager(userId) {
        const raidUserData = completedRaidsData.get(userId);
        const member = getDiscordMember(userId);
        if (!raidUserData) {
            if (!noDataRaids.has(raidData) && member?.roles.cache.has(statusRoles.clanmember)) {
                noDataRaids.add(raidData);
                setTimeout(() => raidDataInChnMsg(raidData), 60 * 1000 * 5);
            }
            if (member?.roles.cache.has(statusRoles.verified)) {
                return `Данные <@${userId}> не были закешированы - в течение 5-ти минут они обновятся`;
            }
            else {
                return `<@${userId}> не зарегистрирован`;
            }
        }
        const raidClears = [];
        raidUserData.kf > 0 ? raidClears.push(`${raidUserData.kf}${raidUserData.kfMaster > 0 ? `(${raidUserData.kfMaster})` : ""} ГК`) : "";
        raidUserData.votd > 0 ? raidClears.push(`${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП`) : "";
        raidUserData.vog > 0 ? raidClears.push(`${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ`) : "";
        raidUserData.dsc > 0 ? raidClears.push(`${raidUserData.dsc} СГК`) : "";
        raidUserData.gos > 0 ? raidClears.push(`${raidUserData.gos} СС`) : "";
        raidUserData.lw > 0 ? raidClears.push(`${raidUserData.lw} ПЖ`) : "";
        return `${raidClears.length > 0
            ? `${member?.displayName.replace(/\[[+](?:\d|\d\d)]/, "")} завершил: ${raidClears.join(", ")}`
            : `${member?.displayName.replace(/\[[+](?:\d|\d\d)]/, "")} не проходил ранее рейды`}`;
    }
    const joined = raidData.joined.map((userId) => raidUserDataManager(userId));
    const hotJoined = raidData.hotJoined.map((userId) => raidUserDataManager(userId));
    const alt = raidData.alt.map((userId) => raidUserDataManager(userId));
    const inChnMsg = await inChnMsgPromise;
    if (!inChnMsg || !inChnMsg.embeds || !inChnMsg.embeds[0]) {
        return console.error(`Error during raidDataInChnMsg`, raidData.chnId, raidData.inChnMsg, inChnMsg ? inChnMsg.id : inChnMsg, inChnMsg ? inChnMsg.embeds : "");
    }
    const embed = EmbedBuilder.from(inChnMsg.embeds[0]);
    embed.spliceFields(1, 3);
    if (raidData.joined.length > 0)
        embed.spliceFields(1, 0, { name: "Успешные закрытия рейдов у основной группы", value: joined.join("\n") });
    if (raidData.hotJoined.length > 0)
        embed.spliceFields(2, 0, { name: "Успешные закрытия рейдов у запасных участников", value: hotJoined.join("\n") });
    if (raidData.alt.length > 0)
        embed.spliceFields(3, 0, { name: "Успешные закрытия рейдов у возможных участников", value: alt.join("\n") });
    embed.setTimestamp();
    inChnMsg.edit({ embeds: [embed] });
}
export async function timerConverter(time, data) {
    const args = time.replace(/\s+/g, " ").trim().split(" ");
    const date = new Date();
    function timeSpliter(args) {
        if (args[0]?.split(":").length === 2 && args[1]?.split("/").length === 2) {
            var hhmm = args[0];
            var ddmm = args[1];
            return { hhmm, ddmm };
        }
        else if (args[1]?.split(":").length === 2 && args[0]?.split("/").length === 2) {
            var hhmm = args[1];
            var ddmm = args[0];
            return { hhmm, ddmm };
        }
        else if (args.length === 1 && args[0]?.split(":").length === 2) {
            var hhmm = args[0];
            var ddmm = `${date.getDate() + `/` + (date.getMonth() + 1)}`;
            return { hhmm, ddmm };
        }
        else {
            return {};
        }
    }
    const { hhmm, ddmm } = timeSpliter(args);
    const daymonth = ddmm?.split("/");
    const hoursmins = hhmm?.split(":");
    if (!daymonth || !hoursmins) {
        throw {
            name: "Ошибка времени",
            message: 'Время должно быть указано в формате (без ""): "ДЕНЬ/МЕСЯЦ ЧАС:МИНУТА"\nПробел обязателен если указывается и дата, и время. Знак / и : также обязательны.',
            falseAlarm: true,
        };
    }
    date.setMonth(Math.round(Number(daymonth[1]) - 1), Number(daymonth[0]));
    date.setHours(Number(hoursmins[0]), Number(hoursmins[1]) || 0, 0, 0);
    if (date.getTimezoneOffset() !== -540)
        date.setTime(Math.trunc(date.getTime() - ((await data)?.tz || 3) * 60 * 60 * 1000));
    const returnTime = Math.trunc(date.getTime() / 1000);
    if (isNaN(returnTime)) {
        throw {
            name: "Ошибка времени",
            message: `Проверьте правильность введенного времени, дата: ${daymonth.toString()}, время: ${hoursmins.toString()}`,
            falseAlarm: true,
        };
    }
    return returnTime;
}
async function raidAnnounceSystem(raidData) {
    if (!raidAnnounceSet.has(raidData.id)) {
        raidAnnounceSet.add(raidData.id);
        const time = raidData.time - Math.trunc(new Date().getTime() / 1000);
        if (time <= 60 * 60 * 24)
            setTimeout(() => raidAnnounce(raidData), (time - 60 * 15) * 1000);
    }
}
async function raidAnnounce(oldRaidData) {
    const raidData = await raids.findOne({ where: { id: oldRaidData.id } });
    if (!raidData || (raidData && raidData.time !== oldRaidData.time))
        return;
    const raidInfo = raidDataFetcher(raidData.raid, raidData.difficulty);
    const guild = BotClient.guilds.cache.get(guildId);
    const raidMembers = raidData.joined.map(async (userId) => {
        return guild.members.cache.get(userId) || (await guild.members.fetch(userId));
    });
    const raidMembersNames = (await Promise.all(raidMembers))
        .sort((a, b) => {
        return a.id === raidData.creator ? 1 : 0;
    })
        .map((member, i) => {
        const userRaidClears = completedRaidsData.get(member.id);
        return `${i + 1 + ". **" + member.displayName.replace(/\[[+](?:\d|\d\d)]/, "")}**${userRaidClears
            ? `— ${userRaidClears[raidData.raid]}${raidInfo?.maxDifficulty >= 2 ? `(${userRaidClears[raidData.raid + "Master"]})` : ""} закрытий рейда`
            : ""} `;
    });
    const embed = new EmbedBuilder()
        .setColor(raidInfo ? raidInfo.raidColor : colors.default)
        .setTitle("Уведомление о скором рейде")
        .setThumbnail(raidInfo?.raidBanner || null)
        .setTimestamp(raidData.time * 1000)
        .setDescription(`Рейд [${raidData.id}-${raidData.raid}](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.msgId}) начнется в течение 15-ти минут!`)
        .addFields([
        {
            name: "Состав группы",
            value: raidMembersNames.join("\n"),
        },
    ]);
    const raidVoiceChannels = guild.channels.cache
        .filter((chn) => chn.parentId === ids.raidChnCategoryId && chn.type === ChannelType.GuildVoice && chn.name.includes("Raid Room"))
        .reverse();
    const components = [];
    for await (const [i, chn] of raidVoiceChannels) {
        if (chn.type === ChannelType.GuildVoice && (chn.userLimit === 0 || chn.userLimit - 6 > chn.members.size || chn.members.has(raidData.creator))) {
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
                    components: components,
                },
            ],
        });
    });
}
export function raidDataFetcher(raid, difficulty) {
    switch (raid) {
        case "kf":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Гибель короля: Мастер" : "Гибель короля",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/raid_kings_fall.jpg",
                raidColor: difficulty === 2 ? "#FF063A" : "#a02200",
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
                raidColor: difficulty === 2 ? "#FF063A" : "#52E787",
                channelName: "-клятва-послушника",
                requiredRole: dlcsRoles.twq,
                milestoneHash: 2136320298,
            };
        case "vog":
            return {
                raid: raid,
                raidName: difficulty === 2 ? "Хрустальный чертог: Мастер" : "Хрустальный чертог",
                maxDifficulty: 2,
                raidBanner: "https://www.bungie.net/img/destiny_content/pgcr/vault_of_glass.jpg",
                raidColor: difficulty === 2 ? "#FF063A" : "#52E787",
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
                requiredRole: dlcsRoles.bl,
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
                requiredRole: dlcsRoles.sk,
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
                requiredRole: dlcsRoles.frs,
                milestoneHash: 3181387331,
            };
    }
}
async function getRaid(raidId, interaction) {
    if (raidId === null) {
        const raidData = await raids.findAll({
            where: { creator: interaction.user.id },
        });
        if (!raidData || !raidData[0] || !raidData[0]?.creator) {
            throw { name: `У вас нет ни одного рейда, создателем которого вы являетесь`, falseAlarm: true };
        }
        else if (raidData[1] !== undefined) {
            throw {
                name: "Укажите нужный рейд в параметре id_рейда",
                message: `Id рейдов доступные для вас: ${raidData.map((raidData) => raidData.id).join(", ")}`,
            };
        }
        else {
            if (raidData[0].creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                throw {
                    name: "Недостаточно прав",
                    message: `Управление рейдом ${raidId} доступно лишь ${interaction
                        .guild.members.cache.get(raidData[0].creator)
                        .displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
                };
            }
            else {
                return raidData[0];
            }
        }
    }
    else {
        const raidData = await raids.findOne({
            where: { id: raidId },
        });
        if (raidData === null || !raidData?.creator) {
            throw { name: `Рейд ${raidId} не найден` };
        }
        else {
            if (raidData.creator !== interaction.user.id && !interaction.memberPermissions?.has("Administrator")) {
                throw {
                    name: "Недостаточно прав",
                    message: `Управление рейдом ${raidId} доступно лишь ${interaction
                        .guild.members.cache.get(raidData.creator)
                        .displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
                    falseAlarm: true,
                };
            }
            else {
                return raidData;
            }
        }
    }
}
export async function raidMsgUpdate(raidData, interaction) {
    const msg = await msgFetcher(ids.raidChnId, raidData.msgId);
    if (!msg || !msg.embeds || !msg.embeds[0]) {
        return console.error(`[Error code: 1037] Error during raidMsgUpdate`, msg.id, msg.embeds);
    }
    const embed = EmbedBuilder.from(msg.embeds[0]);
    const gMembers = (id) => interaction.guild.members.cache.get(id)?.displayName.replace(/\[[+](?:\d|\d\d)]/, "");
    const joined = raidData.joined && raidData.joined.length >= 1 ? raidData.joined.map((data) => gMembers(data)).join(", ") : "Никого";
    const hotJoined = raidData.hotJoined && raidData.hotJoined.length >= 1 ? raidData.hotJoined.map((data) => gMembers(data)).join(", ") : "Никого";
    const alt = raidData.alt && raidData.alt.length >= 1 ? raidData.alt.map((data) => gMembers(data)).join(", ") : "Никого";
    if (raidData.joined.length && raidData.joined.length == 6) {
        embed.setColor(null);
    }
    else if (embed.data.color === undefined) {
        embed.setColor(raidDataFetcher(raidData.raid, raidData.difficulty).raidColor);
    }
    const isDescription = embed.data.fields?.findIndex((d) => d.name.startsWith("Описание")) ? 1 : 0;
    const findK = (k) => {
        const index = embed?.data?.fields?.findIndex((d) => d.name.startsWith(k));
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
    if (raidData.joined?.length && raidData.joined?.length >= 1) {
        embed?.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0, {
            name: `Участник${raidData.joined?.length === 1 ? "" : "и"}: ${raidData.joined?.length}/6`,
            value: joined,
        });
    }
    else {
        embed?.spliceFields(findK("Участник"), findK("Участник") !== -1 ? 1 : 0);
    }
    if (raidData.hotJoined?.length && raidData.hotJoined?.length >= 1) {
        embed?.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0, { name: `Замена: ${raidData.hotJoined?.length}`, value: hotJoined });
    }
    else {
        embed?.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0);
    }
    if (raidData.alt?.length && raidData.alt?.length >= 1) {
        embed?.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0, {
            name: `Возможно буд${raidData.alt?.length === 1 ? "ет" : "ут"}: ${raidData.alt?.length}`,
            value: alt,
        });
    }
    else {
        embed?.spliceFields(findK("Возможно"), findK("Возможно") !== -1 ? 1 : 0);
    }
    if (interaction instanceof ButtonInteraction) {
        await interaction.message.edit({ embeds: [embed] });
    }
    else {
        await msg.edit({ embeds: [embed] });
    }
}
export default {
    name: "рейд",
    nameLocalizations: {
        "en-US": "raid",
        "en-GB": "raid",
    },
    description: "Создание и управление наборами на рейды",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "создать",
            nameLocalizations: { "en-US": "create", "en-GB": "create" },
            description: "Создание набора на рейд",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "рейд",
                    nameLocalizations: { "en-US": "raid", "en-GB": "raid" },
                    description: "Укажите рейд",
                    required: true,
                    choices: [
                        {
                            name: "Гибель короля",
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            value: "lw",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "время",
                    nameLocalizations: { "en-US": "time", "en-GB": "time" },
                    description: "Укажите время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "описание",
                    nameLocalizations: { "en-US": "description", "en-GB": "description" },
                    maxLength: 1024,
                    description: "Укажите описание",
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 1,
                    maxValue: 2,
                    name: "сложность",
                    nameLocalizations: { "en-US": "difficulty", "en-GB": "difficulty" },
                    description: "Нормальный/Мастер",
                    choices: [
                        {
                            name: "Нормальный",
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            value: 2,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "требуемых_закрытий",
                    nameLocalizations: { "en-US": "req_clears", "en-GB": "req_clears" },
                    description: "Укажите минимальное количество закрытий этого рейда для записи",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "изменить",
            nameLocalizations: { "en-US": "edit", "en-GB": "edit" },
            description: "Изменение созданного набора",
            options: [
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id редактируемого рейда",
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новый_рейд",
                    nameLocalizations: { "en-US": "new_raid", "en-GB": "new_raid" },
                    description: "Укажите измененный рейд",
                    choices: [
                        {
                            name: "Гибель короля",
                            value: "kf",
                        },
                        {
                            name: "Клятва послушника",
                            value: "votd",
                        },
                        {
                            name: "Хрустальный чертог",
                            value: "vog",
                        },
                        {
                            name: "Склеп Глубокого камня",
                            value: "dsc",
                        },
                        {
                            name: "Сад спасения",
                            value: "gos",
                        },
                        {
                            name: "Последнее желание",
                            value: "lw",
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_время",
                    nameLocalizations: { "en-US": "new_time", "en-GB": "new_time" },
                    description: "Укажите измененное время старта. Формат: ЧАС:МИНУТА ДЕНЬ/МЕСЯЦ",
                },
                {
                    type: ApplicationCommandOptionType.User,
                    name: "новый_создатель",
                    nameLocalizations: { "en-US": "new_creator", "en-GB": "new_creator" },
                    description: "Укажите нового создателя рейда",
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "новое_описание",
                    nameLocalizations: { "en-US": "new_description", "en-GB": "new_description" },
                    description: "Укажите измененное описание",
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "новая_сложность",
                    minValue: 1,
                    maxValue: 2,
                    nameLocalizations: { "en-US": "new_difficulty", "en-GB": "new_difficulty" },
                    description: "Нормальный/Мастер",
                    choices: [
                        {
                            name: "Нормальный",
                            value: 1,
                        },
                        {
                            name: "Мастер",
                            value: 2,
                        },
                    ],
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    minValue: 0,
                    maxValue: 1000,
                    name: "новое_количество_закрытий",
                    nameLocalizations: { "en-US": "new_req_clears", "en-GB": "new_req_clears" },
                    description: "Укажите измененное минимальное количество закрытий для записи",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "добавить",
            nameLocalizations: { "en-US": "add", "en-GB": "add" },
            description: "Добавление участника на набор",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите добавляемого участника",
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "альтернатива",
                    nameLocalizations: { "en-US": "alt", "en-GB": "alt" },
                    description: "Укажите группу добавляемого участника",
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, на который добавляем участника",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "исключить",
            nameLocalizations: { "en-US": "kick", "en-GB": "kick" },
            description: "Исключение участника из набора",
            options: [
                {
                    type: ApplicationCommandOptionType.User,
                    name: "участник",
                    nameLocalizations: { "en-US": "user", "en-GB": "user" },
                    description: "Укажите исключаемого участника",
                    required: true,
                },
                {
                    type: ApplicationCommandOptionType.Boolean,
                    name: "blacklist",
                    nameLocalizations: { ru: "черный_список" },
                    description: "Добавить участника в ЧС рейда",
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id рейда, из которого исключаем участника",
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "удалить",
            nameLocalizations: { "en-US": "delete", "en-GB": "delete" },
            description: "Удаление созданного набора",
            options: [
                {
                    type: ApplicationCommandOptionType.Integer,
                    min_value: 1,
                    max_value: 100,
                    name: "id_рейда",
                    nameLocalizations: { "en-US": "raid_id", "en-GB": "raid_id" },
                    autocomplete: true,
                    description: "Укажите Id удаляемого рейда",
                },
            ],
        },
    ],
    callback: async (_client, interaction, member, guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const { options } = interaction;
        const subCommand = options.getSubcommand(true);
        if (subCommand === "создать") {
            const raid = options.getString("рейд", true);
            const time = options.getString("время", true);
            const raidDescription = options.getString("описание");
            const difficulty = options.getInteger("сложность") || 1;
            const reqClears = options.getInteger("требуемых_закрытий") || 0;
            const data = auth_data.findOne({
                where: { discord_id: member.id },
                attributes: ["tz"],
            });
            const raidData = raidDataFetcher(raid, difficulty);
            const parsedTime = await timerConverter(time, data);
            if (parsedTime < Math.trunc(new Date().getTime() / 1000)) {
                throw {
                    name: "Ошибка. Указанное время в прошлом",
                    message: `Вы указали время <t:${parsedTime}>, <t:${parsedTime}:R>, но время начала обязательно должно быть в будущем\nВремя указывается по вашему часовому поясу. Ваш часовой пояс +${(await data)?.tz || "3"} от UTC+00:00`,
                };
            }
            const raidDb = await raids.create({
                chnId: member.id,
                inChnMsg: member.id,
                msgId: member.id,
                creator: member.id,
                joined: `{${member.id}}`,
                time: parsedTime,
                raid: raidData.raid,
                difficulty: difficulty,
                reqClears: reqClears,
            });
            const embed = new EmbedBuilder()
                .setTitle(`Рейд: ${raidData.raidName}${reqClears >= 1 ? ` от ${reqClears} закрытий` : ""}`)
                .setColor(raidData.raidColor)
                .setFooter({
                text: `Создатель рейда: ${member.displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
                iconURL: "https://www.bungie.net/common/destiny2_content/icons/8b1bfd1c1ce1cab51d23c78235a6e067.png",
            })
                .setThumbnail(raidData.raidBanner)
                .addFields([
                { name: "Id", value: raidDb.id.toString(), inline: true },
                {
                    name: `Начало: <t:${parsedTime}:R>`,
                    value: `<t:${parsedTime}>`,
                    inline: true,
                },
                { name: "Участники: 1/6", value: `<@${member.id}>` },
            ]);
            if (raidDescription !== null && raidDescription.length < 1024) {
                embed.spliceFields(2, 0, {
                    name: "Описание",
                    value: raidDescription.replace(/\\n/g, "\n"),
                });
            }
            const mainComponents = [
                new ButtonBuilder().setCustomId("raidEvent_btn_join").setLabel("Записаться").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("raidEvent_btn_leave").setLabel("Выйти").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("raidEvent_btn_alt").setLabel("Возможно буду").setStyle(ButtonStyle.Secondary),
            ];
            const content = `Открыт набор в рейд: ${raidData.raidName} ${raidData.requiredRole !== null ? `<@&${raidData.requiredRole}>` : member.guild.roles.everyone}`;
            const raidChannel = chnFetcher(ids.raidChnId);
            const msg = raidChannel.send({
                content: content,
                embeds: [embed],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: mainComponents,
                    },
                ],
            });
            member.guild.channels
                .create({
                name: `├💪${raidDb.id}-${raidData.channelName}`,
                parent: ids.raidChnCategoryId,
                position: raidChannel.rawPosition + 1,
                permissionOverwrites: [
                    {
                        deny: "ViewChannel",
                        id: member.guild.roles.everyone,
                    },
                    {
                        allow: ["ViewChannel", "ManageMessages", "MentionEveryone"],
                        id: member.id,
                    },
                ],
                reason: `New raid by ${member.displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
            })
                .then(async (chn) => {
                raidAnnounceSystem(raidDb);
                const premiumEmbed = new EmbedBuilder()
                    .setColor("#F3AD0C")
                    .addFields([
                    { name: "⁣", value: `**Испытания этой недели:**\n　*на одном из этапов*\n\n**Модификаторы рейда:**\n　*если есть..*` },
                ]);
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder().setCustomId("raidInChnButton_notify").setLabel("Оповестить участников").setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("raidInChnButton_transfer")
                                .setLabel("Переместить участников в рейд-войс")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId("raidInChnButton_unlock").setLabel("Закрыть набор").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId("raidInChnButton_resend").setLabel("Обновить сообщение").setStyle(ButtonStyle.Secondary),
                        ],
                    },
                ];
                const inChnMsg = chn.send({
                    embeds: [premiumEmbed],
                    components: components,
                });
                const insertedRaidData = raids.update({
                    chnId: chn.id,
                    inChnMsg: (await inChnMsg).id,
                    msgId: (await msg).id,
                }, { where: { chnId: member.id }, returning: true });
                await deferredReply;
                interaction.editReply({
                    content: `Рейд создан. <#${chn.id}>, [ссылка на набор](https://discord.com/channels/${guild.id}/${raidChannel.id}/${(await msg).id})`,
                });
                raidDataInChnMsg((await insertedRaidData)[1][0]);
                raidChallenges(raidData, await inChnMsg, parsedTime, difficulty);
            });
        }
        else if (subCommand === "изменить") {
            const raidId = options.getInteger("id_рейда");
            const newRaid = options.getString("новый_рейд");
            const newTime = options.getString("новое_время");
            const newRaidLeader = options.getUser("новый_создатель");
            const newDescription = options.getString("новое_описание");
            const newDifficulty = options.getInteger("новая_сложность");
            const newReqClears = options.getInteger("новое_количество_закрытий");
            var raidData = await getRaid(raidId, interaction);
            if (raidData === null || (raidData instanceof Array && raidData.length === 0)) {
                throw {
                    name: "Ошибка. Рейд не найден",
                };
            }
            const raidInfo = raidDataFetcher(newRaid || raidData.raid, newDifficulty || raidData.difficulty);
            const time = raidData.time;
            const reqClears = raidData.reqClears;
            const msgId = raidData.msgId;
            const changes = [];
            const embedChanges = [];
            const embed = msgFetcher(ids.raidChnId, msgId);
            const t = await db.transaction();
            const changesForChannel = [];
            if (newRaid || newDifficulty || newReqClears) {
                changes.push(`Рейд был измнен`);
                newRaid
                    ? changesForChannel.push({
                        name: `Рейд`,
                        value: `Рейд набора был изменен - \`${raidInfo.raidName}\``,
                    })
                    : "";
                newReqClears == 0
                    ? changesForChannel.push({
                        name: "Требование для вступления",
                        value: `Требование для вступления \`отключено\``,
                    })
                    : newReqClears
                        ? changesForChannel.push({
                            name: "Требование для вступления",
                            value: `Теперь для вступления нужно от \`${newReqClears}\` закрытий`,
                        })
                        : "";
                newDifficulty && newDifficulty <= raidInfo.maxDifficulty
                    ? changesForChannel.push({
                        name: "Сложность рейда",
                        value: `Сложность рейда была изменена - \`${newDifficulty === 2 ? "Мастер" : newDifficulty === 1 ? "Нормальный" : "*неизвестная сложность*"}\``,
                    })
                    : "";
                embedChanges.push({
                    color: raidInfo.raidColor,
                }, {
                    title: newReqClears || reqClears >= 1 || newDifficulty
                        ? `Рейд: ${raidInfo.raidName}${(newReqClears && newReqClears === 0) || (!newReqClears && reqClears === 0)
                            ? ""
                            : newReqClears
                                ? ` от ${newReqClears} закрытий`
                                : ` от ${reqClears} закрытий`}`
                        : `Рейд: ${raidInfo.raidName}`,
                }, {
                    thumbnail: raidInfo.raidBanner,
                });
                if (newRaid) {
                    await raids.update({
                        raid: raidInfo.raid,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                    raidChallenges(raidInfo, await msgFetcher(raidData.chnId, raidData.inChnMsg), raidData.time, newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : raidData.difficulty);
                    chnFetcher(raidData.chnId).edit({ name: `├💪${raidData.id}-${raidInfo.channelName}` });
                }
                if ((newDifficulty && raidInfo.maxDifficulty >= newDifficulty) || newRaid) {
                    await raids.update({
                        difficulty: newDifficulty && raidInfo.maxDifficulty >= newDifficulty ? newDifficulty : 1,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
                if (newReqClears !== null) {
                    await raids.update({
                        reqClears: newReqClears,
                    }, {
                        where: { id: raidData.id },
                        transaction: t,
                    });
                }
            }
            if (newDescription) {
                embedChanges.push({
                    description: newDescription,
                });
                if (newDescription.length <= 1) {
                    changesForChannel.push({
                        name: "Описание",
                        value: `Описание было удалено`,
                    });
                }
                else {
                    changesForChannel.push({
                        name: "Описание",
                        value: newDescription,
                    });
                }
                changes.push(`Описание было изменено`);
            }
            if (newTime) {
                const data = auth_data.findOne({
                    where: { discord_id: member.id },
                    attributes: ["tz"],
                });
                const changedTime = await timerConverter(newTime, data);
                if (changedTime === time) {
                    return changes.push(`Время старта осталось без изменений`);
                }
                if (changedTime > Math.trunc(new Date().getTime() / 1000)) {
                    embedChanges.push({
                        time: changedTime,
                    });
                    changesForChannel.push({
                        name: "Время",
                        value: `Старт рейда перенесен на <t:${changedTime}>, <t:${changedTime}:R>`,
                    });
                    changes.push(`Время старта было изменено`);
                    const [i, updatedRaiddata] = await raids.update({
                        time: changedTime,
                    }, { where: { id: raidData.id }, transaction: t, returning: ["id", "time"] });
                    raidAnnounceSystem(updatedRaiddata[0]);
                }
                else {
                    changes.push(`Время старта осталось без изменений - указано время <t:${changedTime}>, <t:${changedTime}:R>, но оно в прошлом`);
                }
            }
            if (newRaidLeader) {
                if (!newRaidLeader.bot) {
                    guild.channels.cache.get(raidData.chnId).edit({
                        permissionOverwrites: [
                            {
                                deny: ["ManageMessages", "MentionEveryone"],
                                id: raidData.creator,
                            },
                            {
                                allow: ["ManageMessages", "MentionEveryone", "ViewChannel"],
                                id: newRaidLeader.id,
                            },
                        ],
                    });
                    embedChanges.push({
                        raidLeader: newRaidLeader,
                    });
                    changesForChannel.push({
                        name: "Создатель рейда",
                        value: raidData.creator === interaction.user.id
                            ? `${interaction
                                .guild.members.cache.get(interaction.user.id)
                                .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} передал права создателя рейда ${interaction
                                .guild.members.cache.get(newRaidLeader.id)
                                .displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`
                            : `Права создателя были переданы ${interaction
                                .guild.members.cache.get(newRaidLeader.id)
                                .displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
                    });
                    changes.push(`Создатель рейда был изменен`);
                    await raids.update({
                        creator: newRaidLeader.id,
                    }, { where: { id: raidData.id }, transaction: t });
                }
                else {
                    changes.push(`Создатель рейда не был изменен - нельзя назначить бота создателем`);
                }
            }
            const raidEmbed = EmbedBuilder.from((await embed).embeds[0]);
            embedChanges.forEach(async (change) => {
                if (change.color)
                    raidEmbed.setColor(change.color);
                if (change.title)
                    raidEmbed.setTitle(change.title);
                if (change.thumbnail)
                    raidEmbed.setThumbnail(change.thumbnail);
                if (change.description) {
                    const field = {
                        name: `Описание`,
                        value: change.description.replace(/\\n/g, "\n"),
                    };
                    var checker = false;
                    raidEmbed.data.fields?.map((k, v) => {
                        if (k.name === "Описание") {
                            if (change.description !== " " && change.description !== "-") {
                                raidEmbed.spliceFields(v, 1, field);
                                checker = true;
                            }
                            else {
                                raidEmbed.spliceFields(v, 1);
                                checker = true;
                            }
                        }
                    });
                    if (!checker)
                        raidEmbed.spliceFields(2, 0, field);
                }
                if (change.raidLeader) {
                    raidEmbed.setFooter({
                        text: `Создатель рейда: ${interaction
                            .guild.members.cache.get(change.raidLeader.id)
                            .displayName.replace(/\[[+](?:\d|\d\d)]/, "")}`,
                        iconURL: raidEmbed.data.footer?.icon_url,
                    });
                }
                if (change.time) {
                    const field = {
                        name: `Начало: <t:${change.time}:R>`,
                        value: `<t:${change.time}>`,
                        inline: true,
                    };
                    raidEmbed.data.fields?.map((k, v) => {
                        if (k.name.startsWith("Начало")) {
                            raidEmbed.spliceFields(v, 1, field);
                        }
                    });
                }
            });
            if (embedChanges.length > 0 && changesForChannel.length > 0) {
                try {
                    t.commit();
                }
                catch (error) {
                    console.error(error);
                }
                (await msgFetcher(ids.raidChnId, msgId)).edit({
                    embeds: [raidEmbed],
                });
                const replyEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`Рейд ${raidData.id} был изменен`)
                    .setDescription(changes.join(`\n`).toString())
                    .setTimestamp();
                await deferredReply;
                interaction.editReply({ embeds: [replyEmbed] });
                const editedEmbedReplyInChn = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTimestamp()
                    .setFooter({
                    text: `Изменение ${raidData.creator === interaction.user.id ? "создателем рейда" : "Администратором"}`,
                });
                changesForChannel.forEach((chng) => {
                    editedEmbedReplyInChn.addFields(chng);
                });
                chnFetcher(raidData.chnId).send({ embeds: [editedEmbedReplyInChn] });
            }
            else {
                t.rollback();
                const replyEmbed = new EmbedBuilder().setColor("DarkRed").setTitle("Параметры не были указаны");
                await deferredReply;
                interaction.editReply({ embeds: [replyEmbed] });
            }
        }
        else if (subCommand === "удалить") {
            const raidId = options.getInteger("id_рейда");
            const raidData = await getRaid(raidId, interaction);
            await raids
                .destroy({ where: { id: raidData.id } })
                .then(async () => {
                try {
                    await guild.channels.cache
                        .get(raidData.chnId)
                        ?.delete(`${interaction.guild.members.cache.get(interaction.user.id).displayName.replace(/\[[+](?:\d|\d\d)]/, "")} удалил рейд`);
                }
                catch (e) {
                    console.error(`Channel during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                try {
                    await (await msgFetcher(ids.raidChnId, raidData.msgId)).delete();
                }
                catch (e) {
                    console.error(`Message during raid manual delete for raidId ${raidData.id} wasn't found`);
                    e.code !== 10008 ? console.error(e) : "";
                }
                const embed = new EmbedBuilder().setColor("Green").setTitle(`Рейд ${raidData.id}-${raidData.raid} был удален`);
                await deferredReply;
                interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => console.log(`/raid delete error`, e));
        }
        else if (subCommand === "добавить") {
            const addedUser = options.getUser("участник", true);
            const raidId = options.getInteger("id_рейда");
            const isAlt = options.getBoolean("альтернатива");
            const raidData = await getRaid(raidId, interaction);
            const embedReply = new EmbedBuilder().setColor("Green");
            const blacklist = raidBlacklist.get(raidData.id);
            if (blacklist) {
                if (isAlt && blacklist.alt.includes(addedUser.id))
                    blacklist.alt.splice(blacklist.alt.findIndex((a) => a === addedUser.id), 1);
                if (!isAlt && blacklist.joined.includes(addedUser.id))
                    blacklist.joined.splice(blacklist.joined.findIndex((a) => a === addedUser.id), 1);
                raidBlacklist.set(raidData.id, { joined: blacklist.joined, alt: blacklist.alt });
            }
            if (isAlt) {
                if (!raidData.alt.includes(addedUser.id)) {
                    if (raidData.joined.includes(addedUser.id))
                        raidData.joined.splice(raidData.joined.indexOf(addedUser.id), 1);
                    if (raidData.hotJoined.includes(addedUser.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(addedUser.id), 1);
                    raidData.alt.push(addedUser.id);
                    embedReply.setAuthor({
                        name: `${interaction
                            .guild.members.cache.get(addedUser.id)
                            .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был записан на рейд как возможный участник`,
                        iconURL: addedUser.displayAvatarURL(),
                    });
                    chnFetcher(raidData.chnId).permissionOverwrites.create(addedUser.id, { ViewChannel: true });
                    await raids.update({
                        joined: `{${raidData.joined}}`,
                        hotJoined: `{${raidData.hotJoined}}`,
                        alt: `{${raidData.alt}}`,
                    }, {
                        where: { id: raidData.id },
                    });
                    await raidMsgUpdate(raidData, interaction);
                    chnFetcher(raidData.chnId).send({ embeds: [embedReply] });
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`${interaction
                        .guild.members.cache.get(addedUser.id)
                        .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был записан как возможный участник на ${raidData.id}-${raidData.raid}`);
                    await deferredReply;
                    interaction.editReply({ embeds: [embed] });
                    raidDataInChnMsg(raidData);
                }
                else {
                    throw {
                        name: "Пользователь уже записан как возможный участник",
                    };
                }
            }
            else {
                if (!raidData.joined.includes(addedUser.id)) {
                    if (raidData.joined.length === 6) {
                        if (raidData.hotJoined.includes(addedUser.id)) {
                            throw {
                                name: "Ошибка",
                                message: `Набор ${raidData.id}-${raidData.raid} полон, а ${interaction
                                    .guild.members.cache.get(addedUser.id)
                                    .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} уже добавлен в запас`,
                            };
                        }
                        raidData.hotJoined.push(addedUser.id);
                        embedReply.setAuthor({
                            name: `${interaction
                                .guild.members.cache.get(addedUser.id)
                                .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был записан на рейд как запасной участник`,
                            iconURL: addedUser.displayAvatarURL(),
                        });
                    }
                    else {
                        embedReply.setAuthor({
                            name: `${interaction
                                .guild.members.cache.get(addedUser.id)
                                .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был записан на рейд как участник`,
                            iconURL: addedUser.displayAvatarURL(),
                        });
                        raidData.joined.push(addedUser.id);
                        if (raidData.hotJoined.includes(addedUser.id))
                            raidData.hotJoined.splice(raidData.hotJoined.indexOf(addedUser.id), 1);
                    }
                    if (raidData.alt.includes(addedUser.id))
                        raidData.alt.splice(raidData.alt.indexOf(addedUser.id), 1);
                    const raidChn = chnFetcher(raidData.chnId);
                    raidChn.send({ embeds: [embedReply] });
                    raidChn.permissionOverwrites.create(addedUser.id, {
                        ViewChannel: true,
                    });
                    await raids.update({
                        joined: `{${raidData.joined}}`,
                        hotJoined: `{${raidData.hotJoined}}`,
                        alt: `{${raidData.alt}}`,
                    }, {
                        where: { id: raidData.id },
                    });
                    await raidMsgUpdate(raidData, interaction);
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`${interaction.guild.members.cache.get(addedUser.id).displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был записан на ${raidData.id}-${raidData.raid}`);
                    await deferredReply;
                    interaction.editReply({ embeds: [embed] });
                    raidDataInChnMsg(raidData);
                }
                else {
                    throw {
                        name: "Ошибка",
                        message: "Пользователь уже записан как участник",
                        falseAlarm: true,
                    };
                }
            }
        }
        else if (subCommand === "исключить") {
            const preFetch = getRaid(options.getInteger("id_рейда"), interaction);
            const kickableUser = options.getUser("участник", true);
            const isBlacklist = options.getBoolean("blacklist") || false;
            const raidData = await preFetch;
            if (!Array.prototype.concat(raidData.joined, raidData.alt, raidData.hotJoined).includes(kickableUser.id))
                throw { name: `Исключаемый участник не состоит в рейде` };
            const embed = new EmbedBuilder().setColor("Green").setTitle("Пользователь исключен"), inChnEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("Пользователь был исключен с рейда")
                .setTimestamp()
                .setFooter({ text: `Исключитель: ${raidData.creator === interaction.user.id ? "Создатель рейда" : "Администратор"}` });
            if (isBlacklist) {
                const currentBlacklist = raidBlacklist.get(raidData.id) || raidBlacklist.set(raidData.id, { joined: [], alt: [] }).get(raidData.id);
                if ((raidData.joined.includes(kickableUser.id) || raidData.hotJoined.includes(kickableUser.id)) &&
                    !currentBlacklist.joined.includes(kickableUser.id))
                    currentBlacklist.joined.push(kickableUser.id);
                if (raidData.alt.includes(kickableUser.id) && !currentBlacklist.alt.includes(kickableUser.id))
                    currentBlacklist.alt.push(kickableUser.id);
                raidBlacklist.set(raidData.id, { joined: currentBlacklist.joined, alt: currentBlacklist.alt });
            }
            if (raidData.joined.includes(kickableUser.id)) {
                raidData.joined.splice(raidData.joined.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction
                    .guild.members.cache.get(kickableUser.id)
                    .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} исключен будучи участником рейда`);
            }
            if (raidData.alt.includes(kickableUser.id)) {
                raidData.alt.splice(raidData.alt.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction
                    .guild.members.cache.get(kickableUser.id)
                    .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} исключен будучи возможным участником рейда`);
            }
            if (raidData.hotJoined.includes(kickableUser.id)) {
                raidData.hotJoined.splice(raidData.hotJoined.indexOf(kickableUser.id), 1);
                inChnEmbed.setDescription(`${interaction
                    .guild.members.cache.get(kickableUser.id)
                    .displayName.replace(/\[[+](?:\d|\d\d)]/, "")} исключен будучи заменой участников рейда`);
            }
            if (isBlacklist)
                inChnEmbed.data.description += " и добавлен в ЧС рейда";
            await raidMsgUpdate(raidData, interaction);
            await raids.update({
                joined: `{${raidData.joined}}`,
                hotJoined: `{${raidData.hotJoined}}`,
                alt: `{${raidData.alt}}`,
            }, {
                where: { id: raidData.id },
            });
            const raidChn = chnFetcher(raidData.chnId);
            raidChn.send({ embeds: [inChnEmbed] });
            raidChn.permissionOverwrites.delete(kickableUser.id);
            embed.setDescription(`${interaction.guild.members.cache.get(kickableUser.id).displayName.replace(/\[[+](?:\d|\d\d)]/, "")} был исключен с рейда ${raidData.id}-${raidData.raid}`);
            await deferredReply;
            interaction.editReply({ embeds: [embed] });
            raidDataInChnMsg(raidData);
        }
    },
};
