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
const ids_1 = require("../base/ids");
const raid_1 = require("../commands/raid");
const sequelize_1 = require("../handlers/sequelize");
const full_checker_1 = require("../features/full_checker");
const channels_1 = require("../base/channels");
const roles_1 = require("../base/roles");
function joinInChnMsg(member, how, chnId, guild, was) {
    return __awaiter(this, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder();
        member = member instanceof discord_js_1.GuildMember ? member : undefined;
        if (!member) {
            throw { name: "Ошибка. Вы не участник сервера" };
        }
        switch (how) {
            case "join":
                embed.setColor("Green").setAuthor({
                    name: `${member.displayName} записался на рейд${was ? (was === "alt" ? " ранее будучи возможным участником" : was === "hotJoined" ? " ранее будучи в запасе" : "") : ""}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case "alt":
                embed.setColor("Yellow").setAuthor({
                    name: `${member.displayName} записался на рейд как возможный участник${was ? (was === "join" ? " ранее будучи участником" : was === "hotJoined" ? " ранее будучи в запасе" : "") : ""}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case "leave":
                embed.setColor("Red").setAuthor({
                    name: `${member.displayName} покинул рейд${was
                        ? was === "join"
                            ? " ранее будучи участником"
                            : was === "alt"
                                ? " ранее будучи возможным участником"
                                : was === "hotJoined"
                                    ? " ранее будучи в запасе"
                                    : ""
                        : ""}`,
                    iconURL: member.displayAvatarURL(),
                });
                break;
            case "hotJoined":
                embed.setColor("DarkGreen").setAuthor({ name: `${member.displayName} записался на рейд, но был записан в запас`, iconURL: member.displayAvatarURL() });
                break;
        }
        (0, channels_1.chnFetcher)(chnId).send({ embeds: [embed] });
    });
}
function joinedFromHotJoined(raidData, userId, guild) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!guild)
            return console.error(`joinedFromHotJoined error, guild undefined`, userId, raidData);
        const member = guild.members.cache.get(userId);
        if (!member)
            return console.error(`joinedFromHotJoined error, member wasnt found`, userId, guild, raidData);
        const embed = new discord_js_1.EmbedBuilder().setColor("Orange").setAuthor({
            name: member.displayName + " был автоматически записан в основной состав ранее будучи в запасе",
            iconURL: member.displayAvatarURL(),
        });
        (0, channels_1.chnFetcher)(raidData.chnId).send({ embeds: [embed] });
        const DMEmbed = new discord_js_1.EmbedBuilder()
            .setColor("Orange")
            .setTitle(`Вы были автоматически записаны на рейд ${raidData.id}-${raidData.raid}`)
            .addFields({
            name: `Число записанных участников`,
            value: `Участников: ${raidData.joined.length}${raidData.hotJoined.length > 0 ? `\nВ запасе: ${raidData.hotJoined.length}` : ""}${raidData.alt.length > 0 ? `\nВозможно будут: ${raidData.alt.length}` : ""}`,
        }, { name: `Начало рейда: <t:${raidData.time}:R>`, value: `<t:${raidData.time}>`, inline: true }, {
            name: `Ссылки:`,
            value: `[Перейти к набору](https://discord.com/channels/${ids_1.guildId}/${ids_1.ids.raidChnId}/${raidData.msgId})\n[Перейти в канал рейда](https://discord.com/channels/${ids_1.guildId}/${raidData.chnId})`,
        });
        member.send({ embeds: [DMEmbed] });
    });
}
exports.default = {
    callback: (client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (interaction.type === discord_js_1.InteractionType.MessageComponent &&
            interaction.componentType === discord_js_1.ComponentType.Button &&
            ((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id) === ids_1.ids.raidChnId &&
            interaction.member !== null) {
            yield interaction.deferUpdate();
            const raidData = yield sequelize_1.raids.findOne({
                where: { msgId: interaction.message.id },
            });
            if (!raidData) {
                console.log(`Raid not found ${interaction.user.id}/${interaction.user.username}, ${interaction.channel.id}`);
                throw { name: "Критическая ошибка, рейд не найден :(" };
            }
            switch (interaction.customId) {
                case "raidEvent_btn_join": {
                    if (raidData.joined.includes(interaction.user.id)) {
                        throw { name: "Ошибка. Вы не были добавлены на рейд" };
                    }
                    if (raidData.reqClears > 0) {
                        const userRaidClears = full_checker_1.completedRaidsData.get(interaction.user.id);
                        if (!userRaidClears) {
                            throw {
                                name: "Данные не найдены",
                                message: `Для записи на этот рейд необходимо узнать количество закрытых вами рейдов, но статистика не была собрана\n\nПопробуйте снова через 1-3 минуты\n\n\nДля сбора статистики вы должны быть зарегистрированы у <@${(_b = client.user) === null || _b === void 0 ? void 0 : _b.id}>, а также иметь роль <@&${roles_1.statusRoles.clanmember}> или <@&${roles_1.statusRoles.member}>`,
                                userId: interaction.user.id,
                            };
                        }
                        else {
                            if (userRaidClears[raidData.raid] < raidData.reqClears) {
                                throw {
                                    name: "Недостаточно закрытий",
                                    message: `Для записи на этот рейд необходимо ${raidData.reqClears} закрытий, а у вас ${userRaidClears[raidData.raid]}`,
                                };
                            }
                        }
                    }
                    joinInChnMsg(interaction.member, "join", raidData.chnId, interaction.guild, raidData.alt.includes(interaction.user.id)
                        ? "alt"
                        : raidData.hotJoined.includes(interaction.user.id) && raidData.joined.length !== 6
                            ? "hotJoined"
                            : undefined);
                    if (raidData.alt.includes(interaction.user.id))
                        raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                    if (raidData.hotJoined.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    if (raidData.joined.length === 6) {
                        raidData.hotJoined.push(interaction.user.id);
                    }
                    else {
                        raidData.joined.push(interaction.user.id);
                    }
                    (0, channels_1.chnFetcher)(raidData.chnId).permissionOverwrites.create(interaction.user.id, {
                        ViewChannel: true,
                    });
                    yield (0, raid_1.raidMsgUpdate)(raidData, interaction);
                    yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    (0, raid_1.raidDataInChnMsg)(raidData);
                    break;
                }
                case "raidEvent_btn_leave": {
                    if (!raidData.joined.includes(interaction.user.id) &&
                        !raidData.hotJoined.includes(interaction.user.id) &&
                        !raidData.alt.includes(interaction.user.id)) {
                        return;
                    }
                    joinInChnMsg(interaction.member, "leave", raidData.chnId, interaction.guild, raidData.joined.includes(interaction.user.id)
                        ? "join"
                        : raidData.alt.includes(interaction.user.id)
                            ? "alt"
                            : raidData.alt.includes(interaction.user.id)
                                ? "hotJoined"
                                : undefined);
                    if (raidData.joined.length === 6 && raidData.joined.includes(interaction.user.id) && raidData.hotJoined.length > 0) {
                        const updatedJoined = raidData.hotJoined.shift();
                        raidData.joined.push(updatedJoined);
                        joinedFromHotJoined(raidData, updatedJoined, interaction.guild);
                    }
                    if (raidData.joined.includes(interaction.user.id))
                        raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                    if (raidData.alt.includes(interaction.user.id))
                        raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                    if (raidData.hotJoined.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    (0, channels_1.chnFetcher)(raidData.chnId).permissionOverwrites.delete(interaction.user.id);
                    yield (0, raid_1.raidMsgUpdate)(raidData, interaction);
                    yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    (0, raid_1.raidDataInChnMsg)(raidData);
                    break;
                }
                case "raidEvent_btn_alt": {
                    if (raidData.alt.includes(interaction.user.id)) {
                        return;
                    }
                    joinInChnMsg(interaction.member, "alt", raidData.chnId, interaction.guild, raidData.joined.includes(interaction.user.id) ? "join" : raidData.hotJoined.includes(interaction.user.id) ? "hotJoined" : undefined);
                    if (raidData.joined.length === 6 && raidData.joined.includes(interaction.user.id) && raidData.hotJoined.length > 0) {
                        const updatedJoined = raidData.hotJoined.shift();
                        raidData.joined.push(updatedJoined);
                        joinedFromHotJoined(raidData, updatedJoined, interaction.guild);
                    }
                    if (raidData.joined.includes(interaction.user.id))
                        raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                    if (raidData.hotJoined.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    raidData.alt.push(interaction.user.id);
                    (0, channels_1.chnFetcher)(raidData.chnId).permissionOverwrites.create(interaction.user.id, {
                        ViewChannel: true,
                    });
                    yield (0, raid_1.raidMsgUpdate)(raidData, interaction);
                    yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    (0, raid_1.raidDataInChnMsg)(raidData);
                    break;
                }
            }
        }
    }),
};
