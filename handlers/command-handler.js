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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutocompleteHandler = exports.EventHandler = exports.Command = void 0;
const discord_js_1 = require("discord.js");
const ids_1 = require("../base/ids");
const file_reader_1 = __importDefault(require("./file-reader"));
const commands = {};
const events = {};
class Command {
}
exports.Command = Command;
class EventHandler {
}
exports.EventHandler = EventHandler;
class AutocompleteHandler {
}
exports.AutocompleteHandler = AutocompleteHandler;
exports.default = (client, commandDir, eventsDir) => __awaiter(void 0, void 0, void 0, function* () {
    const files = (0, file_reader_1.default)(commandDir);
    const eventsFiles = (0, file_reader_1.default)(eventsDir);
    yield new Promise((res) => setTimeout(res, 1000));
    for (const command of files) {
        const { default: commandFile } = require(`../commands/${command}`);
        const { name: commandName, description: commandDescription, global, options, defaultMemberPermissions, type, nameLocalizations } = commandFile;
        commands[commandName.toLowerCase()] = commandFile;
    }
    for (const event of eventsFiles) {
        const { default: commandFile } = require(`../events/${event}`);
        events[event.slice(0, -3).toLowerCase()] = commandFile;
    }
    client.on("interactionCreate", (interaction) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if ((interaction.isChatInputCommand() || interaction.isUserContextMenuCommand()) && interaction.channel !== null) {
            const { commandName } = interaction;
            const guild = interaction.guild || client.guilds.cache.get(ids_1.guildId) || (yield client.guilds.fetch(ids_1.guildId));
            const memberPre = interaction.member || (guild === null || guild === void 0 ? void 0 : guild.members.cache.get(interaction.user.id)) || (yield guild.members.fetch(interaction.user.id));
            const channel = interaction.channel;
            const member = memberPre instanceof discord_js_1.GuildMember ? memberPre : yield guild.members.fetch(memberPre.user.id);
            if (!commands[commandName])
                return;
            console.log(`${member.displayName} used ${commandName} ${((_a = interaction === null || interaction === void 0 ? void 0 : interaction.options) === null || _a === void 0 ? void 0 : _a.data)
                ? interaction.options.data.map((d) => {
                    return `${d.name}${d.value !== undefined ? ` : ${d.value}` : ""}`;
                })
                : "no options"}`);
            try {
                commands[commandName].callback(client, interaction, member, guild, channel).catch((err) => {
                    var _a, _b, _c, _d;
                    const embed = new discord_js_1.EmbedBuilder().setColor("Red");
                    console.error(`Slash command error`, err);
                    if (!err.stack && err.name) {
                        embed.setTitle(err.name);
                        if (err.message)
                            embed.setDescription(err === null || err === void 0 ? void 0 : err.message);
                    }
                    else {
                        embed.setTitle(`${(err === null || err === void 0 ? void 0 : err.code)
                            ? `Error ${err.code}`
                            : ((_a = err.error) === null || _a === void 0 ? void 0 : _a.ErrorCode)
                                ? `Bungie request error ${(_b = err.error) === null || _b === void 0 ? void 0 : _b.ErrorCode}`
                                : ((_c = err.parent) === null || _c === void 0 ? void 0 : _c.code)
                                    ? `DB error ${(_d = err.parent) === null || _d === void 0 ? void 0 : _d.code}`
                                    : `Error ${err.name}`}`);
                    }
                    if (interaction.deferred) {
                        interaction.editReply({ embeds: [embed] });
                    }
                    else {
                        interaction.reply({ embeds: [embed] });
                    }
                    return;
                });
            }
            catch (error) {
                console.error("Command error:", error);
            }
        }
        else if (interaction.isButton() || interaction.isSelectMenu()) {
            const { customId } = interaction;
            const commandName = ((_b = customId.split("_").shift()) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || "blank";
            if (!events[commandName])
                return;
            events[commandName].callback(client, interaction, interaction.member, interaction.guild, interaction.channel).catch((e) => {
                if (Object.keys(e).length >= 3) {
                    const embed = new discord_js_1.EmbedBuilder().setColor("Red");
                    embed.setTitle(e === null || e === void 0 ? void 0 : e.name);
                    interaction.followUp({ ephemeral: true, embeds: [embed] });
                }
            });
        }
        else if (interaction.type === discord_js_1.InteractionType.ApplicationCommandAutocomplete) {
            if (interaction.commandName === "рейд") {
                events["raidautocomplete"].callback(client, interaction, interaction.member, interaction.guild, interaction.channel).catch((e) => {
                    console.error(e);
                });
            }
        }
        else if (interaction.isMessageContextMenuCommand() && interaction.commandName === "stats") {
            commands["stats"].callback(client, interaction, interaction.member, interaction.guild, interaction.channel).catch((e) => {
                console.error(`Slash command error`, e);
                const embed = new discord_js_1.EmbedBuilder().setColor("Red");
                embed.setTitle(e === null || e === void 0 ? void 0 : e.name);
                interaction.followUp({ ephemeral: true, embeds: [embed] });
            });
        }
    }));
});
