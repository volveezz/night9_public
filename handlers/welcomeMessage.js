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
exports.welcomeMessage = void 0;
const discord_js_1 = require("discord.js");
const roles_1 = require("../base/roles");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const channels_1 = require("../base/channels");
const sequelize_1 = require("./sequelize");
function welcomeMessage(client, member) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        member.roles.add(roles_1.statusRoles.newbie).catch((err) => {
            console.error(err.code === 50013 ? `welcomeMessage err: Missing permissions to give role to ${member.displayName}` : err);
        });
        const embed = new discord_js_1.EmbedBuilder()
            .setColor(colors_1.colors.default)
            .setAuthor({
            name: "Добро пожаловать на сервер клана Night 9",
            iconURL: String(((_a = client.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.iconURL()) || ((_b = client.user) === null || _b === void 0 ? void 0 : _b.displayAvatarURL())),
        })
            .setTimestamp()
            .addFields([
            {
                name: "Вступление в клан",
                value: `⁣　⁣Для вступления в клан перейдите в канал <#${channels_1.clan.join}> и следуйте [инструкции](https://discord.com/channels/${ids_1.guildId}/${channels_1.clan.join}/${channels_1.clan.joinMessage})`,
            },
            {
                name: "Общение без вступления",
                value: `⁣　⁣Для получения доступа к каналам у нас необязательно быть участником клана. Достаточно зарегистрироваться в канале <#${channels_1.clan.register}> после этого вам будут выданы временные права`,
            },
            {
                name: "FAQ",
                value: `⁣　⁣При вопросах заходите в канал <#${channels_1.clan.question}> или задайте их напрямую одному из администраторов клана`,
            },
        ]);
        member
            .send({ embeds: [embed] })
            .then((m) => {
            setTimeout(() => {
                sequelize_1.auth_data
                    .findOne({
                    where: { discord_id: member.id },
                    attributes: ["displayname", "membership_id"],
                })
                    .then((data) => {
                    if (data !== null) {
                        embed.addFields([
                            {
                                name: "Регистрация восстановлена",
                                value: `⁣　⁣Ранее вы уже регистрировались под аккаунтом ${data.displayname} ([bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${data.membership_id}))`,
                            },
                        ]);
                        m.edit({ embeds: [embed] });
                    }
                    else {
                        console.log(data);
                    }
                });
            }, 3333);
        })
            .catch((err) => {
            console.error(err.code === 50007 ? `welcomeMessage err: ${member.displayName} blocked DMs from server members` : err);
        });
    });
}
exports.welcomeMessage = welcomeMessage;
