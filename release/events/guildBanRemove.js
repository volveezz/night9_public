import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.getCachedTextChannel(ids.guildMemberChnId);
export default new Event("guildBanRemove", (member) => {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: `${member.user.username} разбанен`,
        iconURL: member.user.displayAvatarURL(),
    })
        .setFooter({ text: `Id: ${member.user.id}` });
    if (member.reason) {
        embed.addFields([
            {
                name: "Причина бана",
                value: member.reason.length > 1000 ? "*слишком длинная причина бана*" : member.reason,
            },
        ]);
    }
    guildMemberChannel.send({ embeds: [embed] });
});
