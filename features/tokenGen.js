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
const request_promise_native_1 = require("request-promise-native");
const sequelize_1 = require("../handlers/sequelize");
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
exports.default = () => {
    function generator(table) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = table === 1
                ? yield sequelize_1.auth_data.findAll({ attributes: ["bungie_id", "refresh_token"] })
                : yield sequelize_1.lost_data.findAll({ attributes: ["bungie_id", "refresh_token"] });
            const t = yield sequelize_1.db.transaction();
            for (const row of data) {
                const request = yield (0, request_promise_native_1.post)("https://www.bungie.net/Platform/App/OAuth/Token/", {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        Authorization: `Basic ${process.env.AUTH}`,
                    },
                    form: {
                        grant_type: "refresh_token",
                        refresh_token: row.refresh_token,
                    },
                    json: true,
                }).catch((err) => {
                    console.error(`[tokenGen error] ${row.bungie_id} data was lost`, err.toString());
                    return false;
                });
                if (request === null || request === void 0 ? void 0 : request.access_token) {
                    if (table === 1) {
                        sequelize_1.auth_data
                            .update({
                            access_token: request.access_token,
                            refresh_token: request.refresh_token,
                        }, {
                            where: {
                                bungie_id: row.bungie_id,
                            },
                            transaction: t,
                        })
                            .then((query) => {
                            if (!query || query[0] !== 1)
                                console.error(`[tokenGen error] ${row.bungie_id} data`, request.toString(), query);
                        });
                    }
                    else {
                        sequelize_1.lost_data
                            .update({
                            access_token: request.access_token,
                            refresh_token: request.refresh_token,
                        }, {
                            where: {
                                bungie_id: row.bungie_id,
                            },
                            transaction: t,
                        })
                            .then((query) => {
                            if (!query || query[0] !== 1)
                                console.error(`[tokenGen error] LostData ${row.bungie_id} data`, request.toString(), query);
                        });
                    }
                }
                yield timer(100);
            }
            try {
                yield t.commit();
            }
            catch (error) {
                console.log(error || "[tokenGen error] Error occured in transaction");
            }
        });
    }
    generator(1);
    generator(2);
    setInterval(() => generator(1), 1000 * 60 * 50);
};
