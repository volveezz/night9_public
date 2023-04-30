import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { RegisterButtons } from "../configs/Buttons.js";
import colors from "../configs/colors.js";
import { channelIds } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { client } from "../index.js";
import { apiStatus } from "../structures/apiStatus.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { AuthData, LeavedUsersData, database } from "../utils/persistence/sequelize.js";
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/Token/";
export async function requestUpdateTokens({ userId, table = AuthData, refresh_token, }) {
    let refreshToken = refresh_token;
    if (!refreshToken) {
        if (table === AuthData) {
            refreshToken = (await AuthData.findByPk(userId, { attributes: ["refreshToken"] }))?.refreshToken;
        }
        else if (table === LeavedUsersData) {
            refreshToken = (await LeavedUsersData.findByPk(userId, { attributes: ["refreshToken"] }))?.refreshToken;
        }
    }
    if (!refreshToken) {
        console.error("[Error code: 1698]", userId, table, refreshToken);
        return null;
    }
    const form = new URLSearchParams(Object.entries({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    }));
    const fetchRequest = (await fetch(BUNGIE_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${process.env.AUTH}`,
        },
        body: form,
    }));
    const request = await fetchRequest.json();
    return request;
}
async function bungieGrantRequest(row, table, t, retry = false) {
    const request = await requestUpdateTokens({ refresh_token: row.refreshToken, table: table === 1 ? AuthData : LeavedUsersData });
    if (request && request.access_token) {
        await (table === 1 ? AuthData : LeavedUsersData).update({ accessToken: request.access_token, refreshToken: request.refresh_token }, { where: { bungieId: row.bungieId }, transaction: t });
    }
    else {
        if (request && request.error_description === "SystemDisabled") {
            apiStatus.status = 5;
        }
        if (retry === false) {
            bungieGrantRequest(row, table, t, true);
            console.error(`[Error code: 1420] For ${row.bungieId}\n`, request);
        }
        else {
            console.error(`[Error code: 1231] For ${row.bungieId}\n`, request);
            if (request.error_description === "AuthorizationRecordRevoked") {
                await (table === 1 ? AuthData : LeavedUsersData).destroy({ where: { bungieId: row.bungieId }, transaction: t, limit: 1 });
                console.log(`The user (${row.bungieId}) was deleted from the ${table === 1 ? "main table" : "secondary table"} because he revoked the authorization token`);
            }
            else if (request.error_description === "AuthorizationRecordExpired") {
                if (table === 1) {
                    const { discordId } = (await AuthData.findOne({ where: { bungieId: row.bungieId }, attributes: ["discordId"] }));
                    await AuthData.destroy({ where: { bungieId: row.bungieId }, transaction: t, limit: 1 }).then(async (r) => {
                        console.log(`The user (${row.bungieId}) was deleted from the main table because his authorization token expired`);
                        const embed = new EmbedBuilder()
                            .setColor(colors.warning)
                            .setTitle("Необходима повторная регистрация")
                            .setDescription("У вашего авторизационного токена истек срок годности. Зарегистрируйтесь повторно");
                        const registerButton = new ButtonBuilder()
                            .setCustomId(RegisterButtons.register)
                            .setLabel("Регистрация")
                            .setStyle(ButtonStyle.Success);
                        const components = await addButtonComponentsToMessage([registerButton]);
                        const member = client.getCachedMembers().get(discordId) || (await client.getCachedGuild().members.fetch(discordId));
                        const user = member ||
                            client.users.cache.get(discordId) ||
                            (await client.users.fetch(discordId)) ||
                            (await client.getCachedGuild().members.fetch(discordId));
                        if (member) {
                            await member.roles.set([statusRoles.newbie]).catch(async (e) => {
                                console.error(`[Error code: 1635] An error occurred while deleting roles of ${member.displayName || member.user.username}\n`, e);
                                const botHighestRole = member.guild.roles.highest.position;
                                const removableRoles = member.roles.cache.filter((role) => {
                                    return role.editable && !role.managed && role.position < botHighestRole;
                                });
                                await member.roles.remove(removableRoles).catch((e) => {
                                    console.error(`[Error code: 1712] An error occurred while removing roles of ${member.displayName || member.user.username}\n`, e);
                                });
                            });
                        }
                        user.send({ embeds: [embed], components }).catch(async (e) => {
                            if (e.code === 50007) {
                                const botChannel = client.getCachedTextChannel(channelIds.publicBotSpam) ||
                                    (await client.getCachedGuild().channels.fetch(channelIds.publicBotSpam));
                                embed.setAuthor({
                                    name: `${nameCleaner(user.displayName ? user.displayName : user.user?.username || user.username)}`,
                                    iconURL: user.displayAvatarURL(),
                                });
                                botChannel.send({ embeds: [embed], components });
                            }
                        });
                    });
                }
                else {
                    await LeavedUsersData.destroy({ where: { bungieId: row.bungieId }, transaction: t, limit: 1 }).then((r) => {
                        console.log(`The user (${row.bungieId}) was deleted in the secondary table because his authorization token has expired`);
                    });
                }
            }
        }
    }
}
async function refreshTokens(table) {
    const data = table === 1
        ? await AuthData.findAll({ attributes: ["bungieId", "refreshToken"] })
        : await LeavedUsersData.findAll({ attributes: ["bungieId", "refreshToken"] });
    const t = await database.transaction();
    for (const row of data) {
        try {
            if (!row.refreshToken)
                return;
            await bungieGrantRequest(row, table, t, false);
        }
        catch (error) {
            console.error(`[Error code: 1242] Error during refreshing token of ${row.bungieId}: ${error}`);
        }
    }
    try {
        await t.commit();
    }
    catch (error) {
        await t.rollback();
        console.error("[Error code: 1421] Error during commiting DB changes");
    }
}
async function tokenManagment() {
    if (process.env.DEV_BUILD === "dev")
        return;
    await refreshTokens(1);
    await refreshTokens(2);
    setInterval(async () => await refreshTokens(1), 1000 * 60 * 50);
}
export default tokenManagment;
