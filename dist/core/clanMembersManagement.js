import { ActivityType } from "discord.js";
import { getAdminAccessToken } from "../commands/clanCommand.js";
import NightRoleCategory from "../configs/RoleCategory.js";
import { groupId, ownerId } from "../configs/ids.js";
import { clanJoinDateRoles, triumphsCategory } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import getClanMemberData from "../utils/api/getClanMemberData.js";
import kickClanMember from "../utils/api/kickClanMember.js";
import { updateClanRolesWithLogging } from "../utils/logging/clanEventLogger.js";
import { joinDateCheckedClanMembers, nonRegClanMembers, recentlyExpiredAuthUsersBungieIds } from "../utils/persistence/dataStore.js";
import { clanOnline } from "./userStatisticsManagement.js";
let lastLoggedErrorCode = 1;
async function clanMembersManagement(databaseData) {
    try {
        const clanList = await fetchRequest(`Platform/GroupV2/${groupId}/Members/?memberType=None`);
        if (!clanList) {
            console.error("[Error code: 1013]", databaseData.map((d) => d.bungieId).join(", "));
            return;
        }
        const errorCode = clanList.ErrorCode;
        if (lastLoggedErrorCode !== 1) {
            lastLoggedErrorCode = errorCode ?? 1;
        }
        if (apiStatus.status != 1 && clanList.results && clanList.results.length > 1) {
            apiStatus.status = 1;
            console.info("\x1b[32mBungie API is back online\x1b[0m");
        }
        if (errorCode != null && errorCode != apiStatus.status) {
            apiStatus.status = errorCode;
        }
        if (client.user.presence.activities[0].name.startsWith("🔁")) {
            client.stopUpdatingPresence();
        }
        if (!clanList.results || !clanList.results?.length) {
            if (errorCode === 5) {
                client.user.setPresence({
                    activities: [
                        { name: "Bungie API отключено", type: ActivityType.Listening },
                        { name: "Destiny API не отвечает", type: ActivityType.Watching },
                    ],
                    status: "idle",
                });
            }
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
            client.user.setActivity(`${clanList.results.length} участников в клане`, { type: ActivityType.Watching });
        }
        else {
            client.user.setActivity(`${onlineCounter} онлайн из ${clanList.results.length}`, { type: ActivityType.Watching });
        }
        processClanMembers();
        async function handleClanLeftMembers() {
            await Promise.all(databaseData.map(async (member) => {
                if (member.clan === true) {
                    const memberData = await getClanMemberData(member);
                    if (memberData.member?.groupId !== groupId) {
                        console.debug("UPDATING", member.displayName, "AS HE LEFT THE CLAN");
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
                    if (clanMemberData.member?.groupId === groupId) {
                        console.debug("User joined the clan", memberAuthData.displayName);
                    }
                    else {
                        console.debug("User wasn't found in the clan", memberAuthData.displayName, clanMemberData.member);
                    }
                }
                catch (error) {
                    console.error("[Error code: 1924]", error);
                }
                memberAuthData.clan = true;
                await memberAuthData.save();
                updateClanRolesWithLogging(memberAuthData, true);
            }
            const destinyUserName = clanMember.destinyUserInfo.bungieGlobalDisplayName ||
                clanMember.destinyUserInfo.LastSeenDisplayName ||
                clanMember.destinyUserInfo.displayName;
            if (memberAuthData.displayName.replace("⁣", "") !== destinyUserName) {
                memberAuthData.displayName = destinyUserName;
                await memberAuthData.save();
            }
            if (!joinDateCheckedClanMembers.has(membershipId)) {
                if (!(memberAuthData.roleCategoriesBits & NightRoleCategory.Triumphs))
                    return;
                const userJoinDate = new Date(clanMember.joinDate).getTime();
                const userInClanDays = (Date.now() - userJoinDate) / 1000 / 60 / 60 / 24;
                for (const { days: daysRequiredInClan, roleId } of clanJoinDateRoles.roles) {
                    if (daysRequiredInClan <= userInClanDays) {
                        const member = await client.getAsyncMember(memberAuthData.discordId);
                        if (!member.roles.cache.has(roleId)) {
                            try {
                                await member.roles.remove(clanJoinDateRoles.allRoles.filter((r) => r !== roleId));
                                if (!member.roles.cache.has(triumphsCategory)) {
                                    await member.roles.add([triumphsCategory, roleId]);
                                }
                                else {
                                    await member.roles.add(roleId);
                                }
                            }
                            catch (error) {
                                console.error("[Error code: 1238]", error);
                            }
                        }
                        break;
                    }
                }
                joinDateCheckedClanMembers.add(membershipId);
            }
        }
        async function handleNonRegisteredMembers(clanMember) {
            const bungieId = clanMember.destinyUserInfo.membershipId;
            if (recentlyExpiredAuthUsersBungieIds.has(bungieId))
                return;
            if (nonRegClanMembers.has(bungieId)) {
                const userKickChance = nonRegClanMembers.get(bungieId);
                const randomNumber = Math.floor(Math.random() * 100);
                if (randomNumber > userKickChance) {
                    const adminAccessToken = (await getAdminAccessToken(ownerId));
                    await kickClanMember(clanMember.destinyUserInfo.membershipType, bungieId, adminAccessToken);
                }
                else {
                    nonRegClanMembers.set(bungieId, randomNumber);
                }
            }
            else {
                nonRegClanMembers.set(bungieId, 20);
            }
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
