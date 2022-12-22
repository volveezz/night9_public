import { EmbedBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.channels.cache.get(ids.guildMemberChnId);
export default new Event("guildMemberRemove", (member) => {
    if (member.guild.bans.cache.has(member.id))
        return;
    const embed = new EmbedBuilder()
        .setAuthor({ name: "Участник покинул сервер", iconURL: member.displayAvatarURL() })
        .setColor("Red")
        .addFields([
        { name: `Пользователь`, value: `${member.displayName}/${member}`, inline: true },
        {
            name: "Дата присоединения к серверу",
            value: String(`<t:` + Math.round(member.joinedTimestamp / 1000) + ">"),
            inline: true,
        },
    ])
        .setFooter({ text: `Id: ${member.id}` });
    if (member.roles.cache.hasAny(statusRoles.clanmember, statusRoles.member, statusRoles.kicked, statusRoles.newbie)) {
        embed.addFields({
            name: "Статус пользователя",
            value: `${member.roles.cache.has(statusRoles.clanmember)
                ? `Участник клана`
                : member.roles.cache.has(statusRoles.member)
                    ? `Участник сервера`
                    : member.roles.cache.has(statusRoles.kicked)
                        ? `Исключенный участник`
                        : member.roles.cache.has(statusRoles.newbie)
                            ? `Неизвестный`
                            : "Роли не найдены"}`,
        });
    }
    guildMemberChannel.send({ embeds: [embed] });
});
