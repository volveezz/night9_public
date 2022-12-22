import { Sequelize, Model, DataTypes } from "sequelize";
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    ssl: true,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: {
        max: 20,
    },
    logging: false,
});
class AuthData extends Model {
}
AuthData.init({
    discordId: { type: DataTypes.STRING(30), primaryKey: true },
    bungieId: { type: DataTypes.STRING(30), primaryKey: true },
    platform: { type: DataTypes.SMALLINT },
    clan: { type: DataTypes.BOOLEAN, values: ["true", "false"], defaultValue: false },
    displayName: { type: DataTypes.STRING(30) },
    accessToken: { type: DataTypes.TEXT },
    refreshToken: { type: DataTypes.TEXT },
    membershipId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    timezone: { type: DataTypes.SMALLINT, allowNull: true },
    roleCategoriesBits: { type: DataTypes.SMALLINT, defaultValue: "31" },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false, freezeTableName: true });
class InitData extends Model {
}
InitData.init({
    discordId: { type: DataTypes.STRING(30), primaryKey: true },
    state: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4 },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class LeavedUsersData extends Model {
}
LeavedUsersData.init({
    discordId: { type: DataTypes.STRING(30), primaryKey: true },
    bungieId: { type: DataTypes.STRING(30), primaryKey: true },
    displayName: { type: DataTypes.STRING(30), allowNull: false },
    platform: { type: DataTypes.SMALLINT, allowNull: false },
    accessToken: { type: DataTypes.TEXT },
    refreshToken: { type: DataTypes.TEXT },
    membershipId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    timezone: { type: DataTypes.SMALLINT, allowNull: true },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class AutoRoleData extends Model {
}
AutoRoleData.init({
    triumphRequirement: { type: DataTypes.BIGINT, primaryKey: true },
    roleId: { type: DataTypes.STRING(30) },
    category: { type: DataTypes.SMALLINT, values: ["1", "2", "4", "8", "16"] },
    gildedTriumphRequirement: { type: DataTypes.BIGINT },
    gildedRoles: { type: DataTypes.ARRAY(DataTypes.STRING(30)) },
    available: { type: DataTypes.SMALLINT, defaultValue: -1 },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class UserActivityData extends Model {
}
UserActivityData.init({
    discordId: { type: DataTypes.STRING(30), primaryKey: true, references: { model: AuthData, key: "discordId" } },
    messages: { type: DataTypes.INTEGER, defaultValue: 0 },
    voice: { type: DataTypes.INTEGER, defaultValue: 0 },
    raids: { type: DataTypes.INTEGER, defaultValue: 0 },
    dungeons: { type: DataTypes.INTEGER, defaultValue: 0 },
    updatedAt: { type: DataTypes.DATE },
}, {
    sequelize,
    timestamps: true,
    createdAt: false,
    updatedAt: true,
    freezeTableName: true,
    name: { singular: "UserActivityData", plural: "UserActivityData" },
});
AuthData.belongsTo(UserActivityData, { foreignKey: "discordId", targetKey: "discordId", onDelete: "CASCADE" });
UserActivityData.belongsTo(AuthData, { foreignKey: "discordId", targetKey: "discordId", onDelete: "CASCADE" });
class RaidEvent extends Model {
}
RaidEvent.init({
    id: {
        type: DataTypes.SMALLINT,
        primaryKey: true,
        autoIncrement: true,
    },
    channelId: {
        type: DataTypes.STRING(30),
        unique: "composite_unique_constraint",
        allowNull: false,
    },
    inChannelMessageId: {
        type: DataTypes.STRING(30),
        unique: "composite_unique_constraint",
        allowNull: false,
    },
    messageId: {
        type: DataTypes.STRING(30),
        unique: "composite_unique_constraint",
        allowNull: false,
    },
    creator: { type: DataTypes.STRING(30), allowNull: false },
    joined: { type: DataTypes.ARRAY(DataTypes.STRING(30)), defaultValue: [] },
    hotJoined: {
        type: DataTypes.ARRAY(DataTypes.STRING(30)),
        defaultValue: [],
    },
    alt: { type: DataTypes.ARRAY(DataTypes.STRING(30)), defaultValue: [] },
    time: { type: DataTypes.INTEGER, allowNull: false },
    raid: { type: DataTypes.ENUM("kf", "votd", "vog", "dsc", "gos", "lw") },
    requiredClears: {
        type: DataTypes.SMALLINT,
        defaultValue: 0,
    },
    difficulty: {
        type: DataTypes.SMALLINT,
        defaultValue: 1,
        values: ["1", "2", "3"],
    },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
export { sequelize as database, AuthData, InitData, LeavedUsersData, AutoRoleData, UserActivityData, RaidEvent };