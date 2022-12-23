import { ButtonInteraction, EmbedBuilder, ChannelType, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import { client } from "../index.js";
import colors from "../configs/colors.js";
import destinyRaidsChallenges from "../configs/destinyRaidsChallenges.js";
import { guildId, ids } from "../configs/ids.js";
import { dlcRoles, statusRoles } from "../configs/roles.js";
import UserErrors from "../enums/UserErrors.js";
import { completedRaidsData, userTimezones } from "../features/memberStatisticsHandler.js";
import { RaidEvent } from "../handlers/sequelize.js";
import { CachedDestinyActivityModifierDefinition } from "./manifestHandler.js";
import { fetchRequest } from "./fetchRequest.js";
import { raidAnnounceSet } from "../commands/raid.js";
import { RaidNames } from "../enums/Raids.js";
import nameCleaner from "./nameClearer.js";
export function getRaidData(raid, difficulty = 1) {
    switch (raid) {
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
            throw { name: `У вас нет ни одного рейда, создателем которого вы являетесь` };
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
                    description: `Управление рейдом ${raidId} доступно лишь ${interaction
                        .guild.members.cache.get(raidData[0].creator)
                        .displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")}`,
                };
            }
            else {
                return raidData[0];
            }
        }
    }
    else {
        const raidData = await RaidEvent.findOne({
            where: { id: raidId },
        });
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
    const msg = client.getCachedGuild().channels.cache.get(ids.raidChnId).messages.cache.get(raidDbData.messageId);
    if (!msg || !msg.embeds || !msg.embeds[0]) {
        return console.error(`[Error code: 1037] Error during updateRaidMessage`, { msg });
    }
    const embed = EmbedBuilder.from(msg.embeds[0]);
    const clearMemberName = (id) => nameCleaner(client.getCachedMembers().get(id)?.displayName ?? "неизвестный пользователь");
    const joined = raidDbData.joined && raidDbData.joined.length >= 1
        ? raidDbData.joined
            .map((data, index) => {
            const raidClears = completedRaidsData.get(data);
            return `⁣　${index + 1}. **${clearMemberName(data)}**${raidClears
                ? ` — ${raidClears[raidDbData.raid]} закрытий${raidClears[raidDbData.raid + "Master"] ? ` (+${raidClears[raidDbData.raid + "Master"]} на мастере)` : ""}`
                : ""}`;
        })
            .join("\n")
        : "Никого";
    const hotJoined = raidDbData.hotJoined && raidDbData.hotJoined.length >= 1 ? raidDbData.hotJoined.map((data) => clearMemberName(data)).join(", ") : "Никого";
    const alt = raidDbData.alt && raidDbData.alt.length >= 1 ? raidDbData.alt.map((data) => clearMemberName(data)).join(", ") : "Никого";
    if (raidDbData.joined.length && raidDbData.joined.length === 6) {
        embed.setColor(null);
    }
    else if (embed.data.color === undefined) {
        embed.setColor(getRaidData(raidDbData.raid, raidDbData.difficulty).raidColor);
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
        embed?.spliceFields(findK("Замена"), findK("Замена") !== -1 ? 1 : 0, { name: `Замена: ${raidDbData.hotJoined.length}`, value: hotJoined });
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
    if (interaction instanceof ButtonInteraction) {
        await interaction.message.edit({ embeds: [embed] });
    }
    else {
        await msg.edit({ embeds: [embed] });
    }
}
export async function raidChallenges(raidData, inChnMsg, startTime, difficulty) {
    if (difficulty > 2)
        return;
    const milestoneRequest = await fetchRequest("Platform/Destiny2/Milestones/");
    const raidMilestone = milestoneRequest[raidData.milestoneHash];
    const manifest = CachedDestinyActivityModifierDefinition;
    const raidChallengesArray = [];
    const raidModifiersArray = [];
    const raidDataChallanges = destinyRaidsChallenges[raidData.raid];
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
        if (manifest[modifier].displayProperties.description.toLowerCase().startsWith("вас ждет испытание")) {
            const challenge = new Date(raidMilestone.endDate).getTime() > startTime * 1000
                ? raidDataChallanges.find((a) => a.hash === modifier)
                : raidDataChallanges.find((a) => a.hash === modifier)?.encounter === raidDataChallanges.length
                    ? raidDataChallanges.find((a) => a.encounter === 1)
                    : raidDataChallanges.find((a) => a.encounter === raidDataChallanges.find((a) => a.hash === modifier).encounter + 1);
            raidChallengesArray.push("⁣　⁣**" + manifest[challenge?.hash].displayProperties.name + `**, ${challenge.encounter} этап: ${challenge.description.toLowerCase()}`);
        }
        else if (new Date(raidMilestone.endDate).getTime() > startTime * 1000) {
            if (modifier === 4038464106)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с барьерными, перегруженными и неудержимыми воителями.");
            if (modifier === 2116552995)
                return raidModifiersArray.push("⁣　⁣**Модификаторы «Мастер»:** больше воителей и щитов.");
            if (modifier === 1990363418)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с барьерными и перегруженными воителями.");
            if (modifier === 40182179)
                return raidModifiersArray.push("⁣　⁣**Противники-воители:** вы встретитесь с перегруженными и неудержимыми воителями.");
            raidModifiersArray.push("⁣　⁣**" + manifest[modifier].displayProperties.name + ":** " + String(manifest[modifier].displayProperties.description).toLowerCase());
        }
    });
    const embed = EmbedBuilder.from(inChnMsg.embeds[0]);
    embed.data.fields[0].name =
        raidChallengesArray.length > 0
            ? `**Испытани${raidChallengesArray.length === 1 ? "е" : "я"} ${new Date(raidMilestone.endDate).getTime() > startTime * 1000 ? "этой" : "следующей"} недели**`
            : raidModifiersArray.length > 0
                ? `**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда:**`
                : "Объявление";
    embed.data.fields[0].value = `${raidChallengesArray.join("\n")}${raidModifiersArray.length > 0
        ? `${raidChallengesArray.length > 0 ? `\n\n**Модификатор${raidModifiersArray.length === 1 ? `` : `ы`} рейда:**` : ""}\n`
        : ""}${raidModifiersArray.join("\n")}${raidChallengesArray.length === 0 && raidModifiersArray.length === 0
        ? "⁣　⁣Продается __утепленный__ гараж в восточном ГК. ***Дешево***. За подробностями в личку <@298353895258980362>, торопитесь!"
        : ""}`;
    return inChnMsg.edit({ embeds: [embed] });
}
export async function updatePrivateRaidMessage({ raidEvent, retry }) {
    if (!raidEvent)
        return console.error(`[Error code: 1051] raidDataInChnMsg, no raidData info`);
    if (retry) {
        raidEvent = await RaidEvent.findByPk(raidEvent.id);
        if (!raidEvent)
            return;
    }
    const inChnMsgPromise = client.getCachedGuild().channels.cache.get(raidEvent.channelId).messages.fetch(raidEvent.inChannelMessageId);
    const guildMembers = client.getCachedMembers();
    const getDiscordMember = (discordId) => guildMembers.get(discordId);
    async function raidUserDataManager(userId) {
        const raidUserData = completedRaidsData.get(userId);
        const member = getDiscordMember(userId);
        if (!raidUserData) {
            if (!retry && member?.roles.cache.has(statusRoles.verified)) {
                setTimeout(() => updatePrivateRaidMessage({ raidEvent, retry: true }), 60 * 1000 * 5);
            }
            if (member?.roles.cache.has(statusRoles.verified)) {
                return `⁣　<@${userId}> не закеширован`;
            }
            else {
                return `⁣　<@${userId}> не зарегистрирован`;
            }
        }
        const raidClears = [];
        raidUserData.kf > 0 ? raidClears.push(`${raidUserData.kf}${raidUserData.kfMaster > 0 ? `(${raidUserData.kfMaster})` : ""} ГК`) : "";
        raidUserData.votd > 0 ? raidClears.push(`${raidUserData.votd}${raidUserData.votdMaster > 0 ? `(${raidUserData.votdMaster})` : ""} КП`) : "";
        raidUserData.vog > 0 ? raidClears.push(`${raidUserData.vog}${raidUserData.vogMaster > 0 ? `(${raidUserData.vogMaster})` : ""} ХЧ`) : "";
        raidUserData.dsc > 0 ? raidClears.push(`${raidUserData.dsc} СГК`) : "";
        raidUserData.gos > 0 ? raidClears.push(`${raidUserData.gos} СС`) : "";
        raidUserData.lw > 0 ? raidClears.push(`${raidUserData.lw} ПЖ`) : "";
        return `⁣　${raidClears.length > 0
            ? `${member?.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} завершил: ${raidClears.join(", ")}`
            : `${member?.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")} не проходил ранее рейды`}`;
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
    embed.setTimestamp();
    inChnMsg.edit({ embeds: [embed] });
}
export async function timeConverter({ time, authData, userId }) {
    if (parseInt(time) > 10000000)
        return parseInt(time);
    const args = time.replace(/\s+/g, " ").trim().split(" ");
    const date = new Date();
    function timeSpliter(args) {
        if (args[0]?.split(":").length === 2 && args[1]?.split("/").length === 2) {
            return { hhmm: args[0], ddmm: args[1] };
        }
        else if (args[1]?.split(":").length === 2 && args[0]?.split("/").length === 2) {
            return { hhmm: args[1], ddmm: args[0] };
        }
        else if (args.length === 1 && args[0]?.split(":").length === 2) {
            return { hhmm: args[0], ddmm: `${date.getDate() + `/` + (date.getMonth() + 1)}` };
        }
        else {
            return {};
        }
    }
    const { hhmm, ddmm } = timeSpliter(args);
    const daymonth = ddmm?.split("/");
    const hoursmins = hhmm?.split(":");
    const dbData = await authData;
    const timezoneOffset = dbData && dbData?.timezone && dbData?.timezone !== undefined && dbData?.timezone !== null
        ? dbData.timezone
        : userId && userTimezones.get(userId)
            ? userTimezones.get(userId) ?? 3
            : 3;
    if (!daymonth || !hoursmins) {
        if (!authData)
            return Math.floor((date.getTime() + timezoneOffset * 60 * 60 * 1000) / 1000);
        throw {
            name: "Ошибка времени",
            description: 'Время должно быть указано в формате (без ""): "ДЕНЬ/МЕСЯЦ ЧАС:МИНУТА"\nПробел обязателен если указывается и дата, и время. Знак / и : также обязательны.',
            customErrorCode: "[Error code: 1067]",
        };
    }
    date.setMonth(Math.round(parseInt(daymonth[1]) - 1), parseInt(daymonth[0]));
    date.setHours(parseInt(hoursmins[0]), parseInt(hoursmins[1]) ?? 0, 0, 0);
    if (date.getTimezoneOffset() !== -540) {
        date.setTime(Math.floor(date.getTime() + timezoneOffset * 60 * 60 * 1000));
    }
    const returnTime = Math.floor(date.getTime() / 1000);
    if (isNaN(returnTime)) {
        if (!authData)
            return Math.floor((date.getTime() + timezoneOffset * 60 * 60 * 1000) / 1000);
        throw {
            name: "Ошибка времени",
            description: `Проверьте правильность введенного времени, дата: ${daymonth.toString()}, время: ${hoursmins.toString()}`,
            customErrorCode: "[Error code: 1068]",
        };
    }
    return returnTime;
}
export async function raidAnnounceSystem(raidData) {
    if (!raidAnnounceSet.has(raidData.id)) {
        raidAnnounceSet.add(raidData.id);
        const time = raidData.time - Math.trunc(new Date().getTime() / 1000);
        if (time <= 60 * 60 * 24)
            setTimeout(() => raidAnnounce(raidData), (time - 60 * 15) * 1000);
    }
}
async function raidAnnounce(oldRaidData) {
    const raidData = await RaidEvent.findOne({ where: { id: oldRaidData.id } });
    if (!raidData || (raidData && raidData.time !== oldRaidData.time))
        return;
    const raidInfo = getRaidData(raidData.raid, raidData.difficulty);
    const guild = (client.getCachedGuild() || client.guilds.cache.get(guildId));
    const raidMembers = raidData.joined.map(async (userId) => {
        return guild.members.cache.get(userId) ?? (await guild.members.fetch(userId));
    });
    const raidMembersNames = (await Promise.all(raidMembers))
        .sort((a) => (a.id === raidData.creator ? 1 : 0))
        .map((member, index) => {
        const raidClears = completedRaidsData.get(member.id);
        return `⁣　${index + 1}. **${member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")}**${raidClears
            ? ` — ${raidClears[raidData.raid]} закрытий${raidClears[raidData.raid + "Master"] ? ` (+${raidClears[raidData.raid + "Master"]} на мастере)` : ""}`
            : ""}`;
    });
    const embed = new EmbedBuilder()
        .setColor(raidInfo ? raidInfo.raidColor : colors.default)
        .setTitle("Уведомление о скором рейде")
        .setThumbnail(raidInfo?.raidBanner ?? null)
        .setTimestamp(raidData.time * 1000)
        .setDescription(`Рейд [${raidData.id}-${raidData.raid}](https://discord.com/channels/${guildId}/${ids.raidChnId}/${raidData.messageId}) начнется в течение ${Math.round((raidData.time - Math.trunc(new Date().getTime() / 1000)) / 60)} минут!`)
        .addFields([
        {
            name: "Состав группы:",
            value: raidMembersNames.join("\n") || "⁣　*никого*",
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
