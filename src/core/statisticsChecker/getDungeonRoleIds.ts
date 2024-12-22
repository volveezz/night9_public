import { dungeonsTriumphHashes } from "../../configs/roleRequirements.js";
import { AutoRoleData } from "../../utils/persistence/sequelizeModels/autoRoleData.js";

const dungeonRolesCache: string[] = [];

export const cacheDungeonRoles = async () => {
	if (dungeonRolesCache.length > 0) return dungeonRolesCache;

	const rolesData = await AutoRoleData.findAll({ where: { category: 8 } });
	rolesData
		.filter((roleData) => dungeonsTriumphHashes.includes(roleData.triumphRequirement))
		.forEach((role) => dungeonRolesCache.push(role.roleId));

	return dungeonRolesCache;
};

export const getDungeonRoles = () => dungeonRolesCache;
