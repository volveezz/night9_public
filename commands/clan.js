import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { colors } from "../base/colors.js";
import { auth_data, discord_activities } from "../handlers/sequelize.js";
export default {
    name: "clan",
    description: "Управление и статистика клана",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "list",
            description: "Список клана и статистика каждого из участников",
        },
    ],
    callback: async (_client, interaction, _member, guild, _channel) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const clanMembers = await auth_data.findAll({ where: { clan: true }, include: discord_activities });
        const discordMembers = guild.members.cache;
        const destinyRequest = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        const destinyMembers = destinyRequest.results;
        if (!clanMembers || !discordMembers || !destinyRequest || !destinyMembers) {
            console.error(`[Error code: 1035] clan list error`, !clanMembers ? clanMembers : "", !discordMembers ? discordMembers : "", !destinyRequest ? destinyRequest : "");
            throw { name: "Ошибка во время сбора данных", message: "Пожалуйста, повторите попытку позже" };
        }
        const mergedMembersUnsort = destinyMembers.map((clanmember) => {
            return {
                isOnline: clanmember.isOnline,
                lastOnlineStatusChange: clanmember.lastOnlineStatusChange,
                joinDate: Math.trunc(new Date(clanmember.joinDate).getTime() / 1000),
                bungieName: clanmember.bungieNetUserInfo
                    ? clanmember.bungieNetUserInfo.supplementalDisplayName ||
                        clanmember.bungieNetUserInfo.bungieGlobalDisplayName +
                            "#" +
                            (clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode.length === 3
                                ? "0" + clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode
                                : clanmember.bungieNetUserInfo.bungieGlobalDisplayNameCode)
                    : clanmember.destinyUserInfo.bungieGlobalDisplayName +
                        "#" +
                        (clanmember.destinyUserInfo.bungieGlobalDisplayNameCode.length === 3
                            ? "0" + clanmember.destinyUserInfo.bungieGlobalDisplayNameCode
                            : clanmember.destinyUserInfo.bungieGlobalDisplayNameCode) ||
                        clanmember.destinyUserInfo.LastSeenDisplayName ||
                        clanmember.destinyUserInfo.displayName,
                membershipType: clanmember.destinyUserInfo.membershipType,
                bungieId: clanmember.destinyUserInfo.membershipId,
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
            const dbData = clanMembers.find((d) => d.bungie_id === member.bungieId);
            return {
                name: `${member.bungieName} / ${discordMembers.get(dbData?.discord_id)?.displayName || "Не зарегистрирован"} / ${member.membershipType + `/` + member.bungieId}`,
                value: `[Bungie.net](https://www.bungie.net/7/ru/User/Profile/${member.membershipType}/${member.bungieId}) | ${member.isOnline ? "В игре" : `<t:${member.lastOnlineStatusChange}>`} | <t:${member.joinDate}>${dbData && dbData.discord_activity
                    ? ` | ${dbData.discord_activity.messages}:book: | ${dbData.discord_activity.voice}с:microphone2: | ${dbData.discord_activity.dungeons}/${dbData.discord_activity.raids}`
                    : ""}`,
            };
        });
        const e = embed;
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i];
            embed.addFields({ name: `${i + 1} ${field.name}`, value: field.value });
            if (embed.data.fields?.length === 25 || i === fields.length - 1) {
                if (i === 24) {
                    await deferredReply;
                    await interaction.editReply({ embeds: [e] });
                    e.setTitle(null).spliceFields(0, 25);
                }
                else {
                    await interaction.followUp({ embeds: [e], ephemeral: true });
                    e.spliceFields(0, 25);
                }
            }
        }
    },
};
