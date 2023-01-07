import { ButtonBuilder, EmbedBuilder, ComponentType, ButtonStyle } from "discord.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import fetch from "node-fetch";
import { AuthData, InitData, UserActivityData } from "../handlers/sequelize.js";
import { client } from "../index.js";
import { fetchRequest } from "./fetchRequest.js";
import colors from "../configs/colors.js";
import { ClanButtons } from "../enums/Buttons.js";
export default async (code, state, res) => {
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
        const fetchedData = (request.destinyMemberships.find((membership) => {
            membership.membershipId === request.primaryMembershipId;
        }) ??
            request.destinyMemberships.find((membership) => {
                membership.crossSaveOverride === membership.membershipType;
            }) ??
            request.destinyMemberships.length === 1
            ? request.destinyMemberships[0]
            : request.destinyMemberships.find((v) => v.membershipType === 3)) ?? request.destinyMemberships[0];
        if (!fetchedData) {
            res.send(`<script>location.replace('error.html')</script>`);
            return console.error("[Error code: 1011]", `State: ${state} / Code:${code}`, body);
        }
        const { membershipType: platform, membershipId: bungieId } = fetchedData;
        const displayName = fetchedData.bungieGlobalDisplayName || fetchedData.LastSeenDisplayName || fetchedData.displayName;
        const authData = await AuthData.create({
            discordId: json.discordId,
            bungieId,
            platform,
            clan: false,
            displayName,
            accessToken: body.access_token,
            refreshToken: body.refresh_token,
            membershipId: body.membership_id,
        });
        InitData.destroy({
            where: { discordId: json.discordId },
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
            .setTimestamp()
            .addFields({
            name: "Bungie аккаунт",
            value: `[bungie.net](https://www.bungie.net/7/ru/User/Profile/254/${body.membership_id})`,
            inline: true,
        }, {
            name: "BungieName",
            value: displayName || "[Error code: 1216]",
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
            value: displayName || `[Error code: 1217]`,
            inline: true,
        });
        if (clanResponse && clanResponse.results && clanResponse.results.length >= 1) {
            embed.addFields([{ name: "Текущий клан", value: `${clanResponse.results[0].group.name}`, inline: true }]);
            loggedEmbed.addFields([{ name: "Текущий клан", value: `${clanResponse.results[0].group.name}`, inline: true }]);
        }
        try {
            client.getCachedGuild().channels.cache.get(ids.botChnId).send({ embeds: [loggedEmbed] });
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
        if (!clanResponse || !clanResponse.results) {
            if (!member.roles.cache.hasAll(statusRoles.member, statusRoles.clanmember))
                member.roles.add(statusRoles.member).then((m) => m.roles.remove(statusRoles.newbie));
            const component = new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Отправить приглашение").setStyle(ButtonStyle.Success);
            embed.setDescription(embed.data.description
                ? embed.data.description +
                    `\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны`
                : `\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны`);
            member.send({
                embeds: [embed],
                components: [
                    {
                        type: ComponentType.ActionRow,
                        components: [component],
                    },
                ],
            });
        }
        else if (clanResponse && clanResponse.results && clanResponse.results.length >= 1 && clanResponse.results[0].group.groupId !== "4123712") {
            if (!member.roles.cache.hasAll(statusRoles.member, statusRoles.clanmember))
                member.roles.add(statusRoles.member).then((m) => m.roles.remove(statusRoles.newbie));
            const component = new ButtonBuilder().setCustomId(ClanButtons.invite).setLabel("Отправить приглашение").setStyle(ButtonStyle.Success);
            embed.setDescription(embed.data.description
                ? embed.data.description + `\n\nНажмите кнопку для получения приглашения в клан`
                : `Нажмите кнопку для получения приглашения в клан`);
            member.send({
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
            member.send({
                embeds: [embed],
            });
        }
    }
    catch (error) {
        try {
            res.send(`<script>location.replace('error.html')</script>`);
        }
        catch (e) {
            console.error(`[Error code: 1210]`, { e });
        }
        return console.error(`[Error code: 1234] State: ${state} / Code:${code}`, { body }, { error });
    }
};
