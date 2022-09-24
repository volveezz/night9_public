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
const roles_1 = require("../base/roles");
const sequelize_1 = require("../handlers/sequelize");
exports.default = {
    callback: (_client, interaction, member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        if (interaction.isButton() && interaction.customId.startsWith("roleChannel")) {
            const commandFull = interaction.customId.split("_").slice(1);
            const commandId = commandFull.shift();
            switch (commandId) {
                case "classRoles": {
                    const className = commandFull.pop();
                    member.roles
                        .remove(roles_1.classRoles
                        .filter((r) => r.className !== className)
                        .map((r) => {
                        return r.id;
                    }))
                        .then((_r) => {
                        if (className === "disable")
                            return;
                        setTimeout(() => {
                            member.roles.add(roles_1.classRoles.find((r) => r.className === className).id);
                        }, 1500);
                    });
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor("Green")
                        .setTitle(className === "disable"
                        ? "Вы отключили основной класс"
                        : `Вы установили ${className === "hunter"
                            ? "<:hunter:995496474978824202>Охотника"
                            : className === "warlock"
                                ? "<:warlock:995496471526920232>Варлока"
                                : "<:titan:995496472722284596>Титана"} как основной класс`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                default:
                    {
                        const categoryId = String(Number(commandFull.pop()) + 1);
                        (_a = sequelize_1.auth_data.sequelize) === null || _a === void 0 ? void 0 : _a.query(`UPDATE auth_data SET roles_cat[${categoryId}]=NOT roles_cat[${categoryId}] WHERE discord_id=${interaction.user.id} RETURNING roles_cat`).then((d) => __awaiter(void 0, void 0, void 0, function* () {
                            const changedRows = d[1].rows[0].roles_cat.map((b) => {
                                return b === false ? "<:crossmark:1020504750350934026>" : "<:successCheckmark:1018320951173189743>";
                            });
                            const embed = new discord_js_1.EmbedBuilder()
                                .setColor("Green")
                                .setTitle(`Вы ${d[1].rows[0].roles_cat[Number(categoryId)] ? "включили" : "отключили"} роли за ${categoryId === "1"
                                ? "общую статистику"
                                : categoryId === "2"
                                    ? "статистику Испытаний Осириса"
                                    : categoryId === "3"
                                        ? "титулы"
                                        : categoryId === "4"
                                            ? "триумфы"
                                            : "активность на сервере"}`)
                                .setDescription(`<:dot:1018321568218226788>Общая статистика - ${changedRows[0]}\n<:dot:1018321568218226788>Статистика Испытаний Осириса - ${changedRows[1]}\n<:dot:1018321568218226788>Титулы - ${changedRows[2]}\n<:dot:1018321568218226788>Триумфы - ${changedRows[3]}\n<:dot:1018321568218226788>Активность на сервере - ${changedRows[4]}`);
                            interaction.reply({ embeds: [embed], ephemeral: true });
                            if (d[1].rows[0].roles_cat[Number(categoryId)] === true)
                                return;
                            let removedRoles = [];
                            switch (categoryId) {
                                case "1":
                                    removedRoles.push(roles_1.rStats.category);
                                    member.roles.remove(removedRoles.concat(roles_1.rStats.allActive, roles_1.rStats.allKd, removedRoles));
                                    break;
                                case "2":
                                    removedRoles.push(roles_1.rTrials.category, roles_1.rTrials.wintrader);
                                    member.roles.remove(removedRoles.concat(roles_1.rTrials.allKd, roles_1.rTrials.allRoles, removedRoles));
                                    break;
                                case "3":
                                    const allTitlesRoles = yield sequelize_1.role_data.findAll({ where: { category: 3 } });
                                    removedRoles.push(roles_1.rTitles.category);
                                    allTitlesRoles.forEach((r) => {
                                        removedRoles.push(r.role_id);
                                        r.guilded_roles && r.guilded_roles.length > 0 ? (removedRoles = removedRoles.concat(r.guilded_roles)) : [];
                                    });
                                    member.roles.remove(removedRoles.filter((r) => r !== null));
                                    break;
                                case "4":
                                    const allTriumphsRoles = yield sequelize_1.role_data.findAll({ where: { category: 4 } });
                                    removedRoles.push(roles_1.rTriumphs.category);
                                    allTriumphsRoles.forEach((r) => {
                                        removedRoles.push(r.role_id);
                                        r.guilded_roles && r.guilded_roles.length > 0 ? (removedRoles = removedRoles.concat(r.guilded_roles)) : [];
                                    });
                                    member.roles.remove(removedRoles.concat(roles_1.rClanJoinDate.allRoles));
                                    break;
                                case "5":
                                    removedRoles.push(roles_1.rActivity.category);
                                    member.roles.remove(removedRoles.concat(roles_1.rActivity.allMessages, roles_1.rActivity.allVoice, removedRoles));
                                    break;
                            }
                        }));
                    }
                    break;
            }
        }
    }),
};
