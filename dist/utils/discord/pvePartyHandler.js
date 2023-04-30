import { ButtonBuilder, ButtonStyle, ChannelType, ComponentType, EmbedBuilder, } from "discord.js";
import colors from "../../configs/colors.js";
import { channelIds } from "../../configs/ids.js";
import { dlcRoles } from "../../configs/roles.js";
import { bungieNames } from "../../core/userStatisticsManagement.js";
import { client } from "../../index.js";
import { CachedDestinyActivityDefinition } from "../api/manifestHandler.js";
import { escapeString } from "../general/utilities.js";
class activitySettings {
    name;
    description;
    image;
    footerIcon;
    lightLevel;
    constructor(activityName, difficulty) {
        const activity = Object.values(CachedDestinyActivityDefinition).find((searchActivity) => {
            if (searchActivity.originalDisplayProperties.name.toLowerCase() === activityName.toLowerCase() &&
                (searchActivity.displayProperties.name.toLowerCase() ===
                    `${activityName.toLowerCase()}: ${(difficulty ?? "нормальный").toLowerCase()}` ||
                    searchActivity.selectionScreenDisplayProperties?.name?.toLowerCase() === (difficulty ?? "нормальный").toLowerCase() ||
                    (!difficulty &&
                        (!searchActivity.selectionScreenDisplayProperties ||
                            searchActivity.selectionScreenDisplayProperties.name.toLowerCase() === "нормальный"))))
                return searchActivity;
        }) ??
            Object.values(CachedDestinyActivityDefinition).find((searchActivity) => {
                if ((searchActivity.originalDisplayProperties.name.toLowerCase().startsWith(activityName.toLowerCase()) ||
                    searchActivity.originalDisplayProperties.name.toLowerCase().endsWith(activityName.toLowerCase())) &&
                    (searchActivity.displayProperties.name.toLowerCase() ===
                        `${activityName.toLowerCase()}: ${(difficulty ?? "нормальный").toLowerCase()}` ||
                        searchActivity.selectionScreenDisplayProperties?.name?.toLowerCase() === (difficulty ?? "нормальный").toLowerCase() ||
                        (!difficulty &&
                            (!searchActivity.selectionScreenDisplayProperties ||
                                searchActivity.selectionScreenDisplayProperties.name.toLowerCase() === "нормальный"))))
                    return searchActivity;
            });
        this.name = activity?.displayProperties?.name || activityName || null;
        this.description = activity?.displayProperties?.description || null;
        this.image = activity?.pgcrImage ? `https://bungie.net${activity.pgcrImage}` : null || null;
        this.footerIcon = activity?.displayProperties?.icon || null;
        this.lightLevel = activity?.activityLightLevel.toString() || null;
    }
}
class UserSettings {
    invite;
    ping;
    activity;
    color;
    activitySettings;
    constructor() {
        this.ping = this.ping || null;
        this.activity = this.activity || null;
        this.color = this.color || colors.serious;
        this.activitySettings = this.activitySettings || null;
    }
}
export const createdChannelsMap = new Map();
const pvePartyChannel = client.getCachedTextChannel(channelIds.pveParty);
export async function handlePveParty(message) {
    if (!message.content.startsWith("+") || !message.member)
        return;
    let userMessageContent = message.cleanContent;
    const userLimitString = userMessageContent.replace(/\+\s+/, "");
    const userLimit = parseInt(userLimitString) + 1;
    if (isNaN(userLimit) || userLimit <= 1 || userLimit > 99) {
        messageErrorHandler("Ошибка числа участников", "Число участников должно быть больше 1 и меньше 100", message);
        return;
    }
    userMessageContent = userMessageContent.replace(/\+\s?\d{1,2}\s?/, "").trim();
    if (userMessageContent.length === 0) {
        messageErrorHandler("Ошибка названия", "Название набора обязательно", message);
        return;
    }
    const stringArgs = userMessageContent.trim().match(new RegExp(/--\w+=((?:("|')[^("|')]*("|')|^[^("|')]*$)|\w+)|--\w+/g));
    const userSettings = {
        invite: true,
        ping: null,
        activity: null,
        color: colors.serious,
        activitySettings: null,
    };
    stringArgs?.forEach((args) => {
        if (!args)
            return console.error("Broken arg", stringArgs);
        if (args.toLowerCase() === "--everyone")
            return (userSettings.ping = "everyone");
        if (args.toLowerCase() === "--f" || args.toLowerCase() === "--frs")
            return (userSettings.ping = dlcRoles.frs);
        if (args.toLowerCase() === "--sk")
            return (userSettings.ping = dlcRoles.sk);
        if (args.toLowerCase() === "--bl")
            return (userSettings.ping = dlcRoles.bl);
        if (args.toLowerCase() === "--anni")
            return (userSettings.ping = dlcRoles.anni);
        if (args.toLowerCase() === "--twq")
            return (userSettings.ping = dlcRoles.twq);
        if (args.toLowerCase() === "--lf")
            return (userSettings.ping = dlcRoles.lf);
        if (args.toLowerCase().startsWith("--activity")) {
            const activityName = args.slice(args.indexOf("=") + 1, args.length).replaceAll(/\"|\'/g, "");
            if (!activityName)
                return;
            const activityDifficulty = stringArgs
                .find((arg) => arg.toLowerCase().startsWith("--difficulty"))
                ?.slice(args.indexOf("=") + 1, args.length)
                ?.replaceAll(/\"|\'/g, "") ?? null;
            const activityData = new activitySettings(activityName, activityDifficulty);
            if (activityData && activityData.name)
                userSettings.activitySettings = activityData;
            return;
        }
        if (args.toLowerCase().startsWith("--color")) {
            const activityColor = args.slice(args.indexOf("=") + 1, args.length).replaceAll(/\"|\'/g, "");
            if (!activityColor)
                return;
            userSettings.color = activityColor;
            return;
        }
        if (args.toLowerCase().startsWith("--noinvite")) {
            userSettings.invite = false;
            return;
        }
    });
    const userText = userMessageContent.replaceAll(new RegExp(/--\w+=((?:("|')[^("|')]*("|')|^[^("|')]*$)|\w+)|--\w+/g), "").trim();
    const separatorIndex = userText.indexOf("|");
    const userTitle = userText.slice(0, separatorIndex !== -1 ? separatorIndex : userText.length).trim();
    const userDescription = separatorIndex !== -1 ? userText.slice(userText.indexOf("|") + 1, userText.length).trim() : null;
    const embed = new EmbedBuilder().setThumbnail(userSettings.activitySettings?.image ?? null);
    try {
        let userLimitWithCurrentVoiceMembers = userLimit - (message.member.voice.channel?.members.size || 0);
        embed.setTitle(`+${userLimitWithCurrentVoiceMembers < 0 ? 0 : userLimitWithCurrentVoiceMembers} в ${(userSettings.activitySettings?.name ?? userTitle) || "неизвестную активность"}`);
    }
    catch (error) {
        message.channel
            .send("Ошибка. Не удалось установить ваш заголовок\nВозможные причины: текст слишком длинный или содержит специальные символы")
            .then((m) => setTimeout(() => m.delete(), 5000));
    }
    try {
        embed.setDescription((userSettings.activitySettings?.description ?? userDescription) || null);
    }
    catch (error) {
        message.channel
            .send("Ошибка. Не удалось установить ваше описание\nВозможные причины: текст слишком длинный или содержит специальные символы")
            .then((m) => setTimeout(() => m.delete(), 5000));
    }
    try {
        embed.setColor(userSettings.color);
    }
    catch (error) {
        embed.setColor(colors.error);
        message.channel
            .send("Ошибка. Не удалось установить ваш цвет: '${userSettings.color}'")
            .then((m) => setTimeout(() => m.delete(), 5000));
    }
    if (userSettings.activitySettings?.name && userTitle) {
        embed.addFields([
            {
                name: userSettings.activitySettings?.name && embed.data.description !== userDescription && userDescription
                    ? userTitle
                    : embed.data.description !== userDescription && userDescription
                        ? `+${userLimit} в ${userTitle}`
                        : "⁣",
                value: embed.data.description !== userDescription && userDescription ? userDescription : `+${userLimit} в ${userTitle}`,
            },
        ]);
    }
    if (userSettings.activitySettings?.lightLevel) {
        embed.addFields([{ name: "Рекомендуемый уровень силы", value: `${userSettings.activitySettings.lightLevel}`, inline: true }]);
    }
    if (message.member) {
        embed.addFields([
            {
                name: "Создатель набора",
                value: `<@${message.author.id}> — ${message.member.displayName.replace(/\[[+](?:\d|\d\d)]\s?/, "")}${bungieNames.has(message.author.id) ? ` — ${bungieNames.get(message.author.id)}` : ""}`,
                inline: true,
            },
        ]);
    }
    if (message.member.voice.channel) {
        let i = 1;
        embed.addFields([
            {
                name: "Состав группы",
                value: message.member.voice.channel.members
                    .map((guildMember) => {
                    const bungieName = bungieNames.get(guildMember.id);
                    return `${i++}. <@${guildMember.id}>${bungieName ? ` — ${bungieName}` : ""}`;
                })
                    .join("\n"),
            },
        ]);
    }
    const voiceChannel = message.member.voice.channel?.type === ChannelType.GuildVoice
        ? message.member.voice.channel
        : await message.guild?.channels.create({
            name: userTitle || userSettings.activitySettings?.name || "⚡｜набор в активность",
            type: ChannelType.GuildVoice,
            parent: pvePartyChannel.parent,
            position: pvePartyChannel.position,
            permissionOverwrites: [
                ...pvePartyChannel.permissionOverwrites.cache.toJSON(),
                { allow: "Connect", id: pvePartyChannel.guild.roles.everyone },
                { allow: "ManageChannels", id: message.author.id },
            ],
            reason: `Created by ${message.member?.displayName} request`,
            userLimit,
        });
    if (!voiceChannel)
        return messageErrorHandler("Ошибка во время создания голосового канала", "Попробуйте позже", message);
    const components = [];
    if (userSettings.invite)
        components.push(new ButtonBuilder()
            .setURL(`${(await voiceChannel.createInvite({ maxAge: 60 * 120 })).url}`)
            .setLabel("Перейти в голосовой канал")
            .setStyle(ButtonStyle.Link));
    const partyMessage = await message.channel.send({
        embeds: [embed],
        content: userSettings.ping ? (userSettings.ping === "everyone" ? "@everyone" : `<@&${userSettings.ping}>`) : undefined,
        components: components.length > 0
            ? [
                {
                    type: ComponentType.ActionRow,
                    components,
                },
            ]
            : [],
    });
    createdChannelsMap.set(voiceChannel.id, {
        joined: message.member.voice.channel?.members.map((member) => member.id) ?? [],
        message: partyMessage,
        voice: voiceChannel,
        deletable: message.member.voice.channel ? false : true,
    });
    message.delete();
    return;
}
export async function pvePartyVoiceChatHandler(channelId, member, state) {
    const createdChannel = createdChannelsMap.get(channelId);
    if (!createdChannel)
        return;
    if (createdChannel.joined.includes(member.id) && state === "leave") {
        createdChannel.joined.splice(createdChannel.joined.indexOf(member.id), 1);
    }
    else if (state === "join") {
        createdChannel.joined.push(member.id);
    }
    if (createdChannel.joined.length === 0) {
        return createdChannel.message.delete().then((r) => {
            createdChannelsMap.delete(channelId);
            createdChannel.deletable ? createdChannel.voice.delete("Last member disconnected") : "";
        });
    }
    const embed = EmbedBuilder.from(createdChannel.message.embeds[0]);
    if (embed.data.title) {
        const joinedCount = parseInt(embed.data.title);
        const updatedCount = state === "join" ? joinedCount - 1 : joinedCount + 1;
        embed.setTitle(embed.data.title.replace(/\d+/, `${updatedCount > 0 ? updatedCount : 0}`));
    }
    const joinedUsersFieldIndex = embed.data.fields?.findIndex((v) => v.name.startsWith("Состав группы"));
    const joinedUsersUpdatedFieldValue = createdChannel.joined
        .map((id, i) => {
        const bungieName = bungieNames.get(id);
        return `${i + 1}. <@${id}>${bungieName ? ` — ${escapeString(bungieName)}` : ""}`;
    })
        .join("\n");
    const joinedUsersReadyField = {
        name: "Состав группы",
        value: joinedUsersUpdatedFieldValue,
    };
    joinedUsersFieldIndex && joinedUsersFieldIndex >= 1
        ? embed.data.fields?.splice(joinedUsersFieldIndex, 1, joinedUsersReadyField)
        : embed.addFields(joinedUsersReadyField);
    await createdChannel.message.edit({ embeds: [embed] }).then((m) => createdChannelsMap.set(channelId, {
        joined: createdChannel.joined,
        message: m,
        voice: createdChannel.voice,
        deletable: createdChannel.deletable,
    }));
}
async function messageErrorHandler(name, description, message) {
    const errorEmbed = new EmbedBuilder().setColor(colors.error).setTitle(name).setDescription(description);
    const m = await message.channel.send({ embeds: [errorEmbed] });
    setTimeout(() => {
        m.delete();
    }, 5000);
    return;
}
