import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { AuthData, LeavedUsersData, database } from "../handlers/sequelize.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
const guildMemberChannel = client.getCachedTextChannel(ids.guildMemberChnId);
export default new Event("guildMemberRemove", (member) => {
    if (member.guild.bans.cache.has(member.id))
        return;
    const embed = new EmbedBuilder()
        .setAuthor({
        name: "Участник покинул сервер",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264590767243294/6498-icon-leave.png",
    })
        .setColor(colors.error)
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
    guildMemberChannel.send({ embeds: [embed] }).then(async (m) => {
        const data = await AuthData.findByPk(member.id);
        if (!data)
            return;
        const transaction = await database.transaction();
        const embed = m.embeds[0];
        try {
            await AuthData.destroy({
                where: { discordId: data.discordId },
                transaction: transaction,
            });
            await LeavedUsersData.create({
                discordId: data.discordId,
                bungieId: data.bungieId,
                displayName: data.displayName,
                platform: data.platform,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken,
                membershipId: data.membershipId,
                timezone: data.timezone,
            }, {
                transaction,
            });
            await transaction.commit();
            embed.fields.push({
                name: "BungieId",
                value: `${data.platform}/${data.bungieId}`,
                inline: true,
            }, {
                name: "Ник в игре",
                value: data.displayName,
                inline: true,
            }, {
                name: "MembershipId",
                value: `[${data.membershipId}](https://www.bungie.net/7/ru/User/Profile/254/${data.membershipId})`,
                inline: true,
            });
            m.edit({ embeds: [embed] });
        }
        catch (error) {
            await transaction.rollback();
            embed.fields.push({
                name: "Ошибка",
                value: "Произошла ошибка во время удаления данных в БД",
            });
            console.error(`[Error code: 1209]`, error, data, transaction);
            m.edit({ embeds: [embed] });
        }
    });
});
