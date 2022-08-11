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
const sequelize_1 = require("../handlers/sequelize");
const request_promise_native_1 = require("request-promise-native");
exports.default = {
    name: "raid_checker",
    nameLocalizations: {
        ru: "закрытия_рейдов",
        "en-US": "raid_clears",
    },
    description: "Ваша статистика по рейдам",
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        yield interaction.deferReply({ ephemeral: true });
        const db_data = yield sequelize_1.auth_data.findOne({
            where: { discord_id: interaction.user.id },
            attributes: ["bungie_id", "platform", "access_token"],
        });
        if (db_data === null) {
            throw { name: "Ошибка", message: "Для использования этой команды необходимо зарегистрироваться" };
        }
        const characters_list = yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${db_data.platform}/Profile/${db_data.bungie_id}/?components=200`, {
            json: true,
            headers: { "X-API-KEY": process.env.XAPI },
            auth: {
                bearer: db_data.access_token ? db_data.access_token : undefined,
            },
        });
        const manifest = yield (0, request_promise_native_1.get)("https://www.bungie.net/Platform/Destiny2/Manifest/", {
            json: true,
            headers: { "X-API-KEY": process.env.XAPI },
        }).then((manifest) => __awaiter(void 0, void 0, void 0, function* () {
            return yield (0, request_promise_native_1.get)(`https://www.bungie.net${manifest.Response.jsonWorldComponentContentPaths.ru.DestinyActivityDefinition}`, {
                json: true,
                headers: { "X-API-KEY": process.env.XAPI },
            }).then((activity_manifest) => {
                return Object.keys(activity_manifest).reduce(function (acc, val) {
                    if (activity_manifest[val].activityTypeHash === 2043403989)
                        acc[val] = activity_manifest[val];
                    return acc;
                }, {});
            });
        }));
        const arr = [];
        Object.keys(manifest).forEach((key) => {
            arr.push({
                activity: key,
                acitivty_name: manifest[key].displayProperties.name,
                clears: 0,
            });
        });
        const characters = Object.keys(characters_list.Response.characters.data);
        const activity_map = new Map();
        const set = [
            [
                new Map(),
                ((_a = characters_list.Response.characters.data[characters[0]]) === null || _a === void 0 ? void 0 : _a.classHash) === 671679327
                    ? "<:hunter:995496474978824202>"
                    : ((_b = characters_list.Response.characters.data[characters[0]]) === null || _b === void 0 ? void 0 : _b.classHash) === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
            [
                new Map(),
                ((_c = characters_list.Response.characters.data[characters[1]]) === null || _c === void 0 ? void 0 : _c.classHash) === 671679327
                    ? "<:hunter:995496474978824202>"
                    : ((_d = characters_list.Response.characters.data[characters[1]]) === null || _d === void 0 ? void 0 : _d.classHash) === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
            [
                new Map(),
                ((_e = characters_list.Response.characters.data[characters[2]]) === null || _e === void 0 ? void 0 : _e.classHash) === 671679327
                    ? "<:hunter:995496474978824202>"
                    : ((_f = characters_list.Response.characters.data[characters[2]]) === null || _f === void 0 ? void 0 : _f.classHash) === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>",
            ],
        ];
        yield Promise.all(characters.map((character, index) => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${db_data.platform}/Account/${db_data.bungie_id}/Character/${character}/Stats/AggregateActivityStats/`, { json: true, headers: { "X-API-KEY": process.env.XAPI } }).then((activities) => __awaiter(void 0, void 0, void 0, function* () {
                const activity_fresh = activities.Response.activities;
                arr.forEach((activity_data) => __awaiter(void 0, void 0, void 0, function* () {
                    var _g, _h;
                    const clears = (_g = activity_fresh.filter((d) => d.activityHash == activity_data.activity)[0]) === null || _g === void 0 ? void 0 : _g.values.activityCompletions.basic.value;
                    if (clears !== undefined) {
                        activity_map.set(activity_data.acitivty_name, {
                            activity: activity_data.acitivty_name,
                        });
                        if (set[index][0].has(activity_data.acitivty_name)) {
                            set[index][0].set(activity_data.acitivty_name, {
                                clears: clears +
                                    ((_h = set[index][0].get(activity_data.acitivty_name)) === null || _h === void 0 ? void 0 : _h.clears),
                            });
                        }
                        else {
                            set[index][0].set(activity_data.acitivty_name, {
                                clears: clears,
                            });
                        }
                    }
                }));
            }));
        })));
        const embed = new discord_js_1.EmbedBuilder().setColor("Green").setTitle("Статистка закрытых рейдов по классам").setTimestamp();
        const embed_map = new Map([...activity_map].sort());
        embed_map.forEach((_activity_name, key) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            embed.addFields([
                {
                    name: key,
                    value: `${((_b = (_a = set[0][0]) === null || _a === void 0 ? void 0 : _a.get(key)) === null || _b === void 0 ? void 0 : _b.clears)
                        ? set[0][1] + " " + ((_d = (_c = set[0][0]) === null || _c === void 0 ? void 0 : _c.get(key)) === null || _d === void 0 ? void 0 : _d.clears)
                        : ""} ${((_f = (_e = set[1][0]) === null || _e === void 0 ? void 0 : _e.get(key)) === null || _f === void 0 ? void 0 : _f.clears)
                        ? set[1][1] + " " + ((_h = (_g = set[1][0]) === null || _g === void 0 ? void 0 : _g.get(key)) === null || _h === void 0 ? void 0 : _h.clears)
                        : ""} ${((_k = (_j = set[2][0]) === null || _j === void 0 ? void 0 : _j.get(key)) === null || _k === void 0 ? void 0 : _k.clears)
                        ? set[2][1] + " " + ((_m = (_l = set[2][0]) === null || _l === void 0 ? void 0 : _l.get(key)) === null || _m === void 0 ? void 0 : _m.clears)
                        : ""}`,
                    inline: false,
                },
            ]);
        });
        interaction.editReply({ embeds: [embed] });
    }),
};
