import { checkedStoryActivities, forbiddenRaidIds } from "../../configs/ids.js";
import { activityRoles, raidRoles, trialsRoles } from "../../configs/roles.js";
import { userCharactersId } from "../../core/userStatisticsManagement.js";
import { GetApiStatus } from "../../structures/apiStatus.js";
import { sendApiRequest } from "../api/sendApiRequest.js";
import { logActivityCompletion } from "../logging/activityLogger.js";
import { completedRaidsData } from "../persistence/dataStore.js";
import { getRaidNameFromHash } from "./raidFunctions.js";
import { setUserCharacters } from "./setUserCharacters.js";
const cachedKDData = new Map();
export async function destinyActivityChecker({ authData, mode, member, count = 250 }) {
    if (GetApiStatus("activity") !== 1)
        return;
    const activityAvaliableTime = Date.now() - 1000 * 60 * 60 * 2;
    const { platform, bungieId, accessToken, discordId } = authData;
    const userCharactersArray = userCharactersId.get(discordId);
    if (!userCharactersArray) {
        userCharactersId.set(authData.discordId, []);
        await setUserCharacters(authData);
        destinyActivityChecker({ authData, mode, member, count });
    }
    else {
        let completedActivities = [];
        let kills = 0;
        let deaths = 0;
        let wtmatches = 0;
        let isPreviousIsTraded = false;
        let isWintrader = false;
        for (const character of userCharactersArray) {
            if (GetApiStatus("activity") !== 1)
                return;
            let page = 0;
            await fetchAndProcessActivities();
            async function fetchAndProcessActivities() {
                if (GetApiStatus("activity") !== 1)
                    return;
                const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Character/${character}/Stats/Activities/?count=${count}&mode=${mode}&page=${page}`, accessToken);
                if (response.activities?.length > 0) {
                    await Promise.all(response.activities.map((activity) => {
                        const activityMode = activity.activityDetails.mode;
                        if ((activityMode === 82 ||
                            activityMode === 4 ||
                            (activityMode === 2 &&
                                checkedStoryActivities.includes(activity.activityDetails.referenceId))) &&
                            activity.values.completed.basic.value) {
                            if (new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 >
                                activityAvaliableTime)
                                logActivityCompletion(activity.activityDetails.instanceId);
                            if (mode === 4 && !forbiddenRaidIds.includes(activity.activityDetails.referenceId))
                                completedActivities.push(activity.activityDetails.referenceId);
                        }
                        else if (mode === 84) {
                            if (activity.values.completionReason.basic.value === 3) {
                                if (isPreviousIsTraded === true) {
                                    wtmatches++;
                                    isWintrader = true;
                                }
                                else {
                                    isPreviousIsTraded = true;
                                }
                            }
                            else {
                                if (isPreviousIsTraded === true) {
                                    isPreviousIsTraded = false;
                                    if (isWintrader === true) {
                                        wtmatches++;
                                        isWintrader = false;
                                    }
                                }
                            }
                            kills += activity.values.kills.basic.value;
                            deaths += activity.values.deaths.basic.value;
                        }
                    }));
                    if (response.activities.length === 250) {
                        page++;
                        await fetchAndProcessActivities();
                    }
                }
            }
        }
        if (mode === 4 && count === 250 && member) {
            const completedRaidCount = completedActivities.length;
            const previousTotalRaidCount = completedRaidsData.get(discordId)?.totalRaidCount;
            if (previousTotalRaidCount && previousTotalRaidCount > completedRaidCount) {
                return;
            }
            const raidCounts = completedActivities.reduce((counts, activity) => {
                const raidName = getRaidNameFromHash(activity);
                if (raidName !== "unknown") {
                    counts[raidName] += 1;
                }
                return counts;
            }, { ron: 0, ronMaster: 0, kf: 0, kfMaster: 0, votd: 0, votdMaster: 0, dsc: 0, gos: 0, vog: 0, vogMaster: 0, lw: 0 });
            completedRaidsData.set(discordId, {
                ...raidCounts,
                totalRaidCount: completedRaidCount,
            });
            if (member.roles.cache.has(process.env.CLANMEMBER) ||
                (member.roles.cache.has(process.env.MEMBER) &&
                    member.roles.cache.hasAny(...activityRoles.allMessages, ...activityRoles.allVoice)) ||
                authData.UserActivityData !== undefined) {
                const { ron, ronMaster, kf, kfMaster, votd, votdMaster, dsc, gos, vog, vogMaster, lw, totalRaidCount } = completedRaidsData.get(discordId);
                const ronClears = ron + ronMaster;
                const kfClears = kf + kfMaster;
                const votdClears = votd + votdMaster;
                const vogClears = vog + vogMaster;
                const totalClears = totalRaidCount;
                for (const step of raidRoles.roles) {
                    if (ronClears >= step.individualClears / 2 &&
                        kfClears >= step.individualClears &&
                        votdClears >= step.individualClears &&
                        vogClears >= step.individualClears &&
                        dsc >= step.individualClears &&
                        gos >= step.individualClears &&
                        lw >= step.individualClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            await member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId));
                            await member.roles.add(step.roleId);
                        }
                        break;
                    }
                    else if (totalClears >= step.totalClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            await member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId));
                            await member.roles.add(step.roleId);
                        }
                        break;
                    }
                }
            }
        }
        else if (mode === 84 && member) {
            if (wtmatches >= 10 && discordId !== process.env.OWNER_ID) {
                if (!member.roles.cache.has(trialsRoles.wintrader)) {
                    await member.roles.remove(trialsRoles.allKd);
                    await member.roles.add(trialsRoles.wintrader);
                }
                return;
            }
            else {
                const kd = kills / deaths;
                const cachedUserKd = cachedKDData.get(discordId);
                if (!cachedUserKd || cachedUserKd < kills + deaths) {
                    cachedKDData.set(discordId, kills + deaths);
                }
                else if (cachedUserKd > kills + deaths) {
                    return;
                }
                if (!isNaN(kd)) {
                    for (const step of trialsRoles.kd) {
                        if (kd >= step.kd) {
                            if (!member.roles.cache.has(trialsRoles.category))
                                await member.roles.add(trialsRoles.category);
                            if (!member.roles.cache.has(step.roleId)) {
                                await member.roles.remove(trialsRoles.allKd.filter((r) => r !== step.roleId));
                                await member.roles.add(step.roleId);
                            }
                            break;
                        }
                    }
                }
                else {
                    console.error(`[Error code: 1019] KD is NaN for ${member.displayName}`);
                    return;
                }
            }
        }
    }
}
//# sourceMappingURL=destinyActivityChecker.js.map