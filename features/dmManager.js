import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { guildId, ids } from "../base/ids.js";
import { dmChnSentMsgsLogger } from "../handlers/logger.js";
import { patchnoteGenerator } from "../handlers/patchnoteGen.js";
import { discord_activities } from "../handlers/sequelize.js";
const lastestOpenedDM = new Map();
export default (client) => {
    const dmChn = chnFetcher(ids.dmMsgsChnId);
    client.on("messageCreate", async (message) => {
        if (message.author.bot)
            return;
        if (message.channelId === ids.patchGeneratorChnId)
            return patchnoteGenerator(message);
        if (message.channel.type === ChannelType.DM) {
            if ((await message.channel.messages.fetch({ limit: 3 }))
                .map((msg) => {
                if (msg.content === "Введите новый текст оповещения" && msg.author.id === client.user?.id) {
                    return false;
                }
            })
                .includes(false)) {
                return;
            }
            const member = client.guilds.cache.get(guildId)?.members.cache.get(message.author.id);
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
        else {
            discord_activities
                .increment("messages", { by: 1, where: { authDatumDiscordId: message.author.id } })
                .catch((e) => console.log(`[Error code: 1110] Error during updating discordActivity for ${message.member?.displayName}`, e));
        }
        if (message.channel.id === dmChn.id && message.member?.permissions.has("Administrator") && message.guild) {
            try {
                await new Promise((res) => setTimeout(res, 30));
                await message.fetch();
            }
            catch (error) {
                return;
            }
            let msgContent = message.content.trim().replaceAll("\\n", "\n").replaceAll("\\*", "\n — ");
            const isEmbed = msgContent.endsWith("embed") ? true : false;
            const userId = msgContent.split(" ").shift();
            let member = message.guild.members.cache.get(userId);
            const lastDM = lastestOpenedDM.get(message.author.id);
            member ? (msgContent = msgContent.slice(userId.length).trim()) : "";
            !member && lastDM ? (member = lastDM) : "";
            if ((!lastDM || lastDM.user.id !== member?.user.id) && member)
                lastestOpenedDM.set(message.author.id, member);
            isEmbed && msgContent.length > 5 ? (msgContent = msgContent.slice(0, -5).trim()) : "";
            if (member !== undefined) {
                const sendedMsg = await (isEmbed
                    ? member.send({
                        embeds: [new EmbedBuilder().setColor(colors.default).setDescription(msgContent)],
                    })
                    : member.send(msgContent));
                message.delete();
                dmChnSentMsgsLogger(member, sendedMsg.content.length > 0 ? sendedMsg.content : sendedMsg.embeds[0].description, sendedMsg.id);
            }
            else {
                throw { name: "Ошибка. Пользователь не участник сервера", code: "[Error code: 1113]" };
            }
        }
    });
};
