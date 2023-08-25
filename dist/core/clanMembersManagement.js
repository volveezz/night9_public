import { ActivityType } from "discord.js";
import { clanJoinDateRoles } from "../configs/roles.js";
import { client } from "../index.js";
import getClanMemberData from "../utils/api/getClanMemberData.js";
import kickClanMember from "../utils/api/kickClanMember.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus, updateEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import checkUserRequirements from "../utils/general/newbieRequirementsChecker/checkUserRequirements.js";
import notifyUserNotMeetRequirements from "../utils/general/newbieRequirementsChecker/notifyUserNotMeetRequirements.js";
import { updateClanRolesWithLogging } from "../utils/logging/clanEventLogger.js";
import { clanOnline, joinDateCheckedClanMembers, recentlyExpiredAuthUsersBungieIds, recentlyNotifiedKickedMembers, } from "../utils/persistence/dataStore.js";
let lastLoggedErrorCode = 1;
async function clanMembersManagement(databaseData) {
    try {
        const request = await sendApiRequest(`/Platform/GroupV2/${process.env.GROUP_ID}/Members/?memberType=None`, null, true);
        if (!request) {
            console.error("[Error code: 1013]", databaseData.map((d) => d.bungieId).join(", "));
            return;
        }
        const { ErrorCode: errorCode, Response: clanList } = request;
        if (lastLoggedErrorCode !== 1) {
            lastLoggedErrorCode = errorCode ?? 1;
        }
        if ((client.user.presence.activities[0].state || client.user.presence.activities[0].name).startsWith("🔁")) {
            await client.stopUpdatingPresence();
            console.debug("Stopped updating presence");
        }
        if (errorCode === 1 &&
            getEndpointStatus("api") != errorCode &&
            clanList.results &&
            clanList.results.length > 1) {
            updateEndpointStatus("api", 1);
            client.user.setPresence({
                status: "online",
            });
            console.info("\x1b[32mBungie API is back online\x1b[0m");
        }
        else if (errorCode != null && errorCode != getEndpointStatus("api") && errorCode != 1) {
            updateEndpointStatus("api", errorCode);
            client.user.setPresence({
                activities: [
                    { name: "Bungie API отключено", type: ActivityType.Listening },
                    { name: "Destiny API не отвечает", type: ActivityType.Watching },
                ],
                status: "idle",
            });
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
        if (onlineCounter === 0) {
            client.user.setPresence({
                activities: [{ name: `${clanList.results.length} участников в клане`, type: ActivityType.Custom }],
                status: "online",
            });
            client.user.setActivity({ name: `${clanList.results.length} участников в клане`, type: ActivityType.Custom });
        }
        else {
            client.user.setActivity({ name: `${onlineCounter} онлайн в клане из ${clanList.results.length}`, type: ActivityType.Custom });
        }
        processClanMembers();
        async function handleClanLeftMembers() {
            await Promise.all(databaseData.map(async (member) => {
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
        async function processClanMembers() {
            await Promise.all(clanList.results.map((clanMember) => {
                return processClanMember(clanMember);
            }));
            await handleClanLeftMembers();
        }
        async function processClanMember(clanMember) {
            const { membershipId } = clanMember.destinyUserInfo;
            const index = databaseData.findIndex((e) => e.bungieId === membershipId);
            if (index === -1) {
                handleNonRegisteredMembers(clanMember);
                return;
            }
            const [memberAuthData] = databaseData.splice(index, 1);
            if (clanMember.isOnline) {
                clanOnline.set(memberAuthData.discordId, {
                    platform: clanMember.destinyUserInfo.membershipType,
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
                            await kickClanMember(platform, bungieId);
                            if (!recentlyNotifiedKickedMembers.has(bungieId)) {
                                console.debug(`Notifing ${memberAuthData.displayName} about not meeting requirements`);
                                await notifyUserNotMeetRequirements(memberAuthData, isUserMeetsRequirements);
                            }
                        }
                        else {
                            console.error("[Error code: 1976]", isUserMeetsRequirements, memberAuthData.platform, memberAuthData.bungieId, memberAuthData.accessToken?.length);
                        }
                    }
                }
                catch (error) {
                    console.error("[Error code: 1924]", error);
                }
            }
            const destinyUserName = clanMember.destinyUserInfo.bungieGlobalDisplayName ||
                clanMember.destinyUserInfo.LastSeenDisplayName ||
                clanMember.destinyUserInfo.displayName;
            if (memberAuthData.displayName.replace("⁣", "") !== destinyUserName) {
                memberAuthData.displayName = destinyUserName;
                await memberAuthData.save();
            }
            if (!joinDateCheckedClanMembers.has(membershipId)) {
                if (!(memberAuthData.roleCategoriesBits & 8))
                    return;
                const userJoinDate = new Date(clanMember.joinDate).getTime();
                const userInClanDays = (Date.now() - userJoinDate) / 1000 / 60 / 60 / 24;
                for (const { days: daysRequiredInClan, roleId } of clanJoinDateRoles.roles) {
                    if (daysRequiredInClan <= userInClanDays) {
                        const rolesExceptTheNeeded = clanJoinDateRoles.allRoles.filter((r) => r !== roleId);
                        try {
                            const member = await client.getAsyncMember(memberAuthData.discordId);
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
                joinDateCheckedClanMembers.add(membershipId);
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
        if (e.statusCode >= 400 || e.statusCode <= 599)
            console.error(`[Error code: 1221] ${e.statusCode} error during clan checking`);
        else
            console.error("[Error code: 1222]", e.error?.stack || e.error || e, e.statusCode);
    }
}
export default clanMembersManagement;
//# sourceMappingURL=clanMembersManagement.js.map