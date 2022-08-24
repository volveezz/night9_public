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
const colors_1 = require("../base/colors");
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    name: "clan",
    description: "Управление и статистика клана",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "list",
            description: "Список клана и статистика каждого из участников",
        },
    ],
    callback: (_client, interaction, _member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        yield interaction.deferReply({ ephemeral: true });
        const clanMembers = yield sequelize_1.auth_data.findAll({ where: { clan: true }, include: sequelize_1.discord_activities });
        const discordMembers = guild.members.cache;
        const destinyRequest = yield (0, request_promise_native_1.get)("https://www.bungie.net/Platform/GroupV2/4123712/Members/?memberType=None", {
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": process.env.XAPI,
            },
            json: true,
        });
        const destinyMembers = destinyRequest["Response"]["results"];
        if (!clanMembers || !discordMembers || !destinyRequest || destinyRequest["ErrorCode"] !== 1 || !destinyMembers) {
            console.error(`clan list error`, !clanMembers ? clanMembers : "", !discordMembers ? discordMembers : "", !destinyRequest ? destinyRequest : "");
            throw { name: "Ошибка во время сбора данных", message: "Пожалуйста, повторите попытку позже" };
        }
        const mergedMembersUnsort = destinyMembers.map((clanmember) => {
            return {
                isOnline: clanmember.isOnline,
                lastOnlineStatusChange: clanmember.lastOnlineStatusChange,
                joinDate: Math.trunc(new Date(clanmember.joinDate).getTime() / 1000),
                bungieName: clanmember.bungieNetUserInfo
                    ? clanmember.bungieNetUserInfo.supplementalDisplayName ||
                        clanmember.bungieNetUserInfo.bungieGlobalDisplayName +
                            "#" +
                            (clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode.length === 3
                                ? "0" + clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode
                                : clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode)
                    : clanmember.destinyUserInfo.bungieGlobalDisplayName +
                        "#" +
                        (clanmember.destinyUserInfo.bungieGlobalDisplayNameCode.length === 3
                            ? "0" + clanmember.destinyUserInfo.bungieGlobalDisplayNameCode
                            : clanmember.destinyUserInfo.bungieGlobalDisplayNameCode) ||
                        clanmember.destinyUserInfo.LastSeenDisplayName ||
                        clanmember.destinyUserInfo.displayName,
                membershipType: clanmember.destinyUserInfo.membershipType,
                bungieId: clanmember.destinyUserInfo.membershipId,
            };
        });
        const mergedMembers = mergedMembersUnsort.sort((a, b) => b.lastOnlineStatusChange - a.lastOnlineStatusChange);
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setTitle(`Статистика ${destinyRequest["Response"]["results"][0]["groupId"] === "4123712" ? "клана Night 9" : "неизвестного клана"}`)
            .addFields([
            {
                name: `*n* *bungieName* / *discordName* / *platform*/*bungieId*`,
                value: `*bungieNet* | *lastOnline* | *joinDate* | *msgsSent* | *voiceSec* | *clanDungeons/Raids*`,
            },
        ]);
        const fields = mergedMembers.map((member) => {
            var _a;
            const dbData = clanMembers.find((d) => d.bungie_id === member.bungieId);
            return {
                name: `${member.bungieName} / ${((_a = discordMembers.get(dbData === null || dbData === void 0 ? void 0 : dbData.discord_id)) === null || _a === void 0 ? void 0 : _a.displayName) || "Не зарегистрирован"} / ${member.membershipType + `/` + member.bungieId}`,
                value: `[Bungie.net](https://www.bungie.net/7/ru/User/Profile/${member.membershipType}/${member.bungieId}) | ${member.isOnline ? "В игре" : `<t:${member.lastOnlineStatusChange}>`} | <t:${member.joinDate}>${dbData && dbData.discord_activity
                    ? ` | ${dbData.discord_activity.messages}:book: | ${dbData.discord_activity.voice}с:microphone2: | ${dbData.discord_activity.dungeons}/${dbData.discord_activity.raids}`
                    : ""}`,
            };
        });
        const e = embed;
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            embed.addFields({ name: `${i + 1} ${field.name}`, value: field.value });
            if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) === 25 || i === fields.length - 1) {
                if (i === 24) {
                    yield interaction.editReply({ embeds: [e] });
                    e.setTitle(null).spliceFields(0, 25);
                }
                else {
                    yield interaction.followUp({ embeds: [e], ephemeral: true });
                    e.spliceFields(0, 25);
                }
            }
        }
    }),
};
