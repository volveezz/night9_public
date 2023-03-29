import { checkedStoryActivities, forbiddenRaidIds, ownerId } from "../../configs/ids.js";
import { activityRoles, raidRoles, statusRoles, trialsRoles } from "../../configs/roles.js";
import { completedRaidsData, userCharactersId } from "../../core/userStatisticsManagement.js";
import { apiStatus } from "../../structures/apiStatus.js";
import { fetchRequest } from "../api/fetchRequest.js";
import { logActivityCompletion } from "../logging/activityLogger.js";
import { setUserCharacters } from "./setUserCharacters.js";
const cachedKDData = new Map();
export async function destinyActivityChecker(authData, member, mode, count = 250) {
    if (apiStatus.status !== 1)
        return;
    const activityAvaliableTime = Date.now() - 1000 * 60 * 20;
    const { platform, bungieId, accessToken } = authData;
    const userCharactersArray = userCharactersId.get(member.id);
    if (!userCharactersArray) {
        userCharactersId.set(member.id, []);
        await setUserCharacters(authData, member);
        destinyActivityChecker(authData, member, mode);
    }
    else {
        let completedActivities = [];
        let kills = 0;
        let deaths = 0;
        let wtmatches = 0;
        for await (const character of userCharactersArray) {
            let page = 0;
            await fetchAndProcessActivities();
            async function fetchAndProcessActivities() {
                if (apiStatus.status !== 1)
                    return;
                const response = await fetchRequest(`Platform/Destiny2/${platform}/Account/${bungieId}/Character/${character}/Stats/Activities/?count=${count}&mode=${mode}&page=${page}`, accessToken);
                if (!response)
                    return console.error(`[Error code: 1018] Response error for ${bungieId} during checking ${mode} mode`);
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
                            if (activity.values.completionReason.basic.value === 3)
                                wtmatches++;
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
        if (mode === 4 && count === 250) {
            const completedRaidCount = completedActivities.length;
            const previousTotalRaidCount = completedRaidsData.get(member.id)?.totalRaidCount;
            if (previousTotalRaidCount && previousTotalRaidCount > completedRaidCount) {
                return;
            }
            const raidCounts = completedActivities.reduce((counts, activity) => {
                switch (activity) {
                    case 2381413764:
                    case 1191701339:
                        counts.ron += 1;
                        break;
                    case 2918919505:
                        counts.ronMaster += 1;
                        break;
                    case 1374392663:
                    case 1063970578:
                        counts.kf += 1;
                        break;
                    case 2964135793:
                        counts.kfMaster += 1;
                        break;
                    case 1441982566:
                        counts.votd += 1;
                        break;
                    case 4217492330:
                        counts.votdMaster += 1;
                        break;
                    case 910380154:
                    case 3976949817:
                        counts.dsc += 1;
                        break;
                    case 3458480158:
                    case 2497200493:
                    case 2659723068:
                    case 3845997235:
                        counts.gos += 1;
                        break;
                    case 3881495763:
                    case 1485585878:
                    case 3711931140:
                        counts.vog += 1;
                        break;
                    case 1681562271:
                    case 3022541210:
                        counts.vogMaster += 1;
                        break;
                    case 2122313384:
                    case 1661734046:
                        counts.lw += 1;
                        break;
                    default:
                        console.log(`[Error code: 1232] Found unknown raidId ${activity}`);
                        break;
                }
                return counts;
            }, { ron: 0, ronMaster: 0, kf: 0, kfMaster: 0, votd: 0, votdMaster: 0, dsc: 0, gos: 0, vog: 0, vogMaster: 0, lw: 0 });
            completedRaidsData.set(member.id, {
                ...raidCounts,
                totalRaidCount: completedRaidCount,
            });
            if (member.roles.cache.has(statusRoles.clanmember) ||
                (member.roles.cache.has(statusRoles.member) &&
                    member.roles.cache.hasAny(...activityRoles.allMessages, ...activityRoles.allVoice, activityRoles.category)) ||
                authData.UserActivityData !== undefined) {
                const { ron, ronMaster, kf, kfMaster, votd, votdMaster, dsc, gos, vog, vogMaster, lw, totalRaidCount } = completedRaidsData.get(member.id);
                const ronClears = ron + ronMaster;
                const kfClears = kf + kfMaster;
                const votdClears = votd + votdMaster;
                const vogClears = vog + vogMaster;
                const totalClears = totalRaidCount;
                for await (const step of raidRoles.roles) {
                    if (ronClears >= step.individualClears / 2 &&
                        kfClears >= step.individualClears &&
                        votdClears >= step.individualClears &&
                        vogClears >= step.individualClears &&
                        dsc >= step.individualClears &&
                        gos >= step.individualClears &&
                        lw >= step.individualClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId));
                            setTimeout(() => member.roles.add(step.roleId), 1000);
                        }
                        break;
                    }
                    else if (totalClears >= step.totalClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId));
                            setTimeout(() => member.roles.add(step.roleId), 1000);
                        }
                        break;
                    }
                }
            }
        }
        else if (mode === 84) {
            if (wtmatches >= 10 && member.id !== ownerId) {
                if (!member.roles.cache.has(trialsRoles.wintrader)) {
                    member.roles.remove(trialsRoles.allKd);
                    setTimeout(() => member.roles.add(trialsRoles.wintrader), 1000);
                }
                return;
            }
            else {
                const kd = kills / deaths;
                const cachedUserKd = cachedKDData.get(member.id);
                if (!cachedUserKd || cachedUserKd < kills + deaths) {
                    cachedKDData.set(member.id, kills + deaths);
                }
                else if (cachedUserKd > kills + deaths) {
                    return;
                }
                if (!isNaN(kd)) {
                    for (const step of trialsRoles.kd) {
                        if (kd >= step.kd) {
                            if (!member.roles.cache.has(trialsRoles.category))
                                member.roles.add(trialsRoles.category);
                            if (!member.roles.cache.has(step.roleId)) {
                                member.roles.remove(trialsRoles.allKd.filter((r) => r !== step.roleId));
                                setTimeout(() => member.roles.add(step.roleId), 1000);
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
