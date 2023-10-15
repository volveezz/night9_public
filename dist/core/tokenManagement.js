import { ButtonBuilder, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import fetch from "node-fetch";
import { Op } from "sequelize";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import tokenRefresher from "../structures/tokenRefresher.js";
import { getEndpointStatus, updateEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import setMemberRoles from "../utils/discord/setRoles.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { pause } from "../utils/general/utilities.js";
import { recentlyExpiredAuthUsersBungieIds } from "../utils/persistence/dataStore.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
import { LeavedUsersData } from "../utils/persistence/sequelizeModels/leavedUsersData.js";
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
            tokenRefresher.updateTokenRefreshTime();
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
        return;
    }
    if (retry === false) {
        console.error(`[Error code: 1745] First time error for ${row.discordId}/${row.bungieId} | ${request?.error_description}`);
        if (request && request.error_description === "SystemDisabled") {
            return;
        }
        bungieGrantRequest(row, table, true);
    }
    else {
        console.error(`[Error code: 1231] Second error in a row for ${row.discordId}/${row.bungieId}\n`, request);
        await handleSpecificError(request, row, table);
    }
}
async function handleSpecificError(request, row, table) {
    if (request.error_description === "AuthorizationRecordRevoked") {
        await handleAuthorizationRecordRevoked(row, table);
    }
    else if (request.error_description === "AuthorizationRecordExpired") {
        await handleAuthorizationRecordExpired(row, table);
    }
}
async function handleAuthorizationRecordRevoked(row, table) {
    const dbPromise = row.destroy();
    if (table === 2)
        return;
    const memberPromise = client.getMember(row.discordId);
    const [member, _] = await Promise.all([memberPromise, dbPromise]);
    console.log(`The database row for (${row.discordId}) has been removed from the ${table === 1 ? "main table" : "secondary table"}`);
    setMemberRoles({
        member,
        roles: [member.roles.cache.has(process.env.KICKED) ? process.env.KICKED : process.env.NEWBIE],
        reason: "User revoked access token",
    });
    const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setAuthor({ name: "Данные вашей авторизации были удалены", iconURL: icons.warning })
        .setDescription("Вы отозвали права, выданные при регистрации. Рекомендуется повторно зарегистрироваться, в ином случае вам будет недоступен большая часть функционала сервера");
    member
        .send({ embeds: [embed] })
        .catch((e) => console.error(`[Error code: 2087] Cannot send the notification to ${nameCleaner(member.displayName)} since he closed his DM`, e));
}
const REGISTER_BUTTON = new ButtonBuilder().setCustomId("initEvent_register").setLabel("Регистрация").setStyle(ButtonStyle.Success);
async function handleAuthorizationRecordExpired(row, table) {
    const { discordId, bungieId } = row;
    if (table === 1) {
        recentlyExpiredAuthUsersBungieIds.add(bungieId);
        row.accessToken = null;
        row.refreshToken = null;
        const [member, _] = await Promise.all([client.getMember(discordId), row.save()]);
        console.log(`The authorization data for (${discordId}) has been removed from the main table because their token expired`);
        const components = addButtonsToMessage([REGISTER_BUTTON]);
        const embed = new EmbedBuilder()
            .setColor(colors.warning)
            .setAuthor({ name: "Необходима повторная регистрация", iconURL: icons.warning })
            .setDescription("У вашего авторизационного токена истек срок действия. Зарегистрируйтесь повторно");
        member.send({ embeds: [embed], components }).catch(async (e) => {
            if (e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                console.error("[Error code: 2086] Received unexpected error while sending message to user", e);
                return;
            }
            const botChannel = await client.getTextChannel(process.env.PUBLIC_BOT_CHANNEL_ID);
            embed.setAuthor({
                name: `${nameCleaner(member.displayName)}`,
                iconURL: member.displayAvatarURL(),
            });
            botChannel.send({ embeds: [embed], components });
        });
    }
    else {
        await row.destroy();
        console.log(`The database row for (${discordId}) has been removed from the secondary table because their token expired.`);
    }
}
async function refreshTokens(table) {
    if (getEndpointStatus("oauth") !== 1)
        return;
    const attributes = ["discordId", "bungieId", "refreshToken"];
    const data = table === 1
        ? await AuthData.findAll({
            attributes,
            where: {
                refreshToken: {
                    [Op.ne]: null,
                },
            },
        })
        : await LeavedUsersData.findAll({ attributes });
    for (const row of data) {
        try {
            await bungieGrantRequest(row, table, false);
            await pause(1000);
        }
        catch (error) {
            console.error("[Error code: 1242] Error during refreshing token of", row.bungieId, error);
        }
    }
}
async function tokenManagment() {
    await refreshTokens(1);
    await refreshTokens(2);
    async function recursiveAuthDataTokenRefresh() {
        try {
            await refreshTokens(1);
        }
        catch (error) {
            console.error("[Error code: 2085] Error during periodic token refresh:", error);
        }
        finally {
            setTimeout(recursiveAuthDataTokenRefresh, 1000 * 60 * 50);
        }
    }
    recursiveAuthDataTokenRefresh();
}
export default tokenManagment;
//# sourceMappingURL=tokenManagement.js.map