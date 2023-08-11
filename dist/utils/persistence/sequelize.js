import { DataTypes, Model, Sequelize } from "sequelize";
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
    bungieId: { type: DataTypes.STRING(30), unique: true },
    platform: { type: DataTypes.SMALLINT },
    clan: { type: DataTypes.BOOLEAN, values: ["true", "false"], defaultValue: false },
    displayName: { type: DataTypes.STRING(30) },
    accessToken: { type: DataTypes.TEXT, allowNull: true },
    refreshToken: { type: DataTypes.TEXT, allowNull: true },
    membershipId: {
        type: DataTypes.STRING(30),
        unique: true,
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
    bungieId: { type: DataTypes.STRING(30), unique: true },
    displayName: { type: DataTypes.STRING(30), allowNull: false },
    platform: { type: DataTypes.SMALLINT, allowNull: false },
    accessToken: { type: DataTypes.TEXT },
    refreshToken: { type: DataTypes.TEXT },
    membershipId: {
        type: DataTypes.STRING(30),
        unique: true,
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
    discordId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true,
        references: {
            model: AuthData,
            key: "discordId",
        },
    },
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
    raid: { type: DataTypes.ENUM("kf", "votd", "vog", "dsc", "gos", "lw", "ron") },
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
class RaidUserNotification extends Model {
}
RaidUserNotification.init({
    discordId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true,
        references: {
            model: AuthData,
            key: "discordId",
        },
    },
    notificationTimes: {
        type: DataTypes.ARRAY(DataTypes.SMALLINT),
        allowNull: false,
        defaultValue: [15],
    },
}, {
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    freezeTableName: true,
    name: { singular: "RaidUserNotification", plural: "RaidUserNotification" },
});
RaidUserNotification.belongsTo(AuthData, {
    foreignKey: {
        name: "discordId",
        allowNull: false,
    },
    targetKey: "discordId",
    onDelete: "CASCADE",
});
AuthData.hasOne(RaidUserNotification, {
    foreignKey: {
        name: "discordId",
        allowNull: false,
    },
});
class VoiceChannels extends Model {
}
VoiceChannels.init({
    channelId: {
        type: DataTypes.STRING(30),
        allowNull: false,
        primaryKey: true,
    },
}, {
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    freezeTableName: true,
    name: { singular: "VoiceChannels", plural: "VoiceChannels" },
});
class ProcessedLink extends Model {
}
ProcessedLink.init({
    route: {
        type: DataTypes.STRING(30),
        primaryKey: true,
        allowNull: false,
    },
    link: {
        type: DataTypes.STRING(120),
        allowNull: false,
    },
}, {
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    freezeTableName: true,
    name: { singular: "ProcessedLink", plural: "ProcessedLink" },
});
class VotingDatabase extends Model {
}
VotingDatabase.init({
    uniqueId: {
        type: DataTypes.STRING(8),
        primaryKey: true,
        allowNull: false,
    },
    multiVote: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    votes: {
        type: DataTypes.ARRAY(DataTypes.JSON),
        defaultValue: [],
    },
}, {
    sequelize,
    timestamps: false,
    createdAt: false,
    updatedAt: false,
    freezeTableName: true,
    tableName: "VotingDatabase",
});
export { AuthData, AutoRoleData, InitData, LeavedUsersData, ProcessedLink, RaidEvent, RaidUserNotification, UserActivityData, VoiceChannels, VotingDatabase, sequelize as database, };
//# sourceMappingURL=sequelize.js.map