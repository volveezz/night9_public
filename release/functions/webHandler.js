import { ButtonBuilder, EmbedBuilder, ComponentType, ButtonStyle } from "discord.js";
import { ids } from "../configs/ids.js";
import { statusRoles } from "../configs/roles.js";
import { updateClanRolesWithLogging } from "./logger.js";
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
        const fetchedData = request.destinyMemberships.find((membership) => {
            membership.crossSaveOverride === membership.membershipType;
        }) || request.destinyMemberships.length === 1
            ? request.destinyMemberships[0]
            : request.destinyMemberships.find((v) => v.membershipType === 3) || request.destinyMemberships[0];
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
        if (!clanResponse) {
        }
        const userClan = clanResponse?.results[0]?.group;
        const member = client.getCachedMembers().get(json.discordId);
        if (!member) {
            console.error("[Error code: 1012]", `Member error during webHandling of`, json);
            return res.send(`<script>location.replace('error.html')</script>`);
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
            value: displayName,
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
            value: displayName,
            inline: true,
        });
        if (userClan) {
            embed.addFields([{ name: "Текущий клан", value: `${userClan.name}`, inline: true }]);
            loggedEmbed.addFields([{ name: "Текущий клан", value: `${userClan.name}`, inline: true }]);
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
        if (userClan.groupId !== "4123712") {
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
            updateClanRolesWithLogging(authData, true);
            member.send({
                embeds: [embed],
            });
            AuthData.update({ clan: true }, { where: { bungieId: bungieId } });
        }
    }
    catch (error) {
        res.send(`<script>location.replace('error.html')</script>`);
        return console.error(`[Error code: 1234] State: ${state} / Code:${code}`, { body }, { error });
    }
};
