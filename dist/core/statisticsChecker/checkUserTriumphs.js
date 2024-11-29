import { dungeonsTriumphHashes } from "../../configs/roleRequirements.js";
import { activityRoles, statisticsRoles } from "../../configs/roles.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";
import { getDungeonRoles } from "./getDungeonRoleIds.js";
export async function triumphsChecker({ hasRole, hasAnyRole, member, profileResponse, roleCategoriesBits, roleData, characterResponse, roleIdsForAdding, roleIdsForRemoval, }) {
    if (roleCategoriesBits & 1) {
        const activeTriumphs = profileResponse.activeScore;
        for (const { roleId, triumphScore } of statisticsRoles.active) {
            if (activeTriumphs >= triumphScore) {
                if (!hasRole(process.env.STATISTICS_CATEGORY))
                    roleIdsForAdding.push(process.env.STATISTICS_CATEGORY);
                const restStatisticsRoles = statisticsRoles.allActive.filter((r) => r !== roleId);
                if (hasAnyRole(restStatisticsRoles)) {
                    roleIdsForRemoval.push(...restStatisticsRoles);
                }
                if (!hasRole(roleId)) {
                    roleIdsForAdding.push(roleId);
                }
                break;
            }
        }
    }
    const dungeonRolesIds = getDungeonRoles();
    for (const autoRole of roleData) {
        const { category, gildedTriumphRequirement, gildedRoles, roleId, available, triumphRequirement } = autoRole;
        if (category === 4 && !(roleCategoriesBits & 4))
            continue;
        if (category === 8 && !(roleCategoriesBits & 8))
            continue;
        if (gildedTriumphRequirement) {
            const gildedTriumphRecord = profileResponse.records[gildedTriumphRequirement];
            if (gildedTriumphRecord) {
                if (gildedTriumphRecord.completedCount && gildedTriumphRecord.completedCount > 0) {
                    const index = gildedTriumphRecord.completedCount;
                    const gildedRole = gildedRoles?.at(index - 1)?.toLowerCase();
                    if (gildedRole != "null" && gildedRole != null) {
                        if (!hasRole(process.env.TITLE_CATEGORY))
                            roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                        const restRoles = [roleId, ...gildedRoles.filter((r) => r !== gildedRole)];
                        if (hasAnyRole(restRoles)) {
                            roleIdsForRemoval.push(...restRoles);
                        }
                        if (!hasRole(gildedRole)) {
                            roleIdsForAdding.push(gildedRole);
                            if (available && available > 0) {
                                if (available === 1) {
                                    await AutoRoleData.update({ available: 0 }, { where: { roleId } });
                                }
                                else {
                                    await AutoRoleData.decrement("available", { by: 1, where: { roleId } });
                                }
                            }
                        }
                    }
                    else {
                        let lastKnownRole = roleId;
                        for (let i = 0; i < index; i++) {
                            const gildedRoleId = gildedRoles[i];
                            if (gildedRoleId?.toLowerCase() == "null" && i === index - 1) {
                                const notGildedRole = member.guild.roles.cache.get(roleId);
                                const gildedRole = notGildedRole && member.guild.roles.cache.find((r) => r.name === `⚜️${notGildedRole.name} ${i + 1}`);
                                if (gildedRole) {
                                    const restRoles = [roleId, ...gildedRoles.filter((r) => r !== gildedRole.id)];
                                    if (hasAnyRole(restRoles)) {
                                        roleIdsForRemoval.push(...restRoles);
                                    }
                                    if (!hasRole(member.guild.roles.cache.find((r) => r.name === `⚜️${notGildedRole.name} ${i + 1}`).id)) {
                                        roleIdsForAdding.push(gildedRole.id);
                                    }
                                    continue;
                                }
                                else if (!notGildedRole) {
                                    console.error(`[Error code: 1089] Not found previous role of ${triumphRequirement}`, lastKnownRole, notGildedRole);
                                    continue;
                                }
                                const createdRole = await member.guild.roles.create({
                                    name: `⚜️${notGildedRole.name} ${i + 1}`,
                                    color: "#ffb300",
                                    permissions: [],
                                    position: notGildedRole.position + i,
                                    reason: "Auto auto-role creation",
                                });
                                gildedRoles[i] = createdRole.id;
                                for (let i = 0; i < index || i < gildedRoles.length; i++) {
                                    const element = gildedRoles[i] || undefined;
                                    if (!element || element.toLowerCase() === "null")
                                        gildedRoles[i] = "null";
                                }
                                if (!hasRole(process.env.TITLE_CATEGORY))
                                    roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                                roleIdsForAdding.push(createdRole.id);
                                roleIdsForRemoval.push(roleId, ...autoRole.gildedRoles.filter((r) => r !== createdRole.id));
                                await autoRole.save();
                                break;
                            }
                            else if (gildedRoleId?.toLowerCase() != "null") {
                                lastKnownRole = gildedRoleId;
                            }
                            else {
                                gildedRoles[i] = "null";
                            }
                        }
                    }
                }
                else if (profileResponse.records[Number(triumphRequirement)]) {
                    const nonGildedTriumphRecord = profileResponse.records[Number(triumphRequirement)];
                    if (nonGildedTriumphRecord.objectives
                        ? nonGildedTriumphRecord.objectives?.pop()?.complete === true
                        : nonGildedTriumphRecord.intervalObjectives?.pop()?.complete === true) {
                        if (category & 4 && !hasRole(process.env.TITLE_CATEGORY)) {
                            roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                        }
                        else if (category & 8 && !hasRole(process.env.TRIUMPHS_CATEGORY)) {
                            roleIdsForAdding.push(process.env.TRIUMPHS_CATEGORY);
                        }
                        if (!hasRole(roleId)) {
                            roleIdsForAdding.push(roleId);
                        }
                    }
                }
            }
            else {
                console.error(`[Error code: 1090] Profile record ${gildedTriumphRequirement} not found for ${member.displayName}`);
            }
        }
        else {
            let triumphRecord = profileResponse.records[triumphRequirement];
            if (!triumphRecord && characterResponse) {
                triumphRecord = characterResponse[Object.keys(characterResponse)[0]].records[triumphRequirement];
            }
            if (!triumphRecord)
                continue;
            const objective = triumphRecord.objectives
                ? triumphRecord.objectives[triumphRecord.objectives.length - 1]
                : triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1];
            if (dungeonsTriumphHashes.includes(triumphRequirement)) {
                if (objective.complete === true) {
                    if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                        if (hasAnyRole(dungeonRolesIds))
                            roleIdsForRemoval.push(...dungeonRolesIds);
                        continue;
                    }
                    if (member.roles.cache.hasAll(...dungeonRolesIds) && !roleIdsForAdding.includes(process.env.DUNGEON_MASTER_ROLE)) {
                        roleIdsForAdding.push(process.env.DUNGEON_MASTER_ROLE);
                    }
                }
                else if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                    roleIdsForRemoval.push(process.env.DUNGEON_MASTER_ROLE);
                }
            }
            if (objective?.complete === true) {
                if (category === 4 && !hasRole(process.env.TITLE_CATEGORY)) {
                    roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                }
                else if (category === 8 && !hasRole(process.env.TRIUMPHS_CATEGORY)) {
                    roleIdsForAdding.push(process.env.TRIUMPHS_CATEGORY);
                }
                else if (category === 16 && !hasRole(activityRoles.category)) {
                    roleIdsForAdding.push(activityRoles.category);
                }
                if (!hasRole(roleId))
                    roleIdsForAdding.push(roleId);
            }
            else if (hasRole(roleId)) {
                roleIdsForRemoval.push(roleId);
            }
        }
    }
}
//# sourceMappingURL=checkUserTriumphs.js.map