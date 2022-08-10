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
const colors_1 = require("../base/colors");
const sequelize_2 = require("../handlers/sequelize");
exports.default = {
    name: "auth",
    description: "Manual auth renewal",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.String,
            name: "id",
            description: "id",
            required: true,
        },
    ],
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        yield interaction.deferReply({ ephemeral: true });
        var id = interaction.options.getString("id", true) === "me" ? interaction.user.id : interaction.options.getString("id", true);
        try {
            BigInt(id);
        }
        catch (error) {
            throw { name: "Ошибка Id", message: error.toString() };
        }
        const data = yield sequelize_2.auth_data.findOne({
            where: { [sequelize_1.Op.or]: [{ discord_id: id }, { bungie_id: id }] },
            attributes: ["refresh_token"],
        });
        if (!data) {
            throw { name: "Запись в БД отсутствует", message: `Id: ${id}`, falseAlarm: true };
        }
        try {
            var token = yield (0, request_promise_native_1.post)(`https://www.bungie.net/Platform/App/OAuth/Token/`, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${process.env.AUTH}`,
                },
                form: {
                    grant_type: "refresh_token",
                    refresh_token: data.refresh_token,
                },
                json: true,
            });
        }
        catch (err) {
            throw { name: "Request error", message: err.error.error_description || "no description available" };
        }
        if (token) {
            yield sequelize_2.auth_data.update({
                access_token: token.access_token,
                refresh_token: token.refresh_token,
            }, {
                where: {
                    membership_id: token.membership_id,
                },
            });
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_1.colors.default)
                .setTimestamp()
                .setFooter({ text: `Id: ${id}` })
                .setTitle(`MembershipId: ${token.membership_id} обновлен`);
            interaction.editReply({ embeds: [embed] });
        }
        else {
            throw { name: `${id} not updated`, userId: interaction.user.id };
        }
    }),
};
