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
exports.default = {
    callback: (client, interaction, member, guild, _channel) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        if (interaction.isButton() && interaction.customId.startsWith("dmChnFunc")) {
            if (!interaction.channel)
                throw { name: "Канал не найден" };
            const buttonId = interaction.customId;
            const messageId = interaction.message.embeds[0].footer.text.split(" | MId: ").pop();
            const userId = interaction.message.embeds[0].footer.text.split(" | MId: ").shift().split("UId: ").pop();
            const replyMember = guild.members.cache.get(userId);
            if (!replyMember)
                throw { name: "User not found, dmfunc" };
            switch (buttonId) {
                case "dmChnFunc_reply": {
                    const embed = new discord_js_1.EmbedBuilder()
                        .setColor(colors_1.colors.default)
                        .setTitle("Введите текст сообщения для ответа")
                        .setAuthor({ name: replyMember.displayName, iconURL: replyMember.displayAvatarURL() });
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    const collector = interaction.channel.createMessageCollector({
                        filter: (m) => m.author.id === member.id,
                        time: 60 * 1000 * 2,
                        max: 1,
                    });
                    collector.on("collect", (m) => __awaiter(void 0, void 0, void 0, function* () {
                        m.delete();
                        if (m.cleanContent === "cancel")
                            return collector.stop("canceled");
                        const replyContent = m.cleanContent.endsWith("embed") && m.cleanContent.length > 5
                            ? new discord_js_1.EmbedBuilder().setColor(colors_1.colors.default).setDescription(m.cleanContent.slice(0, -5))
                            : m.cleanContent;
                        if (typeof replyContent === "string") {
                            var replyMsg = replyMember.send({ content: replyContent, reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        else {
                            var replyMsg = replyMember.send({ embeds: [replyContent], reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        (0, logger_1.dmChnSentMsgsLogger)(replyMember, m.cleanContent.endsWith("embed") && m.cleanContent.length > 5 ? m.cleanContent.slice(0, -5) : m.cleanContent, (yield replyMsg).id);
                    }));
                    return;
                }
                case "dmChnFunc_delete": {
                    yield interaction.deferUpdate();
                    yield ((_c = (yield ((_b = (yield ((_a = client.users.cache.get(userId)) === null || _a === void 0 ? void 0 : _a.createDM()))) === null || _b === void 0 ? void 0 : _b.messages.fetch(messageId)))) === null || _c === void 0 ? void 0 : _c.delete().then((m) => {
                        const embed = discord_js_1.EmbedBuilder.from(interaction.message.embeds[0]).setColor(colors_1.colors.kicked).setTitle("Сообщение удалено");
                        interaction.message.edit({ embeds: [embed], components: [] });
                    }).catch((e) => {
                        console.error(`dmChnFunc delete msg error`, e);
                        throw { name: "Произошла ошибка во время удаления сообщения" };
                    }));
                    return;
                }
            }
        }
    }),
};
