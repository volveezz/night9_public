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
                        .setAuthor({ name: replyMember.displayName.replace(/\[[+](?:\d|\d\d)]/, ""), iconURL: replyMember.displayAvatarURL() });
                    interaction.reply({ embeds: [embed], ephemeral: true });
                    const collector = interaction.channel.createMessageCollector({
                        filter: (m) => m.author.id === member.id,
                        time: 60 * 1000 * 2,
                        max: 1,
                    });
                    collector.on("collect", async (m) => {
                        m.delete();
                        if (m.cleanContent === "cancel")
                            return collector.stop("canceled");
                        const replyContent = m.cleanContent.endsWith("embed") && m.cleanContent.length > 5
                            ? new EmbedBuilder().setColor(colors.default).setDescription(m.cleanContent.slice(0, -5))
                            : m.cleanContent;
                        if (typeof replyContent === "string") {
                            var replyMsg = replyMember.send({ content: replyContent, reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        else {
                            var replyMsg = replyMember.send({ embeds: [replyContent], reply: { messageReference: messageId, failIfNotExists: false } });
                        }
                        dmChnSentMsgsLogger(replyMember, m.cleanContent.endsWith("embed") && m.cleanContent.length > 5 ? m.cleanContent.slice(0, -5) : m.cleanContent, (await replyMsg).id);
                    });
                    return;
                }
                case "dmChnFunc_delete": {
                    await interaction.deferUpdate();
                    await (await (await client.users.cache.get(userId)?.createDM())?.messages.fetch(messageId))
                        ?.delete()
                        .then((m) => {
                        const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(colors.kicked).setTitle("Сообщение удалено");
                        interaction.message.edit({ embeds: [embed], components: [] });
                    })
                        .catch((e) => {
                        console.error(`dmChnFunc delete msg error`, e);
                        throw { name: "Произошла ошибка во время удаления сообщения" };
                    });
                    return;
                }
            }
        }
    },
};
