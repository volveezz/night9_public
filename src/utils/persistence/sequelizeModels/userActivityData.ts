import { Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { AuthData } from "./authData.js";

interface UserActivityDataAttributes {
	discordId: string;
	messages: number;
	voice: number;
	raids: number;
	dungeons: number;
	updatedAt?: Date;
}
interface UserActivityDataCreationAttributes {
	discordId: string;
	messages?: number;
	voice?: number;
	raids?: number;
	dungeons?: number;
}

@Table({
	timestamps: true,
	createdAt: false,
	updatedAt: true,
	freezeTableName: true,
	name: { plural: "UserActivityData", singular: "UserActivityData" },
})
export class UserActivityData extends Model<UserActivityDataAttributes, UserActivityDataCreationAttributes> {
	@PrimaryKey
	@ForeignKey(() => AuthData)
	@Column(DataType.STRING(30))
	declare discordId: string;

	@Default(0)
	@Column(DataType.INTEGER)
	declare messages: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare voice: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare raids: number;

	@Default(0)
	@Column(DataType.INTEGER)
	declare dungeons: number;

	@UpdatedAt
	declare updatedAt?: Date;
}
