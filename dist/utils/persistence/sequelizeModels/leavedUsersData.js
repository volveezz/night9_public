var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AllowNull, Column, DataType, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
let LeavedUsersData = class LeavedUsersData extends Model {
};
__decorate([
    PrimaryKey,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "discordId", void 0);
__decorate([
    Unique,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "bungieId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "displayName", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], LeavedUsersData.prototype, "platform", void 0);
__decorate([
    Column(DataType.TEXT),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "accessToken", void 0);
__decorate([
    Column(DataType.TEXT),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "refreshToken", void 0);
__decorate([
    Unique,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], LeavedUsersData.prototype, "membershipId", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], LeavedUsersData.prototype, "timezone", void 0);
LeavedUsersData = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
    })
], LeavedUsersData);
export { LeavedUsersData };
//# sourceMappingURL=leavedUsersData.js.map