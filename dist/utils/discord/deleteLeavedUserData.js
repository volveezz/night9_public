import { escapeString } from "../general/utilities.js";
import { AuthData, LeavedUsersData, database } from "../persistence/sequelize.js";
const deletedUsers = new Set();
async function deleteLeavedUserData({ message, member }) {
    const userId = member.user.id;
    if (deletedUsers.has(userId))
        return;
    deletedUsers.add(userId);
    setTimeout(() => deletedUsers.delete(userId), 10000);
    const data = await AuthData.findByPk(userId);
    if (!data)
        return;
    const transaction = await database.transaction();
    const embed = message.embeds[0];
    try {
        await AuthData.destroy({
            where: { discordId: data.discordId },
            transaction,
            limit: 1,
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
            value: `${escapeString(data.displayName)}`,
            inline: true,
        }, {
            name: "MembershipId",
            value: `[${data.membershipId}](https://www.bungie.net/7/ru/User/Profile/254/${data.membershipId})`,
            inline: true,
        });
        await message.edit({ embeds: [embed] });
    }
    catch (error) {
        await transaction.rollback();
        embed.fields.push({
            name: "Ошибка",
            value: "Произошла ошибка во время удаления данных в БД",
        });
        console.error("[Error code: 1209]", error, data);
        await message.edit({ embeds: [embed] });
    }
}
export default deleteLeavedUserData;
