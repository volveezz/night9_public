import { AllowNull, Column, DataType, Model, PrimaryKey, Table } from "sequelize-typescript";

interface VoiceChannelsAttributes {
	channelId: string;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
	freezeTableName: true,
	name: { singular: "VoiceChannels", plural: "VoiceChannels" },
})
export class VoiceChannels extends Model<VoiceChannelsAttributes> {
	@PrimaryKey
	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare channelId: string;
}
