import { auth_data, discord_activities, init_data } from "./sequelize.js";
import { ButtonBuilder, EmbedBuilder, ComponentType } from "discord.js";
import { chnFetcher } from "../base/channels.js";
import { guildId, ids } from "../base/ids.js";
import { statusRoles } from "../base/roles.js";
import { clan_joinLeave } from "./logger.js";
import { BotClient as client } from "../index.js";
import fetch from "node-fetch";
export async function fetchRequest(url, authorizationData) {
    const cleanUrl = url.startsWith("https://bungie.net/") || url.startsWith("https://www.bungie.net/")
        ? console.error("[Error code: 1025]", "Wrong url", url)
        : url.startsWith("/")
            ? url.slice(1)
            : url;
    const auth = authorizationData instanceof auth_data && authorizationData.access_token
        ? `Bearer ${authorizationData.access_token}`
        : typeof authorizationData === "object" && !(authorizationData instanceof auth_data)
            ? Object.keys(authorizationData).includes("access_token")
                ? `Bearer ${authorizationData.access_token}`
                : ""
            : "";
    const response = fetch(`http://www.bungie.net/${cleanUrl}`, {
        headers: { "X-API-KEY": process.env.XAPI, Authorization: auth },
    });
    const jsonResponse = await (await response).json().catch((e) => {
        console.error(`[Error code: 1064]`, e);
        return undefined;
    });
    return jsonResponse?.Response ? jsonResponse?.Response : jsonResponse;
}
export default async (code, state, res) => {
    const json = await init_data.findOne({ where: { state: state } });
    if (!json)
        return console.error("[Error code: 1053] No data found", code, state);
    if (json.discord_id) {
        const form = new URLSearchParams();
        form.append("grant_type", "authorization_code");
        form.append("code", code);
        const body = await (await fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${process.env.AUTH}`,
            },
            body: form,
        })).json();
        if (body.error === "invalid_request") {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error("[Error code: 1010]", `There is problem with fetching authData from state: ${state}`, body);
        }
        else if (body.error === "invalid_grant") {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error(`${body.error_description} for: ${state}\nCode:${code}`);
        }
        else {
            const unfetchRequest = await (await fetch(`https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/`, {
                headers: { "X-API-KEY": process.env.XAPI, Authorization: `Bearer ${body.access_token}` },
            })).json();
            if (!unfetchRequest) {
                res.send(`<script>location.replace('error.html')</script>`);
                return console.error(`[Error code: 1034] State: ${state} / Code: ${code}`, body);
            }
            const request = unfetchRequest.Response;
            function getData() {
                return request.destinyMemberships.map((membership) => {
                    if (membership.crossSaveOverride === membership.membershipType) {
                        return {
                            platform: membership.membershipType,
                            bungie_id: membership.membershipId,
                            displayname: membership.bungieGlobalDisplayName || membership.displayName,
                        };
                    }
                    else if (request.destinyMemberships.length <= 1) {
                        return {
                            platform: membership.membershipType,
                            bungie_id: membership.membershipId,
                            displayname: membership.bungieGlobalDisplayName || membership.displayName,
                        };
                    }
                })[0];
            }
            const fetchedData = getData();
            if (!fetchedData) {
                res.send(`<script>location.replace('error.html')</script>`);
                return console.error("[Error code: 1011]", `State: ${state} / Code:${code}`, body);
            }
            const { platform, bungie_id, displayname } = fetchedData;
            const result = await auth_data.create({
                discord_id: json.discord_id,
                bungie_id: bungie_id,
                platform: platform,
                clan: false,
                displayname: displayname,
                access_token: body.access_token,
                refresh_token: body.refresh_token,
                membership_id: body.membership_id,
                tz: null,
            });
            await init_data.destroy({
                where: { discord_id: json.discord_id },
            });
            res.send(`<script>location.replace('index.html')</script>`).end();
            const clanResponse = await fetchRequest(`Platform/GroupV2/User/${platform}/${bungie_id}/0/1/`, body);
            const member = client.guilds.cache.get(guildId).members.cache.get(json.discord_id);
            if (!member) {
                console.error("[Error code: 1012]", `Member error during webHandling of`, json);
                return res.send(`<script>location.replace('error.html')</script>`);
            }
            const embed = new EmbedBuilder()
                .setTitle("Вы зарегистрировались")
                .setDescription("Для удобства на сервере вы можете указать свой часовой пояс введя команду `/tz`")
                .setColor("Green")
                .setTimestamp()
                .addFields({
                name: "Bungie аккаунт",
                value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
                inline: true,
            }, {
                name: "BungieName",
                value: displayname,
                inline: true,
            });
            const loggedEmbed = new EmbedBuilder()
                .setColor("Green")
                .setAuthor({ name: `${member.displayName} зарегистрировался`, iconURL: member.displayAvatarURL() })
                .addFields({ name: "Пользователь", value: `<@${member.id}>`, inline: true }, {
                name: "Bungie аккаунт",
                value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
                inline: true,
            }, {
                name: "BungieName",
                value: displayname,
                inline: true,
            });
            chnFetcher(ids.botChnId).send({ embeds: [loggedEmbed] });
            discord_activities.findOrCreate({
                where: { authDatumDiscordId: member.id },
                defaults: {
                    authDatumDiscordId: member.id,
                },
            });
            if (clanResponse.results[0]?.group.groupId !== "4123712") {
                !member?.roles.cache.has(statusRoles.member) && !member?.roles.cache.has(statusRoles.clanmember)
                    ? member?.roles.add([statusRoles.member]).then((m) => m.roles.remove([statusRoles.newbie]))
                    : [];
                const component = new ButtonBuilder().setCustomId("webhandlerEvent_clan_request").setLabel("Отправить приглашение").setStyle(3);
                embed.setDescription(embed.data.description
                    ? embed.data.description + `\n\nНажмите кнопку для получения приглашения в клан`
                    : `Нажмите кнопку для получения приглашения в клан`);
                member?.send({
                    embeds: [embed],
                    components: [
                        {
                            type: ComponentType.ActionRow,
                            components: [component],
                        },
                    ],
                });
            }
            else {
                clan_joinLeave(result, true);
                member?.send({
                    embeds: [embed],
                });
                auth_data.update({ clan: true }, { where: { bungie_id: bungie_id } });
            }
        }
    }
};
