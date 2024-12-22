import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
import { RaidUserNotifications } from "./raidUserNotifications.js";
import { UserActivityData } from "./userActivityData.js";

interface AuthDataAttributes {
	discordId: string | null;
	bungieId: string | null;
	platform: number;
	clan: boolean;
	displayName: string;
	accessToken?: string | null;
	refreshToken?: string | null;
	membershipId?: string | null;
	timezone?: number;
	roleCategoriesBits: number;
}

interface AuthDataCreationAttributes {
	discordId: string;
	bungieId: string;
	platform: number;
	clan?: boolean;
	displayName: string;
	accessToken?: string;
	refreshToken?: string;
	membershipId?: string;
	timezone?: number;
	roleCategoriesBits?: number;
}

@Table({
	timestamps: false,
	freezeTableName: true,
	indexes: [
		{
			name: "idx_auth_data_discord_id",
			fields: ["discordId"],
		},
	],
})
export class AuthData extends Model<AuthDataAttributes, AuthDataCreationAttributes> {
	@PrimaryKey
	@Column(DataType.STRING(30))
	declare discordId: string;

	@Unique
	@Column(DataType.STRING(30))
	declare bungieId: string;

	@Column(DataType.SMALLINT)
	declare platform: number;

	@Default(false)
	@Column(DataType.BOOLEAN)
	declare clan: boolean;

	@Column(DataType.STRING(30))
	declare displayName: string;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare accessToken: string | null;

	@AllowNull(true)
	@Column(DataType.TEXT)
	declare refreshToken: string | null;

	@Unique
	@AllowNull(true)
	@Column(DataType.STRING(30))
	declare membershipId: string | null;

	@AllowNull(true)
	@Default(null)
	@Column(DataType.SMALLINT)
	declare timezone: number;

	@Default(31)
	@Column(DataType.SMALLINT)
	declare roleCategoriesBits: number;

	declare UserActivityData: UserActivityData;

	declare RaidUserNotifications: RaidUserNotifications;
}
