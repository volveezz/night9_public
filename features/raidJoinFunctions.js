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
function joinInChnMsg(member, how, chnId, guild, was) {
    return __awaiter(this, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder();
        member = member instanceof discord_js_1.GuildMember ? member : undefined;
        if (!member) {
            throw { name: "Member not found", message: "Member not found, please try again" };
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
                throw { name: "Критическая ошибка", message: "Произошла критическая ошибка во время отправки сообщения в рейд канал" };
            }
        });
    });
}
exports.default = (client) => {
    client.on("interactionCreate", (interaction) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2;
        if (interaction.type === discord_js_1.InteractionType.MessageComponent &&
            interaction.componentType === discord_js_1.ComponentType.Button &&
            ((_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.id) === ids_1.ids.raidChn &&
            interaction.member !== null) {
            yield interaction.deferUpdate();
            const raidData = yield sequelize_1.raids.findOne({
                where: { msgId: interaction.message.id },
                attributes: ["id", "msgId", "chnId", "inChnMsg", "joined", "alt", "hotJoined"],
            });
            if (!raidData) {
                throw { name: "Ошибка", message: "Попробуйте повторить попытку позже", userId: interaction.user.id };
            }
            switch (interaction.customId) {
                case "raid_btn_join":
                    {
                        if ((_b = raidData.joined) === null || _b === void 0 ? void 0 : _b.includes(interaction.user.id)) {
                            throw { name: "Ошибка", message: "Вы уже записаны на этот рейд", falseAlarm: true };
                        }
                        joinInChnMsg(interaction.member, "join", raidData.chnId, interaction.guild, ((_c = raidData.alt) === null || _c === void 0 ? void 0 : _c.includes(interaction.user.id))
                            ? "alt"
                            : ((_d = raidData.hotJoined) === null || _d === void 0 ? void 0 : _d.includes(interaction.user.id)) && ((_e = raidData.joined) === null || _e === void 0 ? void 0 : _e.length) !== 6
                                ? "hotJoined"
                                : undefined);
                        if ((_f = raidData.alt) === null || _f === void 0 ? void 0 : _f.includes(interaction.user.id))
                            raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                        if ((_g = raidData.hotJoined) === null || _g === void 0 ? void 0 : _g.includes(interaction.user.id))
                            raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                        if (((_h = raidData.joined) === null || _h === void 0 ? void 0 : _h.length) === 6) {
                            (_j = raidData.hotJoined) === null || _j === void 0 ? void 0 : _j.push(interaction.user.id);
                        }
                        else {
                            (_k = raidData.joined) === null || _k === void 0 ? void 0 : _k.push(interaction.user.id);
                        }
                        yield (0, raid_1.raidMsgUpdate)(raidData, interaction.guild);
                        yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    }
                    break;
                case "raid_btn_leave":
                    {
                        if (!((_l = raidData.joined) === null || _l === void 0 ? void 0 : _l.includes(interaction.user.id)) &&
                            !((_m = raidData.hotJoined) === null || _m === void 0 ? void 0 : _m.includes(interaction.user.id)) &&
                            !((_o = raidData.alt) === null || _o === void 0 ? void 0 : _o.includes(interaction.user.id))) {
                            throw { name: "Ошибка", message: "Вы не записаны на этот рейд", falseAlarm: true };
                        }
                        joinInChnMsg(interaction.member, "leave", raidData.chnId, interaction.guild, ((_p = raidData.joined) === null || _p === void 0 ? void 0 : _p.includes(interaction.user.id))
                            ? "join"
                            : ((_q = raidData.alt) === null || _q === void 0 ? void 0 : _q.includes(interaction.user.id))
                                ? "alt"
                                : ((_r = raidData.alt) === null || _r === void 0 ? void 0 : _r.includes(interaction.user.id))
                                    ? "hotJoined"
                                    : undefined);
                        if ((_s = raidData.joined) === null || _s === void 0 ? void 0 : _s.includes(interaction.user.id))
                            (_t = raidData.joined) === null || _t === void 0 ? void 0 : _t.splice((_u = raidData.joined) === null || _u === void 0 ? void 0 : _u.indexOf(interaction.user.id), 1);
                        if ((_v = raidData.alt) === null || _v === void 0 ? void 0 : _v.includes(interaction.user.id))
                            raidData.alt.splice(raidData.alt.indexOf(interaction.user.id), 1);
                        if ((_w = raidData.hotJoined) === null || _w === void 0 ? void 0 : _w.includes(interaction.user.id))
                            raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                        yield (0, raid_1.raidMsgUpdate)(raidData, interaction.guild);
                        yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    }
                    break;
                case "raid_btn_alt":
                    {
                        if ((_x = raidData.alt) === null || _x === void 0 ? void 0 : _x.includes(interaction.user.id)) {
                            throw { name: "Ошибка", message: "Вы уже записаны на этот рейд как возможный участник", falseAlarm: true };
                        }
                        joinInChnMsg(interaction.member, "alt", raidData.chnId, interaction.guild, ((_y = raidData.joined) === null || _y === void 0 ? void 0 : _y.includes(interaction.user.id)) ? "joined" : ((_z = raidData.hotJoined) === null || _z === void 0 ? void 0 : _z.includes(interaction.user.id)) ? "hotJoined" : undefined);
                        if ((_0 = raidData.joined) === null || _0 === void 0 ? void 0 : _0.includes(interaction.user.id))
                            raidData.joined.splice(raidData.joined.indexOf(interaction.user.id), 1);
                        if ((_1 = raidData.hotJoined) === null || _1 === void 0 ? void 0 : _1.includes(interaction.user.id))
                            raidData.hotJoined.splice(raidData.hotJoined.indexOf(interaction.user.id), 1);
                        (_2 = raidData.alt) === null || _2 === void 0 ? void 0 : _2.push(interaction.user.id);
                        yield (0, raid_1.raidMsgUpdate)(raidData, interaction.guild);
                        yield sequelize_1.raids.update({ joined: `{${raidData.joined}}`, hotJoined: `{${raidData.hotJoined}}`, alt: `{${raidData.alt}}` }, { where: { id: raidData.id } });
                    }
                    break;
            }
        }
    }));
};
