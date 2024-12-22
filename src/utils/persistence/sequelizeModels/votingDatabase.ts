import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";

interface VotingDatabaseAttributes {
	uniqueId: string;
	multiVote: boolean;
	votes: Vote[];
	messageId: string;
	creatorId: string;
	channelId: string;
}

interface Vote {
	option: number;
	discordIds: string[];
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
	freezeTableName: true,
	tableName: "VotingDatabase",
})
export class VotingDatabase extends Model<VotingDatabaseAttributes> {
	@PrimaryKey
	@AllowNull(false)
	@Column(DataType.STRING(8))
	declare uniqueId: string;

	@AllowNull(false)
	@Column(DataType.BOOLEAN)
	declare multiVote: boolean;

	@Default([])
	@Column(DataType.ARRAY(DataType.JSON))
	declare votes: Vote[];

	@Unique
	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare messageId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare creatorId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare channelId: string;
}
