import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import deleteLeavedUserData from "../utils/discord/deleteLeavedUserData.js";
import kickLeavedUserFromRaids from "../utils/general/raidFunctions/kickLeavedMemberFromRaids.js";
import { completedRaidsData } from "../utils/persistence/dataStore.js";
let guildMemberChannel = null;
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
            value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}>` : `*не найдена*`,
            inline: true,
        },
    ])
        .setFooter({ text: `Id: ${member.id}` });
    if (member.roles.cache.hasAny(process.env.CLANMEMBER, process.env.MEMBER, process.env.KICKED, process.env.NEWBIE)) {
        embed.addFields({
            name: "Статус пользователя",
            value: `${member.roles.cache.has(process.env.CLANMEMBER)
                ? "Участник клана"
                : member.roles.cache.has(process.env.MEMBER)
                    ? "Участник сервера"
                    : member.roles.cache.has(process.env.KICKED)
                        ? "Исключенный участник"
                        : member.roles.cache.has(process.env.NEWBIE)
                            ? "Неизвестный"
                            : "Роли не найдены"}`,
        });
    }
    if (!guildMemberChannel)
        guildMemberChannel =
            client.getCachedTextChannel(process.env.GUILD_MEMBER_CHANNEL_ID) ||
                (await client.getTextChannel(process.env.GUILD_MEMBER_CHANNEL_ID));
    completedRaidsData.delete(member.id);
    const message = await guildMemberChannel.send({ embeds: [embed] });
    await deleteLeavedUserData({ discordMember: member, discordMessage: message });
    kickLeavedUserFromRaids(member);
});
//# sourceMappingURL=guildMemberRemove.js.map