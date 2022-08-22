"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.raids = exports.discord_activities = exports.role_data = exports.lost_data = exports.init_data = exports.auth_data = exports.db = void 0;
const sequelize_1 = require("sequelize");
const sequelize = new sequelize_1.Sequelize(String(process.env.DATABASE_URL), {
    dialect: "postgres",
    ssl: true,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: {
        max: 20,
    },
    logging: false,
});
exports.db = sequelize;
class auth_data extends sequelize_1.Model {
}
exports.auth_data = auth_data;
auth_data.init({
    discord_id: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true },
    bungie_id: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true },
    platform: { type: sequelize_1.DataTypes.SMALLINT },
    clan: { type: sequelize_1.DataTypes.BOOLEAN, values: ["true", "false"], defaultValue: false },
    displayname: { type: sequelize_1.DataTypes.TEXT },
    access_token: { type: sequelize_1.DataTypes.TEXT, primaryKey: true },
    refresh_token: { type: sequelize_1.DataTypes.TEXT, primaryKey: true },
    membership_id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
    },
    tz: { type: sequelize_1.DataTypes.SMALLINT, allowNull: true },
    roles_cat: { type: sequelize_1.DataTypes.BOOLEAN },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false, modelName: "auth_data", freezeTableName: true, tableName: "auth_data" });
class init_data extends sequelize_1.Model {
}
exports.init_data = init_data;
init_data.init({
    discord_id: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true },
    state: { type: sequelize_1.DataTypes.TEXT },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class lost_data extends sequelize_1.Model {
}
exports.lost_data = lost_data;
lost_data.init({
    discord_id: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true },
    bungie_id: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true },
    displayname: { type: sequelize_1.DataTypes.TEXT, primaryKey: true, unique: true },
    platform: { type: sequelize_1.DataTypes.SMALLINT },
    access_token: { type: sequelize_1.DataTypes.TEXT, primaryKey: true, unique: true },
    refresh_token: { type: sequelize_1.DataTypes.TEXT, primaryKey: true, unique: true },
    membership_id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
    },
    tz: { type: sequelize_1.DataTypes.SMALLINT, defaultValue: 3, allowNull: true },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class role_data extends sequelize_1.Model {
}
exports.role_data = role_data;
role_data.init({
    hash: { type: sequelize_1.DataTypes.INTEGER, primaryKey: true, unique: true },
    role_id: { type: sequelize_1.DataTypes.BIGINT },
    category: { type: sequelize_1.DataTypes.SMALLINT, values: ["0", "1", "3", "4", "5"] },
    guilded_hash: { type: sequelize_1.DataTypes.BIGINT },
    guilded_roles: { type: sequelize_1.DataTypes.BIGINT },
    unique: { type: sequelize_1.DataTypes.SMALLINT, defaultValue: -1 },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class discord_activities extends sequelize_1.Model {
}
exports.discord_activities = discord_activities;
discord_activities.init({
    authDatumDiscordId: { type: sequelize_1.DataTypes.BIGINT, primaryKey: true, unique: true, references: { model: auth_data, key: "discord_id" } },
    messages: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    voice: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    raids: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    dungeons: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    updatedAt: { type: sequelize_1.DataTypes.INTEGER },
}, { sequelize, timestamps: true, createdAt: false, updatedAt: true, modelName: "discord_activities", freezeTableName: true, tableName: "discord_activities" });
class raids extends sequelize_1.Model {
}
exports.raids = raids;
raids.init({
    id: {
        type: sequelize_1.DataTypes.SMALLINT,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
    },
    chnId: {
        type: sequelize_1.DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    inChnMsg: {
        type: sequelize_1.DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    msgId: {
        type: sequelize_1.DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    creator: { type: sequelize_1.DataTypes.BIGINT, allowNull: false },
    joined: { type: sequelize_1.DataTypes.BIGINT, defaultValue: "{}" },
    hotJoined: {
        type: sequelize_1.DataTypes.BIGINT,
        defaultValue: "{}",
    },
    alt: { type: sequelize_1.DataTypes.BIGINT, defaultValue: "{}" },
    time: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    raid: { type: sequelize_1.DataTypes.CHAR },
    reqClears: {
        type: sequelize_1.DataTypes.SMALLINT,
        defaultValue: 0,
    },
    difficulty: {
        type: sequelize_1.DataTypes.SMALLINT,
        defaultValue: 1,
        values: ["1", "2", "3"],
    },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
discord_activities.belongsTo(auth_data);
auth_data.hasOne(discord_activities, { foreignKey: { name: "authDatumDiscordId", field: "authDatumDiscordId" } });
