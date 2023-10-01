import { EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { client } from "../../../index.js";
import nameCleaner from "../nameClearer.js";
async function notifyUserNotMeetRequirements(authData, missedRequirementsMessage) {
    const member = await client.getMember(authData.discordId);
    const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setAuthor({
        name: "Вы не соответствуете требованиям для вступления в клан",
        iconURL: icons.warning,
    })
        .setDescription(missedRequirementsMessage);
    try {
        await member.send({ embeds: [embed] });
    }
    catch (error) {
        if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
            const channel = client.getCachedTextChannel(process.env.JOIN_REQUEST_CHANNEL_ID);
            embed.setAuthor({
                name: `${nameCleaner(member.displayName)}, вы не соответствуете требованиям для вступления в клан`,
                iconURL: member.displayAvatarURL(),
            });
            await channel.send({
                content: `<@${authData.discordId}>`,
                embeds: [embed],
            });
        }
        else {
            console.error("[Error code: 1977]", error);
        }
    }
}
export default notifyUserNotMeetRequirements;
//# sourceMappingURL=notifyUserNotMeetRequirements.js.map