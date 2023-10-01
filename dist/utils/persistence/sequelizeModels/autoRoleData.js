var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AllowNull, Column, DataType, Default, Model, PrimaryKey, Table } from "sequelize-typescript";
let AutoRoleData = class AutoRoleData extends Model {
};
__decorate([
    PrimaryKey,
    Column(DataType.BIGINT),
    __metadata("design:type", String)
], AutoRoleData.prototype, "triumphRequirement", void 0);
__decorate([
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], AutoRoleData.prototype, "roleId", void 0);
__decorate([
    Column({
        type: DataType.SMALLINT,
        validate: {
            isIn: [[1, 2, 4, 8, 16]],
        },
    }),
    __metadata("design:type", Number)
], AutoRoleData.prototype, "category", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.BIGINT),
    __metadata("design:type", Number)
], AutoRoleData.prototype, "gildedTriumphRequirement", void 0);
__decorate([
    AllowNull(true),
    Column(DataType.ARRAY(DataType.STRING(30))),
    __metadata("design:type", Array)
], AutoRoleData.prototype, "gildedRoles", void 0);
__decorate([
    Default(-1),
    Column(DataType.SMALLINT),
    __metadata("design:type", Number)
], AutoRoleData.prototype, "available", void 0);
AutoRoleData = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
    })
], AutoRoleData);
export { AutoRoleData };
//# sourceMappingURL=autoRoleData.js.map