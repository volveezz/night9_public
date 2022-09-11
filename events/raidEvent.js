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
        guild.channels.fetch(chnId).then((chn) => {
            if (chn && chn.type === discord_js_1.ChannelType.GuildText) {
                chn.send({ embeds: [embed] });
            }
            else {
                return;
            }
        });
    });
}
exports.default = {
    callback: (client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
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
                    if ((_b = raidData.joined) === null || _b === void 0 ? void 0 : _b.includes(interaction.user.id)) {
                        throw { name: "Ошибка. Вы не были добавлены на рейд" };
                    }
                    if (raidData.reqClears > 0) {
                        const userRaidClears = full_checker_1.completedRaidsData.get(interaction.user.id);
                        if (!userRaidClears) {
                            throw {
                                name: "Данные не найдены",
                                message: `Для записи на этот рейд необходимо узнать количество закрытых вами рейдов, но статистика не была собрана\n\nПопробуйте снова через 1-3 минуты\n\n\nДля сбора статистики вы должны быть зарегистрированы у <@${(_c = client.user) === null || _c === void 0 ? void 0 : _c.id}>`,
                                userId: interaction.user.id,
                            };
                        }
                        else {
                            const rNameWD = raidData.difficulty > 1 && (raidData.raid === "vog" || raidData.raid === "kf" || raidData.raid === "votd")
                                ? `${raidData.raid}Master`
                                : raidData.raid;
                            if (userRaidClears[rNameWD] < raidData.reqClears) {
                                throw {
                                    name: "Недостаточно закрытий",
                                    message: `Для записи на этот рейд необходимо ${raidData.reqClears} закрытий, а у вас ${userRaidClears[rNameWD]}`,
                                };
                            }
                        }
                    }
                    joinInChnMsg(interaction.member, "join", raidData.chnId, interaction.guild, ((_d = raidData.alt) === null || _d === void 0 ? void 0 : _d.includes(interaction.user.id))
                        ? "alt"
                        : ((_e = raidData.hotJoined) === null || _e === void 0 ? void 0 : _e.includes(interaction.user.id)) && ((_f = raidData.joined) === null || _f === void 0 ? void 0 : _f.length) !== 6
                            ? "hotJoined"
                            : undefined);
                    if ((_g = raidData.alt) === null || _g === void 0 ? void 0 : _g.includes(interaction.user.id))
                        raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                    if ((_h = raidData.hotJoined) === null || _h === void 0 ? void 0 : _h.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    if (((_j = raidData.joined) === null || _j === void 0 ? void 0 : _j.length) === 6) {
                        (_k = raidData.hotJoined) === null || _k === void 0 ? void 0 : _k.push(interaction.user.id);
                    }
                    else {
                        (_l = raidData.joined) === null || _l === void 0 ? void 0 : _l.push(interaction.user.id);
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
                    if (!((_m = raidData.joined) === null || _m === void 0 ? void 0 : _m.includes(interaction.user.id)) &&
                        !((_o = raidData.hotJoined) === null || _o === void 0 ? void 0 : _o.includes(interaction.user.id)) &&
                        !((_p = raidData.alt) === null || _p === void 0 ? void 0 : _p.includes(interaction.user.id))) {
                        return;
                    }
                    joinInChnMsg(interaction.member, "leave", raidData.chnId, interaction.guild, ((_q = raidData.joined) === null || _q === void 0 ? void 0 : _q.includes(interaction.user.id))
                        ? "join"
                        : ((_r = raidData.alt) === null || _r === void 0 ? void 0 : _r.includes(interaction.user.id))
                            ? "alt"
                            : ((_s = raidData.alt) === null || _s === void 0 ? void 0 : _s.includes(interaction.user.id))
                                ? "hotJoined"
                                : undefined);
                    if ((_t = raidData.joined) === null || _t === void 0 ? void 0 : _t.includes(interaction.user.id))
                        (_u = raidData.joined) === null || _u === void 0 ? void 0 : _u.splice((_v = raidData.joined) === null || _v === void 0 ? void 0 : _v.indexOf(interaction.user.id), 1);
                    if ((_w = raidData.alt) === null || _w === void 0 ? void 0 : _w.includes(interaction.user.id))
                        raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                    if ((_x = raidData.hotJoined) === null || _x === void 0 ? void 0 : _x.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    (0, channels_1.chnFetcher)(raidData.chnId).permissionOverwrites.delete(interaction.user.id);
                    yield (0, raid_1.raidMsgUpdate)(raidData, interaction);
                    yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    (0, raid_1.raidDataInChnMsg)(raidData);
                    break;
                }
                case "raidEvent_btn_alt": {
                    if ((_y = raidData.alt) === null || _y === void 0 ? void 0 : _y.includes(interaction.user.id)) {
                        return;
                    }
                    joinInChnMsg(interaction.member, "alt", raidData.chnId, interaction.guild, ((_z = raidData.joined) === null || _z === void 0 ? void 0 : _z.includes(interaction.user.id)) ? "join" : ((_0 = raidData.hotJoined) === null || _0 === void 0 ? void 0 : _0.includes(interaction.user.id)) ? "hotJoined" : undefined);
                    if ((_1 = raidData.joined) === null || _1 === void 0 ? void 0 : _1.includes(interaction.user.id))
                        raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                    if ((_2 = raidData.hotJoined) === null || _2 === void 0 ? void 0 : _2.includes(interaction.user.id))
                        raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                    (_3 = raidData.alt) === null || _3 === void 0 ? void 0 : _3.push(interaction.user.id);
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
