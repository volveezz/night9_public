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
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
exports.default = {
    name: "role",
    description: "Удаление ролей у пользователей",
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "clear",
            description: "Удаление роли у всех пользоваталей",
            options: [{ type: discord_js_1.ApplicationCommandOptionType.Role, name: "role", description: "Укажите роль для удаления", required: true }],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "set",
            description: "Установить определенную роль пользователю",
            options: [
                { type: discord_js_1.ApplicationCommandOptionType.Role, name: "role", description: "Укажите роль для установки", required: true },
                { type: discord_js_1.ApplicationCommandOptionType.User, name: "user", description: "Укажите пользователя, которому устанавливаем роль", required: true },
            ],
        },
    ],
    defaultMemberPermissions: ["Administrator"],
    callback: (_client, interaction, _member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        yield interaction.deferReply({ ephemeral: true });
        const subCommand = interaction.options.getSubcommand();
        const user = subCommand === "set" ? interaction.options.getMember("user") : null;
        const role = interaction.options.getRole("role", true);
        switch (subCommand) {
            case "clear": {
                let i = 0;
                const members = guild.members.cache.filter((m) => m.roles.cache.has(role.id));
                for (let n = 0; n < members.size; n++) {
                    const member = members.at(n);
                    i++;
                    member.roles.remove(role.id, "Cleaning users role").catch((e) => {
                        i--;
                        if (e.code !== 50013) {
                            console.error(e);
                        }
                    });
                    yield timer(i * 366);
                }
                const embed = new discord_js_1.EmbedBuilder().setColor("Green").setDescription(`Роль ${role} была удалена у ${i} участников`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "set": {
                if (user instanceof discord_js_1.GuildMember) {
                    const embed = new discord_js_1.EmbedBuilder();
                    const u = user.roles
                        .set([role.id])
                        .then((m) => {
                        embed.setColor("Green").setDescription(`Роль ${role} установлена ${m}`);
                        interaction.editReply({ embeds: [embed] });
                        return true;
                    })
                        .catch((e) => {
                        if (e.code === 50013) {
                            return false;
                        }
                        else {
                            console.log(e);
                        }
                    });
                    if ((yield u) === false) {
                        throw { name: "Ошибка", message: `Недостаточно прав для установки роли ${role} пользователю ${user}`, falseAlarm: true };
                    }
                }
                break;
            }
        }
    }),
};
