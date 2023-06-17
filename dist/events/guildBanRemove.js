import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.getCachedTextChannel(channelIds.guildMember);
export default new Event("guildBanRemove", (member) => {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `${member.user.username} разбанен`,
        iconURL: member.user.displayAvatarURL({ forceStatic: false }),
    })
        .setFooter({ text: `Id: ${member.user.id}` });
    if (member.reason) {
        embed.addFields([
            {
                name: "Причина бана",
                value: member.reason.length > 1020 ? "*слишком длинная причина бана*" : member.reason,
            },
        ]);
    }
    guildMemberChannel.send({ embeds: [embed] });
});
