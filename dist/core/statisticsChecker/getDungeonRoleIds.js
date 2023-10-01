import { dungeonsTriumphHashes } from "../../configs/roleRequirements.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";
const dungeonRolesCache = [];
export const dungeonRoles = async () => {
    if (dungeonRolesCache.length > 0)
        return dungeonRolesCache;
    await AutoRoleData.findAll({ where: { category: 8 } }).then((rolesData) => {
        rolesData
            .filter((roleData) => dungeonsTriumphHashes.includes(roleData.triumphRequirement))
            .map((r) => r.roleId)
            .forEach((roleId) => dungeonRolesCache.push(roleId));
    });
};
//# sourceMappingURL=getDungeonRoleIds.js.map