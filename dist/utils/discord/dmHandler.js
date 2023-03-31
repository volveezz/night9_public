import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder } from "discord.js";
import { AdminDMChannelButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { guildId, ids } from "../../configs/ids.js";
import { client } from "../../index.js";
import { escapeString } from "../general/utilities.js";
const dmChannel = client.getCachedTextChannel(ids.dmMsgsChnId) ||
    (client.getCachedGuild() || client.guilds.cache.get(guildId))?.channels.cache.get(ids.dmMsgsChnId);
export async function dmHandler(message) {
    if (message.channel.type !== ChannelType.DM)
        return;
    if ((await message.channel.messages.fetch({ limit: 5 }))
        .map((msg) => {
        if (msg.content === "Введите новый текст оповещения" && msg.author.id === client.user.id) {
            return false;
        }
    })
        .includes(false)) {
        return;
    }
    const member = client.getCachedMembers().get(message.author.id) || (await client.getCachedGuild().members.fetch(message.author.id));
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Получено новое сообщение")
        .setAuthor({
        name: `Отправитель: ${member.displayName}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: message.author.displayAvatarURL(),
    })
        .setFooter({ text: `UId: ${message.author.id} | MId: ${message.id}` })
        .setTimestamp();
    if (message.cleanContent.length > 0) {
        embed.setDescription(escapeString(message.cleanContent) || "nothing");
    }
    if (message.attachments && message.attachments.size && message.attachments.size > 0) {
        embed.addFields([
            {
                name: "Вложения",
                value: message.attachments
                    .map((att) => {
                    return att.url;
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
    dmChannel.send({
        embeds: [embed],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [new ButtonBuilder().setCustomId(AdminDMChannelButtons.reply).setLabel("Ответить").setStyle(ButtonStyle.Success)],
            },
        ],
    });
}
