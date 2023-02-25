import { forbiddenRaidIds, ownerId } from "../configs/ids.js";
import { activityRoles, raidRoles, statusRoles, trialsRoles } from "../configs/roles.js";
import { character_data, completedRaidsData } from "../features/memberStatisticsHandler.js";
import { apiStatus } from "../structures/apiStatus.js";
import { activityReporter } from "./logger.js";
import { setUserCharacters } from "./setUserCharacters.js";
import { fetchRequest } from "./fetchRequest.js";
export async function destinyActivityChecker(authData, member, mode, count = 250) {
    if (apiStatus.status !== 1)
        return;
    const { platform, bungieId, accessToken } = authData;
    const userCharactersArray = character_data.get(member.id);
    if (!userCharactersArray) {
        character_data.set(member.id, []);
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
            await checker();
            async function checker() {
                const response = await fetchRequest(`Platform/Destiny2/${platform}/Account/${bungieId}/Character/${character}/Stats/Activities/?count=${count}&mode=${mode}&page=${page}`, accessToken);
                if (!response || !response.activities)
                    return console.error(`[Error code: 1018] Response error for ${bungieId} during checking ${mode} mode`);
                if (response.activities?.length > 0) {
                    await Promise.all(response.activities.map((activity) => {
                        if ((mode === 82 || mode === 4) && activity.values.completed.basic.value) {
                            if (new Date(activity.period).getTime() + activity.values.activityDurationSeconds.basic.value * 1000 >
                                new Date().getTime() - 1000 * 60 * 15)
                                activityReporter(activity.activityDetails.instanceId);
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
                        await checker();
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
                    case 9999999:
                        counts.nebula += 1;
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
                        counts.vog += 1;
                        break;
                    case 1681562271:
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
            }, { nebula: 0, kf: 0, kfMaster: 0, votd: 0, votdMaster: 0, dsc: 0, gos: 0, vog: 0, vogMaster: 0, lw: 0 });
            completedRaidsData.set(member.id, {
                ...raidCounts,
                totalRaidCount: completedRaidCount,
            });
            if (member.roles.cache.has(statusRoles.clanmember) ||
                (member.roles.cache.has(statusRoles.member) &&
                    member.roles.cache.hasAny(...activityRoles.allMessages, ...activityRoles.allVoice, activityRoles.category)) ||
                authData.UserActivityData !== undefined) {
                const { nebula, kf, kfMaster, votd, votdMaster, dsc, gos, vog, vogMaster, lw, totalRaidCount } = completedRaidsData.get(member.id);
                const kfClears = kf + kfMaster;
                const votdClears = votd + votdMaster;
                const vogClears = vog + vogMaster;
                const totalClears = totalRaidCount;
                for await (const step of raidRoles.roles) {
                    if (kfClears >= step.individualClears &&
                        votdClears >= step.individualClears &&
                        vogClears >= step.individualClears &&
                        dsc >= step.individualClears &&
                        gos >= step.individualClears &&
                        lw >= step.individualClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.add(step.roleId);
                            setTimeout(() => member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId)), 5555);
                        }
                        break;
                    }
                    else if (totalClears >= step.totalClears) {
                        if (!member.roles.cache.has(step.roleId)) {
                            member.roles.add(step.roleId);
                            setTimeout(() => member.roles.remove(raidRoles.allRoles.filter((r) => r !== step.roleId)), 5555);
                        }
                        break;
                    }
                }
            }
        }
        else if (mode === 84) {
            if (wtmatches >= 10 && member.id !== ownerId) {
                if (!member.roles.cache.has(trialsRoles.wintrader)) {
                    member.roles.add(trialsRoles.wintrader);
                    setTimeout(() => member.roles.remove(trialsRoles.allKd), 6000);
                }
                return;
            }
            else {
                const kd = kills / deaths;
                if (!isNaN(kd)) {
                    for (const step of trialsRoles.kd) {
                        if (kd >= step.kd) {
                            if (!member.roles.cache.has(trialsRoles.category))
                                member.roles.add(trialsRoles.category);
                            if (!member.roles.cache.has(step.roleId)) {
                                member.roles.add(step.roleId);
                                setTimeout(() => member.roles.remove(trialsRoles.allKd.filter((r) => r !== step.roleId)), 6000);
                            }
                            break;
                        }
                    }
                }
                else {
                    console.error(`[Error code: 1019] KD is NaN for ${member.displayName}, ${kills}/${deaths}/${wtmatches}`);
                    return;
                }
            }
        }
    }
}
