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
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (!interaction.isButton())
            return;
        if (interaction.customId === "statsEvent_old_events" || interaction.customId === "statsEvent_pinnacle") {
            yield interaction.deferReply({ ephemeral: true });
            const id = (_a = interaction.message.embeds[0].footer) === null || _a === void 0 ? void 0 : _a.text.slice(4);
            const data = yield sequelize_1.auth_data.findOne({
                where: { discord_id: id },
                attributes: ["bungie_id", "platform", "access_token"],
            });
            if (data === null) {
                console.log(`statsEventError`, data, interaction);
                return;
            }
            else {
                var parsedData = data.toJSON();
                var { platform, access_token, bungie_id } = parsedData;
            }
            switch (interaction.customId) {
                case "statsEvent_old_events":
                    (0, request_promise_native_1.get)("https://www.bungie.net/Platform/Destiny2/Manifest/", { json: true }, function (err, _response, body) {
                        return __awaiter(this, void 0, void 0, function* () {
                            if (err)
                                return console.log(err);
                            const DestinyProgressionDefinition = yield (0, request_promise_native_1.get)(`https://www.bungie.net${body.Response.jsonWorldComponentContentPaths.ru.DestinyProgressionDefinition}`, { json: true });
                            const data = yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=202`, {
                                headers: { "X-API-Key": process.env.XAPI },
                                auth: { bearer: access_token },
                                json: true,
                            });
                            const dataFact = [];
                            const obj = data.Response.characterProgressions.data[Object.keys(data.Response.characterProgressions.data)[0]].factions;
                            Object.entries(obj).forEach(([k, faction]) => {
                                dataFact.push({
                                    factionHash: faction.factionHash,
                                    progressionHash: faction.progressionHash,
                                    currentProgress: faction.currentProgress,
                                    level: faction.level,
                                    levelCap: faction.levelCap,
                                });
                            });
                            const embed = new discord_js_1.EmbedBuilder()
                                .setColor("Green")
                                .setTimestamp()
                                .setFooter({ text: `Id: ${interaction.user.id}` });
                            dataFact.forEach((d) => {
                                var _a;
                                if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) >= 25)
                                    return;
                                if (d.progressionHash === 3468066401) {
                                    embed.addFields([
                                        {
                                            name: "Испытания девяти",
                                            value: `${d.currentProgress} очков, ${d.level} ранг${d.levelCap !== -1 ? ` / ${d.levelCap}` : []}`,
                                            inline: true,
                                        },
                                    ]);
                                }
                                else {
                                    const embedName = DestinyProgressionDefinition[d.progressionHash].displayProperties.name ||
                                        DestinyProgressionDefinition[d.progressionHash].displayProperties.displayUnitsName ||
                                        "blank";
                                    embed.addFields([
                                        {
                                            name: embedName,
                                            value: `${d.currentProgress} очков, ${d.level} ранг${d.levelCap !== -1 ? ` / ${d.levelCap}` : []}`,
                                            inline: true,
                                        },
                                    ]);
                                }
                            });
                            interaction.editReply({ embeds: [embed] });
                        });
                    });
                    break;
                case "statsEvent_pinnacle":
                    const manifest = yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/Manifest/`, {
                        json: true,
                    }).then((data) => __awaiter(void 0, void 0, void 0, function* () {
                        return yield (0, request_promise_native_1.get)(`https://www.bungie.net${data.Response.jsonWorldComponentContentPaths.ru.DestinyMilestoneDefinition}`, { json: true });
                    }));
                    const data = yield (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=200,202`, {
                        headers: { "X-API-Key": process.env.XAPI },
                        auth: { bearer: access_token },
                        json: true,
                    });
                    let chars = [];
                    const components = [];
                    data.Response.characters.data.forEach((char, i) => {
                        console.log(`statsEvent debug data index: ${i}`);
                        components[i] = new discord_js_1.ButtonBuilder({
                            style: discord_js_1.ButtonStyle.Secondary,
                            label: char.classHash === 671679327 ? "Охотник" : char.classHash === 2271682572 ? "Варлок" : "Титан",
                            customId: `statsEvent_pinnacle_char_${i}`,
                        });
                        chars[i] = char.classHash === 671679327 ? "Охотник" : char.classHash === 2271682572 ? "Варлок" : "Титан";
                    });
                    chars.length === 0 ? (chars = ["персонажи отсутствуют"]) : [];
                    const embed = new discord_js_1.EmbedBuilder().setTitle("Выберите персонажа").setDescription(chars.join("\n").toString()).setTimestamp().setColor("DarkGreen");
                    const int = yield interaction.editReply({
                        embeds: [embed],
                        components: [{ type: discord_js_1.ComponentType.ActionRow, components: components }],
                    });
                    const collector = int.createMessageComponentCollector({
                        filter: ({ user }) => user.id == interaction.user.id,
                    });
                    collector.on("collect", (collected) => {
                        const obj = data.Response.characterProgressions.data[Object.keys(data.Response.characterProgressions.data)[Number(collected.customId.slice(-1))]]
                            .milestones;
                        const dataMile = [];
                        Object.entries(obj).forEach(([k, milestone]) => {
                            var _a;
                            if ((milestone === null || milestone === void 0 ? void 0 : milestone.rewards) === undefined || ((_a = milestone === null || milestone === void 0 ? void 0 : milestone.rewards[0]) === null || _a === void 0 ? void 0 : _a.rewardCategoryHash) !== 326786556)
                                return;
                            dataMile.push({
                                milestoneHash: milestone.milestoneHash,
                                endDate: new Date(milestone.endDate).getTime(),
                                rewards: milestone.rewards,
                            });
                        });
                        const embed = new discord_js_1.EmbedBuilder()
                            .setColor("Green")
                            .setTimestamp()
                            .setFooter({ text: `Id: ${id}` });
                        const curDate = new Date().getTime();
                        dataMile.forEach((mile) => {
                            if (curDate > mile.endDate)
                                return;
                            mile.rewards.forEach((reward) => {
                                reward.entries.forEach((subRew) => {
                                    var _a;
                                    if (subRew.redeemed === true)
                                        return;
                                    if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) >= 25)
                                        return;
                                    embed.addFields([
                                        {
                                            name: `${manifest[mile.milestoneHash].displayProperties.name + `\n` + manifest[mile.milestoneHash].displayProperties.description}`,
                                            value: `Условие ${subRew.earned ? "выполнено" : "не выполнено"}${!subRew.redeemed && subRew.earned ? ", но не получено" : ""}`,
                                        },
                                    ]);
                                });
                            });
                        });
                        interaction.editReply({ embeds: [embed], components: [] });
                    });
                    break;
            }
        }
    }),
};
