import { ActivityType } from "discord.js";
import { clanJoinDateRoles } from "../configs/roles.js";
import { client } from "../index.js";
import BungieAPIError from "../structures/BungieAPIError.js";
import getClanMemberData from "../utils/api/getClanMemberData.js";
import kickClanMember from "../utils/api/kickClanMember.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { completedPhases } from "../utils/general/activityCompletionChecker.js";
import checkUserRequirements from "../utils/general/newbieRequirementsChecker/checkUserRequirements.js";
import notifyUserNotMeetRequirements from "../utils/general/newbieRequirementsChecker/notifyUserNotMeetRequirements.js";
import { updateClanRolesWithLogging } from "../utils/logging/clanEventLogger.js";
import { bungieNames, clanOnline, recentlyExpiredAuthUsersBungieIds, recentlyNotifiedKickedMembers, userCharactersId, } from "../utils/persistence/dataStore.js";
let lastLoggedErrorCode = 1;
let pastInitialLaunch = false;
async function updateClientPresence(errorCode) {
    const activities = errorCode === 5
        ? [{ name: "API игры отключено", type: ActivityType.Custom }]
        : [{ name: "API не отвечает", type: ActivityType.Custom }];
    client.user.setPresence({
        activities,
        status: "idle",
    });
}
async function clanMembersManagement(databaseData) {
    const dataForProcessing = new Array(...databaseData);
    try {
        const request = await sendApiRequest(`/Platform/GroupV2/${process.env.GROUP_ID}/Members/?memberType=None`, null, true);
        if (!request) {
            console.error("[Error code: 1013]", dataForProcessing.map((d) => d.bungieId).join(", "));
            return;
        }
        const { ErrorCode: errorCode, Response: clanList } = request;
        lastLoggedErrorCode = errorCode;
        if (errorCode === 1 &&
            getEndpointStatus("api") != errorCode &&
            clanList.results &&
            clanList.results.length > 1) {
            updateEndpointStatus("api", 1);
            client.user.setPresence({
                activities: [{ name: "API игры восстановлено", type: ActivityType.Custom }],
                status: "online",
            });
            console.info("\x1b[32mBungie API is back online\x1b[0m");
        }
        else if (errorCode != null && errorCode != getEndpointStatus("api") && errorCode != 1) {
            updateEndpointStatus("api", errorCode);
            updateClientPresence(errorCode);
            return;
        }
        if (!clanList.results || !clanList.results?.length) {
            if (errorCode != null && lastLoggedErrorCode !== errorCode) {
                console.error("[Error code: 1118]", clanList.ErrorStatus, clanList.Message);
                lastLoggedErrorCode = errorCode;
            }
            return;
        }
        if (clanList.results?.length < 5) {
            console.error("[Error code: 1015]", clanList?.results?.length);
            return;
        }
        clanOnline.clear();
        const onlineCounter = clanList.results.reduce((acc, f) => (f.isOnline === true ? acc + 1 : acc), 0);
        updateBotPresence(onlineCounter, clanList.results.length);
        await Promise.all(clanList.results.map((clanMember) => {
            return processClanMember(clanMember);
        }));
        await handleClanLeftMembers();
        async function handleClanLeftMembers() {
            await Promise.all(dataForProcessing.map(async (member) => {
                if (member.clan === true) {
                    const memberData = await getClanMemberData(member);
                    if (memberData.member?.groupId !== process.env.GROUP_ID) {
                        member.clan = false;
                        await member.save();
                        await updateClanRolesWithLogging(member, false);
                    }
                    else {
                        console.error("[Error code: 1923]", memberData.member);
                    }
                }
            }));
        }
        async function processClanMember(clanMember) {
            const { membershipId, membershipType, bungieGlobalDisplayName, LastSeenDisplayName, displayName } = clanMember.destinyUserInfo;
            const index = dataForProcessing.findIndex((e) => e.bungieId === membershipId);
            if (index === -1) {
                handleNonRegisteredMembers(clanMember);
                return;
            }
            const [memberAuthData] = dataForProcessing.splice(index, 1);
            const { discordId } = memberAuthData;
            if (clanMember.isOnline) {
                clanOnline.set(discordId, {
                    platform: membershipType,
                    membershipId,
                });
            }
            if (memberAuthData.clan === false) {
                try {
                    const clanMemberData = await getClanMemberData(memberAuthData);
                    if (clanMemberData.member?.groupId === process.env.GROUP_ID) {
                        const isUserMeetsRequirements = await checkUserRequirements(memberAuthData);
                        if (typeof isUserMeetsRequirements === "boolean" && isUserMeetsRequirements === true) {
                            memberAuthData.clan = true;
                            await memberAuthData.save();
                            updateClanRolesWithLogging(memberAuthData, true);
                        }
                        else if (typeof isUserMeetsRequirements === "string") {
                            const { platform, bungieId } = memberAuthData;
                            try {
                                await kickClanMember(platform, bungieId);
                            }
                            catch (error) {
                                console.error(`[Error code: 2042] Failed to kick ${platform}/${bungieId} from the clan`);
                                await kickClanMember(platform, bungieId);
                            }
                            if (!recentlyNotifiedKickedMembers.has(bungieId)) {
                                console.debug(`Notifing ${memberAuthData.displayName} about not meeting joining requirements`);
                                await notifyUserNotMeetRequirements(memberAuthData, isUserMeetsRequirements);
                                console.debug(`${memberAuthData.displayName} was notified`);
                            }
                        }
                        else {
                            console.error("[Error code: 1976]", isUserMeetsRequirements, memberAuthData.platform, memberAuthData.bungieId, memberAuthData.accessToken?.length);
                        }
                    }
                }
                catch (error) {
                    console.error(`[Error code: 1924] Received ${error.statusCode} error during checking joining requirements`);
                }
            }
            const destinyUserName = bungieGlobalDisplayName || LastSeenDisplayName || displayName;
            if (memberAuthData.displayName.replace("⁣", "") !== destinyUserName) {
                bungieNames.delete(discordId);
                memberAuthData.displayName = destinyUserName;
                await memberAuthData.save();
            }
            if (!(memberAuthData.roleCategoriesBits & 8))
                return;
            const userJoinDate = new Date(clanMember.joinDate).getTime();
            const userInClanDays = (Date.now() - userJoinDate) / 1000 / 60 / 60 / 24;
            for (const { days: daysRequiredInClan, roleId } of clanJoinDateRoles.roles) {
                if (daysRequiredInClan <= userInClanDays) {
                    const rolesExceptTheNeeded = clanJoinDateRoles.allRoles.filter((r) => r !== roleId);
                    try {
                        const member = await client.getMember(discordId);
                        if (member.roles.cache.hasAny(...rolesExceptTheNeeded)) {
                            await member.roles.remove(rolesExceptTheNeeded);
                        }
                        if (!member.roles.cache.has(roleId)) {
                            if (!member.roles.cache.has(process.env.TRIUMPHS_CATEGORY)) {
                                await member.roles.add([process.env.TRIUMPHS_CATEGORY, roleId]);
                            }
                            else {
                                await member.roles.add(roleId);
                            }
                        }
                    }
                    catch (error) {
                        console.error("[Error code: 1238]", error);
                    }
                    break;
                }
            }
            if (!pastInitialLaunch) {
                const userCharacterIds = userCharactersId.get(discordId);
                userCharacterIds?.forEach((characterId) => {
                    if (!completedPhases.has(characterId))
                        return;
                    const phasesData = completedPhases.get(characterId);
                    if (!clanMember.isOnline) {
                        setTimeout(() => {
                            if (completedPhases.has(characterId)) {
                                console.debug(`Completed phases data for ${memberAuthData.displayName} was deleted since the user not online`);
                                completedPhases.delete(characterId);
                            }
                        }, 60 * 1000 * 5);
                    }
                    else {
                        const interval = setInterval(() => {
                            if (completedPhases.get(characterId) !== phasesData) {
                                clearInterval(interval);
                            }
                            else if (!clanOnline.has(discordId)) {
                                clearInterval(interval);
                                if (completedPhases.has(characterId)) {
                                    console.debug(`Completed phases data for ${memberAuthData.displayName} was deleted during the interval since the user not online`);
                                    completedPhases.delete(characterId);
                                }
                            }
                        }, 60 * 1000 * 30);
                    }
                });
                pastInitialLaunch = true;
            }
        }
        async function handleNonRegisteredMembers(clanMember) {
            const { membershipType, membershipId } = clanMember.destinyUserInfo;
            if (recentlyExpiredAuthUsersBungieIds.has(membershipId))
                return;
            await kickClanMember(membershipType, membershipId);
        }
    }
    catch (e) {
        if (e instanceof BungieAPIError && e.errorCode) {
            console.error(`[Error code: 2052] Received ${e.errorCode}/${e.errorStatus} error during clan checking`);
            updateEndpointStatus("api", e.errorCode);
            updateClientPresence(e.errorCode);
            return;
        }
        if (e.statusCode >= 400 || e.statusCode <= 599) {
            console.error(`[Error code: 1221] ${e.statusCode} error during clan checking`);
        }
        else {
            console.error("[Error code: 1222]", e.error?.stack || e.error || e, e.statusCode);
        }
    }
}
function updateBotPresence(membersOnline, totalMembers) {
    const activityName = membersOnline === 0 ? `${totalMembers} участников в клане` : `${membersOnline} онлайн в клане из ${totalMembers}`;
    if (client.user.presence.activities[0].state !== activityName) {
        client.user.setPresence({
            activities: [{ name: activityName, type: ActivityType.Custom }],
            status: "online",
        });
    }
}
export default clanMembersManagement;
//# sourceMappingURL=clanMembersManagement.js.map