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
const __1 = require("..");
const ids_1 = require("../base/ids");
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    callback: (_client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        const embed = new discord_js_1.EmbedBuilder();
        const tz = interaction.values[0];
        embed.setTitle(`Вы установили +${tz} как свой часовой пояс`).setColor("Green");
        yield sequelize_1.auth_data
            .update({ tz: tz }, { where: { discord_id: interaction.user.id } })
            .catch((e) => console.error(`Error during update tz of ${interaction.user.username}, ${tz}`, e));
        const member = __1.BotClient.guilds.cache.get(ids_1.guildId).members.cache.get(interaction.user.id);
        if (member) {
            !member.permissions.has("Administrator") ? member.setNickname(`[+${tz}] ${member.displayName}`) : [];
        }
        interaction.message.edit({ embeds: [embed], components: [] });
    }),
};
