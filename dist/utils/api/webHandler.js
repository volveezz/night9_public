import { ButtonBuilder, ButtonStyle, EmbedBuilder, RESTJSONErrorCodes } from "discord.js";
import fetch from "node-fetch";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import guildNicknameManagement from "../../core/guildNicknameManagement.js";
import { checkIndiviualUserStatistics } from "../../core/statisticsChecker/userStatisticsManagement.js";
import { client } from "../../index.js";
import { addButtonsToMessage } from "../general/addButtonsToMessage.js";
import nameCleaner from "../general/nameClearer.js";
import { escapeString } from "../general/utilities.js";
import { AuthData, InitData, LeavedUsersData, UserActivityData } from "../persistence/sequelize.js";
import { sendApiRequest } from "./sendApiRequest.js";
function isValidUUIDv4(uuid) {
    const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv4Regex.test(uuid);
}
export default async function webHandler(code, state, res) {
    if (!isValidUUIDv4(state.toString()))
        return console.error("[Error code: 1958] Received invalid state", state);
    const json = await InitData.findOne({ where: { state } });
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
        res.send("<script>location.replace('error.html')</script>").end();
        return console.error("[Error code: 1010]", `There is problem with fetching authData from state: ${state}`, body);
    }
    try {
        const request = await sendApiRequest("/Platform/User/GetMembershipsForCurrentUser/", body.access_token);
        if (!request || !request.destinyMemberships) {
            res.send("<script>location.replace('error.html')</script>").end();
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
            res.send("<script>location.replace('error.html')</script>").end();
            return console.error("[Error code: 1011]", `State: ${state} / Code:${code}`, body, request);
        }
        const { membershipType: platform, membershipId: bungieId } = fetchedData;
        const displayName = fetchedData.bungieGlobalDisplayName || fetchedData.LastSeenDisplayName || fetchedData.displayName;
        const ifHasLeaved = await LeavedUsersData.findOne({ where: { bungieId }, attributes: ["discordId"] });
        if (ifHasLeaved) {
            console.error(`[Error code: 1691] User (${json.discordId}) tried to connect already registered bungieId (${bungieId})`);
            return res.send("<script>location.replace('error.html')</script>").end();
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
            if (authData.discordId === json.discordId && authData.bungieId === bungieId) {
                authData.accessToken = body.access_token;
                authData.refreshToken = body.refresh_token;
                await authData.save();
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Вы обновили данные авторизации", iconURL: icons.success });
                const member = await client.getAsyncMember(json.discordId);
                try {
                    member.send({ embeds: [embed] });
                }
                catch (error) {
                    if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                        const isUserClanMember = member.roles.cache.has(process.env.CLANMEMBER);
                        const channel = await (isUserClanMember
                            ? client.getAsyncTextChannel(process.env.PUBLIC_BOT_CHANNEL_ID)
                            : client.getAsyncTextChannel(process.env.JOIN_REQUEST_CHANNEL_ID));
                        const embed = new EmbedBuilder()
                            .setColor(colors.serious)
                            .setAuthor({
                            name: `${nameCleaner(member.displayName)}, вы обновили данные регистрации`,
                            iconURL: member.displayAvatarURL(),
                        })
                            .setDescription("Вы закрыли доступ к своим личным сообщениям\nДля лучшего опыта на сервере, пожалуйста, откройте доступ к личным сообщениям в настройках Discord");
                        const notificationMessage = await channel.send({ content: `<@${member.displayAvatarURL}>`, embeds: [embed] });
                        setTimeout(() => {
                            notificationMessage.delete();
                        }, 1000 * 60);
                    }
                    else {
                        console.error("[Error code: 1956] Found unexpected error", error);
                    }
                }
                try {
                    const loggedEmbed = new EmbedBuilder()
                        .setColor(colors.success)
                        .setAuthor({ name: member.displayName, iconURL: member.displayAvatarURL() })
                        .setTitle("Пользователь обновил существующую регистрацию");
                    await (await client.getAsyncTextChannel(process.env.BOT_CHANNEL_ID)).send({ embeds: [loggedEmbed] });
                }
                catch (error) {
                    console.error("[Error code: 1808] Failed to send log message", error, json.discordId);
                }
                InitData.destroy({ where: { discordId: json.discordId }, limit: 1 });
                return res.send("<script>location.replace('index.html')</script>").end();
            }
            console.error(`[Error code: 1439] User (${json.discordId}) tried to connect already registered bungieId`, authData?.discordId, authData?.bungieId);
            return res.send("<script>location.replace('error.html')</script>").end();
        }
        InitData.destroy({
            where: { discordId: json.discordId },
            limit: 1,
        });
        res.send("<script>location.replace('index.html')</script>").end();
        const clanResponse = await sendApiRequest(`/Platform/GroupV2/User/${platform}/${bungieId}/0/1/`, body.access_token);
        const member = await client.getAsyncMember(json.discordId);
        if (!member) {
            return console.error("[Error code: 1012] Member error during webHandling of", json);
        }
        const embed = new EmbedBuilder()
            .setTitle("Вы зарегистрировались")
            .setDescription("Для удобства на сервере вы можете указать свой часовой пояс введя команду `/timezone` (</timezone:1055308734794043503>)")
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
            .setColor(colors.success)
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
            client.getCachedTextChannel(process.env.BOT_CHANNEL_ID).send({ embeds: [loggedEmbed] });
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
        if (!member.roles.cache.hasAny(process.env.MEMBER, process.env.CLANMEMBER))
            givenRoles.push(process.env.MEMBER);
        if (!member.roles.cache.has(process.env.VERIFIED))
            givenRoles.push(process.env.VERIFIED);
        if (givenRoles.length > 0) {
            try {
                await member.roles.add(givenRoles, "User registration").then(async (member) => {
                    if (member.roles.cache.has(process.env.NEWBIE))
                        await member.roles.remove(process.env.NEWBIE, "User registration");
                });
            }
            catch (error) {
                console.error("[Error code: 1959] Failed to add roles to member", error, member.id);
            }
        }
        const clanRequestComponent = new ButtonBuilder()
            .setCustomId("webhandlerEvent_clan_request")
            .setLabel("Отправить приглашение")
            .setStyle(ButtonStyle.Success);
        const timezoneComponent = new ButtonBuilder()
            .setCustomId("timezoneButton")
            .setLabel("Установить часовой пояс")
            .setStyle(ButtonStyle.Secondary);
        try {
            guildNicknameManagement();
            checkIndiviualUserStatistics(member.id);
        }
        catch (error) {
            console.error("[Error code: 1736]", error);
        }
        if (!clanResponse || !clanResponse.results) {
            embed.setDescription(embed.data.description
                ? embed.data.description +
                    "\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны"
                : "\n\nПроизошла ошибка во время обработки вашего клана. Скорее всего это связано с недоступностью API игры\n\nКнопка ниже служит для отправки приглашения в клан - она заработает как только сервера игры станут доступны");
            sendMessageToMember(clanRequestComponent, timezoneComponent);
        }
        else if (clanResponse.results.length === 0 || !(clanResponse.results?.[0]?.group?.groupId === process.env.GROUP_ID)) {
            embed.setDescription(embed.data.description
                ? embed.data.description + "\n\nНажмите кнопку для получения приглашения в клан"
                : "Нажмите кнопку для получения приглашения в клан");
            sendMessageToMember(clanRequestComponent, timezoneComponent);
        }
        else {
            const buttons = !(clanResponse?.results?.[0]?.group?.groupId === process.env.GROUP_ID)
                ? [clanRequestComponent, timezoneComponent]
                : [timezoneComponent];
            sendMessageToMember(...buttons);
        }
        async function sendMessageToMember(...buttons) {
            try {
                await member.send({
                    embeds: [embed],
                    components: addButtonsToMessage(buttons),
                });
            }
            catch (error) {
                if (error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    const isUserClanMember = member.roles.cache.has(process.env.CLANMEMBER);
                    const channel = await (isUserClanMember
                        ? client.getAsyncTextChannel(process.env.PUBLIC_BOT_CHANNEL_ID)
                        : client.getAsyncTextChannel(process.env.JOIN_REQUEST_CHANNEL_ID));
                    const embed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setAuthor({ name: `${nameCleaner(member.displayName)}, вы зарегистрировались`, iconURL: member.displayAvatarURL() })
                        .setDescription("### Вы закрыли доступ к своим личным сообщениям\nДля лучшего опыта на сервере, пожалуйста, откройте доступ к личным сообщениям в [настройках Discord](https://support.discord.com/hc/ru/articles/217916488-%D0%91%D0%BB%D0%BE%D0%BA%D0%B8%D1%80%D0%BE%D0%B2%D0%BA%D0%B0-%D0%9D%D0%B0%D1%81%D1%82%D1%80%D0%BE%D0%B9%D0%BA%D0%B8-%D0%9A%D0%BE%D0%BD%D1%84%D0%B8%D0%B4%D0%B5%D0%BD%D1%86%D0%B8%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D1%81%D1%82%D0%B8#:~:text=%D0%92%D1%8B%D0%B1%D0%BE%D1%80%D0%BE%D1%87%D0%BD%D1%8B%D0%B9%20%D0%A1%D0%BB%D1%83%D1%85%3A%20%D0%9C%D0%B5%D1%82%D0%BE%D0%B4%20%D0%9F%D1%80%D1%8F%D0%BC%D1%8B%D1%85%20%D0%A1%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B9)");
                    const notificationMessage = await channel.send({ content: `<@${member.id}>`, embeds: [embed] });
                    setTimeout(() => {
                        notificationMessage.delete();
                    }, 1000 * 60);
                }
                else {
                    console.error("[Error code: 1957] Found unexpected error", error);
                }
            }
        }
    }
    catch (error) {
        try {
            res.send("<script>location.replace('error.html')</script>").end();
        }
        catch (e) {
            console.error("[Error code: 1802]", e);
        }
        return console.error(`[Error code: 1234] State: ${state} / Code:${code}`, body, error);
    }
}
//# sourceMappingURL=webHandler.js.map