import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { RaidButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { channelIds } from "../../configs/ids.js";
import { client } from "../../index.js";
import { fetchRequest } from "../api/fetchRequest.js";
import { CachedDestinyActivityDefinition } from "../api/manifestHandler.js";
import { completedPhases } from "../general/activityCompletionChecker.js";
import { addButtonComponentsToMessage } from "../general/addButtonsToMessage.js";
import { convertSeconds } from "../general/convertSeconds.js";
import { completedRaidsData } from "../general/destinyActivityChecker.js";
import { getRaidNameFromHash, removeRaid } from "../general/raidFunctions.js";
import { escapeString } from "../general/utilities.js";
import { AuthData, RaidEvent, UserActivityData } from "../persistence/sequelize.js";
const hashToImageMap = {
    3755529435: "https://cdn.discordapp.com/attachments/679191036849029167/1089133095820722176/season20_exotic_mission.png",
    3083261666: "https://cdn.discordapp.com/attachments/679191036849029167/1089133095820722176/season20_exotic_mission.png",
    700101128: "https://cdn.discordapp.com/attachments/679191036849029167/1089134183386984569/season_20_battleground_exeter.png",
    2572988947: "https://cdn.discordapp.com/attachments/679191036849029167/1089134184016130088/season_20_battleground_turnabout.png",
    1368255375: "https://cdn.discordapp.com/attachments/679191036849029167/1089134183747690516/season_20_battleground_bulkhead.png",
};
const pgcrIds = new Set();
const ACTIVITY_LEAVE_TIME = 300;
async function restoreFetchedPGCRs() {
    const completedActivitiesChannels = await client.getAsyncTextChannel(channelIds.activity);
    (await completedActivitiesChannels.messages.fetch({ limit: 5 })).forEach(async (message) => {
        const url = message.embeds?.[0]?.data?.author?.url;
        const pgcrId = url?.split("/")[4];
        if (pgcrId) {
            pgcrIds.add(pgcrId);
        }
    });
}
async function logActivityCompletion(pgcrId) {
    if (!pgcrIds.has(pgcrId)) {
        pgcrIds.add(pgcrId);
        function getActivityImage(hash, manifestImage) {
            const placeholderImage = "/img/theme/destiny/bgs/pgcrs/placeholder.jpg";
            if (manifestImage === placeholderImage || manifestImage === "/img/destiny_content/pgcr/season_20_mission_avalon.jpg") {
                if (hashToImageMap[hash]) {
                    return hashToImageMap[hash];
                }
                else {
                    return `https://bungie.net${placeholderImage}`;
                }
            }
            else {
                return `https://bungie.net${manifestImage}`;
            }
        }
        const response = await fetchRequest(`Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`).catch((e) => console.error("[Error code: 1072] activityReporter error", pgcrId, e, e.statusCode));
        if (!response.activityDetails) {
            console.error("[PGCR Checker] [Error code: 1009]", pgcrId, response);
            return;
        }
        const { mode, referenceId } = response.activityDetails;
        const manifestData = CachedDestinyActivityDefinition[referenceId];
        const footerText = (mode === 4
            ? "Рейд был закрыт"
            : mode === 82
                ? "Подземелье было закрыто"
                : "Активность была закрыта") + (response.activityWasStartedFromBeginning ? " с начала" : " с контрольной точки");
        const thumbnailUrl = getActivityImage(referenceId, manifestData.pgcrImage);
        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTimestamp(new Date(response.period))
            .setAuthor({
            name: mode === 4
                ? "Raid Report"
                : mode === 82
                    ? "Dungeon Report"
                    : "Braytech PGCR",
            url: mode === 4
                ? `https://raid.report/pgcr/${pgcrId}`
                : mode === 82
                    ? `https://dungeon.report/pgcr/${pgcrId}`
                    : `https://bray.tech/report/${pgcrId}`,
        })
            .setTitle(`${manifestData.displayProperties.name} - ${response.entries[0].values.activityDurationSeconds.basic.displayValue
            .replace("h", "ч")
            .replace("m", "м")
            .replace("s", "с")}`)
            .setFooter({
            text: footerText,
            iconURL: manifestData.displayProperties.hasIcon
                ? manifestData.displayProperties.highResIcon
                    ? `https://bungie.net${manifestData.displayProperties.highResIcon}`
                    : `https://bungie.net${manifestData.displayProperties.icon}`
                : mode === 82
                    ? "https://cdn.discordapp.com/attachments/679191036849029167/1089153433543651408/dungeon.png"
                    : undefined,
        })
            .setThumbnail(thumbnailUrl);
        const completedUsers = new Map();
        response.entries.forEach((entry) => {
            const destinyUserInfo = entry.player.destinyUserInfo;
            const userData = completedUsers.get(destinyUserInfo.membershipId);
            const miscArray = userData?.misc || [];
            if (entry.extended?.weapons?.some((a) => a.referenceId === 4103414242) && !miscArray.some((a) => a.endsWith("**Божественность**")))
                miscArray.push("<a:catbowtie:1034701666580189256>**Божественность**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 3580904581) && !miscArray.some((a) => a.endsWith("**Буксировщик**")))
                miscArray.push("<:moyaichad:1018345835962044559>**Буксировщик**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 1363886209) && !miscArray.some((a) => a.endsWith("**Гьяллархорн**")))
                miscArray.push("<a:workin:1077438227830542406>**Гьяллархорн**");
            if (entry.extended?.weapons?.some((a) => a.referenceId === 3512014804) && !miscArray.some((a) => a.endsWith("**Люмина**")))
                miscArray.push("<a:iamthebest:1084475253901774938>**Люмина**");
            const isUserCompletedActivity = entry.values.completed.basic.value === 1;
            const isUserHunter = entry.player.classHash === 671679327;
            const isUserWarlock = entry.player.classHash === 2271682572;
            completedUsers.set(destinyUserInfo.membershipId, {
                bungieId: destinyUserInfo.membershipId,
                bungieName: destinyUserInfo.bungieGlobalDisplayName,
                classHash: isUserCompletedActivity
                    ? (isUserHunter
                        ? "<:hunter:995496474978824202>"
                        : isUserWarlock
                            ? "<:warlock:995496471526920232>"
                            : "<:titan:995496472722284596>") + (userData?.classHash || "")
                    : (userData?.classHash || "") +
                        (isUserHunter
                            ? "<:deadHunter:1023051800653344859>"
                            : isUserWarlock
                                ? "<:deadWarlock:1023051796932989059>"
                                : "<:deadTitan:1023051798740729876>"),
                completed: !userData?.completed ? (isUserCompletedActivity ? true : false) : true,
                kills: entry.values.kills.basic.value + (userData?.kills || 0),
                deaths: entry.values.deaths.basic.value + (userData?.deaths || 0),
                assists: entry.values.assists.basic.value + (userData?.assists || 0),
                timeInActivity: entry.values.timePlayedSeconds.basic.value + (userData?.timeInActivity || 0),
                misc: miscArray,
            });
        });
        const membersMembershipIds = [...new Set(Array.from(completedUsers.keys()))];
        if (membersMembershipIds.length <= 0)
            return;
        const databaseData = await AuthData.findAll({ where: { bungieId: { [Op.any]: membersMembershipIds } } });
        const clanMembersInActivity = databaseData.filter((a) => a.clan).length;
        if (databaseData.length >= 1 && clanMembersInActivity >= 1) {
            if ((mode === 82 || mode === 4) &&
                (databaseData.length < membersMembershipIds.length / 2 || clanMembersInActivity < databaseData.length / 2))
                return;
            if (mode === 2 &&
                !((clanMembersInActivity === 1 && membersMembershipIds.length === 1) || clanMembersInActivity > 1))
                return;
            let completedUsersCount = 0;
            let uncompletedUsersCount = 0;
            const raidName = mode === 4 ? getRaidNameFromHash(referenceId) : null;
            const getFormattedRaidClearsForUser = (bungieId) => {
                if (!raidName)
                    return null;
                const databaseDataForUser = databaseData.find((data) => data.bungieId === bungieId);
                if (!databaseDataForUser)
                    return null;
                const totalRaidClearsForUser = completedRaidsData.get(databaseDataForUser.discordId);
                if (!totalRaidClearsForUser)
                    return null;
                const baseRaidName = raidName.endsWith("Master") ? raidName.replace("Master", "") : raidName;
                const masterRaidName = raidName.endsWith("Master") ? raidName : raidName + "Master";
                const baseClears = totalRaidClearsForUser[baseRaidName] || 0;
                const masterClears = totalRaidClearsForUser[masterRaidName] || 0;
                const baseClearsText = `Закрытий: **${baseClears}**`;
                const masterClearsText = masterClears > 0 ? `\n+**${masterClears}** на мастере` : "";
                return baseClearsText + masterClearsText;
            };
            const activityModeName = `В ${mode === 4 ? "рейде" : mode === 82 ? "подземелье" : "задании"}`;
            completedUsers.forEach((value, key) => {
                if (!value.completed) {
                    return;
                }
                else {
                    completedUsers.delete(key);
                    completedUsersCount++;
                }
                if (completedUsersCount > 12)
                    return;
                try {
                    const isUserLeavedActivity = value.timeInActivity + ACTIVITY_LEAVE_TIME < response.entries[0].values.activityDurationSeconds.basic.value;
                    const raidClearsResult = getFormattedRaidClearsForUser(value.bungieId);
                    embed.addFields({
                        name: escapeString(value.bungieName),
                        value: `${raidClearsResult ? `${raidClearsResult}\n` : ""}${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${isUserLeavedActivity ? `\n${activityModeName}: **${convertSeconds(value.timeInActivity)}**` : ""}${value.misc.length > 0 ? `\n${value.misc.join("\n")}` : ""}`,
                        inline: true,
                    });
                }
                catch (error) {
                    console.error("[Error code: 1671]", error);
                }
            });
            embed.data.fields = embed.data.fields?.sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            completedUsers.forEach((value, _key) => {
                uncompletedUsersCount++;
                if (uncompletedUsersCount > 12)
                    return;
                const isUserLeavedActivity = value.timeInActivity + ACTIVITY_LEAVE_TIME < response.entries[0].values.activityDurationSeconds.basic.value;
                const raidClearsResult = getFormattedRaidClearsForUser(value.bungieId);
                embed.addFields({
                    name: `❌${escapeString(value.bungieName)}`,
                    value: `${raidClearsResult ? `${raidClearsResult}\n` : ""}${value.classHash}УП: **${value.kills + value.assists}** С: **${value.deaths}**${isUserLeavedActivity ? `\n${activityModeName}: **${convertSeconds(value.timeInActivity)}**` : ""}${value.misc.length > 0 ? "\n" + value.misc.join("\n") : ""}`,
                    inline: true,
                });
            });
            if (mode === 4) {
                const preciseEncountersTime = new Map();
                membersMembershipIds.forEach((bungieId, i1) => {
                    if (completedPhases.has(bungieId)) {
                        const completedPhasesForUser = completedPhases.get(bungieId);
                        let previousEncounterEndTime = 0;
                        completedPhasesForUser.forEach((completedPhase, i2) => {
                            const { phase: phaseHash, start, end } = completedPhase;
                            if (!preciseEncountersTime.has(phaseHash)) {
                                preciseEncountersTime.set(phaseHash, completedPhase);
                                previousEncounterEndTime = end;
                            }
                            else {
                                const preciseStoredEncounterTime = preciseEncountersTime.get(phaseHash);
                                if (start > 1 && start < preciseStoredEncounterTime.start && previousEncounterEndTime <= start) {
                                    preciseStoredEncounterTime.start = start;
                                }
                                if (end > 1 && end < preciseStoredEncounterTime.end && previousEncounterEndTime < end) {
                                    preciseStoredEncounterTime.end = end;
                                }
                                else if (end <= 1) {
                                    const resolvedTime = completedPhasesForUser[i2 + 1]?.end || completedPhases.get(membersMembershipIds[i1 + 1])?.[i2 + 1]?.end;
                                    if (resolvedTime && resolvedTime > 1) {
                                        preciseStoredEncounterTime.end = resolvedTime;
                                    }
                                }
                                preciseEncountersTime.set(phaseHash, preciseStoredEncounterTime);
                                previousEncounterEndTime = preciseStoredEncounterTime.end;
                            }
                        });
                        completedPhases.delete(bungieId);
                    }
                });
                if (preciseEncountersTime && preciseEncountersTime.size > 0) {
                    const encountersData = [];
                    const phasesArray = Array.from(preciseEncountersTime.values()).sort((a, b) => a.phaseIndex - b.phaseIndex);
                    phasesArray.forEach((encounterData, i) => {
                        if (i === 0) {
                            const startTimeFromGame = new Date(response.period).getTime();
                            const isTimeFromGameValid = startTimeFromGame < encounterData.start;
                            const resolvedStartTime = isTimeFromGameValid ? startTimeFromGame : encounterData.start;
                            console.debug(startTimeFromGame, isTimeFromGameValid, resolvedStartTime);
                            encountersData.push({
                                end: encounterData.end,
                                phase: encounterData.phase,
                                phaseIndex: `${isTimeFromGameValid ? "" : "⚠️"}${encounterData.phaseIndex != 1 && response.activityWasStartedFromBeginning
                                    ? `1-${encounterData.phaseIndex}`
                                    : encounterData.phaseIndex}`,
                                start: resolvedStartTime,
                            });
                        }
                        else if (i === phasesArray.length - 1) {
                            const activityEndTime = new Date(response.period).getTime() + response.entries[0].values.activityDurationSeconds.basic.value * 1000;
                            encountersData.push({
                                end: encounterData.end > activityEndTime || encounterData.end <= 1 ? activityEndTime : encounterData.end,
                                phase: encounterData.phase,
                                phaseIndex: encounterData.phaseIndex,
                                start: encounterData.start,
                            });
                        }
                        else {
                            encountersData.push(encounterData);
                        }
                    });
                    if (encountersData.length >= 1) {
                        try {
                            embed.addFields([
                                {
                                    name: "Затраченное время на этапы",
                                    value: `${encountersData
                                        .map((encounter) => {
                                        return `⁣　⁣${encounter.phaseIndex}. <t:${Math.floor(encounter.start / 1000)}:t> — <t:${Math.floor(encounter.end / 1000)}:t>, **${convertSeconds(Math.floor((encounter.end - encounter.start) / 1000))}**`;
                                    })
                                        .join("\n")}`,
                                },
                            ]);
                        }
                        catch (error) {
                            console.error("[Error code: 1610] Error during adding fields to the raid result", error);
                        }
                    }
                    else {
                        console.error("[Error code: 1613]", encountersData, preciseEncountersTime, preciseEncountersTime.size);
                    }
                    preciseEncountersTime.clear();
                }
            }
            const msg = (await client.getAsyncTextChannel(channelIds.activity)).send({ embeds: [embed] });
            const currentTime = Math.floor(Date.now() / 1000);
            databaseData.forEach(async (dbMemberData) => {
                if (mode === 82 && clanMembersInActivity > 1)
                    return UserActivityData.increment("dungeons", { by: 1, where: { discordId: dbMemberData.discordId } });
                if (mode !== 4)
                    return;
                if (dbMemberData.clan === true && clanMembersInActivity > 2)
                    UserActivityData.increment("raids", { by: 1, where: { discordId: dbMemberData.discordId } });
                const pastCreatedRaid = raidName &&
                    (await RaidEvent.findOne({
                        where: {
                            creator: dbMemberData.discordId,
                            time: {
                                [Op.lt]: currentTime,
                            },
                            raid: raidName.replace("Master", ""),
                        },
                    }));
                if (pastCreatedRaid && pastCreatedRaid.time < currentTime) {
                    const resolvedMessage = await msg;
                    const raidCompletionEmbed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setFooter({ text: `RId: ${pastCreatedRaid.id}` })
                        .setTitle("Созданный вами рейд был завершен")
                        .setDescription(`Вы создавали рейд ${pastCreatedRaid.id}-${pastCreatedRaid.raid} на <t:${pastCreatedRaid.time}> и сейчас он был завершен\nПодтвердите завершение рейда для удаления набора\n\n[Результаты рейда](https://discord.com/channels/${resolvedMessage.guildId}/${resolvedMessage.channelId}/${resolvedMessage.id})`);
                    const deleteRaidButton = new ButtonBuilder()
                        .setCustomId(RaidButtons.delete)
                        .setLabel("Удалить набор")
                        .setStyle(ButtonStyle.Danger);
                    const member = client.getCachedMembers().get(pastCreatedRaid.creator) ||
                        (await client.getCachedGuild().members.fetch(pastCreatedRaid.creator));
                    const raidCompletionNotification = await member
                        .send({
                        embeds: [raidCompletionEmbed],
                        components: await addButtonComponentsToMessage([deleteRaidButton]),
                    })
                        .catch((e) => console.error("[Error code: 1071] acitvityReporter final error", e));
                    setTimeout(async () => {
                        const isRaidStillExists = await RaidEvent.findOne({ where: { id: pastCreatedRaid.id }, attributes: ["time"] });
                        if (isRaidStillExists && isRaidStillExists.time === pastCreatedRaid.time) {
                            await removeRaid(pastCreatedRaid).catch((e) => console.error("[Error code: 1711]", e));
                        }
                        if (!raidCompletionNotification)
                            return;
                        const updatedMessage = await raidCompletionNotification.fetch();
                        if (updatedMessage) {
                            const updatedEmbed = EmbedBuilder.from(updatedMessage.embeds[0])
                                .setTitle("Рейд был завершен")
                                .setDescription(`Созданный вами рейд ${pastCreatedRaid.id}-${pastCreatedRaid.raid} на <t:${pastCreatedRaid.time}> был завершен и удален\n\n[Результаты рейда](https://discord.com/channels/${resolvedMessage.guildId}/${resolvedMessage.channelId}/${resolvedMessage.id})`);
                            raidCompletionNotification.edit({ embeds: [updatedEmbed], components: [] });
                        }
                    }, 1000 * 60 * 20);
                }
            });
        }
    }
}
export { logActivityCompletion, restoreFetchedPGCRs };
