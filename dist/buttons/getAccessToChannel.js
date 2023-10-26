import { ChannelType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Button } from "../structures/button.js";
import { updateChannelPermissionsForUser } from "../utils/discord/updateChannelPermissionsForUser.js";
function isThreadChannel(channel) {
    return [ChannelType.PublicThread, ChannelType.PrivateThread].includes(channel.type);
}
const ButtonCommand = new Button({
    name: "getAccessToChannel",
    run: async ({ client, interaction }) => {
        const channelId = interaction.customId.split("_")[1];
        if (!channelId) {
            throw { name: "Ошибка при указании Id канала", message: "Сообщите администрации об этой ошибке" };
        }
        const channel = client.getCachedGuildChannel(channelId);
        if (!channel) {
            throw { errorType: "CHANNEL_NOT_FOUND" };
        }
        else if (isThreadChannel(channel)) {
            return;
        }
        const permissionsStatus = !channel.permissionsFor(interaction.user.id)?.has("ViewChannel");
        await updateChannelPermissionsForUser(channel, interaction.user.id, permissionsStatus);
        const embed = new EmbedBuilder().setColor(permissionsStatus ? colors.success : colors.error).setAuthor({
            name: `Вы ${permissionsStatus ? "получили" : "забрали свой"} доступ к каналу ${channel.name}`,
            iconURL: permissionsStatus ? icons.success : icons.close,
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
});
export default ButtonCommand;
//# sourceMappingURL=getAccessToChannel.js.map