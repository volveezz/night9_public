import { AllowNull, AutoIncrement, BeforeUpdate, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { RaidDifficulty, RaidNames } from "../../../configs/Raids.js";

function uniqueArray(arr: string[]): string[] {
	return Array.from(new Set(arr));
}
interface RaidEventAttributes {
	id: number;
	channelId: string;
	inChannelMessageId: string;
	messageId: string;
	creator: string;
	joined: string[];
	hotJoined: string[];
	alt: string[];
	time: number;
	raid: RaidNames;
	requiredClears?: number;
	difficulty?: RaidDifficulty;
}
interface RaidEventCreationAttributes {
	channelId: string;
	inChannelMessageId: string;
	messageId: string;
	creator: string;
	joined?: string[];
	hotJoined?: string[];
	alt?: string[];
	time: number;
	raid: RaidNames;
	requiredClears?: number;
	difficulty?: RaidDifficulty;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
})
export class RaidEvent extends Model<RaidEventAttributes, RaidEventCreationAttributes> {
	@PrimaryKey
	@AutoIncrement
	@Column(DataType.SMALLINT)
	declare id: number;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare channelId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare inChannelMessageId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare messageId: string;

	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare creator: string;

	@Default([])
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare joined: string[];

	@Default([])
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare hotJoined: string[];

	@Default([])
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare alt: string[];

	@AllowNull(false)
	@Column(DataType.INTEGER)
	declare time: number;

	@Column(DataType.ENUM("se", "ce", "kf", "votd", "vog", "dsc", "gos", "lw", "ron"))
	declare raid: RaidNames;

	@Default(0)
	@Column(DataType.SMALLINT)
	declare requiredClears: number;

	@Default(1)
	@Column({
		type: DataType.SMALLINT,
		validate: {
			isIn: [[1, 2, 3]],
		},
	})
	declare difficulty: RaidDifficulty;

	@BeforeUpdate
	static ensureUniqueArrays(instance: RaidEvent) {
		instance.joined = uniqueArray(instance.joined);
		instance.hotJoined = uniqueArray(instance.hotJoined);
		instance.alt = uniqueArray(instance.alt);
	}
}
