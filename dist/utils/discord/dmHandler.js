import { ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import { escapeString } from "../general/utilities.js";
let dmChannel = null;
async function sendAdminNotification(message, member) {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Получено новое сообщение")
        .setAuthor({
        name: `Отправитель: ${member.displayName}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: message.author.displayAvatarURL(),
    })
        .setFooter({ text: `UId: ${message.author.id} | MId: ${message.id}` });
    if (message.embeds.length > 0 && message.embeds[0].image?.url) {
        try {
            embed.setImage(message.embeds[0].image.url);
        }
        catch (error) {
            console.error("[Error code: 2008] Failed to add image to embed");
        }
    }
    if (message.cleanContent.length > 0) {
        embed.setDescription(escapeString(message.cleanContent));
    }
    if (message.attachments.size > 0) {
        embed.addFields([{ name: "Вложения", value: message.attachments.map((att) => att.url).join("\n") }]);
    }
    if (message.stickers.size > 0) {
        embed.addFields([{ name: "Стикеры", value: message.stickers.map((sticker) => sticker.name + ":" + sticker.description).join("\n") }]);
    }
    const buttons = [new ButtonBuilder().setCustomId("adminDirectMessageButton_reply").setLabel("Reply").setStyle(ButtonStyle.Success)];
    if (!dmChannel) {
        const channelId = process.env.DIRECT_MESSAGES_CHANNEL_ID;
        dmChannel = client.getCachedTextChannel(channelId) || (await client.getTextChannel(channelId));
    }
    await dmChannel.send({
        embeds: [embed],
        components: addButtonsToMessage(buttons),
    });
}
export async function handleDm(message) {
    if (message.channel.type !== ChannelType.DM)
        return;
    const member = client.getCachedMembers().get(message.author.id) || (await client.getMember(message.author.id));
    await sendAdminNotification(message, member);
}
//# sourceMappingURL=dmHandler.js.map