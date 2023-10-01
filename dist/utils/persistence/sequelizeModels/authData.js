var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table, Unique } from "sequelize-typescript";
let AuthData = class AuthData extends Model {
};
__decorate([
    PrimaryKey,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], AuthData.prototype, "discordId", void 0);
__decorate([
    Unique,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], AuthData.prototype, "bungieId", void 0);
__decorate([
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], AuthData.prototype, "platform", void 0);
__decorate([
    Default(false),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], AuthData.prototype, "clan", void 0);
__decorate([
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], AuthData.prototype, "displayName", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.TEXT),
    __metadata("design:type", Object)
], AuthData.prototype, "accessToken", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.TEXT),
    __metadata("design:type", Object)
], AuthData.prototype, "refreshToken", void 0);
__decorate([
    Unique,
    AllowNull(true),
    Column(DataType.STRING(30)),
    __metadata("design:type", Object)
], AuthData.prototype, "membershipId", void 0);
__decorate([
    AllowNull(true),
    Default(null),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], AuthData.prototype, "timezone", void 0);
__decorate([
    Default(31),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], AuthData.prototype, "roleCategoriesBits", void 0);
AuthData = __decorate([
    Table({
        timestamps: false,
        freezeTableName: true,
        indexes: [
            {
                name: "idx_auth_data_discord_id",
                fields: ["discordId"],
            },
        ],
    })
], AuthData);
export { AuthData };
//# sourceMappingURL=authData.js.map