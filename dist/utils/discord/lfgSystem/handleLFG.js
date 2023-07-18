import { ButtonBuilder, ButtonStyle, ChannelType, Colors, EmbedBuilder, resolveColor, } from "discord.js";
import { LfgButtons } from "../../../configs/Buttons.js";
import colors from "../../../configs/colors.js";
import icons from "../../../configs/icons.js";
import { dlcRoles, seasonalRoles } from "../../../configs/roles.js";
import { bungieNames } from "../../../core/userStatisticsManagement.js";
import { client } from "../../../index.js";
import { addButtonsToMessage } from "../../general/addButtonsToMessage.js";
import nameCleaner from "../../general/nameClearer.js";
import { escapeString } from "../../general/utilities.js";
import { channelDataMap } from "../../persistence/dataStore.js";
import findActivityForLfg from "./findActivityForLfg.js";
import { removeChannelData } from "./handleLfgJoin.js";
class LfgActivitySettings {
    name;
    description;
    image;
    footerIcon;
    lightLevel;
    constructor(activityName, difficulty) {
        const activity = findActivityForLfg(activityName, difficulty) ?? findActivityForLfg(activityName, difficulty, true);
        this.name = activity?.displayProperties?.name || activityName || null;
        this.description = activity?.displayProperties?.description || null;
        this.image = activity?.pgcrImage ? `https://bungie.net${activity.pgcrImage}` : null || null;
        this.footerIcon = activity?.displayProperties?.icon || null;
        this.lightLevel = activity?.activityLightLevel.toString() || null;
    }
}
class LfgUserSettings {
    invite = true;
    ping = null;
    activity = null;
    color = colors.serious;
    activitySettings = null;
}
let pvePartyChannel = null;
async function lfgHandler(message) {
    if (!message.content.startsWith("+"))
        return;
    let userMessageContent = message.cleanContent;
    const userLimitString = userMessageContent.match(/\+ *(\d+) */)?.[0] || "1";
    const voiceLimit = parseInt(userLimitString, 10) + 1;
    const userLimit = voiceLimit > 99 ? 99 : voiceLimit <= 1 ? 2 : voiceLimit;
    if (isNaN(userLimit) || userLimit <= 1 || userLimit > 99) {
        await messageErrorHandler("Ошибка числа участников", "Число участников должно быть больше 1 и меньше 100", message);
        return;
    }
    userMessageContent = userMessageContent.replace(/\+ *(\d+) */, "").trim();
    if (userMessageContent.length === 0) {
        await messageErrorHandler("Ошибка названия", "Название набора обязательно", message);
        return;
    }
    const stringArgs = userMessageContent.trim().match(/--\w+(?:=(?:"[^"]*"|'[^']*'))?/g);
    const userSettings = {
        invite: true,
        ping: null,
        activity: null,
        color: colors.serious,
        activitySettings: null,
    };
    if (stringArgs) {
        stringArgs.forEach(processArg);
        function processArg(args) {
            if (!args)
                return console.error("[Error code: 1733] Broken arg", stringArgs);
            const lowerCaseArg = args.toLowerCase();
            const value = args.slice(args.indexOf("=") + 1, args.length).replace(/\"|\'/g, "");
            switch (lowerCaseArg) {
                case "--here":
                    userSettings.ping = "@here";
                    break;
                case "--everyone":
                    userSettings.ping = "everyone";
                    break;
                case "--f":
                case "--frs":
                case "--forsaken":
                    userSettings.ping = dlcRoles.frs;
                    break;
                case "--sk":
                case "--shadowkeep":
                    userSettings.ping = dlcRoles.sk;
                    break;
                case "--bl":
                case "--beyondlight":
                    userSettings.ping = dlcRoles.bl;
                    break;
                case "--anni":
                case "--anniversary":
                case "--30":
                case "--30th":
                    userSettings.ping = dlcRoles.anni;
                    break;
                case "--twq":
                case "--thewitchqueen":
                case "--witchqueen":
                    userSettings.ping = dlcRoles.twq;
                    break;
                case "--lf":
                case "--lightfall":
                    userSettings.ping = dlcRoles.lf;
                    break;
                case "--season":
                case "--curseason":
                case "--currentseason":
                case "--seasonal":
                    userSettings.ping = seasonalRoles.curSeasonRole;
                    break;
                case "--noinvite":
                case "--deleteinvite":
                case "--no_invite":
                    userSettings.invite = false;
                    break;
                default:
                    if (lowerCaseArg.startsWith("--activity")) {
                        processActivityArg(value);
                    }
                    else if (lowerCaseArg.startsWith("--color")) {
                        processColorArg(value);
                    }
                    break;
            }
        }
        function processColorArg(value) {
            try {
                let cleanedName = value.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
                const color = (Colors[cleanedName] || colors.serious);
                if (resolveColor(color)) {
                    return (userSettings.color = color);
                }
            }
            catch (error) { }
        }
        function processActivityArg(value) {
            const activityName = value;
            if (!activityName)
                return;
            const difficultyArg = stringArgs.find((arg) => arg.toLowerCase().startsWith("--difficulty")) || "нормальный";
            const activityDifficulty = difficultyArg.slice(difficultyArg.indexOf("=") + 1, difficultyArg.length).replace(/\"|\'/g, "") || "нормальный";
            const activityData = new LfgActivitySettings(activityName, activityDifficulty);
            if (activityData && activityData.name)
                userSettings.activitySettings = activityData;
        }
    }
    const userText = userMessageContent.replace(/--\w+(?:=(?:"[^"]*"|'[^']*'))?/g, "").trim();
    const separatorIndex = userText.indexOf("|");
    const userTitle = userText
        .slice(0, separatorIndex !== -1 ? separatorIndex : userText.length)
        .trim()
        .replace(/^в\s*/, "");
    const userDescription = separatorIndex !== -1 ? userText.slice(userText.indexOf("|") + 1, userText.length).trim() : null;
    const member = await client.getAsyncMember(message.author.id);
    const lfgData = member.voice.channel && channelDataMap.get(member.voice.channel?.id);
    let deletable = member.voice.channel ? false : true;
    const embed = new EmbedBuilder().setThumbnail(userSettings.activitySettings?.image ?? null);
    try {
        let userLimitWithCurrentVoiceMembers = userLimit - (member.voice.channel?.members.size || 0);
        embed.setTitle(`+${userLimitWithCurrentVoiceMembers < 0 ? 0 : userLimitWithCurrentVoiceMembers} в ${(userSettings.activitySettings?.name ?? userTitle) || "неизвестную активность"}`);
    }
    catch (error) {
        await messageErrorHandler("Ошибка названия", "Не удалось установить ваш заголовок\nВозможные причины: текст слишком длинный или содержит специальные символы", message);
    }
    try {
        embed.setDescription((userSettings.activitySettings?.description ?? userDescription) || null);
    }
    catch (error) {
        await messageErrorHandler("Ошибка описания", "Не удалось установить ваше описание\nВозможные причины: текст слишком длинный или содержит специальные символы", message);
    }
    try {
        embed.setColor(userSettings.color);
    }
    catch (error) {
        embed.setColor(colors.error);
        await messageErrorHandler("Ошибка цвета", `Не удалось установить ваш цвет: \`${userSettings.color}\``, message);
    }
    if (userSettings.activitySettings?.name && userTitle) {
        embed.addFields({
            name: userSettings.activitySettings?.name && userDescription && embed.data.description !== userDescription
                ? userTitle
                : userDescription && embed.data.description !== userDescription
                    ? `${userTitle}`
                    : "Описание",
            value: userDescription && embed.data.description !== userDescription ? userDescription : `${userTitle}`,
        });
    }
    if (userSettings.activitySettings?.lightLevel) {
        embed.addFields({ name: "Рекомендуемый уровень силы", value: `${userSettings.activitySettings.lightLevel}`, inline: true });
    }
    if (member) {
        embed.addFields({
            name: "Создатель набора",
            value: `<@${message.author.id}> — ${nameCleaner(member.displayName, true)}${bungieNames.has(message.author.id) ? ` — ${escapeString(bungieNames.get(message.author.id))}` : ""}`,
        });
    }
    if (member.voice.channel) {
        let i = 1;
        embed.addFields({
            name: "Состав группы",
            value: member.voice.channel.members
                .map((guildMember) => {
                const bungieName = bungieNames.get(guildMember.id);
                return `${i++}. <@${guildMember.id}>${bungieName ? ` — ${escapeString(bungieName)}` : ""}`;
            })
                .join("\n"),
        });
    }
    if (!pvePartyChannel)
        pvePartyChannel = await client.getAsyncTextChannel(process.env.PVE_PARTY_CHANNEL_ID);
    const voiceChannel = member.voice.channel?.type === ChannelType.GuildVoice
        ? member.voice.channel
        : await message.guild?.channels.create({
            name: userTitle || userSettings.activitySettings?.name || "⚡｜набор в активность",
            type: ChannelType.GuildVoice,
            parent: pvePartyChannel.parent,
            permissionOverwrites: [
                ...pvePartyChannel.permissionOverwrites.cache.toJSON(),
                { allow: "Connect", id: pvePartyChannel.guild.roles.everyone },
                { allow: "ManageChannels", id: message.author.id },
            ],
            reason: `Created by ${member?.displayName} request`,
            userLimit,
        });
    if (!voiceChannel)
        return messageErrorHandler("Ошибка во время создания голосового канала", "Попробуйте позже", message);
    const buttonForLfgDeletion = new ButtonBuilder().setStyle(ButtonStyle.Danger).setLabel("Удалить сбор").setCustomId(LfgButtons.delete);
    const components = [buttonForLfgDeletion];
    if (userSettings.invite) {
        const invite = await voiceChannel.createInvite({ maxAge: 60 * 300 });
        if (invite) {
            components.push(new ButtonBuilder().setURL(invite.url).setLabel("Перейти в голосовой канал").setStyle(ButtonStyle.Link));
        }
    }
    const ping = userSettings.ping
        ? userSettings.ping === "everyone"
            ? "@everyone"
            : userSettings.ping === "@here"
                ? "@here"
                : `<@&${userSettings.ping}>`
        : undefined;
    const partyMessage = await pvePartyChannel.send({
        embeds: [embed],
        content: ping,
        components: addButtonsToMessage(components),
    });
    if (lfgData) {
        await removeChannelData(member.voice.channel.id);
        if (lfgData.isDeletable === true) {
            deletable = true;
        }
    }
    channelDataMap.set(voiceChannel.id, {
        members: member.voice.channel?.members.map((member) => member.id) ?? [],
        channelMessage: partyMessage,
        voiceChannel: voiceChannel,
        isDeletable: deletable,
        creator: member.id,
    });
    await message.delete();
    return;
}
async function messageErrorHandler(name, description, message) {
    const errorEmbed = new EmbedBuilder().setColor(colors.error).setAuthor({ name, iconURL: icons.error }).setDescription(description);
    const errorMessage = await (await client.getAsyncTextChannel(message.channelId)).send({ embeds: [errorEmbed] });
    setTimeout(async () => await errorMessage.delete(), 5000);
    return;
}
export { lfgHandler };
//# sourceMappingURL=handleLFG.js.map