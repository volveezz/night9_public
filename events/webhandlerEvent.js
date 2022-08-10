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
const sequelize_1 = require("sequelize");
const ids_1 = require("../base/ids");
const sequelize_2 = require("../handlers/sequelize");
const inviteCd = new Set();
exports.default = {
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        if (interaction.customId !== "webhandlerEvent_clan_request")
            return;
        yield interaction.deferReply({ ephemeral: true });
        if (inviteCd.has(interaction.user.id) || interaction.user.id === ids_1.ownerId) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor("Red")
                .setTitle("Время вышло")
                .setDescription(`Приглашения действуют лишь в течении 15-ти минут\nДля вступления в клан вручную подайте заявку через [сайт bungie.net](https://www.bungie.net/ru/ClanV2?groupid=4123712)`);
            interaction.editReply({ embeds: [embed] });
            return;
        }
        const authData = yield sequelize_2.auth_data.findAll({
            attributes: ["clan", "bungie_id", "platform", "access_token"],
            where: {
                [sequelize_1.Op.or]: [{ discord_id: interaction.user.id }, { discord_id: ids_1.ownerId }],
            },
        });
        if (authData[0].toJSON().discord_id === ids_1.ownerId) {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[1].toJSON();
            var { access_token: inviter_access_token } = authData[0].toJSON();
        }
        else {
            var { clan: invitee_clan, bungie_id: invitee_bungie_id, platform: invitee_platform } = authData[0].toJSON();
            var { access_token: inviter_access_token } = authData[1].toJSON();
        }
        if (authData.length === 2) {
            if (invitee_clan === true) {
                const embed = new discord_js_1.EmbedBuilder().setColor("DarkGreen").setTitle("Вы уже состоите в клане :)").setTimestamp();
                (_a = interaction.channel) === null || _a === void 0 ? void 0 : _a.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = discord_js_1.EmbedBuilder.from(msg.embeds[0]);
                    reEmbed.setDescription(null);
                    msg.edit({ components: [] });
                    interaction.editReply({ embeds: [reEmbed] });
                });
                return;
            }
            try {
                var request = yield (0, request_promise_native_1.post)(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInvite/${invitee_platform}/${invitee_bungie_id}/`, {
                    headers: { "X-API-Key": process.env.XAPI },
                    auth: { bearer: inviter_access_token },
                    json: true,
                    body: { message: "message" },
                });
            }
            catch (err) {
                if (err.error.ErrorCode === 676) {
                    const embed = new discord_js_1.EmbedBuilder().setColor("DarkGreen").setTitle("Вы уже участник нашего клана :)");
                    interaction.editReply({ embeds: [embed] });
                    (_b = interaction.channel) === null || _b === void 0 ? void 0 : _b.messages.fetch(interaction.message.id).then((msg) => {
                        const reEmbed = discord_js_1.EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                        msg.edit({ components: [], embeds: [reEmbed] });
                    });
                    return;
                }
                else {
                    console.error(err.error);
                    return;
                }
            }
            if (request.ErrorCode === 1) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor("Green")
                    .setTitle("Приглашение было отправлено")
                    .setDescription(`Приглашение будет действительно лишь в течении 15-ти минут`);
                interaction.editReply({ embeds: [embed] });
                (_c = interaction.channel) === null || _c === void 0 ? void 0 : _c.messages.fetch(interaction.message.id).then((msg) => {
                    const reEmbed = discord_js_1.EmbedBuilder.from(msg.embeds[0]).setDescription(null);
                    msg.edit({ components: [], embeds: [reEmbed] });
                }).catch((err) => {
                    if (err.code !== 10008)
                        console.error(err);
                });
                setTimeout(() => {
                    inviteCd.add(interaction.user.id);
                    (0, request_promise_native_1.post)(`https://www.bungie.net/platform/GroupV2/4123712/Members/IndividualInviteCancel/${invitee_platform}/${invitee_bungie_id}/`, {
                        headers: { "X-API-Key": process.env.XAPI },
                        auth: { bearer: inviter_access_token },
                        json: true,
                    }).catch((e) => {
                        console.error("webHandler invite cancel err", e);
                    });
                }, 1000 * 60 * 15);
            }
            else {
                interaction.editReply("Произошла ошибка :(");
                return console.log(request);
            }
        }
        else {
            interaction.editReply("Произошла ошибка :(");
            return;
        }
    }),
};
