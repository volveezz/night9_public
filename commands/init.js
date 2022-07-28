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
const colors_1 = require("../base/colors");
const logger_1 = require("../handlers/logger");
const sequelize_1 = require("../handlers/sequelize");
const emoji = "<:dot:933355027307823174>";
exports.default = {
    name: "init",
    name_localizations: {
        ru: "регистрация",
    },
    description: "Свяжите свой аккаунт Destiny с аккаунтом Discord",
    global: true,
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        yield interaction.deferReply({ ephemeral: true });
        const checker = yield sequelize_1.auth_data.findOne({
            where: { discord_id: interaction.user.id },
        });
        if (checker !== null) {
            throw {
                name: "Вы уже зарегистрированы",
                userId: interaction.user.id,
                command: interaction.commandName,
            };
        }
        const [request, created] = yield sequelize_1.init_data.findOrCreate({
            where: { discord_id: interaction.user.id },
            defaults: {
                discord_id: interaction.user.id,
            },
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle("Нажмите для перехода к авторизации")
            .setURL(`https://www.bungie.net/ru/OAuth/Authorize?client_id=31616&response_type=code&state=${request.toJSON().state}`)
            .setColor(colors_1.colors.default)
            .setDescription(`${emoji}По нажатию на ссылку вы будете перенаправлены на сайт Bungie (bungie.net)\n${emoji}На сайте достаточно авторизоваться через любой удобный для вас способ\n${emoji}К 1 аккаунту Discord можно привязать лишь 1 аккаунт Bungie`);
        (0, logger_1.init_register)(request.toJSON().state, interaction.user, created);
        return interaction.editReply({ embeds: [embed] });
    }),
};
