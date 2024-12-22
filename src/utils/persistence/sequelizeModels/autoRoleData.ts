import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import NightRoleCategory from "../../../configs/RoleCategory.js";

interface AutoRoleDataAttributes {
	triumphRequirement: string;
	roleId: string;
	category: NightRoleCategory;
	gildedTriumphRequirement?: number;
	gildedRoles?: string[];
	available: number;
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
})
export class AutoRoleData extends Model<AutoRoleDataAttributes> {
	@PrimaryKey
	@Column(DataType.BIGINT)
	declare triumphRequirement: string;

	@Column(DataType.STRING(30))
	declare roleId: string;

	@Column({
		type: DataType.SMALLINT,
		validate: {
			isIn: [[1, 2, 4, 8, 16]],
		},
	})
	declare category: NightRoleCategory;

	@AllowNull(true)
	@Column(DataType.BIGINT)
	declare gildedTriumphRequirement: number;

	@AllowNull(true)
	@Column(DataType.ARRAY(DataType.STRING(30)))
	declare gildedRoles: string[];

	@Default(-1)
	@Column(DataType.SMALLINT)
	declare available: number;
}
