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
function uniqueArray(arr) {
    return Array.from(new Set(arr));
}
let LfgDatabase = class LfgDatabase extends Model {
    static ensureUniqueArrays(instance) {
        instance.joinedUsers = uniqueArray(instance.joinedUsers);
        instance.hotJoinedUsers = uniqueArray(instance.hotJoinedUsers);
    }
};
__decorate([
    PrimaryKey,
    AutoIncrement,
    AllowNull(false),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], LfgDatabase.prototype, "id", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], LfgDatabase.prototype, "creatorId", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.STRING(15)),
    __metadata("design:type", Object)
], LfgDatabase.prototype, "activityHash", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.STRING(100)),
    __metadata("design:type", Object)
], LfgDatabase.prototype, "activityName", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(30)),
    __metadata("design:type", Object)
], LfgDatabase.prototype, "channelId", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(30)),
    __metadata("design:type", Object)
], LfgDatabase.prototype, "messageId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], LfgDatabase.prototype, "time", void 0);
__decorate([
    Default(3),
    AllowNull(false),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], LfgDatabase.prototype, "userLimit", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], LfgDatabase.prototype, "joinedUsers", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], LfgDatabase.prototype, "hotJoinedUsers", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.STRING(30)),
    __metadata("design:type", Object)
], LfgDatabase.prototype, "requiredDLC", void 0);
__decorate([
    BeforeUpdate,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LfgDatabase]),
    __metadata("design:returntype", void 0)
], LfgDatabase, "ensureUniqueArrays", null);
LfgDatabase = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
        freezeTableName: true,
        tableName: "LfgDatabase",
    })
], LfgDatabase);
export { LfgDatabase };
//# sourceMappingURL=lfgDatabase.js.map