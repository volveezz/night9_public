var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AllowNull, Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table } from "sequelize-typescript";
import { AuthData } from "./authData.js";
let RaidUserNotifications = class RaidUserNotifications extends Model {
};
__decorate([
    PrimaryKey,
    ForeignKey(() => AuthData),
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], RaidUserNotifications.prototype, "discordId", void 0);
__decorate([
    AllowNull(false),
    Default([15, 60]),
    Column(DataType.ARRAY(DataType.SMALLINT)),
    __metadata("design:type", Array)
], RaidUserNotifications.prototype, "notificationTimes", void 0);
RaidUserNotifications = __decorate([
    Table({
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
], RaidUserNotifications);
export { RaidUserNotifications };
//# sourceMappingURL=raidUserNotifications.js.map