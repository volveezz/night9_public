import { Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";

interface InitDataAttributes {
	discordId: string;
	state?: string;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
})
export class InitData extends Model<InitDataAttributes> {
	@PrimaryKey
	@Column(DataType.STRING(30))
	declare discordId: string;

	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	declare state: string;
}
