import { ActivityType } from "discord.js";
import NightRoleCategory from "../configs/RoleCategory.js";
import { clanJoinDateRoles, triumphsCategory } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { timer } from "../utils/general/utilities.js";
import { updateClanRolesWithLogging } from "../utils/logging/logger.js";
import { AuthData, database } from "../utils/persistence/sequelize.js";
import { clanOnline } from "./userStatisticsManagement.js";
const clanJoinDateCheck = new Set();
async function changeUserNickname(discordId, name) {
    try {
        const member = await client.getAsyncMember(discordId);
        if (!member) {
            console.error("[Error code: 1735]", discordId, name);
            return;
        }
        member.setNickname(name, "GlobalNickname changed");
    }
    catch (error) {
        console.error("[Error code: 1098] Name change error", error);
    }
}
let lastLoggedErrorCode = 1;
async function clanMembersManagement(userBungieIds) {
    try {
        const clanList = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        if (!clanList) {
            console.error("[Error code: 1013]", userBungieIds.map((d) => d.bungieId).join(", "));
            return;
        }
        if (clanList.ErrorCode !== undefined && clanList.ErrorCode !== apiStatus.status) {
            apiStatus.status = clanList.ErrorCode;
        }
        else if (apiStatus.status !== 1 && clanList?.results && clanList.results.length > 1) {
            apiStatus.status = 1;
            console.info("Bungie API is back online");
        }
        if (client.user.presence.activities[0].name.startsWith("🔁")) {
            client.stopUpdatingPresence();
        }
        if (!clanList.results || !clanList.results?.length) {
            if (clanList.ErrorCode != null && lastLoggedErrorCode !== clanList.ErrorCode) {
                console.error("[Error code: 1118]", clanList.ErrorStatus, clanList.Message);
                lastLoggedErrorCode = clanList.ErrorCode;
                if (clanList.ErrorCode === 5) {
                    client.user.setPresence({
                        activities: [
                            { name: "Bungie API отключено", type: ActivityType.Listening },
                            { name: "Destiny API не отвечает", type: ActivityType.Watching },
                        ],
                        status: "online",
                    });
                }
            }
            return;
        }
        if (clanList.results?.length < 5) {
            console.error("[Error code: 1015]", clanList?.results?.length);
            return;
        }
        clanOnline.clear();
        const onlineCounter = clanList.results.filter((f) => f.isOnline === true).length;
        if (onlineCounter === 0) {
            client.user.setActivity(`${clanList.results.length} участников в клане`, { type: 3 });
        }
        else {
            client.user.setActivity(`${onlineCounter} онлайн из ${clanList.results.length}`, { type: 3 });
        }
        const t = await database.transaction();
        await Promise.all(clanList.results.map(async (result) => {
            const membershipId = result.destinyUserInfo.membershipId;
            if (userBungieIds.some((e) => e.bungieId === membershipId)) {
                const [memberAuthData] = userBungieIds.splice(userBungieIds.findIndex((e) => e.bungieId === membershipId), 1);
                if (result.isOnline) {
                    clanOnline.set(memberAuthData.discordId, {
                        platform: result.destinyUserInfo.membershipType,
                        membershipId,
                    });
                }
                if (!clanJoinDateCheck.has(membershipId)) {
                    await timer(1000);
                    if (!(memberAuthData.roleCategoriesBits & NightRoleCategory.Triumphs))
                        return clanJoinDateCheck.add(membershipId);
                    const member = client.getCachedMembers().get(memberAuthData.discordId);
                    if (!member) {
                        console.error(`[Error code: 1087] Member not found ${memberAuthData.discordId}/${memberAuthData.displayName}`);
                        return;
                    }
                    for await (const step of clanJoinDateRoles.roles) {
                        if (step.days <= Math.trunc((Date.now() - new Date(result.joinDate).getTime()) / 1000 / 60 / 60 / 24)) {
                            if (!member.roles.cache.has(step.roleId)) {
                                try {
                                    await member.roles.remove(clanJoinDateRoles.allRoles.filter((r) => r !== step.roleId));
                                    if (!member.roles.cache.has(triumphsCategory)) {
                                        await member.roles.add([triumphsCategory, step.roleId]);
                                    }
                                    else {
                                        await member.roles.add(step.roleId);
                                    }
                                }
                                catch (error) {
                                    console.error("[Error code: 1238] Error during clanJoinDate role managment", error);
                                }
                            }
                            break;
                        }
                    }
                    clanJoinDateCheck.add(membershipId);
                }
                if (memberAuthData.displayName !== result.destinyUserInfo.bungieGlobalDisplayName &&
                    !memberAuthData.displayName.startsWith("⁣")) {
                    await AuthData.update({
                        displayName: result.destinyUserInfo.bungieGlobalDisplayName,
                    }, {
                        where: {
                            bungieId: membershipId,
                        },
                        transaction: t,
                    });
                    changeUserNickname(memberAuthData.discordId, result.destinyUserInfo.bungieGlobalDisplayName);
                }
                if (memberAuthData.clan === false) {
                    await AuthData.update({ clan: true }, {
                        where: {
                            bungieId: membershipId,
                        },
                        transaction: t,
                    });
                    updateClanRolesWithLogging(memberAuthData, true);
                }
            }
        }));
        await Promise.all(userBungieIds.map(async (result) => {
            if (result.clan === true) {
                await AuthData.update({ clan: false }, { where: { bungieId: result.bungieId }, transaction: t });
                updateClanRolesWithLogging(result, false);
            }
        }));
        try {
            await t.commit();
        }
        catch (error) {
            t.rollback();
            console.error("[Error code: 1220] Clan checker commit error", error);
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
