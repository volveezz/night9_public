import { Sequelize, Model, DataTypes } from "sequelize";
const sequelize = new Sequelize(String(process.env.DATABASE_URL), {
    dialect: "postgres",
    ssl: true,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: {
        max: 20,
    },
    logging: false,
});
class auth_data extends Model {
}
auth_data.init({
    discord_id: { type: DataTypes.BIGINT, primaryKey: true, unique: true },
    bungie_id: { type: DataTypes.BIGINT, primaryKey: true, unique: true },
    platform: { type: DataTypes.SMALLINT },
    clan: { type: DataTypes.BOOLEAN, values: ["true", "false"], defaultValue: false },
    displayname: { type: DataTypes.TEXT },
    access_token: { type: DataTypes.TEXT, primaryKey: true },
    refresh_token: { type: DataTypes.TEXT, primaryKey: true },
    membership_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
    },
    tz: { type: DataTypes.SMALLINT, allowNull: true },
    roles_cat: { type: DataTypes.BOOLEAN },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false, modelName: "auth_data", freezeTableName: true, tableName: "auth_data" });
class init_data extends Model {
}
init_data.init({
    discord_id: { type: DataTypes.BIGINT, primaryKey: true, unique: true },
    state: { type: DataTypes.TEXT },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class lost_data extends Model {
}
lost_data.init({
    discord_id: { type: DataTypes.BIGINT, primaryKey: true, unique: true },
    bungie_id: { type: DataTypes.BIGINT, primaryKey: true, unique: true },
    displayname: { type: DataTypes.TEXT, primaryKey: true, unique: true },
    platform: { type: DataTypes.SMALLINT },
    access_token: { type: DataTypes.TEXT, primaryKey: true, unique: true },
    refresh_token: { type: DataTypes.TEXT, primaryKey: true, unique: true },
    membership_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        unique: true,
    },
    tz: { type: DataTypes.SMALLINT, defaultValue: 3, allowNull: true },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class role_data extends Model {
}
role_data.init({
    hash: { type: DataTypes.INTEGER, primaryKey: true, unique: true },
    role_id: { type: DataTypes.BIGINT },
    category: { type: DataTypes.SMALLINT, values: ["0", "1", "3", "4", "5"] },
    guilded_hash: { type: DataTypes.BIGINT },
    guilded_roles: { type: DataTypes.BIGINT },
    unique: { type: DataTypes.SMALLINT, defaultValue: -1 },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
class discord_activities extends Model {
}
discord_activities.init({
    authDatumDiscordId: { type: DataTypes.BIGINT, primaryKey: true, unique: true, references: { model: auth_data, key: "discord_id" } },
    messages: { type: DataTypes.INTEGER, defaultValue: 0 },
    voice: { type: DataTypes.INTEGER, defaultValue: 0 },
    raids: { type: DataTypes.INTEGER, defaultValue: 0 },
    dungeons: { type: DataTypes.INTEGER, defaultValue: 0 },
    updatedAt: { type: DataTypes.INTEGER },
}, { sequelize, timestamps: true, createdAt: false, updatedAt: true, modelName: "discord_activities", freezeTableName: true, tableName: "discord_activities" });
class raids extends Model {
}
raids.init({
    id: {
        type: DataTypes.SMALLINT,
        primaryKey: true,
        unique: true,
        autoIncrement: true,
    },
    chnId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    inChnMsg: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    msgId: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        unique: true,
        allowNull: false,
    },
    creator: { type: DataTypes.BIGINT, allowNull: false },
    joined: { type: DataTypes.BIGINT, defaultValue: "{}" },
    hotJoined: {
        type: DataTypes.BIGINT,
        defaultValue: "{}",
    },
    alt: { type: DataTypes.BIGINT, defaultValue: "{}" },
    time: { type: DataTypes.INTEGER, allowNull: false },
    raid: { type: DataTypes.CHAR },
    reqClears: {
        type: DataTypes.SMALLINT,
        defaultValue: 0,
    },
    difficulty: {
        type: DataTypes.SMALLINT,
        defaultValue: 1,
        values: ["1", "2", "3"],
    },
}, { sequelize, timestamps: false, createdAt: false, updatedAt: false });
discord_activities.belongsTo(auth_data);
auth_data.hasOne(discord_activities, { foreignKey: { name: "authDatumDiscordId", field: "authDatumDiscordId" } });
export { sequelize as db, auth_data, init_data, lost_data, role_data, discord_activities, raids };
