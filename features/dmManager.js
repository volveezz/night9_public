import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { colors } from "../base/colors.js";
import { guildId, ids } from "../base/ids.js";
import { dmChnSentMsgsLogger } from "../handlers/logger.js";
import { discord_activities } from "../handlers/sequelize.js";
export default (client) => {
    const dmChn = chnFetcher(ids.dmMsgsChnId);
    client.on("messageCreate", async (message) => {
        if (message.author.bot)
            return;
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
                .catch((e) => console.log(`Error during updating discordActivity for ${message.member.displayName}`, e));
        }
        if (message.channel.id === dmChn.id && message.member?.permissions.has("Administrator") && message.guild && message.content.length > 18) {
            const msgContent = message.content.trim().split(" ");
            const userId = msgContent.shift();
            const embedCheck = msgContent.pop();
            const isEmbed = embedCheck === "embed" && msgContent.length !== 0 ? true : false;
            const member = userId ? message.guild.members.cache.get(userId) : undefined;
            if (member) {
                const sendedMsg = await msgSend(isEmbed);
                message.delete();
                dmChnSentMsgsLogger(member, sendedMsg.content.length > 0 ? sendedMsg.content : sendedMsg.embeds[0].description, sendedMsg.id);
                async function msgSend(isEmbed) {
                    if (isEmbed) {
                        return member.send({
                            embeds: [new EmbedBuilder().setColor(colors.default).setDescription(msgContent.join(" "))],
                        });
                    }
                    else {
                        msgContent.push(embedCheck);
                        return member.send(msgContent.join(" "));
                    }
                }
            }
        }
    });
};
