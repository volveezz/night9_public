import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
export async function sendDmLogMessage(member, text, id, interaction) {
    const dmLogChannel = interaction ? null : client.getCachedTextChannel(process.env.DIRECT_MESSAGES_CHANNEL_ID);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL(),
    })
        .setDescription(text || "nothing")
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    const components = [
        new ButtonBuilder().setCustomId("adminDirectMessageButton_reply").setLabel("Ответить").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("adminDirectMessageButton_delete").setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
    ];
    const messageOptions = {
        embeds: [embed],
        components: addButtonsToMessage(components),
    };
    interaction ? interaction.editReply(messageOptions) : dmLogChannel.send(messageOptions);
}
//# sourceMappingURL=logger.js.map