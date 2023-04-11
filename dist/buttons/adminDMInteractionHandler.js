import { EmbedBuilder } from "discord.js";
import { AdminDMChannelButtons } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { descriptionFormatter } from "../utils/general/utilities.js";
import { sendDmLogMessage } from "../utils/logging/logger.js";
export const workingCollectors = new Map();
export default {
    name: "adminDMInteractionHandler",
    run: async ({ client, interaction }) => {
        if (interaction.customId !== AdminDMChannelButtons.delete && interaction.customId !== AdminDMChannelButtons.reply)
            return;
        const buttonId = interaction.customId;
        const messageId = interaction.message.embeds[0].footer.text.split(" | MId: ").pop();
        const userId = interaction.message.embeds[0].footer.text.split(" | MId: ").shift().split("UId: ").pop();
        const replyMember = interaction.guild.members.cache.get(userId);
        const channel = (interaction.channel || (await client.getCachedGuild().channels.fetch(ids.dmMsgsChnId)));
        if (!replyMember)
            throw { name: "[adminDMInteractionHandler error] User not found", userId, errorType: UserErrors.MEMBER_NOT_FOUND };
        switch (buttonId) {
            case AdminDMChannelButtons.reply: {
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Введите текст сообщения для ответа")
                    .setAuthor({
                    name: `Отвечаем: ${nameCleaner(replyMember.displayName)}`,
                    iconURL: replyMember.displayAvatarURL(),
                });
                interaction.reply({ embeds: [embed] });
                const collector = channel.createMessageCollector({
                    filter: (m) => m.author.id === interaction.user.id,
                    time: 60 * 1000 * 5,
                    max: 1,
                });
                workingCollectors.set(interaction.user.id, collector);
                collector.on("collect", async (m) => {
                    m.delete();
                    if (m.cleanContent === "cancel")
                        return collector.stop("canceled");
                    const contentText = descriptionFormatter(m.cleanContent.endsWith("embed") && m.cleanContent.length > 5 ? m.cleanContent.slice(0, -5) : m.cleanContent);
                    const replyContent = m.cleanContent.endsWith("embed") && m.cleanContent.length > 5
                        ? new EmbedBuilder().setColor(colors.default).setDescription(contentText)
                        : contentText;
                    if (typeof replyContent === "string") {
                        var replyMsg = replyMember.send({
                            content: replyContent,
                            reply: { messageReference: messageId, failIfNotExists: false },
                        });
                    }
                    else {
                        var replyMsg = replyMember.send({
                            embeds: [replyContent],
                            reply: { messageReference: messageId, failIfNotExists: false },
                        });
                    }
                    sendDmLogMessage(replyMember, contentText, (await replyMsg).id, interaction);
                    workingCollectors.delete(interaction.user.id);
                });
                collector.on("end", (_, reason) => {
                    if (reason === "canceled")
                        interaction.deleteReply();
                    workingCollectors.delete(interaction.user.id);
                });
                return;
            }
            case AdminDMChannelButtons.delete: {
                const deferredUpdate = interaction.deferUpdate();
                const user = client.users.cache.get(userId) || (await client.users.fetch(userId));
                const DMChannel = user.dmChannel || (await user.createDM());
                const message = DMChannel.messages.cache.get(messageId) || (await DMChannel.messages.fetch(messageId));
                message
                    .delete()
                    .then((m) => {
                    const embed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(colors.kicked).setTitle("Сообщение удалено");
                    interaction.message.edit({ embeds: [embed], components: [] });
                })
                    .catch(async (e) => {
                    console.error(`[Error code: 1112] adminDMInteractionHandler delete msg error`, e);
                    await deferredUpdate;
                    throw { name: "Произошла ошибка во время удаления сообщения" };
                });
                return;
            }
        }
    },
};
