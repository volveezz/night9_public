import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import deleteLeavedUserData from "../utils/discord/deleteLeavedUserData.js";
const guildMemberChannel = client.getCachedTextChannel(channelIds.guildMember);
export default new Event("guildMemberRemove", async (member) => {
    if (member.guild.bans.cache.has(member.id))
        return;
    const embed = new EmbedBuilder()
        .setAuthor({
        name: "Участник покинул сервер",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264590767243294/6498-icon-leave.png",
    })
        .setColor(colors.error)
        .addFields([
        { name: "Пользователь", value: `${member.displayName}/${member}`, inline: true },
        {
            name: "Дата присоединения к серверу",
            value: String("<t:" + Math.round(member.joinedTimestamp / 1000) + ">"),
            inline: true,
        },
    ])
        .setFooter({ text: `Id: ${member.id}` });
    if (member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member, statusRoles.kicked, statusRoles.newbie)) {
        embed.addFields({
            name: "Статус пользователя",
            value: `${member.roles.cache.has(statusRoles.clanmember)
                ? "Участник клана"
                : member.roles.cache.has(statusRoles.member)
                    ? "Участник сервера"
                    : member.roles.cache.has(statusRoles.kicked)
                        ? "Исключенный участник"
                        : member.roles.cache.has(statusRoles.newbie)
                            ? "Неизвестный"
                            : "Роли не найдены"}`,
        });
    }
    const message = await guildMemberChannel.send({ embeds: [embed] });
    await deleteLeavedUserData({ member, message });
});
