import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.getCachedTextChannel(ids.guildMemberChnId);
export default new Event("guildBanAdd", async (member) => {
    const joinedDate = Math.floor(member.guild.members.cache.get(member.user.id)?.joinedTimestamp / 1000);
    const embed = new EmbedBuilder()
        .setAuthor({
        name: `${member.user.username} был забанен`,
        iconURL: member.user.displayAvatarURL(),
    })
        .setColor(colors.error)
        .setFooter({ text: `Id: ${member.user.id}` })
        .addFields([
        {
            name: "Дата присоединения к серверу",
            value: String(isNaN(joinedDate) ? "не найдена" : `<t:${joinedDate}>`),
        },
    ]);
    await member.fetch();
    if (member.reason) {
        embed.addFields([
            {
                name: "Причина бана",
                value: member.reason ? member.reason : "не указана",
            },
        ]);
    }
    guildMemberChannel.send({ embeds: [embed] });
});
