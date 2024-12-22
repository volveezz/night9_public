import { join, resolve } from "path";
import { Sequelize } from "sequelize-typescript";
import { AuthData } from "./sequelizeModels/authData.js";
import { AutoRoleData } from "./sequelizeModels/autoRoleData.js";
import { InitData } from "./sequelizeModels/initData.js";
import { LeavedUsersData } from "./sequelizeModels/leavedUsersData.js";
import { LfgDatabase } from "./sequelizeModels/lfgDatabase.js";
import { RaidEvent } from "./sequelizeModels/raidEvent.js";
import { RaidUserNotifications } from "./sequelizeModels/raidUserNotifications.js";
import { UserActivityData } from "./sequelizeModels/userActivityData.js";
import { VoiceChannels } from "./sequelizeModels/voiceChannels.js";
import { VotingDatabase } from "./sequelizeModels/votingDatabase.js";

const __dirname = resolve();

const sequelize = new Sequelize((process.env.DATABASE_PRIVATE_URL || process.env.DATABASE_URL)!, {
	dialect: "postgres",
	ssl: true,
	dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
	pool: {
		max: 20,
	},
	logging: false,
	models: [join(__dirname, "/sequelizeModels")],
});

sequelize.addModels([
	AuthData,
	AutoRoleData,
	RaidUserNotifications,
	UserActivityData,
	RaidEvent,
	InitData,
	LeavedUsersData,
	LfgDatabase,
	VoiceChannels,
	VotingDatabase,
]);

RaidUserNotifications.belongsTo(AuthData, {
	foreignKey: {
		name: "discordId",
		allowNull: false,
	},
	targetKey: "discordId",
	onDelete: "CASCADE",
});

UserActivityData.belongsTo(AuthData, {
	foreignKey: {
		name: "discordId",
		allowNull: false,
	},
	targetKey: "discordId",
	onDelete: "CASCADE",
});

AuthData.hasOne(UserActivityData, {
	foreignKey: {
		name: "discordId",
		allowNull: false,
	},
});

AuthData.hasOne(RaidUserNotifications, {
	foreignKey: {
		name: "discordId",
		allowNull: false,
	},
});

export { sequelize as sequelizeInstance };
