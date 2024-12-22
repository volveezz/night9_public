import { AllowNull, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { AuthData } from "./authData.js";

interface RaidUserNotificationsAttributes {
	discordId: string;
	notificationTimes?: number[];
}

@Table({
	timestamps: false,
	createdAt: false,
	updatedAt: false,
	freezeTableName: true,
	name: { singular: "RaidUserNotifications", plural: "RaidUserNotifications" },
	indexes: [
		{
			name: "idx_raid_user_notifications_discord_id",
			fields: ["discordId"],
		},
	],
})
/**
 * Class representing User Notifications for Raids.
 * @extends Model
 */
export class RaidUserNotifications extends Model<RaidUserNotificationsAttributes> {
	/**
	 * The Discord ID of the user.
	 * Acts as a foreign key referencing AuthData.
	 * @type {string}
	 */
	@PrimaryKey
	@ForeignKey(() => AuthData)
	@AllowNull(false)
	@Column(DataType.STRING(30))
	declare discordId: string;

	/**
	 * The times at which notifications are to be sent.
	 * Defaults to [15, 60].
	 * @type {number[]}
	 */
	@AllowNull(false)
	@Default([15, 60])
	@Column(DataType.ARRAY(DataType.SMALLINT))
	declare notificationTimes: number[];
}
