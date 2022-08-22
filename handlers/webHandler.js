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
const channels_1 = require("../base/channels");
const ids_1 = require("../base/ids");
const roles_1 = require("../base/roles");
const logger_1 = require("./logger");
const __1 = require("..");
exports.default = (code, state, res) => __awaiter(void 0, void 0, void 0, function* () {
    const json = yield sequelize_1.init_data.findOne({ where: { state: state } });
    if (json === null) {
        return console.error("No data found", code, state);
    }
    if (json.discord_id !== null && json.discord_id !== undefined) {
        const body = yield (0, request_promise_native_1.post)({
            url: "https://www.bungie.net/Platform/App/OAuth/Token/",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${process.env.AUTH}`,
            },
            form: {
                grant_type: "authorization_code",
                code: code,
            },
            json: true,
        });
        if (body.error === "invalid_request") {
            return console.error(`There is problem with fetching authData from state: ${state}`, body);
        }
        else if (body.error === "invalid_grant") {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error(`${body.error_description} for: ${state}\nCode:${code}`);
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
                return __awaiter(this, void 0, void 0, function* () {
                    const { Response } = subBody;
                    function getData() {
                        var e_1, _a;
                        return __awaiter(this, void 0, void 0, function* () {
                            try {
                                for (var _b = __asyncValues(Response.destinyMemberships), _c; _c = yield _b.next(), !_c.done;) {
                                    const membership = _c.value;
                                    if (membership.crossSaveOverride === membership.membershipType) {
                                        const platform = membership.membershipType;
                                        const bungie_id = membership.membershipId;
                                        const displayname = membership.bungieGlobalDisplayName || membership.displayName;
                                        return [platform, bungie_id, displayname];
                                    }
                                    else if (Response.destinyMemberships.length === 0) {
                                        const displayname = membership.bungieGlobalDisplayName || membership.displayName;
                                        const platform = membership.membershipType;
                                        const bungie_id = membership.membershipId;
                                        return [platform, bungie_id, displayname];
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
                        });
                    }
                    const platform = (yield getData())[0];
                    const bungie_id = (yield getData())[1];
                    const displayname = (yield getData())[2];
                    const result = yield sequelize_1.auth_data.create({
                        discord_id: json.discord_id,
                        bungie_id: bungie_id,
                        platform: platform,
                        clan: false,
                        displayname: displayname,
                        access_token: body.access_token,
                        refresh_token: body.refresh_token,
                        membership_id: body.membership_id,
                        tz: null,
                    });
                    yield sequelize_1.init_data.destroy({
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
                        const member = __1.BotClient.guilds.cache.get(ids_1.guildId).members.cache.get(json.discord_id);
                        if (!member) {
                            console.error(`Member error during webHandling of`, json);
                            res.send(`<script>location.replace('error.html')</script>`);
                            return;
                        }
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
                        const loggedEmbed = new discord_js_1.EmbedBuilder()
                            .setColor("Green")
                            .setAuthor({ name: `${member === null || member === void 0 ? void 0 : member.displayName} зарегистрировался`, iconURL: member === null || member === void 0 ? void 0 : member.displayAvatarURL() })
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
                        ])
                            .setTimestamp();
                        (0, channels_1.chnFetcher)(ids_1.ids.botChnId).send({ embeds: [loggedEmbed] });
                        sequelize_1.discord_activities.findOrCreate({
                            where: { authDatumDiscordId: member.id },
                            defaults: {
                                authDatumDiscordId: member.id,
                            },
                        });
                        if (((_a = clanResponse.results[0]) === null || _a === void 0 ? void 0 : _a.group.groupId) !== "4123712") {
                            !(member === null || member === void 0 ? void 0 : member.roles.cache.has(roles_1.statusRoles.member)) && !(member === null || member === void 0 ? void 0 : member.roles.cache.has(roles_1.statusRoles.clanmember))
                                ? member === null || member === void 0 ? void 0 : member.roles.add([roles_1.statusRoles.member]).then((m) => m.roles.remove([roles_1.statusRoles.newbie]))
                                : [];
                            const component = new discord_js_1.ButtonBuilder().setCustomId("webhandlerEvent_clan_request").setLabel("Отправить приглашение").setStyle(3);
                            embed.setDescription(`Нажмите кнопку для получения приглашения в клан`);
                            member === null || member === void 0 ? void 0 : member.send({
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
                            (0, logger_1.clan_joinLeave)(result, true);
                            member === null || member === void 0 ? void 0 : member.send({
                                embeds: [embed],
                            });
                            sequelize_1.auth_data.update({ clan: true }, { where: { bungie_id: bungie_id } });
                        }
                    });
                });
            });
        }
    }
});
