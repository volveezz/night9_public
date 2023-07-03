import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import { RaidButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { activityIcons } from "../../configs/icons.js";
import { client } from "../../index.js";
import { CachedDestinyActivityDefinition } from "../api/manifestHandler.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { completedPhases } from "../general/activityCompletionChecker.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { convertSeconds } from "../general/convertSeconds.js";
import { completedRaidsData } from "../general/destinyActivityChecker.js";
import { getRaidNameFromHash, removeRaid } from "../general/raidFunctions.js";
import { escapeString } from "../general/utilities.js";
import { AuthData, RaidEvent, UserActivityData } from "../persistence/sequelize.js";
const hashToImageMap = {
    313828469: "https://cdn.discordapp.com/attachments/679191036849029167/1111828224956170290/2023_Ghost_of_the_Deep_Press_Kit_Dungeon_LARGE_002.jpg",
    2716998124: "https://cdn.discordapp.com/attachments/679191036849029167/1111828224956170290/2023_Ghost_of_the_Deep_Press_Kit_Dungeon_LARGE_002.jpg",
    700101128: "https://cdn.discordapp.com/attachments/679191036849029167/1089134183386984569/season_20_battleground_exeter.png",
    2572988947: "https://cdn.discordapp.com/attachments/679191036849029167/1089134184016130088/season_20_battleground_turnabout.png",
    1368255375: "https://cdn.discordapp.com/attachments/679191036849029167/1089134183747690516/season_20_battleground_bulkhead.png",
};
const checkedPGCRIds = new Set();
const ACTIVITY_LEAVE_TIME = 300;
const PLACEHOLDER_TEXTS = [": Нормальный", "Засекречено"];
async function restoreFetchedPGCRs() {
    const completedActivitiesChannels = await client.getAsyncTextChannel(process.env.ACTIVITY_CHANNEL_ID);
    (await completedActivitiesChannels.messages.fetch({ limit: 15 })).forEach(async (message) => {
        const url = message.embeds?.[0]?.data?.author?.url;
        const pgcrId = url?.split("/")[4];
        if (pgcrId) {
            checkedPGCRIds.add(pgcrId);
        }
    });
}
function findCorrectedName(hash) {
    switch (hash) {
        case 313828469:
            return "Призраки Глубин: Нормальный";
        case 2716998124:
            return "Призраки Глубин: Мастер";
        default:
            return "Засекречено";
    }
}
async function logActivityCompletion(pgcrId) {
    if (checkedPGCRIds.has(pgcrId))
        return;
    function getActivityImage(hash, manifestImage) {
        if (hashToImageMap[hash]) {
            return hashToImageMap[hash];
        }
        else {
            return `https://bungie.net${manifestImage}`;
        }
    }
    function getActivityTitle(hash, manifestTitle) {
        if (!manifestTitle || PLACEHOLDER_TEXTS.includes(manifestTitle)) {
            return findCorrectedName(hash);
        }
        return manifestTitle;
    }
    const response = await sendApiRequest(`Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`).catch((e) => console.error("[Error code: 1072] activityReporter error", pgcrId, e, e.statusCode));
    if (!response || !response.activityDetails) {
        console.error("[Error code: 1009]", pgcrId, response);
        return;
    }
    if (checkedPGCRIds.has(pgcrId))
        return;
    checkedPGCRIds.add(pgcrId);
    const { mode, referenceId } = response.activityDetails;
    const manifestData = CachedDestinyActivityDefinition[referenceId];
    const activityTitle = getActivityTitle(referenceId, manifestData.displayProperties.name);
    const activityReplacedTime = response.entries[0].values.activityDurationSeconds.basic.displayValue
        .replace("h", "ч")
        .replace("m", "м")
        .replace("s", "с");
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
        .setTitle(`${activityTitle} - ${activityReplacedTime}`)
        .setFooter({
        text: footerText,
        iconURL: manifestData.displayProperties.hasIcon
            ? manifestData.displayProperties.highResIcon
                ? `https://bungie.net${manifestData.displayProperties.highResIcon}`
                : `https://bungie.net${manifestData.displayProperties.icon}`
            : mode === 82
                ? activityIcons.dungeon
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
            characterId: isUserCompletedActivity || !userData?.characterId ? entry.characterId : userData?.characterId,
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
            const baseClears = (totalRaidClearsForUser[baseRaidName] || 0) + (totalRaidClearsForUser[masterRaidName] || 0);
            return `Закрытий: **${baseClears}**`;
        };
        const activityModeName = `В ${mode === 4 ? "рейде" : mode === 82 ? "подземелье" : "задании"}`;
        const raidCharactersIds = new Array();
        completedUsers.forEach((value) => {
            raidCharactersIds.push(value.characterId);
        });
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
            try {
                const preciseEncountersTime = getCommonEncounterTimes();
                if (preciseEncountersTime && preciseEncountersTime.length > 0) {
                    const encountersData = [];
                    const phasesArray = preciseEncountersTime.sort((a, b) => a.phaseIndex - b.phaseIndex);
                    phasesArray.forEach((encounterData, i) => {
                        if (i === 0) {
                            const startTimeFromGame = new Date(response.period).getTime();
                            const isTimeFromGameValid = startTimeFromGame < encounterData.start;
                            const resolvedStartTime = isTimeFromGameValid ? startTimeFromGame : encounterData.start;
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
                            embed.addFields({
                                name: "Затраченное время на этапы",
                                value: `${encountersData
                                    .map((encounter) => {
                                    return `⁣　⁣${encounter.phaseIndex}. <t:${Math.floor(encounter.start / 1000)}:t> — <t:${Math.floor(encounter.end / 1000)}:t>, **${convertSeconds(Math.floor((encounter.end - encounter.start) / 1000))}**`;
                                })
                                    .join("\n")}`,
                            });
                        }
                        catch (error) {
                            console.error("[Error code: 1610] Error during adding fields to the raid result", error);
                        }
                    }
                    else {
                        console.error("[Error code: 1613]", encountersData, preciseEncountersTime, preciseEncountersTime.length);
                    }
                }
                function getCommonEncounterTimes() {
                    const filteredCompletedPhases = new Map(Array.from(completedPhases).filter(([characterId]) => raidCharactersIds.includes(characterId)));
                    const allPhases = new Map();
                    for (const phases of filteredCompletedPhases.values()) {
                        for (const phase of phases) {
                            if (!allPhases.has(phase.phase)) {
                                allPhases.set(phase.phase, []);
                            }
                            allPhases.get(phase.phase).push(phase);
                        }
                    }
                    const preciseStoredEncounterTime = [];
                    let latestEndTime = 0;
                    for (const [phase, phaseData] of allPhases) {
                        const phaseStartTimes = phaseData.map((p) => p.start);
                        const phaseEndTimes = phaseData.map((p) => p.end);
                        let startTime = Math.min(...phaseStartTimes.filter((time) => time > 300));
                        const endTime = Math.min(...phaseEndTimes.filter((time) => time > 300));
                        if (startTime > latestEndTime && preciseStoredEncounterTime.length > 0) {
                            startTime = latestEndTime;
                        }
                        preciseStoredEncounterTime.push({
                            phaseIndex: phaseData[0].phaseIndex,
                            phase: phase,
                            start: startTime,
                            end: endTime,
                        });
                        latestEndTime = preciseStoredEncounterTime[preciseStoredEncounterTime.length - 1].end;
                    }
                    return preciseStoredEncounterTime;
                }
            }
            catch (error) {
                console.error("[Error code: 1823]", error);
            }
        }
        const msg = (await client.getAsyncTextChannel(process.env.ACTIVITY_CHANNEL_ID)).send({ embeds: [embed] });
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
                const member = await client.getAsyncMember(pastCreatedRaid.creator);
                const raidCompletionNotification = await member
                    .send({
                    embeds: [raidCompletionEmbed],
                    components: await addButtonsToMessage([deleteRaidButton]),
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
                    if (!updatedMessage)
                        return;
                    const updatedEmbed = EmbedBuilder.from(updatedMessage.embeds[0])
                        .setTitle("Рейд был завершен")
                        .setDescription(`Созданный вами рейд ${pastCreatedRaid.id}-${pastCreatedRaid.raid} на <t:${pastCreatedRaid.time}> был завершен и удален\n\n[Результаты рейда](https://discord.com/channels/${resolvedMessage.guildId}/${resolvedMessage.channelId}/${resolvedMessage.id})`);
                    raidCompletionNotification.edit({ embeds: [updatedEmbed], components: [] });
                }, 1000 * 60 * 20);
            }
        });
    }
}
export { logActivityCompletion, restoreFetchedPGCRs };
//# sourceMappingURL=activityLogger.js.map