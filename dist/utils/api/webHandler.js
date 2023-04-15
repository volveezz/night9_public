import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import fetch from "node-fetch";
import { ClanButtons, TimezoneButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { ids } from "../../configs/ids.js";
import { statusRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import { addButtonComponentsToMessage } from "../general/addButtonsToMessage.js";
import { escapeString } from "../general/utilities.js";
import { AuthData, InitData, LeavedUsersData, UserActivityData } from "../persistence/sequelize.js";
import { fetchRequest } from "./fetchRequest.js";
export default async function webHandler(code, state, res) {
    const json = await InitData.findOne({ where: { state: state } });
    if (!json || !json.discordId)
        return console.error("[Error code: 1053] No data found", code, state);
    const form = new URLSearchParams();
    form.append("grant_type", "authorization_code");
    form.append("code", code);
    const body = (await (await fetch("https://www.bungie.net/Platform/App/OAuth/Token/", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${process.env.AUTH}`,
        },
        body: form,
    })).json());
    if (body.error === "invalid_request" || body.error === "invalid_grant") {
        res.send(`<script>location.replace('error.html')</script>`);
        return console.error("[Error code: 1010]", `There is problem with fetching authData from state: ${state}`, body);
    }
    try {
        const request = await fetchRequest(`Platform/User/GetMembershipsForCurrentUser/`, body.access_token);
        if (!request || !request.destinyMemberships) {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error(`[Error code: 1034] State: ${state} / Code: ${code}`, body, request);
        }
        const fetchedData = request.destinyMemberships.find((membership) => {
            {
                if (membership.membershipId === request.primaryMembershipId)
                    return membership;
            }
        }) ||
            request.destinyMemberships.find((membership) => {
                {
                    if (membership.crossSaveOverride === membership.membershipType)
                        return membership;
                }
            }) ||
            (request.destinyMemberships.length === 1
                ? request.destinyMemberships[0]
                : request.destinyMemberships.find((v) => {
                    if (v.membershipType === 3)
                        return v;
                })) ||
            request.destinyMemberships[0];
        if (!fetchedData) {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error("[Error code: 1011]", `State: ${state} / Code:${code}`, body, fetchedData, request);
        }
        const { membershipType: platform, membershipId: bungieId } = fetchedData;
        const displayName = fetchedData.bungieGlobalDisplayName || fetchedData.LastSeenDisplayName || fetchedData.displayName;
        const ifHasLeaved = await LeavedUsersData.findOne({ where: { bungieId }, attributes: ["discordId"] });
        if (ifHasLeaved) {
            console.error(`[Error code: 1691] User (${json.discordId}) tried to connect already registered bungieId (${bungieId})`);
            return res.send(`<script>location.replace('error.html')</script>`);
        }
        const [authData, created] = await AuthData.findOrCreate({
            where: {
                bungieId,
            },
            defaults: {
                discordId: json.discordId,
                bungieId,
                platform,
                clan: false,
                displayName,
                accessToken: body.access_token,
                refreshToken: body.refresh_token,
                membershipId: body.membership_id,
            },
        });
        if (!created) {
            console.error(`[Error code: 1439] User (${json.discordId}) tried to connect already registered bungieId`, authData?.toJSON());
            return res.send(`<script>location.replace('error.html')</script>`);
        }
        InitData.destroy({
            where: { discordId: json.discordId },
            limit: 1,
        });
        res.send(`<script>location.replace('index.html')</script>`).end();
        const clanResponse = await fetchRequest(`Platform/GroupV2/User/${platform}/${bungieId}/0/1/`, body.access_token);
        const member = client.getCachedMembers().get(json.discordId);
        if (!member) {
            return console.error(`[Error code: 1012] Member error during webHandling of`, json);
        }
        const embed = new EmbedBuilder()
            .setTitle("Вы зарегистрировались")
            .setDescription("Для удобства на сервере вы можете указать свой часовой пояс введя команду `/timezone`")
            .setColor(colors.success)
            .addFields({
            name: "Bungie аккаунт",
            value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
            inline: true,
        }, {
            name: "BungieName",
            value: `${escapeString(displayName)}`,
            inline: true,
        });
        const loggedEmbed = new EmbedBuilder()
            .setColor(colors.serious)
            .setAuthor({ name: `${member.displayName} зарегистрировался`, iconURL: member.displayAvatarURL() })
            .addFields({ name: "Пользователь", value: `<@${member.id}>`, inline: true }, {
            name: "Bungie аккаунт",
            value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
            inline: true,
        }, {
            name: "BungieName",
            value: `${escapeString(displayName)}`,
            inline: true,
        });
        if (clanResponse && clanResponse.results && clanResponse.results.length >= 1) {
            embed.addFields([{ name: "Текущий клан", value: `${clanResponse.results[0].group.name}`, inline: true }]);
            loggedEmbed.addFields([{ name: "Текущий клан", value: `${clanResponse.results[0].group.name}`, inline: true }]);
        }
        try {
            client.getCachedTextChannel(ids.botChnId).send({ embeds: [loggedEmbed] });
        }
        catch (error) {
            console.error(`[Error code: 1236] Failed to send log message for ${displayName}`);
        }
        UserActivityData.findOrCreate({
            where: { discordId: member.id },
            defaults: {
                discordId: member.id,
            },
        });
        const givenRoles = [];
        if (!member.roles.cache.hasAny(statusRoles.member, statusRoles.clanmember))
            givenRoles.push(statusRoles.member);
        if (!member.roles.cache.has(statusRoles.verified))
            givenRoles.push(statusRoles.verified);
        if (givenRoles.length > 0)
            await member.roles.add(givenRoles, "User registration").then(async (member) => {
                if (member.roles.cache.has(statusRoles.newbie))
                    await member.roles.remove(statusRoles.newbie, "User registration");
            });
        const clanRequestComponent = new ButtonBuilder()
            .setCustomId(ClanButtons.invite)
            .setLabel("Отправить приглашение")
            .setStyle(ButtonStyle.Success);
        const timezoneComponent = new ButtonBuilder()
            .setCustomId(TimezoneButtons.button)
            .setLabel("Установить часовой пояс")
            .setStyle(ButtonStyle.Secondary);
        if (!clanResponse || !clanResponse.results) {
            embed.setDescription(embed.data.description
                ? embed.data.description +
                    `\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны`
                : `\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны`);
            await member.send({
                embeds: [embed],
                components: await addButtonComponentsToMessage([clanRequestComponent, timezoneComponent]),
            });
        }
        else if (clanResponse.results.length === 0 || !(clanResponse.results?.[0]?.group?.groupId === "4123712")) {
            embed.setDescription(embed.data.description
                ? embed.data.description + `\n\nНажмите кнопку для получения приглашения в клан`
                : `Нажмите кнопку для получения приглашения в клан`);
            await member.send({
                embeds: [embed],
                components: await addButtonComponentsToMessage([clanRequestComponent, timezoneComponent]),
            });
        }
        else {
            await member.send({
                embeds: [embed],
                components: await addButtonComponentsToMessage(!(clanResponse?.results?.[0]?.group?.groupId === "4123712") ? [clanRequestComponent, timezoneComponent] : [timezoneComponent]),
            });
        }
    }
    catch (error) {
        try {
            res.send(`<script>location.replace('error.html')</script>`);
        }
        catch (e) {
            console.error(`[Error code: 1210]`, e);
        }
        return console.error(`[Error code: 1234] State: ${state} / Code:${code}`, { body }, { error });
    }
}
