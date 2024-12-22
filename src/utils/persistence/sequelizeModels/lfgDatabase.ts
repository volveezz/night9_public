import { AllowNull, AutoIncrement, BeforeUpdate, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

function uniqueArray(arr: string[]): string[] {
	return Array.from(new Set(arr));
}

interface LfgDatabaseAttributes {
	id: number;
	creatorId: string;
	activityHash?: string | null;
	activityName?: string | null;
	channelId?: string | null;
	messageId?: string | null;
	time: number;
	userLimit: number;
	joinedUsers: string[];
	hotJoinedUsers: string[];
	requiredDLC?: string | null;
}

interface LfgDatabaseCreationAttributes {
	creatorId: string;
	activityHash?: string | null;
	activityName?: string | null;
	channelId?: string | null;
	messageId?: string | null;
	time: number;
	userLimit?: number;
	joinedUsers?: string[];
	hotJoinedUsers?: string[];
	requiredDLC?: string | null;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
	freezeTableName: true,
	tableName: "LfgDatabase",
})
export class LfgDatabase extends Model<LfgDatabaseAttributes, LfgDatabaseCreationAttributes> {
	@PrimaryKey
	@AutoIncrement
	@AllowNull(false)
	@Column(DataType.SMALLINT)
	declare id: number;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare creatorId: string;

	@AllowNull(true)
	@Default(null)
	@Column(DataType.STRING(15))
	declare activityHash: string | null;

	@AllowNull(true)
	@Default(null)
	@Column(DataType.STRING(100))
	declare activityName: string | null;

	@AllowNull(true)
	@Column(DataType.STRING(30))
	declare channelId: string | null;

	@AllowNull(true)
	@Column(DataType.STRING(30))
	declare messageId: string | null;

	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare time: number;

	@Default(3)
	@AllowNull(false)
	@Column(DataType.SMALLINT)
	declare userLimit: number;

	@Default([])
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare joinedUsers: string[];

	@Default([])
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare hotJoinedUsers: string[];

	@AllowNull(true)
	@Column(DataType.STRING(30))
	declare requiredDLC: string | null;

	@BeforeUpdate
	static ensureUniqueArrays(instance: LfgDatabase) {
		instance.joinedUsers = uniqueArray(instance.joinedUsers);
		instance.hotJoinedUsers = uniqueArray(instance.hotJoinedUsers);
	}
}
