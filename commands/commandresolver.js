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
const ids_1 = require("../base/ids");
exports.default = {
    name: "commandresolver",
    nameLocalizations: { ru: "команды" },
    description: "commandresolver",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "fetch",
            description: "fetch commands",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.Boolean,
                    name: "global",
                    description: "global?",
                    required: true,
                },
            ],
        },
        {
            type: discord_js_1.ApplicationCommandOptionType.Subcommand,
            name: "delete",
            description: "delete command",
            options: [
                {
                    type: discord_js_1.ApplicationCommandOptionType.String,
                    description: "command",
                    name: "id",
                    required: true,
                },
            ],
        },
    ],
    callback: (client, interaction, _member, _guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        yield interaction.deferReply({ ephemeral: true });
        const subCommand = interaction.options.getSubcommand();
        if (subCommand === "fetch") {
            fetch(interaction.options.getBoolean("global", true));
        }
        else if (subCommand === "delete") {
            commandDelete(interaction.options.getString("id", true));
        }
        function commandDelete(id) {
            var _a, _b, _c, _d, _e;
            return __awaiter(this, void 0, void 0, function* () {
                if (isNaN(parseInt(id))) {
                    id =
                        ((_b = (_a = client.application) === null || _a === void 0 ? void 0 : _a.commands.cache.find((command) => command.name == id)) === null || _b === void 0 ? void 0 : _b.id) ||
                            ((_d = (_c = client.guilds.cache.get(ids_1.guildId)) === null || _c === void 0 ? void 0 : _c.commands.cache.find((command) => command.name == id)) === null || _d === void 0 ? void 0 : _d.id) ||
                            "NaN";
                }
                if (id === "NaN" || isNaN(parseInt(id))) {
                    throw { name: `Command \`${id}\` not found` };
                }
                (_e = client.application) === null || _e === void 0 ? void 0 : _e.commands.delete(id).then((resp) => {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor("Green")
                        .setTitle(`Global command ${resp === null || resp === void 0 ? void 0 : resp.name} was deleted`)
                        .setFooter({ text: `Id: ${resp === null || resp === void 0 ? void 0 : resp.id}` });
                    if (resp === null || resp === void 0 ? void 0 : resp.description) {
                        embed.addFields([
                            {
                                name: `Type: ${resp.type}`,
                                value: `Description: ${resp.description}`,
                            },
                        ]);
                    }
                    interaction.editReply({ embeds: [embed] });
                }).catch((e) => {
                    var _a;
                    if (e.code === 10063) {
                        (_a = client.guilds.cache
                            .get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.commands.delete(id).then((resp) => {
                            const embed = new discord_js_1.EmbedBuilder()
                                .setColor("Green")
                                .setTitle(`Guild command ${resp === null || resp === void 0 ? void 0 : resp.name} was deleted`)
                                .setFooter({ text: `Id: ${resp === null || resp === void 0 ? void 0 : resp.id}` });
                            if (resp === null || resp === void 0 ? void 0 : resp.description) {
                                embed.addFields([
                                    {
                                        name: `Type: ${resp.type}`,
                                        value: `Description: ${resp.description}`,
                                    },
                                ]);
                            }
                            interaction.editReply({ embeds: [embed] });
                        }).catch((e) => {
                            if (e.code === 10063) {
                                throw { name: `Command \`${id}\` not found as global or guild command`, falseAlarm: true };
                            }
                            else {
                                console.error(e);
                            }
                        });
                    }
                    else
                        console.error(e);
                });
            });
        }
        function fetch(global) {
            var _a, _b, _c;
            return __awaiter(this, void 0, void 0, function* () {
                const commandArray = [];
                if (global) {
                    yield ((_a = client.application) === null || _a === void 0 ? void 0 : _a.commands.fetch().then((commands) => {
                        commands.forEach((command) => {
                            commandArray.push({
                                commandName: command.name,
                                commandType: command.type,
                                commandId: command.id,
                            });
                        });
                    }));
                }
                else {
                    yield ((_b = client.guilds.cache
                        .get(ids_1.guildId)) === null || _b === void 0 ? void 0 : _b.commands.fetch().then((commands) => {
                        commands.forEach((command) => {
                            commandArray.push({
                                commandName: command.name,
                                commandType: command.type,
                                commandId: command.id,
                            });
                        });
                    }));
                }
                const embed = new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default).setTitle(global ? "Global command list" : "Guild command list");
                commandArray.forEach((command) => {
                    var _a;
                    if (((_a = embed.data.fields) === null || _a === void 0 ? void 0 : _a.length) >= 24) {
                        if (embed.data.footer === null) {
                            return embed.setFooter({
                                text: `and ${commandArray.length - commandArray.indexOf(command)} more`,
                            });
                        }
                    }
                    embed.addFields([
                        {
                            name: command.commandName || "blank",
                            value: `${command.commandType}\n${command.commandId}` || "blank",
                            inline: true,
                        },
                    ]);
                });
                if (((_c = embed.data.fields) === null || _c === void 0 ? void 0 : _c.length) === 0)
                    embed.setDescription("0 commands");
                interaction.editReply({ embeds: [embed] });
            });
        }
    }),
};
