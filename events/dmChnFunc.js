import { EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { dmChnSentMsgsLogger } from "../handlers/logger.js";
export default {
    callback: async (client, interaction, member, guild, _channel) => {
        if (interaction.isButton() && interaction.customId.startsWith("dmChnFunc")) {
            if (!interaction.channel)
                throw { name: "Канал не найден" };
            const buttonId = interaction.customId;
            const messageId = interaction.message.embeds[0].footer.text.split(" | MId: ").pop();
            const userId = interaction.message.embeds[0].footer.text.split(" | MId: ").shift().split("UId: ").pop();
            const replyMember = guild.members.cache.get(userId);
            if (!replyMember)
                throw { name: "[dmChnFunc error] User not found", userId };
            switch (buttonId) {
                case "dmChnFunc_reply": {
                    const embed = new EmbedBuilder()
                        .setColor(colors.default)
                        .setTitle("Введите текст сообщения для ответа")
                        .setAuthor({
                        name: `Отвечаем: ${replyMember.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")}`,
                        iconURL: replyMember.displayAvatarURL(),
                    });
                    const interactionReply = interaction.reply({ embeds: [embed] });
                    const collector = interaction.channel.createMessageCollector({
                        filter: (m) => m.author.id === member.id,
                        time: 60 * 1000 * 5,
                        max: 1,
                    });
                    collector.on("collect", async (m) => {
                        m.delete();
                        if (m.cleanContent === "cancel")
                            return collector.stop("canceled");
                        const contentText = m.cleanContent.endsWith("embed") && m.cleanContent.length > 5
                            ? m.cleanContent.slice(0, -5).replaceAll("\\n", "\n").replaceAll("\\*", "\n — ").trim()
                            : m.cleanContent.replaceAll("\\n", "\n").replaceAll("\\*", "\n — ").trim();
                        const replyContent = m.cleanContent.endsWith("embed") && m.cleanContent.length > 5
                            ? new EmbedBuilder().setColor(colors.default).setDescription(contentText)
                            : contentText;
                        if (typeof replyContent === "string") {
                            var replyMsg = replyMember.send({ content: replyContent, reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        else {
                            var replyMsg = replyMember.send({ embeds: [replyContent], reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        dmChnSentMsgsLogger(replyMember, contentText, (await replyMsg).id, interaction);
                    });
                    return;
                }
                case "dmChnFunc_delete": {
                    await interaction.deferUpdate();
                    (await (await client.users.cache.get(userId)?.createDM())?.messages.fetch(messageId))
                        ?.delete()
                        .then((m) => {
                        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(colors.kicked).setTitle("Сообщение удалено");
                        interaction.message.edit({ embeds: [embed], components: [] });
                    })
                        .catch((e) => {
                        console.error(`[Error code: 1112] dmChnFunc delete msg error`, e);
                        throw { name: "Произошла ошибка во время удаления сообщения" };
                    });
                    return;
                }
            }
        }
    },
};
