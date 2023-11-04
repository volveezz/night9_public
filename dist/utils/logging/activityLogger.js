import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Op } from "sequelize";
import colors from "../../configs/colors.js";
import { activityIcons } from "../../configs/icons.js";
import { client } from "../../index.js";
import { GetManifest } from "../api/ManifestManager.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { convertSeconds } from "../general/convertSeconds.js";
import { getRaidNameFromHash, removeRaid } from "../general/raidFunctions.js";
import { escapeString } from "../general/utilities.js";
import { completedPhases, completedRaidsData, grandmasterHashes } from "../persistence/dataStore.js";
import { AuthData } from "../persistence/sequelizeModels/authData.js";
import { RaidEvent } from "../persistence/sequelizeModels/raidEvent.js";
import { UserActivityData } from "../persistence/sequelizeModels/userActivityData.js";
const hashToImageMap = {
    313828469: "https://cdn.discordapp.com/attachments/1134620378615001178/1158036460348387368/Ghosts-of-the-Deep-PGCR.webp",
    2716998124: "https://cdn.discordapp.com/attachments/1134620378615001178/1158036460348387368/Ghosts-of-the-Deep-PGCR.webp",
    4179289725: "https://cdn.discordapp.com/attachments/1134620378615001178/1157167210951876619/CrotasEnd.webp",
    4103176774: "https://cdn.discordapp.com/attachments/1134620378615001178/1157167210951876619/CrotasEnd.webp",
    1507509200: "https://cdn.discordapp.com/attachments/1134620378615001178/1157167210951876619/CrotasEnd.webp",
};
const checkedPGCRIds = new Set();
const ACTIVITY_LEAVE_TIME = 300;
let activityChannel = null;
const PLACEHOLDER_TEXTS = [": Нормальный", "Засекречено"];
async function restoreFetchedPGCRs() {
    const completedActivitiesChannels = await client.getTextChannel(process.env.ACTIVITY_CHANNEL_ID);
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
        default:
            return "Засекречено";
    }
}
function findPredefinedName(hash) {
    switch (hash) {
        case 4201846671:
            return "Предвестие: Легенда";
        case 666172264:
            return "Тайный глас: Легенда";
        case 2919809209:
            return "Операция «Щит Серафима»: Легенда";
        default:
            return null;
    }
}
function getActivityImage(hash, manifestImage) {
    if (hashToImageMap[hash]) {
        return hashToImageMap[hash];
    }
    else {
        return `https://bungie.net${manifestImage}`;
    }
}
async function getActivityTitle(hash, manifestTitle) {
    if (!manifestTitle || PLACEHOLDER_TEXTS.includes(manifestTitle)) {
        return findCorrectedName(hash);
    }
    if (grandmasterHashes.has(hash)) {
        const activityManifest = await GetManifest("DestinyActivityDefinition");
        const activityData = activityManifest[hash];
        if (activityData.displayProperties.name.includes("Грандмастер")) {
            return `Грандмастер: ${activityData.displayProperties.description}`;
        }
    }
    const predefinedName = findPredefinedName(hash);
    return predefinedName || manifestTitle;
}
function getActivityCompletionText(mode, fromBeginning) {
    return ((mode === 4
        ? "Рейд был закрыт"
        : mode === 82
            ? "Подземелье было закрыто"
            : mode === 46
                ? "Сумрачный налет был закрыт"
                : "Активность была закрыта") + (fromBeginning ? " с начала" : " с контрольной точки"));
}
function getActivityAuthorObject(mode, pgcrId) {
    return {
        name: mode === 4
            ? "Raid Report"
            : mode === 82
                ? "Dungeon Report"
                : mode === 46
                    ? "GM Report"
                    : "Braytech PGCR",
        url: mode === 4
            ? `https://raid.report/pgcr/${pgcrId}`
            : mode === 82
                ? `https://dungeon.report/pgcr/${pgcrId}`
                : mode === 46
                    ? `https://gm.report/pgcr/${pgcrId}`
                    : `https://bray.tech/report/${pgcrId}`,
    };
}
async function logActivityCompletion(pgcrId) {
    if (checkedPGCRIds.has(pgcrId))
        return;
    const response = await sendApiRequest(`/Platform/Destiny2/Stats/PostGameCarnageReport/${pgcrId}/`).catch((e) => console.error("[Error code: 1072] activityReporter error", pgcrId, e, e.statusCode));
    if (!response?.activityDetails) {
        console.error("[Error code: 1009]", pgcrId, response);
        return;
    }
    if (checkedPGCRIds.has(pgcrId))
        return;
    checkedPGCRIds.add(pgcrId);
    const { mode, referenceId } = response.activityDetails;
    const manifestData = (await GetManifest("DestinyActivityDefinition"))[referenceId];
    const activityTitle = await getActivityTitle(referenceId, manifestData.displayProperties.name);
    const activityReplacedTime = response.entries[0].values.activityDurationSeconds.basic.displayValue
        .replace("h", "ч")
        .replace("m", "м")
        .replace("s", "с");
    const footerText = getActivityCompletionText(mode, response.activityWasStartedFromBeginning ?? false);
    const thumbnailUrl = getActivityImage(referenceId, manifestData.pgcrImage);
    const isFlawlessCompletion = response.activityWasStartedFromBeginning && response.entries.every((player) => player.values.deaths.basic.value === 0);
    const embed = new EmbedBuilder()
        .setColor(isFlawlessCompletion ? "#e5d163" : colors.success)
        .setTimestamp(new Date(response.period))
        .setAuthor(getActivityAuthorObject(mode, pgcrId))
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
    for (const { player, extended, characterId, values } of response.entries) {
        const destinyUserInfo = player.destinyUserInfo;
        const userData = completedUsers.get(destinyUserInfo.membershipId);
        const miscArray = userData?.misc || [];
        if (extended?.weapons?.some((a) => a.referenceId === 4103414242) && !miscArray.some((a) => a.endsWith("**Божественность**")))
            miscArray.push("<a:catbowtie:1034701666580189256>**Божественность**");
        if (extended?.weapons?.some((a) => a.referenceId === 3580904581) && !miscArray.some((a) => a.endsWith("**Буксировщик**")))
            miscArray.push("<:moyaichad:1018345835962044559>**Буксировщик**");
        if (extended?.weapons?.some((a) => a.referenceId === 1363886209) && !miscArray.some((a) => a.endsWith("**Гьяллархорн**")))
            miscArray.push("<a:workin:1077438227830542406>**Гьяллархорн**");
        if (extended?.weapons?.some((a) => a.referenceId === 3512014804) && !miscArray.some((a) => a.endsWith("**Люмина**")))
            miscArray.push("<a:iamthebest:1084475253901774938>**Люмина**");
        const isUserCompletedActivity = values.completed.basic.value === 1;
        const isUserHunter = player.classHash === 671679327;
        const isUserWarlock = player.classHash === 2271682572;
        const classEmoji = isUserCompletedActivity
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
                        : "<:deadTitan:1023051798740729876>");
        completedUsers.set(destinyUserInfo.membershipId, {
            characterId: isUserCompletedActivity || !userData?.characterId ? characterId : userData?.characterId,
            bungieId: destinyUserInfo.membershipId,
            bungieName: destinyUserInfo.bungieGlobalDisplayName,
            classHash: classEmoji,
            completed: !userData?.completed ? (isUserCompletedActivity ? true : false) : true,
            kills: values.kills.basic.value + (userData?.kills || 0),
            deaths: values.deaths.basic.value + (userData?.deaths || 0),
            assists: values.assists.basic.value + (userData?.assists || 0),
            timeInActivity: values.timePlayedSeconds.basic.value + (userData?.timeInActivity || 0),
            misc: miscArray,
        });
    }
    const membersMembershipIds = [...new Set(Array.from(completedUsers.keys()))];
    if (membersMembershipIds.length <= 0)
        return;
    const databaseData = await AuthData.findAll({ where: { bungieId: { [Op.any]: membersMembershipIds } } });
    const clanMembersInActivity = databaseData.filter((a) => a.clan).length;
    if (databaseData.length < 1 || clanMembersInActivity < 1)
        return;
    if ((mode === 82 || mode === 4) &&
        (databaseData.length < membersMembershipIds.length / 2 || clanMembersInActivity < databaseData.length / 2))
        return;
    if (mode === 2 &&
        !((clanMembersInActivity === 1 && membersMembershipIds.length === 1) || clanMembersInActivity > 1))
        return;
    if (mode === 46 && clanMembersInActivity !== membersMembershipIds.length)
        return;
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
    for (const [_, { characterId }] of completedUsers) {
        raidCharactersIds.push(characterId);
    }
    const parseActivityUsers = (onlyCompletedUsers) => {
        let parsedUserCount = 0;
        for (const [characterId, { timeInActivity, bungieId, classHash, bungieName, assists, deaths, misc, kills, completed },] of completedUsers) {
            if (onlyCompletedUsers) {
                if (!completed) {
                    continue;
                }
                else {
                    completedUsers.delete(characterId);
                }
            }
            parsedUserCount++;
            if (parsedUserCount > 12)
                break;
            try {
                const hasUserLeftActivity = timeInActivity + ACTIVITY_LEAVE_TIME < response.entries[0].values.activityDurationSeconds.basic.value;
                const raidClearsResult = getFormattedRaidClearsForUser(bungieId);
                const emoji = onlyCompletedUsers ? "" : "❌";
                const killsAndAssists = kills + assists;
                const userRaidClears = raidClearsResult ? `${raidClearsResult}\n` : "";
                const participationTime = hasUserLeftActivity ? `\n${activityModeName}: **${convertSeconds(timeInActivity)}**` : "";
                const miscNotes = misc.length > 0 ? `\n${misc.join("\n")}` : "";
                embed.addFields({
                    name: escapeString(bungieName),
                    value: `${emoji}${userRaidClears}${classHash}У+П: **${killsAndAssists}** С: **${deaths}**${participationTime}${miscNotes}`,
                    inline: true,
                });
            }
            catch (error) {
                console.error("[Error Code: 1671] An error occurred while parsing user data.", error);
            }
        }
    };
    parseActivityUsers(true);
    embed.data.fields = embed.data.fields?.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    parseActivityUsers(false);
    if (mode === 4) {
        try {
            const startTimeFromGame = new Date(response.period).getTime();
            const preciseEncountersTime = getValidatedEncounterTimes();
            if (preciseEncountersTime && preciseEncountersTime.length > 0) {
                const encountersData = [];
                const phasesArray = preciseEncountersTime.sort((a, b) => a.phaseIndex - b.phaseIndex);
                for (let i = 0; i < phasesArray.length; i++) {
                    const encounterData = phasesArray[i];
                    if (i === 0) {
                        encountersData.push({
                            start: startTimeFromGame,
                            end: encounterData.end,
                            phase: encounterData.phase,
                            phaseIndex: `${encounterData.phaseIndex != 1 && response.activityWasStartedFromBeginning
                                ? `1-${encounterData.phaseIndex}`
                                : encounterData.phaseIndex}`,
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
                }
                if (encountersData.length > 0) {
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
            function getValidatedEncounterTimes() {
                const completedPhasesForRaidCharacters = new Map();
                console.debug("Participated characters ids:", raidCharactersIds);
                for (const characterId of raidCharactersIds) {
                    const phasesDataPerCharacter = completedPhases.get(characterId);
                    console.debug(`Data for ${characterId} is ${!!phasesDataPerCharacter ? "existing" : "non-existing"}`);
                    if (phasesDataPerCharacter) {
                        console.debug(`Completed phases data for ${characterId} was deleted since his data is being processed`);
                        completedPhasesForRaidCharacters.set(characterId, phasesDataPerCharacter);
                        completedPhases.delete(characterId);
                    }
                }
                console.debug("Completed phases", completedPhasesForRaidCharacters);
                const allPhases = new Map();
                for (const phasesData of completedPhasesForRaidCharacters.values()) {
                    for (const phaseData of phasesData) {
                        if (allPhases.has(phaseData.phase)) {
                            allPhases.get(phaseData.phase).push(phaseData);
                        }
                        else {
                            allPhases.set(phaseData.phase, [phaseData]);
                        }
                    }
                }
                const validatedEncounterTimes = [];
                let latestEndTime = Infinity;
                let latestStartTime = startTimeFromGame;
                const phaseEntries = [...allPhases.entries()];
                for (let i = 0; i < phaseEntries.length; i++) {
                    const [phase, phaseData] = phaseEntries[i];
                    const phaseIndex = phaseData[0].phaseIndex;
                    const phaseStartTimes = phaseData.map((p) => p.start).filter((time) => time >= latestStartTime);
                    const phaseEndTimes = phaseData.map((p) => p.end).filter((time) => time >= latestStartTime);
                    if (phaseStartTimes.length === 0 || phaseEndTimes.length === 0) {
                        continue;
                    }
                    let startTime = Math.min(Math.min(...phaseStartTimes), latestEndTime);
                    let endTime = Math.min(...phaseEndTimes);
                    const lastPhaseData = validatedEncounterTimes.find((a) => a.phaseIndex === phaseIndex - 1);
                    if (i > 0 && latestEndTime > startTime && lastPhaseData) {
                        lastPhaseData.end = startTime;
                    }
                    else if (i === 0 && startTime > startTimeFromGame) {
                        startTime = startTimeFromGame;
                    }
                    if (endTime <= startTime) {
                        console.error("[Error code: 2100] End time is less than start time", endTime, startTime, phaseData);
                        continue;
                    }
                    validatedEncounterTimes.push({
                        phaseIndex,
                        phase,
                        start: startTime,
                        end: endTime,
                    });
                    latestStartTime = startTime;
                    latestEndTime = endTime;
                }
                console.debug(validatedEncounterTimes);
                return validatedEncounterTimes;
            }
        }
        catch (error) {
            console.error("[Error code: 1823]", error);
        }
    }
    if (!activityChannel)
        activityChannel = await client.getTextChannel(process.env.ACTIVITY_CHANNEL_ID);
    const activityMessagePromise = activityChannel.send({ embeds: [embed] });
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    for (const memberData of databaseData) {
        if (mode === 82 && clanMembersInActivity > 1) {
            UserActivityData.increment("dungeons", { by: 1, where: { discordId: memberData.discordId } });
            continue;
        }
        else if (mode !== 4) {
            continue;
        }
        if (memberData.clan === true && clanMembersInActivity > 2)
            UserActivityData.increment("raids", { by: 1, where: { discordId: memberData.discordId } });
        const pastCreatedRaid = raidName &&
            (await RaidEvent.findOne({
                where: {
                    creator: memberData.discordId,
                    time: {
                        [Op.lt]: currentTimeInSeconds,
                    },
                    raid: raidName.replace("Master", ""),
                },
            }));
        if (!pastCreatedRaid || pastCreatedRaid.time > currentTimeInSeconds)
            continue;
        const awaitedMessage = await activityMessagePromise;
        const raidCompletionEmbed = new EmbedBuilder()
            .setColor(colors.serious)
            .setFooter({ text: `RId: ${pastCreatedRaid.id}` })
            .setTitle("Созданный вами рейд был завершен")
            .setDescription(`Вы создавали рейд ${pastCreatedRaid.id}-${pastCreatedRaid.raid} на <t:${pastCreatedRaid.time}> и сейчас он был завершен\nПодтвердите завершение рейда для удаления набора\n\n[Результаты рейда](https://discord.com/channels/${awaitedMessage.guildId}/${awaitedMessage.channelId}/${awaitedMessage.id})`);
        const deleteRaidButton = new ButtonBuilder().setCustomId("raidInChnButton_delete").setLabel("Удалить набор").setStyle(ButtonStyle.Danger);
        const member = await client.getMember(pastCreatedRaid.creator);
        const raidCompletionNotification = await member
            .send({
            embeds: [raidCompletionEmbed],
            components: addButtonsToMessage([deleteRaidButton]),
        })
            .catch((e) => console.error("[Error code: 1071] Couldn't send a message to the raid creator. Most likely, their DMs are closed", e));
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
                .setDescription(`Созданный вами рейд ${pastCreatedRaid.id}-${pastCreatedRaid.raid} на <t:${pastCreatedRaid.time}> был завершен и удален\n\n[Результаты рейда](https://discord.com/channels/${awaitedMessage.guildId}/${awaitedMessage.channelId}/${awaitedMessage.id})`);
            raidCompletionNotification.edit({ embeds: [updatedEmbed], components: [] });
        }, 1000 * 60 * 20);
    }
}
export { logActivityCompletion, restoreFetchedPGCRs };
//# sourceMappingURL=activityLogger.js.map