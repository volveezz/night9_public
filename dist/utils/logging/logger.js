import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { AdminDMChannelButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { channelIds } from "../../configs/ids.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
export async function sendDmLogMessage(member, text, id, interaction) {
    const dmLogChannel = interaction ? null : client.getCachedTextChannel(channelIds.directMessages);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL({ forceStatic: false }),
    })
        .setDescription(text || "nothing")
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    const components = [
        new ButtonBuilder().setCustomId(AdminDMChannelButtons.reply).setLabel("Ответить").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(AdminDMChannelButtons.delete).setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
    ];
    const messageOptions = {
        embeds: [embed],
        components: await addButtonsToMessage(components),
    };
    interaction ? interaction.editReply(messageOptions) : dmLogChannel.send(messageOptions);
}
