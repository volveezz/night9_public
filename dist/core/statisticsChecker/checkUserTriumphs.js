import { dungeonsTriumphHashes } from "../../configs/roleRequirements.js";
import { activityRoles, statisticsRoles } from "../../configs/roles.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";
import { dungeonRoles } from "./getDungeonRoleIds.js";
export async function triumphsChecker({ hasRole, member, profileResponse, roleCategoriesBits, roleData, characterResponse, roleIdsForAdding, roleIdsForRemoval, }) {
    if (roleCategoriesBits & 1) {
        const activeTriumphs = profileResponse.activeScore;
        for (const step of statisticsRoles.active) {
            if (activeTriumphs >= step.triumphScore) {
                if (!hasRole(process.env.STATISTICS_CATEGORY))
                    roleIdsForAdding.push(process.env.STATISTICS_CATEGORY);
                if (!hasRole(step.roleId)) {
                    roleIdsForAdding.push(step.roleId);
                    roleIdsForRemoval.push(...statisticsRoles.allActive.filter((r) => r !== step.roleId));
                }
                break;
            }
        }
    }
    for (const role of roleData) {
        if (role.category === 4 && !(roleCategoriesBits & 4))
            continue;
        if (role.category === 8 && !(roleCategoriesBits & 8))
            continue;
        if (role.gildedTriumphRequirement) {
            const gildedTriumphRecord = profileResponse.records[role.gildedTriumphRequirement];
            if (gildedTriumphRecord) {
                if (gildedTriumphRecord.completedCount && gildedTriumphRecord.completedCount > 0) {
                    const index = gildedTriumphRecord.completedCount;
                    if (role.gildedRoles && role.gildedRoles.at(index - 1) && role.gildedRoles.at(index - 1).toLowerCase() !== "null") {
                        if (!hasRole(process.env.TITLE_CATEGORY))
                            roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                        if (!hasRole(role.gildedRoles.at(index - 1))) {
                            roleIdsForAdding.push(role.gildedRoles.at(index - 1));
                            roleIdsForRemoval.push(role.roleId, ...role.gildedRoles.filter((r) => r !== role.gildedRoles.at(index - 1)));
                            if (role.available && role.available > 0) {
                                if (role.available === 1) {
                                    await AutoRoleData.update({ available: 0 }, { where: { roleId: role.roleId } });
                                }
                                else {
                                    await AutoRoleData.decrement("available", { by: 1, where: { roleId: role.roleId } });
                                }
                            }
                        }
                    }
                    else {
                        let lastKnownRole = role.roleId;
                        for (let i = 0; i < index; i++) {
                            const element = role.gildedRoles[i];
                            if ((!element || element?.toLowerCase() === "null") && i === index - 1) {
                                const nonGildedRole = member.guild.roles.cache.get(role.roleId);
                                const gildedRole = nonGildedRole && member.guild.roles.cache.find((r) => r.name === `⚜️${nonGildedRole.name} ${i + 1}`);
                                if (gildedRole) {
                                    if (!hasRole(member.guild.roles.cache.find((r) => r.name === `⚜️${nonGildedRole.name} ${i + 1}`).id)) {
                                        roleIdsForAdding.push(gildedRole.id);
                                        roleIdsForRemoval.push(role.roleId, ...role.gildedRoles.filter((r) => r !== gildedRole.id));
                                    }
                                    continue;
                                }
                                else if (!nonGildedRole) {
                                    console.error(`[Error code: 1089] Not found previous role of ${role.triumphRequirement}`, lastKnownRole, nonGildedRole);
                                    continue;
                                }
                                const dbRoleUpdated = await AutoRoleData.findOne({
                                    where: { gildedTriumphRequirement: role.gildedTriumphRequirement },
                                });
                                if (!dbRoleUpdated) {
                                    console.error("[Error code: 1756] No information about role in database");
                                    continue;
                                }
                                const createdRole = await member.guild.roles.create({
                                    name: `⚜️${nonGildedRole.name} ${i + 1}`,
                                    color: "#ffb300",
                                    permissions: [],
                                    position: nonGildedRole.position + i,
                                    reason: "Auto auto-role creation",
                                });
                                dbRoleUpdated.gildedRoles[i] = createdRole.id;
                                for (let i = 0; i < index || i < dbRoleUpdated.gildedRoles.length; i++) {
                                    const element = dbRoleUpdated.gildedRoles[i] || undefined;
                                    if (!element || element.toLowerCase() === "null")
                                        dbRoleUpdated.gildedRoles[i] = "null";
                                }
                                if (!hasRole(process.env.TITLE_CATEGORY))
                                    roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                                roleIdsForAdding.push(createdRole.id);
                                roleIdsForRemoval.push(role.roleId, ...dbRoleUpdated.gildedRoles.filter((r) => r !== createdRole.id));
                                await dbRoleUpdated.save();
                                break;
                            }
                            else if (element && element.toLowerCase() !== "null") {
                                lastKnownRole = element;
                            }
                            else {
                                role.gildedRoles[i] = "null";
                            }
                        }
                    }
                }
                else if (profileResponse.records[Number(role.triumphRequirement)]) {
                    const nonGildedTriumphRecord = profileResponse.records[Number(role.triumphRequirement)];
                    if (nonGildedTriumphRecord.objectives
                        ? nonGildedTriumphRecord.objectives?.pop()?.complete === true
                        : nonGildedTriumphRecord.intervalObjectives?.pop()?.complete === true) {
                        if (!hasRole(role.roleId)) {
                            if (role.category & 4 && !hasRole(process.env.TITLE_CATEGORY))
                                roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                            roleIdsForAdding.push(role.roleId);
                        }
                    }
                }
            }
            else {
                console.error(`[Error code: 1090] Profile record ${role.gildedTriumphRequirement} not found for ${member.displayName}`);
            }
        }
        else {
            const triumphHash = role.triumphRequirement;
            let triumphRecord = profileResponse.records[triumphHash];
            if (!triumphRecord && characterResponse) {
                triumphRecord = characterResponse[Object.keys(characterResponse)[0]].records[triumphHash];
            }
            if (!triumphRecord)
                continue;
            const objective = triumphRecord.objectives
                ? triumphRecord.objectives[triumphRecord.objectives.length - 1]
                : triumphRecord.intervalObjectives[triumphRecord.intervalObjectives.length - 1];
            if (dungeonsTriumphHashes.includes(triumphHash)) {
                if (objective.complete === true) {
                    if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                        continue;
                    }
                    const dungeonRolesIds = await dungeonRoles();
                    if (member.roles.cache.hasAll(...dungeonRolesIds) && !roleIdsForAdding.includes(process.env.DUNGEON_MASTER_ROLE)) {
                        roleIdsForAdding.push(process.env.DUNGEON_MASTER_ROLE);
                        roleIdsForRemoval.push(...dungeonRolesIds);
                    }
                }
                else if (hasRole(process.env.DUNGEON_MASTER_ROLE)) {
                    roleIdsForRemoval.push(process.env.DUNGEON_MASTER_ROLE);
                    if (!roleIdsForAdding.includes(role.roleId)) {
                        roleIdsForAdding.push(role.roleId);
                    }
                }
            }
            if (objective && objective.complete === true) {
                if (role.category === 4 && !hasRole(process.env.TITLE_CATEGORY))
                    roleIdsForAdding.push(process.env.TITLE_CATEGORY);
                if (role.category === 8 && !hasRole(process.env.TRIUMPHS_CATEGORY))
                    roleIdsForAdding.push(process.env.TRIUMPHS_CATEGORY);
                if (role.category === 16 && !hasRole(activityRoles.category))
                    roleIdsForAdding.push(activityRoles.category);
                if (!hasRole(role.roleId))
                    roleIdsForAdding.push(role.roleId);
            }
            else if (hasRole(role.roleId)) {
                roleIdsForRemoval.push(role.roleId);
            }
        }
    }
}
//# sourceMappingURL=checkUserTriumphs.js.map