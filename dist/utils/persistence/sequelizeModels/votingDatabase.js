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
let VotingDatabase = class VotingDatabase extends Model {
};
__decorate([
    PrimaryKey,
    AllowNull(false),
    Column(DataType.STRING(8)),
    __metadata("design:type", String)
], VotingDatabase.prototype, "uniqueId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.BOOLEAN),
    __metadata("design:type", Boolean)
], VotingDatabase.prototype, "multiVote", void 0);
__decorate([
    Default([]),
    Column(DataType.ARRAY(DataType.JSON)),
    __metadata("design:type", Array)
], VotingDatabase.prototype, "votes", void 0);
__decorate([
    Unique,
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], VotingDatabase.prototype, "messageId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], VotingDatabase.prototype, "creatorId", void 0);
__decorate([
    AllowNull(false),
    Column(DataType.STRING(30)),
    __metadata("design:type", String)
], VotingDatabase.prototype, "channelId", void 0);
VotingDatabase = __decorate([
    Table({
        timestamps: false,
        createdAt: false,
        updatedAt: false,
        freezeTableName: true,
        tableName: "VotingDatabase",
    })
], VotingDatabase);
export { VotingDatabase };
//# sourceMappingURL=votingDatabase.js.map