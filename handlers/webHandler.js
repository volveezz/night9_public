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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("./sequelize");
const request_promise_native_1 = require("request-promise-native");
const discord_js_1 = require("discord.js");
function webHandler(code, state, client, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const json = yield sequelize_1.init_data.findOne({ where: { state: state } });
        if (json === null) {
            return console.log("No data found");
        }
        if (json.discord_id !== null && json.discord_id !== undefined) {
            console.log(code);
            (0, request_promise_native_1.post)("https://www.bungie.net/Platform/App/OAuth/Token/", {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${process.env.AUTH}`,
                },
                form: {
                    grant_type: "authorization_code",
                    code: code,
                },
                json: true,
            }, function (err, _response, body) {
                if (err)
                    return console.error(`${body.error_description} for: ${state}\nCode:${code}`);
                if (body.error === "invalid_request") {
                    return console.log(`There is problem with fetching authData from state: ${state}`, body);
                }
                else if (body.error === "invalid_grant") {
                    res.send(`<script>location.replace('error.html')</script>`);
                    return console.log(`${body.error_description} for: ${state}\nCode:${code}`);
                }
                else {
                    (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/`, {
                        headers: {
                            "Content-Type": "application/json",
                            "X-API-Key": process.env.XAPI,
                        },
                        auth: {
                            bearer: body.access_token,
                        },
                        json: true,
                    }, function (err, _response, subBody) {
                        var e_1, _a;
                        return __awaiter(this, void 0, void 0, function* () {
                            const { Response } = subBody;
                            var bungie_id, platform, displayname;
                            try {
                                for (var _b = __asyncValues(Response.destinyMemberships), _c; _c = yield _b.next(), !_c.done;) {
                                    const membership = _c.value;
                                    if (membership.crossSaveOverride === membership.membershipType) {
                                        platform = membership.membershipType;
                                        bungie_id = membership.membershipId;
                                        displayname = membership.bungieGlobalDisplayName || membership.displayName;
                                        break;
                                    }
                                    else if (Response.destinyMemberships.length === 0) {
                                        displayname = membership.bungieGlobalDisplayName || membership.displayName;
                                        platform = membership.membershipType;
                                        bungie_id = membership.membershipId;
                                    }
                                }
                            }
                            catch (e_1_1) { e_1 = { error: e_1_1 }; }
                            finally {
                                try {
                                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                                }
                                finally { if (e_1) throw e_1.error; }
                            }
                            sequelize_1.auth_data.create({
                                discord_id: json.discord_id,
                                bungie_id: bungie_id,
                                platform: platform,
                                clan: 0,
                                displayname: displayname,
                                access_token: body.access_token,
                                refresh_token: body.refresh_token,
                                membership_id: body.membership_id,
                            });
                            sequelize_1.init_data.destroy({
                                where: { discord_id: json.discord_id },
                            });
                            res.send(`<script>location.replace('index.html')</script>`).end();
                            (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/GroupV2/User/${platform}/${bungie_id}/0/1/`, {
                                headers: {
                                    "Content-Type": "application/json",
                                    "X-API-Key": process.env.XAPI,
                                },
                                auth: { bearer: body.access_token },
                                json: true,
                            }, function (err, _response, subClanBody) {
                                var _a;
                                const { Response: clanResponse } = subClanBody;
                                const user = client.users.cache.get(json.discord_id);
                                const embed = new discord_js_1.EmbedBuilder()
                                    .setTitle("Вы зарегистрировались")
                                    .setColor("Green")
                                    .setTimestamp()
                                    .addFields([
                                    {
                                        name: "Bungie аккаунт",
                                        value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
                                        inline: true,
                                    },
                                    {
                                        name: "BungieName",
                                        value: displayname,
                                        inline: true,
                                    },
                                ]);
                                if (((_a = clanResponse.results[0]) === null || _a === void 0 ? void 0 : _a.group.groupId) !== "4123712") {
                                    const component = new discord_js_1.ButtonBuilder().setCustomId("webhandlerEvent_clan_request").setLabel("Отправить приглашение").setStyle(3);
                                    embed.setDescription(`Нажмите кнопку для получения приглашения в клан`);
                                    user === null || user === void 0 ? void 0 : user.send({
                                        embeds: [embed],
                                        components: [
                                            {
                                                type: discord_js_1.ComponentType.ActionRow,
                                                components: [component],
                                            },
                                        ],
                                    });
                                }
                                else {
                                    user === null || user === void 0 ? void 0 : user.send({
                                        embeds: [embed],
                                    });
                                }
                            });
                        });
                    });
                }
            });
        }
    });
}
exports.default = webHandler;
