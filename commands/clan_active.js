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
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const request_promise_native_1 = require("request-promise-native");
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    name: "clan",
    description: "Управление и статистика клана",
    defaultMemberPermissions: ["Administrator"],
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        const col = new discord_js_1.Collection();
        yield sequelize_1.auth_data
            .findAll({
            where: { clan: true },
            attributes: ["discord_id", "bungie_id", "membership_id"],
        })
            .then((db) => {
            db.forEach((row) => {
                col.set(row.bungie_id, {
                    discord_id: row.discord_id,
                    membership_Id: row.membership_id,
                });
            });
        });
        const request = yield (0, request_promise_native_1.get)("https://www.bungie.net/platform/GroupV2/4123712/Members/?memberType=None", { headers: { "X-API-KEY": process.env.XAPI }, json: true }).catch((e) => {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor("Red")
                .setTitle(`Error: ${e.ErrorCode}`)
                .setDescription(e.toString());
            interaction.editReply({ embeds: [embed] });
            return;
        });
        const memberColl = new discord_js_1.Collection();
        yield request.Response.results.forEach((member) => {
            var _a;
            memberColl.set(member.destinyUserInfo.membershipId, {
                membership_Id: (_a = member.bungieNetUserInfo) === null || _a === void 0 ? void 0 : _a.membershipId,
                isOnline: member.isOnline,
                lastOnline: member.lastOnlineStatusChange,
            });
        });
        console.log(col);
        col.merge(memberColl, (x) => ({ keep: true, value: x }), (y) => ({ keep: true, value: y }), (x, _y) => ({ keep: true, value: x }));
        console.log(col);
    }),
};
