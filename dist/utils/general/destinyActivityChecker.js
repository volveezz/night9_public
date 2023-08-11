import { checkedStoryActivities, forbiddenRaidIds } from "../../configs/ids.js";
import { activityRoles, raidRoles, trialsRoles } from "../../configs/roles.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { getEndpointStatus } from "../api/statusCheckers/statusTracker.js";
import { logActivityCompletion } from "../logging/activityLogger.js";
import getGrandmasterHashes from "../logging/getGrandmasterHashes.js";
import { completedRaidsData, userCharactersId } from "../persistence/dataStore.js";
import { getRaidNameFromHash } from "./raidFunctions.js";
import fetchCharacterStatsAndCache from "./setUserCharacters.js";
const envs = process.env;
const OWNER_ID = envs.OWNER_ID;
const CLANMEMBER = envs.CLANMEMBER;
const MEMBER = envs.MEMBER;
const cachedKDData = new Map();
async function processActivities(activity, completedActivities, mode, activityAvaliableTime, { isPreviousMatchWintraded, isWintrader, wintradedMatches, kills, deaths }) {
    const activityMode = activity.activityDetails.mode;
    if (activity.values.completed.basic.value &&
        (activityMode === 82 ||
            (activityMode === 46 &&
                (await getGrandmasterHashes()).has(activity.activityDetails.referenceId)) ||
            activityMode === 4 ||
            (activityMode === 2 && checkedStoryActivities.includes(activity.activityDetails.referenceId)))) {
        if (new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 > activityAvaliableTime)
            logActivityCompletion(activity.activityDetails.instanceId);
        if (mode === 4 && !forbiddenRaidIds.includes(activity.activityDetails.referenceId))
            completedActivities.push(activity.activityDetails.referenceId);
    }
    else if (mode === 84) {
        if (activity.values.completionReason.basic.value === 3) {
            if (isPreviousMatchWintraded === true) {
                wintradedMatches++;
                isWintrader = true;
            }
            else {
                isPreviousMatchWintraded = true;
            }
        }
        else {
            if (isPreviousMatchWintraded === true) {
                isPreviousMatchWintraded = false;
                if (isWintrader === true) {
                    wintradedMatches++;
                    isWintrader = false;
                }
            }
        }
        kills += activity.values.kills.basic.value;
        deaths += activity.values.deaths.basic.value;
    }
}
export async function destinyActivityChecker({ authData, mode, member, count = 250 }) {
    if (getEndpointStatus("activity") !== 1)
        return;
    const activityAvaliableTime = Date.now() - 1000 * 60 * 60 * 2;
    const { platform, bungieId, accessToken, discordId } = authData;
    const userCharactersArray = userCharactersId.get(discordId);
    if (!userCharactersArray) {
        await fetchCharacterStatsAndCache(authData);
        destinyActivityChecker({ authData, mode, member, count });
        return;
    }
    let completedActivities = [];
    let kills = 0;
    let deaths = 0;
    let wintradedMatches = 0;
    let isPreviousMatchWintraded = false;
    let isWintrader = false;
    for (const character of userCharactersArray) {
        if (getEndpointStatus("activity") !== 1) {
            return;
        }
        let page = 0;
        await fetchAndProcessActivities();
        async function fetchAndProcessActivities() {
            if (getEndpointStatus("activity") !== 1) {
                return;
            }
            const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Character/${character}/Stats/Activities/?count=${count}&mode=${mode}&page=${page}`, accessToken);
            if (!response || !response.activities) {
                console.error(`[Error code: 1018] Response error for ${bungieId} during checking ${mode} mode`, !!response?.activities);
                return;
            }
            if (response.activities.length <= 0) {
                return;
            }
            const activityRequests = response.activities.map((activity) => processActivities(activity, completedActivities, mode, activityAvaliableTime, {
                isPreviousMatchWintraded,
                isWintrader,
                wintradedMatches,
                kills,
                deaths,
            }));
            await Promise.all([activityRequests]);
            if (response.activities.length === 250) {
                page++;
                await fetchAndProcessActivities();
            }
        }
    }
    if (!member)
        return;
    if (mode === 4 && count === 250) {
        const completedRaidCount = completedActivities.length;
        const previousTotalRaidCount = completedRaidsData.get(discordId)?.totalRaidClears;
        if (previousTotalRaidCount && previousTotalRaidCount > completedRaidCount) {
            return;
        }
        const raidCounts = completedActivities.reduce((counts, activity) => {
            const raidName = getRaidNameFromHash(activity);
            if (raidName !== "unknown") {
                counts[raidName] += 1;
            }
            return counts;
        }, { ce: 0, ron: 0, ronMaster: 0, kf: 0, kfMaster: 0, votd: 0, votdMaster: 0, dsc: 0, gos: 0, vog: 0, vogMaster: 0, lw: 0 });
        completedRaidsData.set(discordId, {
            ...raidCounts,
            totalRaidClears: completedRaidCount,
        });
        if (member.roles.cache.has(CLANMEMBER) ||
            (member.roles.cache.has(MEMBER) && member.roles.cache.hasAny(...activityRoles.allMessages, ...activityRoles.allVoice)) ||
            authData.UserActivityData !== undefined) {
            const { ron, ronMaster, kf, kfMaster, votd, votdMaster, dsc, gos, vog, vogMaster, lw, totalRaidClears } = completedRaidsData.get(discordId);
            const ronClears = ron + ronMaster;
            const kfClears = kf + kfMaster;
            const votdClears = votd + votdMaster;
            const vogClears = vog + vogMaster;
            for (const step of raidRoles.roles) {
                if ((ronClears >= step.individualClears &&
                    kfClears >= step.individualClears &&
                    votdClears >= step.individualClears &&
                    vogClears >= step.individualClears &&
                    dsc >= step.individualClears &&
                    gos >= step.individualClears &&
                    lw >= step.individualClears) ||
                    totalRaidClears >= step.totalClears) {
                    if (member.roles.cache.hasAny(...raidRoles.allRoles.filter((r) => r !== step.roleId))) {
                        await member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId));
                    }
                    if (!member.roles.cache.has(step.roleId)) {
                        await member.roles.add(step.roleId);
                    }
                    break;
                }
            }
        }
    }
    else if (mode === 84) {
        if (wintradedMatches >= 10 && discordId !== OWNER_ID) {
            if (member.roles.cache.hasAny(...trialsRoles.allKd)) {
                await member.roles.remove(trialsRoles.allKd);
            }
            if (!member.roles.cache.has(trialsRoles.wintrader)) {
                await member.roles.add(trialsRoles.wintrader);
            }
            return;
        }
        const userKD = kills / deaths;
        const cachedUserKd = cachedKDData.get(discordId);
        if (!cachedUserKd || cachedUserKd < kills + deaths) {
            cachedKDData.set(discordId, kills + deaths);
        }
        else if (cachedUserKd > kills + deaths) {
            return;
        }
        if (isNaN(userKD)) {
            console.error(`[Error code: 1019] KD is NaN for ${member.displayName}`);
            return;
        }
        for (const step of trialsRoles.kd) {
            if (userKD < step.kd)
                continue;
            const addedRoles = [];
            if (!member.roles.cache.has(trialsRoles.category)) {
                addedRoles.push(trialsRoles.category);
            }
            if (!member.roles.cache.has(step.roleId)) {
                await member.roles.remove(trialsRoles.allKd.filter((r) => r !== step.roleId));
                await member.roles.add(step.roleId, ...addedRoles);
            }
            return;
        }
    }
}
//# sourceMappingURL=destinyActivityChecker.js.map