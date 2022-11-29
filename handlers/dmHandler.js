import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { guildId, ids } from "../base/ids.js";
import { BotClient } from "../index.js";
const dmChn = chnFetcher(ids.dmMsgsChnId);
export async function dmHandler(message) {
    if (message.channel.type !== ChannelType.DM)
        return;
    if ((await message.channel.messages.fetch({ limit: 3 }))
        .map((msg) => {
        if (msg.content === "Введите новый текст оповещения" && msg.author.id === BotClient.user?.id) {
            return false;
        }
    })
        .includes(false)) {
        return;
    }
    const member = BotClient.guilds.cache.get(guildId)?.members.cache.get(message.author.id);
    const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Получено новое сообщение")
        .setAuthor({
        name: `Отправитель: ${member?.displayName}${member?.user.username !== member?.displayName ? ` (${member?.user.username})` : ""}`,
        iconURL: message.author.displayAvatarURL(),
    })
        .setFooter({ text: `UId: ${message.author.id} | MId: ${message.id}` })
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
    dmChn.send({
        embeds: [embed],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [new ButtonBuilder().setCustomId("dmChnFunc_reply").setLabel("Ответить").setStyle(ButtonStyle.Success)],
            },
        ],
    });
}
