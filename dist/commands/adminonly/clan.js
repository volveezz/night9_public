import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, } from "discord.js";
import { ClanButtons } from "../../configs/Buttons.js";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { ownerId } from "../../configs/ids.js";
import { Command } from "../../structures/command.js";
import { fetchRequest } from "../../utils/api/fetchRequest.js";
import { addButtonComponentsToMessage } from "../../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../../utils/general/convertSeconds.js";
import { escapeString } from "../../utils/general/utilities.js";
import { AuthData, UserActivityData } from "../../utils/persistence/sequelize.js";
export default new Command({
    name: "clan",
    description: "Clan management",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "list",
            description: "View detailed statistics for each Night 9 clan member",
            options: [{ name: "removal", description: "Add removal system", type: ApplicationCommandOptionType.Boolean }],
        },
    ],
    run: async ({ client, interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const clanMembers = await AuthData.findAll({ where: { clan: true }, include: UserActivityData });
        const discordMembers = interaction.guild?.members.cache || client.getCachedMembers();
        const destinyRequest = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        const destinyMembers = destinyRequest.results;
        const isRemovalSystem = args.getBoolean("removal") || false;
        if (!clanMembers || !discordMembers || !destinyRequest || !destinyMembers) {
            console.error("[Error code: 1035] clan list error", !clanMembers ? clanMembers : "", !discordMembers ? discordMembers : "", !destinyRequest ? destinyRequest : "");
            throw { name: "Ошибка во время сбора данных", description: "Пожалуйста, повторите попытку позже" };
        }
        const mergedMembersUnsort = destinyMembers.map((clanmember) => {
            return {
                isOnline: clanmember.isOnline,
                lastOnlineStatusChange: parseInt(clanmember.lastOnlineStatusChange),
                joinDate: Math.trunc(new Date(clanmember.joinDate).getTime() / 1000),
                bungieName: clanmember.bungieNetUserInfo
                    ? clanmember.bungieNetUserInfo.supplementalDisplayName ||
                        clanmember.bungieNetUserInfo.bungieGlobalDisplayName +
                            "#" +
                            (clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode?.toString().length === 3
                                ? "0" + clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode
                                : clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode)
                    : clanmember.destinyUserInfo.bungieGlobalDisplayName +
                        "#" +
                        (clanmember.destinyUserInfo.bungieGlobalDisplayNameCode?.toString().length === 3
                            ? "0" + clanmember.destinyUserInfo.bungieGlobalDisplayNameCode
                            : clanmember.destinyUserInfo.bungieGlobalDisplayNameCode) ||
                        clanmember.destinyUserInfo.LastSeenDisplayName ||
                        clanmember.destinyUserInfo.displayName,
                membershipType: clanmember.destinyUserInfo.membershipType,
                bungieId: clanmember.destinyUserInfo.membershipId,
                rank: clanmember.memberType,
            };
        });
        const mergedMembers = mergedMembersUnsort.sort((a, b) => b.lastOnlineStatusChange - a.lastOnlineStatusChange);
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTitle(`Статистика ${destinyRequest.results[0].groupId === "4123712" ? "клана Night 9" : "неизвестного клана"}`)
            .addFields({
            name: "*n* *bungieName* / *discordName* / *platform*/*bungieId*",
            value: "*bungieNet* | *lastOnline* | *joinDate* | *msgsSent* | *voiceSec* | *clanDungeons/Raids*",
        });
        const fields = mergedMembers.map((member) => {
            const dbData = clanMembers.find((d) => d.bungieId === member.bungieId);
            return {
                name: `${member.bungieName} / ${discordMembers.get(dbData?.discordId)?.displayName || "Не зарегистрирован"} / ${member.membershipType + "/" + member.bungieId}`,
                value: `[Bungie.net](https://www.bungie.net/7/ru/User/Profile/${member.membershipType}/${member.bungieId}) | ${member.isOnline ? "В игре" : `<t:${member.lastOnlineStatusChange}>`} | <t:${member.joinDate}>${dbData && dbData.UserActivityData
                    ? ` | ${dbData.UserActivityData.messages}:book: | ${dbData.UserActivityData.voice}с:microphone2: | ${dbData.UserActivityData.dungeons}/${dbData.UserActivityData.raids}`
                    : ""}`,
            };
        });
        const e = embed;
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            embed.addFields({ name: `${i + 1} ${field.name}`, value: field.value });
            if (embed.data.fields?.length === 25 || i === fields.length - 1) {
                if (i === 24) {
                    (await deferredReply) && (await interaction.editReply({ embeds: [e] }));
                    e.setTitle(null).spliceFields(0, 25);
                }
                else {
                    (await deferredReply) && (await interaction.followUp({ embeds: [e], ephemeral: true }));
                    e.spliceFields(0, 25);
                }
            }
        }
        if (isRemovalSystem) {
            let lastMemberIndex = mergedMembers.length - 1;
            async function memberParser(memberIndex) {
                const destinyUser = mergedMembers[memberIndex];
                const memberDbData = clanMembers.find((clanMember) => clanMember.bungieId === mergedMembers[memberIndex].bungieId);
                const serverMember = await client.getAsyncMember(memberDbData?.discordId);
                const lastMember = {
                    ...destinyUser,
                    memberDbData,
                    serverMember,
                };
                const removalEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Управление пользователем")
                    .addFields({
                    name: "Пользователь",
                    value: `${lastMember.serverMember ? `<@${lastMember.serverMember.id}>` : "Отсутствует на сервере"}`,
                    inline: true,
                }, { name: "Ранг", value: `${lastMember.rank}`, inline: true }, {
                    name: "Id",
                    value: `${memberDbData && memberDbData.discordId ? `DiscordId: ${memberDbData.discordId}` : ""}${serverMember && memberDbData && memberDbData.discordId !== serverMember.user.id ? `(${serverMember.user.id})` : ""}\nBungieId: ${lastMember.bungieId}${memberDbData && lastMember.bungieId !== memberDbData.bungieId ? `(${memberDbData.bungieId})` : ""}${memberDbData && memberDbData.membershipId ? `\nMembershipId: ${memberDbData.membershipId}` : ""}`,
                    inline: true,
                }, {
                    name: `Онлайн/Последний/Вступление в клан`,
                    value: `<t:${lastMember.isOnline}>\n${lastMember.lastOnlineStatusChange}\n${lastMember.joinDate}`,
                    inline: true,
                }, {
                    name: "В голосе/Сообщений",
                    value: `${convertSeconds(memberDbData?.UserActivityData?.voice || 0)} / ${memberDbData?.UserActivityData?.messages}`,
                    inline: true,
                });
                if (serverMember) {
                    try {
                        removalEmbed.setAuthor({
                            name: `${serverMember.displayName} / ${lastMember.bungieName}${memberDbData ? ` / ${memberDbData.displayName}` : ""}`,
                            iconURL: serverMember.displayAvatarURL() || serverMember.user.displayAvatarURL(),
                        });
                    }
                    catch (error) {
                        console.error("[Error code: 1746]", error);
                    }
                }
                else {
                    removalEmbed.setAuthor({ name: `Не на сервере / ${lastMember.bungieName}` });
                }
                const components = [
                    new ButtonBuilder()
                        .setCustomId("clanManagement_previous")
                        .setDisabled(memberIndex <= 0)
                        .setLabel("Предыдущий")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId("clanManagement_demote")
                        .setDisabled(lastMember.rank > 1 && lastMember.rank < 4 ? false : true)
                        .setLabel("Понизить")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("clanManagement_promote")
                        .setDisabled(lastMember.rank >= 1 && lastMember.rank < 3 ? false : true)
                        .setLabel("Повысить")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId("clanManagement_kick")
                        .setLabel("Исключить")
                        .setDisabled(lastMember.rank >= 1 && lastMember.rank < 4 ? false : true)
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId("clanManagement_next")
                        .setDisabled(memberIndex >= mergedMembers.length - 1 ? true : false)
                        .setLabel("Следующий")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("clanManagement_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                ];
                return { removalEmbed, components, lastMember, index: memberIndex };
            }
            const { components, removalEmbed } = await memberParser(lastMemberIndex);
            await deferredReply;
            const removalMessage = await interaction.followUp({
                embeds: [removalEmbed],
                components: await addButtonComponentsToMessage(components),
            });
            const collector = removalMessage.channel.createMessageComponentCollector({
                message: removalMessage,
                componentType: ComponentType.Button,
                filter: (btn) => btn.user.id === interaction.user.id,
                time: 60 * 60 * 1000,
            });
            const userAuthData = await AuthData.findOne({
                where: { discordId: interaction.user.id },
                attributes: ["accessToken"],
            });
            if (!userAuthData) {
                throw { errorType: UserErrors.DB_USER_NOT_FOUND };
            }
            collector.on("collect", async (button) => {
                const { customId, member } = button;
                if (!member || !member.permissions.has("Administrator"))
                    throw { errorType: UserErrors.MISSING_PERMISSIONS };
                const { lastMember, index: memberIndex } = await memberParser(lastMemberIndex);
                if (lastMemberIndex !== memberIndex)
                    return;
                const buttonDeferredReply = button.deferUpdate();
                const managementEmbed = new EmbedBuilder();
                if (customId === "clanManagement_previous" || customId === "clanManagement_next") {
                    lastMemberIndex = lastMemberIndex + (customId === "clanManagement_previous" ? -1 : 1);
                }
                else if (customId === "clanManagement_kick") {
                    await buttonDeferredReply;
                    const btnFollowUp = await button.followUp({
                        content: `Подтвердите исключение **${escapeString(lastMember.bungieName)}**`,
                        components: await addButtonComponentsToMessage([
                            new ButtonBuilder()
                                .setCustomId("clanManagement_kick_confirm")
                                .setLabel("Подтвердить")
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder().setCustomId("clanManagement_kick_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                        ]),
                    });
                    const confirmationCollector = btnFollowUp.createMessageComponentCollector({
                        filter: (btn) => btn.user.id === interaction.user.id,
                    });
                    confirmationCollector.on("collect", async (confirmationButton) => {
                        if (confirmationButton.customId === "clanManagement_kick_confirm") {
                            const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/Kick/`, {
                                method: "POST",
                                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${userAuthData.accessToken}` },
                            }));
                            const result = (await query.json());
                            if (result.ErrorCode === 1) {
                                mergedMembers[memberIndex].rank = 0;
                                await button.followUp({ ephemeral: true, content: `**${lastMember.bungieName}** был исключен` });
                                if (lastMember.serverMember) {
                                    const kickNotify = new EmbedBuilder()
                                        .setColor(colors.default)
                                        .setAuthor({
                                        name: "Уведомление об исключении из клана",
                                        iconURL: client.getCachedGuild().bannerURL(),
                                    })
                                        .setDescription(`> Вы были исключены из клана [Night 9](https://www.bungie.net/ru/ClanV2?groupid=4123712) в Destiny 2 поскольку не играли долгое время\n — Если вы вернетесь в игру - клан готов будет вас принять снова\n — Вступление в клан для исключенных доступно в <#724592361237381121> или по кнопке ниже\n\nПомните - даже после исключения из клана у Вас остается доступ к большинству возможностям сервера\nВы всё ещё можете записываться на рейды, общаться в каналах и т.д.\n\nЕсли у вас есть вопросы - обратитесь к <@${ownerId}>`);
                                    await lastMember.serverMember.send({
                                        embeds: [kickNotify],
                                        components: await addButtonComponentsToMessage([
                                            new ButtonBuilder()
                                                .setCustomId(ClanButtons.invite)
                                                .setLabel("Отправить приглашение")
                                                .setStyle(ButtonStyle.Success),
                                            new ButtonBuilder()
                                                .setCustomId(ClanButtons.modal)
                                                .setLabel("Заполнить форму на вступление")
                                                .setStyle(ButtonStyle.Secondary),
                                        ]),
                                    });
                                }
                                await btnFollowUp.delete();
                            }
                            else {
                                await btnFollowUp.delete();
                                await button.followUp({
                                    ephemeral: true,
                                    content: `Произошла ошибка во время исключения **${lastMember.bungieName}**`,
                                });
                            }
                        }
                        else if (confirmationButton.customId === "clanManagement_kick_cancel") {
                            await btnFollowUp.delete();
                        }
                        confirmationCollector.stop();
                    });
                }
                else if (customId === "clanManagement_demote") {
                    const demoteRank = --lastMember.rank;
                    const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/SetMembershipType/${demoteRank}/`, {
                        method: "POST",
                        headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${userAuthData.accessToken}` },
                    }));
                    const result = (await query.json());
                    if (result.ErrorCode === 1) {
                        mergedMembers[memberIndex].rank = lastMember.rank;
                        managementEmbed
                            .setColor(colors.success)
                            .setAuthor({ name: `${lastMember.bungieName} был понижен до ${demoteRank} ранга`, iconURL: icons.success });
                        await button.followUp({ ephemeral: true, embeds: [managementEmbed] });
                    }
                    else {
                        managementEmbed.setColor(colors.error).setAuthor({
                            name: `Произошла ошибка во время понижения **${lastMember.bungieName}** до ${demoteRank} ранга`,
                            iconURL: icons.close,
                        });
                        await button.followUp({
                            ephemeral: true,
                            embeds: [managementEmbed],
                        });
                    }
                }
                else if (customId === "clanManagement_promote") {
                    const promoteRank = ++lastMember.rank;
                    managementEmbed
                        .setColor(colors.success)
                        .setAuthor({ name: `${lastMember.bungieName} был повышен до ${lastMember.rank} ранга`, iconURL: icons.success });
                    const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/SetMembershipType/${promoteRank}/`, {
                        method: "POST",
                        headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${userAuthData.accessToken}` },
                    }));
                    const result = (await query.json());
                    if (result.ErrorCode === 1) {
                        mergedMembers[memberIndex].rank = lastMember.rank;
                        await button.followUp({ ephemeral: true, embeds: [managementEmbed] });
                    }
                    else {
                        managementEmbed.setColor(colors.error).setAuthor({
                            name: `Произошла ошибка во время повышения ${lastMember.bungieName} до ${promoteRank} ранга`,
                            iconURL: icons.close,
                        });
                        await button.followUp({
                            ephemeral: true,
                            embeds: [managementEmbed],
                        });
                    }
                }
                else if (customId === "clanManagement_cancel") {
                    collector.stop("Cancelled");
                    await removalMessage.delete();
                    return;
                }
                const { removalEmbed, components, index } = await memberParser(lastMemberIndex);
                if ((lastMemberIndex !== index || memberIndex !== index) &&
                    customId !== "clanManagement_previous" &&
                    customId !== "clanManagement_next" &&
                    customId !== "clanManagement_kick")
                    return;
                try {
                    await button.message.edit({ embeds: [removalEmbed], components: await addButtonComponentsToMessage(components) });
                }
                catch (error) {
                    console.error("[Error code: 1731]", error);
                }
                return;
            });
        }
    },
});
