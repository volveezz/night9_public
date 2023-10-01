var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, DataType, Default, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import { AuthData } from "./authData.js";
let UserActivityData = class UserActivityData extends Model {
};
__decorate([
    PrimaryKey,
    ForeignKey(() => AuthData),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], UserActivityData.prototype, "discordId", void 0);
__decorate([
    Default(0),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], UserActivityData.prototype, "messages", void 0);
__decorate([
    Default(0),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], UserActivityData.prototype, "voice", void 0);
__decorate([
    Default(0),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], UserActivityData.prototype, "raids", void 0);
__decorate([
    Default(0),
    Column(DataType.INTEGER),
    __metadata("design:type", Number)
], UserActivityData.prototype, "dungeons", void 0);
__decorate([
    UpdatedAt,
    __metadata("design:type", Date)
], UserActivityData.prototype, "updatedAt", void 0);
UserActivityData = __decorate([
    Table({
        timestamps: true,
        createdAt: false,
        updatedAt: true,
        freezeTableName: true,
        name: { plural: "UserActivityData", singular: "UserActivityData" },
    })
], UserActivityData);
export { UserActivityData };
//# sourceMappingURL=userActivityData.js.map