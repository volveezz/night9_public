import fetch from "node-fetch";
import { database, AuthData, LeavedUsersData } from "../handlers/sequelize.js";
import { Feature } from "../structures/feature.js";
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { RegisterButtons } from "../enums/Buttons.js";
import { client } from "../index.js";
import nameCleaner from "../functions/nameClearer.js";
import { statusRoles } from "../configs/roles.js";
const BUNGIE_TOKEN_URL = "https://www.bungie.net/Platform/App/OAuth/Token/";
async function bungieGrantRequest(row, table, t, retry = false) {
    const form = new URLSearchParams(Object.entries({
        grant_type: "refresh_token",
        refresh_token: row.refreshToken,
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
    if (request && request.access_token) {
        await (table === 1 ? AuthData : LeavedUsersData).update({ accessToken: request.access_token, refreshToken: request.refresh_token }, { where: { bungieId: row.bungieId }, transaction: t });
    }
    else {
        if (retry === false) {
            bungieGrantRequest(row, table, t, true);
            console.error(`[Error code: 1420] For ${row.bungieId}`, request);
        }
        else {
            console.error(`[Error code: 1231] For ${row.bungieId}`, request);
            if (request.error_description === "AuthorizationRecordRevoked") {
                await (table === 1 ? AuthData : LeavedUsersData)
                    .destroy({ where: { bungieId: row.bungieId }, transaction: t })
                    .then((r) => console.log(`User (${row.bungieId}) was deleted in ${table === 1 ? "main table" : "secondary table"} becouse he revoked authToken`));
            }
            else if (request.error_description === "AuthorizationRecordExpired") {
                if (table === 1) {
                    const { discordId } = (await AuthData.findOne({ where: { bungieId: row.bungieId }, attributes: ["discordId"] }));
                    await AuthData.destroy({ where: { bungieId: row.bungieId }, transaction: t }).then(async (r) => {
                        console.log(`User (${row.bungieId}) was deleted in main table becouse his authToken has expired`);
                        const embed = new EmbedBuilder()
                            .setColor(colors.warning)
                            .setTitle("Необходима повторная регистрация")
                            .setDescription(`У вашего авторизационного токена истек срок годности. Зарегистрируйтесь повторно`);
                        const components = [
                            {
                                type: ComponentType.ActionRow,
                                components: [
                                    new ButtonBuilder().setCustomId(RegisterButtons.register).setLabel("Регистрация").setStyle(ButtonStyle.Success),
                                ],
                            },
                        ];
                        const member = client.getCachedMembers().get(discordId) || (await client.getCachedGuild().members.fetch(discordId));
                        const user = member ||
                            client.users.cache.get(discordId) ||
                            (await client.users.fetch(discordId)) ||
                            (await client.getCachedGuild().members.fetch(discordId));
                        if (member) {
                            member.roles.set([statusRoles.newbie]).catch((e) => {
                                console.error(`[Error code: 1635] Got error during removal roles of ${member.displayName || member.user.username}`, e);
                            });
                        }
                        user.send({ embeds: [embed], components }).catch(async (e) => {
                            if (e.code === 50007) {
                                const botChannel = client.getCachedGuild().channels.cache.get("677552181154676758") ||
                                    (await client.getCachedGuild().channels.fetch("677552181154676758"));
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
                    await LeavedUsersData.destroy({ where: { bungieId: row.bungieId }, transaction: t }).then((r) => {
                        console.log(`User (${row.bungieId}) was deleted in secondary table becouse his authToken has expired`);
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
        console.error(`[Error code: 1421] Error during commiting DB changes`);
    }
}
export default new Feature({
    execute: async ({}) => {
        if (process.env.DEV_BUILD === "dev")
            return;
        await refreshTokens(1);
        await refreshTokens(2);
        setInterval(async () => await refreshTokens(1), 1000 * 60 * 50);
    },
});
