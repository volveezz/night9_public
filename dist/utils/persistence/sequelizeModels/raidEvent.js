var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AllowNull, AutoIncrement, BeforeUpdate, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
import { RaidNames } from "../../../configs/Raids.js";
function uniqueArray(arr) {
    return Array.from(new Set(arr));
}
let RaidEvent = class RaidEvent extends Model {
    static ensureUniqueArrays(instance) {
        instance.joined = uniqueArray(instance.joined);
        instance.hotJoined = uniqueArray(instance.hotJoined);
        instance.alt = uniqueArray(instance.alt);
    }
};
__decorate([
    PrimaryKey,
    AutoIncrement,
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], RaidEvent.prototype, "id", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], RaidEvent.prototype, "channelId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], RaidEvent.prototype, "inChannelMessageId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], RaidEvent.prototype, "messageId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], RaidEvent.prototype, "creator", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], RaidEvent.prototype, "joined", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], RaidEvent.prototype, "hotJoined", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], RaidEvent.prototype, "alt", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], RaidEvent.prototype, "time", void 0);
__decorate([
    Column(DataType.ENUM("se", "ce", "kf", "votd", "vog", "dsc", "gos", "lw", "ron")),
    __metadata("design:type", String)
], RaidEvent.prototype, "raid", void 0);
__decorate([
    Default(0),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], RaidEvent.prototype, "requiredClears", void 0);
__decorate([
    Default(1),
    Column({
        type: DataType.SMALLINT,
        validate: {
            isIn: [[1, 2, 3]],
        },
    }),
    __metadata("design:type", Number)
], RaidEvent.prototype, "difficulty", void 0);
__decorate([
    BeforeUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RaidEvent]),
    __metadata("design:returntype", void 0)
], RaidEvent, "ensureUniqueArrays", null);
RaidEvent = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
    })
], RaidEvent);
export { RaidEvent };
//# sourceMappingURL=raidEvent.js.map