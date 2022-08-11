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
    name: "stats",
    name_localizations: {
        "en-US": "statistic",
        ru: "статистика",
    },
    description: "Подробная статистика об аккаунте",
    type: [true, true, false],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.String,
            name: "bungiename",
            description: "Введите BungieName игрока для поиска",
        },
    ],
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        yield interaction.deferReply({ ephemeral: true });
        const optionId = interaction instanceof discord_js_1.ChatInputCommandInteraction ? interaction.options.getString("bungiename") : null;
        var targetId = interaction instanceof discord_js_1.ChatInputCommandInteraction ? (optionId ? undefined : interaction.user.id) : interaction.targetId;
        const targetName = optionId ? [] : (_a = interaction.guild.members.cache.get(targetId)) === null || _a === void 0 ? void 0 : _a.displayName;
        const targetAvatar = optionId ? undefined : (_b = interaction.guild.members.cache.get(targetId)) === null || _b === void 0 ? void 0 : _b.displayAvatarURL();
        if (optionId) {
            const bName = optionId.split("#");
            if (bName.length === 2) {
                var bungie_id, platform, displayName;
                yield (0, request_promise_native_1.post)(`https://www.bungie.net/Platform/User/Search/GlobalName/0/`, {
                    headers: {
                        "X-API-KEY": process.env.XAPI,
                        "Content-Type": "application/json",
                    },
                    body: { displayNamePrefix: bName[0] },
                    json: true,
                }).then((response) => __awaiter(void 0, void 0, void 0, function* () {
                    return yield response.Response.searchResults.forEach((result) => __awaiter(void 0, void 0, void 0, function* () {
                        if (result.bungieGlobalDisplayName == bName[0] && result.bungieGlobalDisplayNameCode == bName[1]) {
                            return yield result.destinyMemberships.forEach((membership) => __awaiter(void 0, void 0, void 0, function* () {
                                if (membership.membershipType === 3) {
                                    bungie_id = membership.membershipId;
                                    platform = membership.membershipType;
                                    displayName = membership.bungieGlobalDisplayName || membership.displayName;
                                    return;
                                }
                            }));
                        }
                    }));
                }));
                if (!displayName && !bungie_id) {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Red").setTitle(`${optionId} не найден`);
                    return interaction.editReply({ embeds: [embed] });
                }
                const embed = new discord_js_1.EmbedBuilder()
                    .setAuthor({
                    name: `Статистика ${displayName}`,
                })
                    .setColor("Green")
                    .setTimestamp()
                    .setFooter({ text: `BId: ${bungie_id}` });
                const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
                embed.setColor("Green").addFields([
                    {
                        name: "Ссылки",
                        value: `[Trials.Report](https://trials.report/report/${platform}/${bungie_id}), [Raid.Report](https://raid.report/${reportPlatform}/${bungie_id}), [Crucible.Report](https://crucible.report/report/${platform}/${bungie_id}), [Strike.Report](https://strike.report/${reportPlatform}/${bungie_id}), [DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungie_id}/overview), [WastedonDestiny](https://wastedondestiny.com/${bungie_id})`,
                    },
                ]);
                return interaction.editReply({ embeds: [embed] });
            }
            else {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor("Red")
                    .setTitle(`Проверьте правильность BungieName (${bName})`)
                    .setDescription(`В корректном BungieName обязана присутстовать левая и правые части разделенные знаком #`);
                return interaction.editReply({ embeds: [embed] });
            }
        }
        var embed = new discord_js_1.EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}`,
            iconURL: targetAvatar,
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${targetId}` });
        var data = yield sequelize_1.auth_data.findOne({
            where: {
                discord_id: targetId,
            },
            attributes: ["platform", "bungie_id", "access_token"],
        });
        if (data !== null) {
            const parsedData = data.toJSON();
            const { platform, bungie_id, access_token } = parsedData;
            const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
            embed.setColor("Green").addFields([
                {
                    name: "Ссылки",
                    value: `[Trials.Report](https://trials.report/report/${platform}/${bungie_id}), [Raid.Report](https://raid.report/${reportPlatform}/${bungie_id}), [Crucible.Report](https://crucible.report/report/${platform}/${bungie_id}), [Strike.Report](https://strike.report/${reportPlatform}/${bungie_id}), [DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungie_id}/overview), [WastedonDestiny](https://wastedondestiny.com/${bungie_id})`,
                },
            ]);
            const components = [
                new discord_js_1.ButtonBuilder().setCustomId("statsEvent_old_events").setLabel("Статистика старых ивентов").setStyle(discord_js_1.ButtonStyle.Secondary),
                new discord_js_1.ButtonBuilder().setCustomId("statsEvent_pinnacle").setLabel("Доступная сверхмощка").setStyle(discord_js_1.ButtonStyle.Secondary),
            ];
            interaction.editReply({
                embeds: [embed],
                components: optionId ? undefined : [{ type: discord_js_1.ComponentType.ActionRow, components: components }],
            });
            (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=100`, {
                headers: { "X-API-KEY": process.env.XAPI },
                auth: { bearer: access_token },
                json: true,
            }, function (err, _response, body) {
                var _a, _b;
                if (err)
                    return console.log(err);
                const data = (_b = (_a = body.Response) === null || _a === void 0 ? void 0 : _a.profile) === null || _b === void 0 ? void 0 : _b.data;
                if (!data) {
                    embed.setTitle("Произошла ошибка со стороны Bungie").setColor("Red");
                    return interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
                const lastPlayed = Math.trunc(new Date(data.dateLastPlayed).getTime() / 1000);
                const chars = data.characterIds.length;
                embed.addFields([
                    {
                        name: `Последний онлайн`,
                        value: `<t:${lastPlayed}:R>`,
                        inline: true,
                    },
                    { name: "Персонажей", value: String(chars), inline: true },
                ]);
                interaction.editReply({ embeds: [embed] });
                (0, request_promise_native_1.get)(`https://www.bungie.net/Platform/GroupV2/User/${platform}/${bungie_id}/0/1/`, {
                    headers: { "X-API-KEY": process.env.XAPI },
                    auth: { bearer: access_token },
                    json: true,
                }, function (err, _response, clanBody) {
                    var _a;
                    if (err)
                        return console.log(err);
                    const clanStatus = ((_a = clanBody.Response.results[0]) === null || _a === void 0 ? void 0 : _a.group.groupId) === "4123712"
                        ? `Участник клана`
                        : clanBody.Response.results[0]
                            ? `Клан ${clanBody.Response.results[0].group.name}`
                            : `не состоит в клане`;
                    embed.addFields([{ name: `Клан`, value: clanStatus, inline: true }]);
                    return interaction.editReply({ embeds: [embed] });
                }).catch((e) => console.log(`Stats second phase error`, e.statusCode, data === null || data === void 0 ? void 0 : data.bungie_id));
            }).catch((e) => console.log(`Stats first phase error`, e.statusCode, data === null || data === void 0 ? void 0 : data.bungie_id));
        }
        else {
            embed.setDescription(`Запрашиваемый пользователь не зарегистрирован`);
            return interaction.editReply({ embeds: [embed] });
        }
    }),
};
