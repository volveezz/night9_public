var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
let InitData = class InitData extends Model {
};
__decorate([
    PrimaryKey,
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], InitData.prototype, "discordId", void 0);
__decorate([
    Default(DataType.UUIDV4),
    Column(DataType.UUID),
    __metadata("design:type", String)
], InitData.prototype, "state", void 0);
InitData = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
    })
], InitData);
export { InitData };
//# sourceMappingURL=initData.js.map