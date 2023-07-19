import { escapeString } from "../general/utilities.js";
import { AuthData, LeavedUsersData, database } from "../persistence/sequelize.js";
async function removeUserAndSaveLeavedData({ discordMessage, discordMember }) {
    const userId = discordMember.user.id;
    const authData = await AuthData.findByPk(userId);
    if (!authData)
        return;
    const { discordId, bungieId, displayName, platform, accessToken, refreshToken, membershipId, timezone } = authData;
    const transaction = await database.transaction();
    const embed = discordMessage.embeds[0];
    try {
        await Promise.all([
            AuthData.destroy({
                where: { discordId },
                transaction,
                limit: 1,
            }),
            LeavedUsersData.create({
                discordId,
                bungieId,
                displayName,
                platform,
                accessToken,
                refreshToken,
                membershipId,
                timezone,
            }, {
                transaction,
            }),
        ]);
        await transaction.commit();
        addFieldsToEmbed(embed, {
            BungieId: `${platform}/${bungieId}`,
            "Ник в игре": escapeString(displayName),
            MembershipId: `[${membershipId}](https://www.bungie.net/7/ru/User/Profile/254/${membershipId})`,
        });
        await discordMessage.edit({ embeds: [embed] });
    }
    catch (error) {
        await transaction.rollback();
        addFieldsToEmbed(embed, { Ошибка: "Произошла ошибка во время удаления данных в БД" });
        console.error("[Error code: 1209]", error, authData);
        await discordMessage.edit({ embeds: [embed] });
    }
}
function addFieldsToEmbed(embed, fields) {
    for (const [name, value] of Object.entries(fields)) {
        embed.fields.push({ name, value, inline: true });
    }
}
export default removeUserAndSaveLeavedData;
//# sourceMappingURL=deleteLeavedUserData.js.map