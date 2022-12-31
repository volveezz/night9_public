import { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import colors from "../../configs/colors.js";
import { fetchRequest } from "../../functions/fetchRequest.js";
import { Command } from "../../structures/command.js";
import { ClanButtons } from "../../enums/Buttons.js";
import UserErrors from "../../enums/UserErrors.js";
export default new Command({
    name: "clan",
    description: "Clan management",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "list",
            description: "View detailed statistics for each of clan members",
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
            console.error(`[Error code: 1035] clan list error`, !clanMembers ? clanMembers : "", !discordMembers ? discordMembers : "", !destinyRequest ? destinyRequest : "");
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
            .addFields([
            {
                name: `*n* *bungieName* / *discordName* / *platform*/*bungieId*`,
                value: `*bungieNet* | *lastOnline* | *joinDate* | *msgsSent* | *voiceSec* | *clanDungeons/Raids*`,
            },
        ]);
        const fields = mergedMembers.map((member) => {
            const dbData = clanMembers.find((d) => d.bungieId === member.bungieId);
            return {
                name: `${member.bungieName} / ${discordMembers.get(dbData?.discordId)?.displayName || "Не зарегистрирован"} / ${member.membershipType + `/` + member.bungieId}`,
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
                    await interaction.followUp({ embeds: [e], ephemeral: true });
                    e.spliceFields(0, 25);
                }
            }
        }
        if (isRemovalSystem) {
            let lastMemberIndex = mergedMembers.length - 1;
            async function memberParser(memberIndex) {
                const destinyUser = mergedMembers[memberIndex];
                const memberDbData = clanMembers.find((clanMember) => clanMember.bungieId === mergedMembers[memberIndex].bungieId);
                const lastMember = {
                    ...destinyUser,
                    memberDbData,
                    serverMember: memberDbData ? (interaction.guild || client.getCachedGuild()).members.cache.get(memberDbData.discordId) : undefined,
                };
                const removalEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle(`Управление пользователем`)
                    .addFields([
                    {
                        name: "Пользователь",
                        value: `${lastMember.serverMember ? `<@${lastMember.serverMember.id}>` : "Отсутствует на сервере"}`,
                        inline: true,
                    },
                    { name: "Ранг", value: `${lastMember.rank}`, inline: true },
                    {
                        name: "Id",
                        value: `${lastMember.memberDbData && lastMember.memberDbData.discordId ? `DiscordId: ${lastMember.memberDbData.discordId}` : ""}${lastMember.serverMember?.user.id &&
                            lastMember.memberDbData &&
                            lastMember.memberDbData.discordId !== lastMember.serverMember.user.id
                            ? `(${lastMember.serverMember.user.id})`
                            : ""}\nBungieId: ${lastMember.bungieId}${lastMember.memberDbData && lastMember.bungieId !== lastMember.memberDbData.bungieId
                            ? `(${lastMember.memberDbData.bungieId})`
                            : ""}${lastMember.memberDbData && lastMember.memberDbData.membershipId
                            ? `\nMembershipId: ${lastMember.memberDbData.membershipId}`
                            : ""}`,
                        inline: true,
                    },
                ]);
                if (lastMember.serverMember) {
                    removalEmbed.setAuthor({
                        name: `${lastMember.serverMember.displayName} / ${lastMember.bungieName}${lastMember.memberDbData ? ` / ${lastMember.memberDbData.displayName}` : ""}`,
                        iconURL: lastMember.serverMember.displayAvatarURL(),
                    });
                }
                else {
                    removalEmbed.setAuthor({ name: `Не на сервере / ${lastMember.bungieName}` });
                }
                const components = [
                    {
                        type: ComponentType.ActionRow,
                        components: [
                            new ButtonBuilder()
                                .setCustomId("clanManagment_previous")
                                .setDisabled(memberIndex <= 0 ? true : false)
                                .setLabel("Предыдущий")
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId("clanManagment_demote")
                                .setDisabled(lastMember.rank > 1 && lastMember.rank < 4 ? false : true)
                                .setLabel("Понизить")
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId("clanManagment_promote")
                                .setDisabled(lastMember.rank >= 1 && lastMember.rank < 3 ? false : true)
                                .setLabel("Повысить")
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId("clanManagment_kick")
                                .setLabel("Исключить")
                                .setDisabled(lastMember.rank >= 1 && lastMember.rank < 4 ? false : true)
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setCustomId("clanManagment_next")
                                .setDisabled(memberIndex >= mergedMembers.length - 1 ? true : false)
                                .setLabel("Следующий")
                                .setStyle(ButtonStyle.Secondary),
                        ],
                    },
                ];
                return { removalEmbed, components, lastMember, index: memberIndex };
            }
            const { components, removalEmbed } = await memberParser(lastMemberIndex);
            const removalMessage = await interaction.followUp({ embeds: [removalEmbed], components });
            const collector = removalMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: (btn) => btn.user.id === interaction.user.id,
            });
            collector.on("collect", async (button) => {
                const defferedReply = button.deferUpdate();
                const { customId } = button;
                var dbData = null;
                if (!button.member || !button.member.permissions.has("Administrator"))
                    throw { errorType: UserErrors.MISSING_PERMISSIONS };
                const { lastMember, index: memberIndex } = await memberParser(lastMemberIndex);
                if (lastMemberIndex !== memberIndex)
                    return;
                if (customId !== "clanManagment_previous" && customId !== "clanManagment_next") {
                    dbData = await AuthData.findOne({
                        where: { discordId: interaction.user.id },
                        attributes: ["accessToken"],
                    });
                    if (!dbData)
                        throw { errorType: UserErrors.DB_USER_NOT_FOUND };
                }
                if (customId === "clanManagment_previous" || customId === "clanManagment_next") {
                    lastMemberIndex = lastMemberIndex + (customId === "clanManagment_previous" ? -1 : 1);
                }
                else if (customId === "clanManagment_kick") {
                    const btnFollowUp = (await defferedReply) &&
                        (await button.followUp({
                            content: `Подтвердите исключение **${lastMember.bungieName}**`,
                            components: [
                                {
                                    type: ComponentType.ActionRow,
                                    components: [
                                        new ButtonBuilder().setCustomId("clanManagment_kick_confirm").setLabel("Подтвердить").setStyle(ButtonStyle.Primary),
                                        new ButtonBuilder().setCustomId("clanManagment_kick_cancel").setLabel("Отменить").setStyle(ButtonStyle.Danger),
                                    ],
                                },
                            ],
                        }));
                    const confirmationCollector = btnFollowUp.createMessageComponentCollector({ filter: (btn) => btn.user.id === interaction.user.id });
                    confirmationCollector.on("collect", async (confirmationButton) => {
                        if (confirmationButton.customId === "clanManagment_kick_confirm") {
                            const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/Kick/`, {
                                method: "POST",
                                headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${dbData.accessToken}` },
                            }));
                            const result = (await query.json());
                            if (result.ErrorCode === 1) {
                                mergedMembers[memberIndex].rank = 0;
                                button.followUp({ ephemeral: true, content: `**${lastMember.bungieName}** был исключен` });
                                if (lastMember.serverMember) {
                                    const kickNotify = new EmbedBuilder()
                                        .setColor(colors.default)
                                        .setAuthor({
                                        name: "Уведомление об исключении из клана",
                                        iconURL: (interaction.guild || client.getCachedGuild()).bannerURL(),
                                    })
                                        .setDescription(`> Вы были исключены из клана [Night 9](https://www.bungie.net/ru/ClanV2?groupid=4123712) в Destiny 2 поскольку не играли долгое время\n — Если вы вернетесь в игру - клан готов будет вас принять снова\n — Вступление в клан для исключенных доступно в <#724592361237381121> или по кнопке ниже`);
                                    lastMember.serverMember.send({
                                        embeds: [kickNotify],
                                        components: [
                                            {
                                                type: ComponentType.ActionRow,
                                                components: [
                                                    new ButtonBuilder()
                                                        .setCustomId(ClanButtons.invite)
                                                        .setLabel("Отправить приглашение")
                                                        .setStyle(ButtonStyle.Success),
                                                    new ButtonBuilder()
                                                        .setCustomId(ClanButtons.modal)
                                                        .setLabel("Заполнить форму на вступление")
                                                        .setStyle(ButtonStyle.Secondary),
                                                ],
                                            },
                                        ],
                                    });
                                }
                                btnFollowUp.delete();
                            }
                            else {
                                btnFollowUp.delete();
                                button.followUp({
                                    ephemeral: true,
                                    content: `Произошла ошибка во время исключения **${lastMember.bungieName}**`,
                                });
                            }
                        }
                        else if (confirmationButton.customId === "clanManagment_kick_cancel") {
                            btnFollowUp.delete();
                        }
                        confirmationCollector.stop();
                    });
                }
                else if (customId === "clanManagment_demote") {
                    const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/SetMembershipType/${--lastMember.rank}/`, {
                        method: "POST",
                        headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${dbData.accessToken}` },
                    }));
                    const result = (await query.json());
                    if (result.ErrorCode === 1) {
                        mergedMembers[memberIndex].rank = lastMember.rank;
                        button.followUp({ ephemeral: true, content: `**${lastMember.bungieName}** был понижен до ${lastMember.rank} ранга` });
                    }
                    else {
                        button.followUp({
                            ephemeral: true,
                            content: `Произошла ошибка во время понижения **${lastMember.bungieName}** до ${lastMember.rank} ранга`,
                        });
                    }
                }
                else if (customId === "clanManagment_promote") {
                    const query = (await fetch(`https://www.bungie.net/Platform/GroupV2/4123712/Members/${lastMember.membershipType}/${lastMember.bungieId}/SetMembershipType/${++lastMember.rank}/`, {
                        method: "POST",
                        headers: { "X-API-Key": process.env.XAPI, Authorization: `Bearer ${dbData.accessToken}` },
                    }));
                    const result = (await query.json());
                    if (result.ErrorCode === 1) {
                        mergedMembers[memberIndex].rank = lastMember.rank;
                        button.followUp({ ephemeral: true, content: `**${lastMember.bungieName}** был повышен до ${lastMember.rank} ранга` });
                    }
                    else {
                        button.followUp({
                            ephemeral: true,
                            content: `Произошла ошибка во время повышения **${lastMember.bungieName}** до ${lastMember.rank} ранга`,
                        });
                    }
                }
                const { removalEmbed, components, index } = await memberParser(lastMemberIndex);
                if ((lastMemberIndex !== index || memberIndex !== index) &&
                    customId !== "clanManagment_previous" &&
                    customId !== "clanManagment_next" &&
                    customId !== "clanManagment_kick")
                    return;
                try {
                    button.message.edit({ embeds: [removalEmbed], components });
                }
                catch (error) {
                    console.error(`Error blyad`);
                }
                return;
            });
        }
    },
});
