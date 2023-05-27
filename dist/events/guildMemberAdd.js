import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import guildNicknameManagement from "../core/guildNicknameManagement.js";
import { requestUpdateTokens } from "../core/tokenManagement.js";
import { checkIndiviualUserStatistics } from "../core/userStatisticsManagement.js";
import { client } from "../index.js";
import { Event } from "../structures/event.js";
import welcomeMessage from "../utils/discord/welcomeMessage.js";
import { escapeString } from "../utils/general/utilities.js";
import { AuthData, InitData, LeavedUsersData, database } from "../utils/persistence/sequelize.js";
const guildMemberChannel = await client.getAsyncTextChannel(channelIds.guildMember);
export default new Event("guildMemberAdd", async (member) => {
    welcomeMessage(member);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setAuthor({
        name: "Присоединился новый участник",
        iconURL: "https://cdn.discordapp.com/attachments/679191036849029167/1086264591706771488/3600-icon-join.png",
    })
        .setFooter({ text: `Id: ${member.id}` })
        .setDescription(`<@${member.id}> ${member.user.username}#${member.user.discriminator}`)
        .addFields({
        name: "Дата создания аккаунта",
        value: `<t:${Math.round(member.user.createdTimestamp / 1000)}>`,
    })
        .setThumbnail(member.displayAvatarURL());
    if (member.communicationDisabledUntil != null) {
        embed.addFields({
            name: "Тайм-аут до",
            value: member.communicationDisabledUntilTimestamp
                ? `<t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}>`
                : "*не найден*",
        });
    }
    const message = await guildMemberChannel.send({ embeds: [embed] });
    const data = await LeavedUsersData.findOne({
        where: { discordId: member.id },
    });
    if (!data)
        return;
    const transaction = await database.transaction();
    const loggedEmbed = EmbedBuilder.from(message.embeds[0]);
    var authorizationData = {
        refreshToken: "",
        accessToken: "",
    };
    try {
        const request = await requestUpdateTokens({ refresh_token: data.refreshToken, userId: data.discordId, table: LeavedUsersData });
        if (request?.refresh_token) {
            authorizationData.refreshToken = request.refresh_token;
            authorizationData.accessToken = request.access_token;
        }
    }
    catch (error) {
        console.error("[Error code: 1701]", error);
    }
    try {
        await AuthData.create({
            discordId: data.discordId,
            bungieId: data.bungieId,
            displayName: data.displayName,
            platform: data.platform ?? 3,
            accessToken: authorizationData.accessToken || data.accessToken,
            refreshToken: authorizationData.refreshToken || data.refreshToken,
            membershipId: data.membershipId,
            timezone: data.timezone ?? 3,
        }, {
            transaction,
        });
        await LeavedUsersData.destroy({
            where: { discordId: data.discordId },
            transaction,
            limit: 1,
        });
        InitData.destroy({ where: { discordId: data.discordId }, limit: 1 });
        loggedEmbed.addFields({
            name: "Данные аккаунта восстановлены",
            value: `${escapeString(data.displayName)} ([${data.platform}/${data.bungieId}](https://www.bungie.net/7/ru/User/Profile/${data.platform}/${data.bungieId}))`,
        });
        loggedEmbed.addFields({
            name: "Токен авторизации",
            value: `Обновлен: ${authorizationData.accessToken?.length} / ${authorizationData.refreshToken?.length}`,
        });
        await transaction.commit();
        await message.edit({ embeds: [loggedEmbed] });
        await member.roles.set([statusRoles.member, statusRoles.verified]);
        try {
            guildNicknameManagement();
            checkIndiviualUserStatistics(member.id);
        }
        catch (error) {
            console.error("[Error code: 1809]", error);
        }
    }
    catch (error) {
        await transaction.rollback();
        loggedEmbed.addFields({
            name: "Ошибка",
            value: "Во время восстановления данных произошла ошибка",
        });
        console.error("[Error code: 1131]", error, data?.discordId, data?.bungieId, transaction);
        await message.edit({ embeds: [loggedEmbed] });
    }
});
