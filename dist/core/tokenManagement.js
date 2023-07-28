import { ButtonBuilder, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import fetch from "node-fetch";
import colors from "../configs/colors.js";
import { client } from "../index.js";
import { UpdateTokenRefreshTime } from "../structures/tokenRefresher.js";
import { getEndpointStatus, updateEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import setMemberRoles from "../utils/discord/setRoles.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { recentlyExpiredAuthUsersBungieIds } from "../utils/persistence/dataStore.js";
import { AuthData, LeavedUsersData } from "../utils/persistence/sequelize.js";
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/Token/";
export async function requestTokenRefresh({ userId, table = AuthData, refresh_token, }) {
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
        console.error("[Error code: 1698]", userId, refreshToken);
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
    return (await fetchRequest.json());
}
async function bungieGrantRequest(row, table, retry = false) {
    try {
        const request = await requestTokenRefresh({ refresh_token: row.refreshToken, table: table === 1 ? AuthData : LeavedUsersData });
        if (request && request.access_token) {
            row.accessToken = request.access_token;
            row.refreshToken = request.refresh_token;
            await row.save();
            UpdateTokenRefreshTime();
        }
        else {
            handleRequestError(request, row, table, retry);
        }
    }
    catch (error) {
        console.error(`[Error code: 1744] Token refresher ${retry} for ${row.bungieId}\n`, error);
        if (!retry) {
            bungieGrantRequest(row, table, true);
        }
    }
}
async function handleRequestError(request, row, table, retry) {
    if (request && request.error_description === "SystemDisabled") {
        updateEndpointStatus("oauth", 5);
    }
    if (retry === false) {
        console.error(`[Error code: 1745] First time error for ${row.bungieId} | ${request?.error_description}`);
        if (request && request.error_description === "SystemDisabled") {
            return;
        }
        bungieGrantRequest(row, table, true);
    }
    else {
        console.error(`[Error code: 1231] Second error in a row for ${row.bungieId}\n`, request);
        await handleSpecificError(request, row, table);
    }
}
async function handleSpecificError(request, row, table) {
    if (request.error_description === "AuthorizationRecordRevoked") {
        await (table === 1 ? AuthData : LeavedUsersData).destroy({ where: { bungieId: row.bungieId }, limit: 1 });
        console.log(`The user (${row.bungieId}) was deleted from the ${table === 1 ? "main table" : "secondary table"} because he revoked the authorization token`);
    }
    else if (request.error_description === "AuthorizationRecordExpired") {
        await handleAuthorizationRecordExpired(row, table);
    }
}
async function handleAuthorizationRecordExpired(row, table) {
    if (table === 1) {
        recentlyExpiredAuthUsersBungieIds.add(row.bungieId);
        const { discordId } = (await AuthData.findOne({ where: { bungieId: row.bungieId }, attributes: ["discordId"] }));
        await AuthData.destroy({ where: { bungieId: row.bungieId }, limit: 1 }).then(async (_) => {
            console.log(`The user (${row.bungieId}) was deleted from the main table because his authorization token expired`);
            const embed = new EmbedBuilder()
                .setColor(colors.warning)
                .setTitle("Необходима повторная регистрация")
                .setDescription("У вашего авторизационного токена истек срок годности. Зарегистрируйтесь повторно");
            const registerButton = new ButtonBuilder()
                .setCustomId("initEvent_register")
                .setLabel("Регистрация")
                .setStyle(ButtonStyle.Success);
            const components = addButtonsToMessage([registerButton]);
            const member = await client.getAsyncMember(discordId);
            if (member) {
                await setMemberRoles({ member, roles: [process.env.NEWBIE], reason: "Authorization token expired" }).catch(async (e) => {
                    console.error(`[Error code: 1635] An error occurred while deleting roles of ${member.displayName || member.user.username}\n`, e);
                });
            }
            await member.send({ embeds: [embed], components }).catch(async (e) => {
                if (e.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    const botChannel = await client.getAsyncTextChannel(process.env.PUBLIC_BOT_CHANNEL_ID);
                    embed.setAuthor({
                        name: `${nameCleaner(member.displayName)}`,
                        iconURL: member.displayAvatarURL(),
                    });
                    await botChannel.send({ embeds: [embed], components });
                }
            });
        });
    }
    else {
        await LeavedUsersData.destroy({ where: { bungieId: row.bungieId }, limit: 1 }).then((r) => {
            console.log(`The user (${row.bungieId}) was deleted in the secondary table because his authorization token has expired`);
        });
    }
}
async function refreshTokens(table) {
    if (getEndpointStatus("oauth") !== 1)
        return;
    const data = table === 1
        ? await AuthData.findAll({ attributes: ["discordId", "bungieId", "refreshToken"] })
        : await LeavedUsersData.findAll({ attributes: ["discordId", "bungieId", "refreshToken"] });
    for (const row of data) {
        try {
            if (!row.refreshToken)
                return;
            await bungieGrantRequest(row, table, false);
        }
        catch (error) {
            console.error(`[Error code: 1242] Error during refreshing token of ${row.bungieId}: ${error}`);
        }
    }
}
async function tokenManagment() {
    await refreshTokens(1);
    await refreshTokens(2);
    setInterval(async () => await refreshTokens(1), 1000 * 60 * 50);
}
export default tokenManagment;
//# sourceMappingURL=tokenManagement.js.map