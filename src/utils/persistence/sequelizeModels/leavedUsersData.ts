import { AllowNull, Column, DataType, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";

interface LeavedUsersDataAttributes {
	discordId: string;
	bungieId: string;
	displayName: string;
	platform: number;
	accessToken: string;
	refreshToken: string;
	membershipId: string | null;
	timezone?: number;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
})
export class LeavedUsersData extends Model<LeavedUsersDataAttributes> {
	@PrimaryKey
	@Column(DataType.STRING(30))
	declare discordId: string;

	@Unique
	@Column(DataType.STRING(30))
	declare bungieId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare displayName: string;

	@AllowNull(false)
	@Column(DataType.SMALLINT)
	declare platform: number;

	@Column(DataType.TEXT)
	declare accessToken: string;

	@Column(DataType.TEXT)
	declare refreshToken: string;

	@Unique
	@Column(DataType.STRING(30))
	declare membershipId: string;

	@AllowNull(true)
	@Column(DataType.SMALLINT)
	declare timezone?: number;
}
