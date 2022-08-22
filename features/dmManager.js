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
const channels_1 = require("../base/channels");
const colors_1 = require("../base/colors");
const ids_1 = require("../base/ids");
const sequelize_1 = require("../handlers/sequelize");
exports.default = (client) => {
    const dmChn = (0, channels_1.chnFetcher)(ids_1.ids.dmMsgsChnId);
    client.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        if (message.author.bot)
            return;
        if (message.channel.type === discord_js_1.ChannelType.DM) {
            if ((yield message.channel.messages.fetch({ limit: 3 }))
                .map((msg) => {
                var _a;
                if (msg.content === "Введите новый текст оповещения" && msg.author.id === ((_a = client.user) === null || _a === void 0 ? void 0 : _a.id)) {
                    return false;
                }
            })
                .includes(false)) {
                return;
            }
            const member = (_a = client.guilds.cache.get(ids_1.guildId)) === null || _a === void 0 ? void 0 : _a.members.cache.get(message.author.id);
            const embed = new discord_js_1.EmbedBuilder()
                .setColor("Green")
                .setTitle("Получено новое сообщение")
                .setAuthor({
                name: `Отправитель: ${member === null || member === void 0 ? void 0 : member.displayName}${(member === null || member === void 0 ? void 0 : member.user.username) !== (member === null || member === void 0 ? void 0 : member.displayName) ? ` (${member === null || member === void 0 ? void 0 : member.user.username})` : ""}`,
                iconURL: message.author.displayAvatarURL(),
            })
                .setTimestamp();
            if (message.cleanContent.length > 0) {
                embed.setDescription(message.cleanContent);
            }
            if (message.attachments && message.attachments.size && message.attachments.size > 0) {
                embed.addFields([
                    {
                        name: "Вложения",
                        value: message.attachments
                            .map((att) => {
                            att.url;
                        })
                            .join("\n"),
                    },
                ]);
            }
            if (message.stickers.size > 0) {
                embed.addFields([
                    {
                        name: "Стикеры",
                        value: message.stickers
                            .map((sticker) => {
                            sticker.name + ":" + sticker.description;
                        })
                            .join("\n"),
                    },
                ]);
            }
            dmChn.send({ embeds: [embed] });
        }
        else {
            sequelize_1.discord_activities
                .increment("messages", { by: 1, where: { authDatumDiscordId: message.author.id } })
                .catch((e) => console.log(`Error during updating discordActivity for ${message.member.displayName}`, e));
        }
        if (message.channel.id === dmChn.id && ((_b = message.member) === null || _b === void 0 ? void 0 : _b.permissions.has("Administrator")) && message.guild && message.content.length > 15) {
            const msgContent = message.content.trim().split(" ");
            const userId = msgContent.shift();
            const embedCheck = msgContent.pop();
            const isEmbed = embedCheck === "embed" ? true : false;
            const member = userId ? message.guild.members.cache.get(userId) : undefined;
            if (member) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_1.colors.default)
                    .setTitle("Отправлено сообщение")
                    .setAuthor({
                    name: `Отправлено: ${member.displayName}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
                    iconURL: member.displayAvatarURL(),
                })
                    .setTimestamp()
                    .setFooter({ text: `discordId: ${member.id}` });
                const sendedMsg = yield msgSend(isEmbed);
                sendedMsg.content.length > 0 ? embed.setDescription(sendedMsg.content) : embed.setDescription(sendedMsg.embeds[0].description);
                dmChn.send({ embeds: [embed] });
                function msgSend(isEmbed) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (isEmbed) {
                            return member.send({
                                embeds: [new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default).setDescription(msgContent.join(" "))],
                            });
                        }
                        else {
                            msgContent.push(embedCheck);
                            return member.send(msgContent.join(" "));
                        }
                    });
                }
            }
        }
    }));
};
