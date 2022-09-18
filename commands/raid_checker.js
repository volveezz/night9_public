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
const manifestHandler_1 = require("../handlers/manifestHandler");
exports.default = {
    name: "raid_checker",
    nameLocalizations: {
        ru: "закрытия_рейдов",
    },
    options: [
        { type: discord_js_1.ApplicationCommandOptionType.User, name: "пользователь", description: "Укажите искомого пользователя" },
        {
            type: discord_js_1.ApplicationCommandOptionType.Boolean,
            name: "nonraidchecker",
            description: "Проверить абсолютно все активности в игре?",
            nameLocalizations: { ru: "проверка_не_рейдов" },
        },
    ],
    description: "Статистика по рейдам",
    type: [true, true, false],
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        yield interaction.deferReply({ ephemeral: true });
        const user = interaction instanceof discord_js_1.ChatInputCommandInteraction ? interaction.options.getUser("пользователь") : interaction.targetUser;
        const db_data = yield sequelize_1.auth_data.findOne({
            where: { discord_id: user ? user.id : interaction.user.id },
            attributes: ["bungie_id", "platform", "access_token"],
        });
        if (db_data === null) {
            if (interaction instanceof discord_js_1.UserContextMenuCommandInteraction) {
                throw { name: `Выбранный пользователь не зарегистрирован` };
            }
            throw { name: "Ошибка", message: "Для использования этой команды необходимо зарегистрироваться" };
        }
        const characters_list = yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${db_data.platform}/Profile/${db_data.bungie_id}/?components=200`, {
            json: true,
            headers: { "X-API-KEY": process.env.XAPI },
            auth: {
                bearer: db_data.access_token ? db_data.access_token : undefined,
            },
        });
        const manifest = interaction instanceof discord_js_1.ChatInputCommandInteraction && interaction.options.getBoolean("nonraidchecker") === true
            ? yield manifestHandler_1.DestinyActivityDefinition
            : yield manifestHandler_1.DestinyActivityDefinition.then((activity_manifest) => {
                return Object.keys(activity_manifest).reduce(function (acc, val) {
                    if (activity_manifest[val].activityTypeHash === 2043403989)
                        acc[val] = activity_manifest[val];
                    return acc;
                }, {});
            });
        const arr = [];
        Object.keys(manifest).forEach((key) => __awaiter(void 0, void 0, void 0, function* () {
            arr.push({
                activity: key,
                acitivty_name: manifest[key].displayProperties.name,
                clears: 0,
            });
        }));
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
                    var _j, _k;
                    const clears = (_j = activity_fresh.filter((d) => d.activityHash == activity_data.activity)[0]) === null || _j === void 0 ? void 0 : _j.values.activityCompletions.basic.value;
                    if (clears !== undefined && clears >= 1) {
                        activity_map.set(activity_data.acitivty_name, {
                            activity: activity_data.acitivty_name,
                        });
                        if (set[index][0].has(activity_data.acitivty_name)) {
                            set[index][0].set(activity_data.acitivty_name, {
                                clears: clears +
                                    ((_k = set[index][0].get(activity_data.acitivty_name)) === null || _k === void 0 ? void 0 : _k.clears),
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
        const embed = new discord_js_1.EmbedBuilder()
            .setColor("Green")
            .setTitle(interaction instanceof discord_js_1.ChatInputCommandInteraction && interaction.options.getBoolean("nonraidchecker") === true
            ? "Статистика закрытх активностей по классам"
            : "Статистка закрытых рейдов по классам")
            .setTimestamp()
            .setFooter({ text: "Удаленные персонажи не проверяются" });
        interaction instanceof discord_js_1.UserContextMenuCommandInteraction
            ? embed.setAuthor({
                name: ((_h = (_g = interaction.guild) === null || _g === void 0 ? void 0 : _g.members.cache.get(interaction.targetId)) === null || _h === void 0 ? void 0 : _h.displayName) || interaction.targetUser.username,
                iconURL: interaction.targetUser.displayAvatarURL(),
            })
            : [];
        const embed_map = new Map([...activity_map].sort());
        let replied = false, i = 0;
        const e = embed;
        embed_map.forEach((_activity_name, key) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
            i++;
            if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) === 25) {
                if (i === 26) {
                    interaction.editReply({ embeds: [e] });
                    e.data.fields = [];
                    e.data.footer = undefined;
                    e.data.title = undefined;
                    replied = true;
                }
                else {
                    interaction.followUp({ embeds: [e], ephemeral: true });
                    e.data.fields = [];
                }
            }
            try {
                embed.addFields([
                    {
                        name: key || "blankNameOrNameNotFound",
                        value: `${((_c = (_b = set[0][0]) === null || _b === void 0 ? void 0 : _b.get(key)) === null || _c === void 0 ? void 0 : _c.clears)
                            ? set[0][1] + " " + ((_e = (_d = set[0][0]) === null || _d === void 0 ? void 0 : _d.get(key)) === null || _e === void 0 ? void 0 : _e.clears)
                            : ""} ${((_g = (_f = set[1][0]) === null || _f === void 0 ? void 0 : _f.get(key)) === null || _g === void 0 ? void 0 : _g.clears)
                            ? set[1][1] + " " + ((_j = (_h = set[1][0]) === null || _h === void 0 ? void 0 : _h.get(key)) === null || _j === void 0 ? void 0 : _j.clears)
                            : ""} ${((_l = (_k = set[2][0]) === null || _k === void 0 ? void 0 : _k.get(key)) === null || _l === void 0 ? void 0 : _l.clears)
                            ? set[2][1] + " " + ((_o = (_m = set[2][0]) === null || _m === void 0 ? void 0 : _m.get(key)) === null || _o === void 0 ? void 0 : _o.clears)
                            : ""}`,
                    },
                ]);
            }
            catch (e) {
                console.error(`Error during addin raids to embed raidChecker`, e.stack);
            }
        });
        !replied
            ? interaction.editReply({ embeds: [embed] }).catch((e) => {
                console.error(e);
                interaction.editReply({ content: "Ошибка :(" });
            })
            : interaction.followUp({ embeds: [embed], ephemeral: true });
    }),
};
