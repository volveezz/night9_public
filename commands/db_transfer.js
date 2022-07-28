"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    name: "db_transfer",
    defaultMemberPermissions: ["Administrator"],
    callback: (_client, _interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        const mysql = mysql2_1.default.createConnection({
            database: process.env.MYSQL_DB,
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PW,
            host: process.env.MYSQL_HOST,
        });
        mysql.connect();
        mysql.query(`SELECT discord_id,bungie_id,platform,displayname,access_token,refresh_token,membership_id FROM discord WHERE refresh_token IS NOT NULL`, function (_err, result) {
            return __awaiter(this, void 0, void 0, function* () {
                const arr = [];
                result.forEach((row) => {
                    arr.push({
                        discord_id: row.discord_id,
                        bungie_id: row.bungie_id,
                        platform: row.platform,
                        displayname: row.displayname,
                        access_token: row.access_token,
                        refresh_token: row.refresh_token,
                        membership_id: row.membership_id,
                    });
                });
                const db = yield sequelize_1.auth_data.bulkCreate(arr);
                console.log(db.length);
            });
        });
        mysql.end();
    }),
};
