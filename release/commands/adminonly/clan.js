import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import colors from "../../configs/colors.js";
import { fetchRequest } from "../../functions/fetchRequest.js";
import { Command } from "../../structures/command.js";
export default new Command({
    name: "clan",
    description: "Clan management",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "list",
            description: "View detailed statistics for each of clan members",
        },
    ],
    run: async ({ client, interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const clanMembers = await AuthData.findAll({ where: { clan: true }, include: UserActivityData });
        const discordMembers = interaction.guild?.members.cache || client.getCachedMembers();
        const destinyRequest = await fetchRequest("Platform/GroupV2/4123712/Members/?memberType=None");
        const destinyMembers = destinyRequest.results;
        if (!clanMembers || !discordMembers || !destinyRequest || !destinyMembers) {
            console.error(`[Error code: 1035] clan list error`, !clanMembers ? clanMembers : "", !discordMembers ? discordMembers : "", !destinyRequest ? destinyRequest : "");
            throw { name: "Ошибка во время сбора данных", description: "Пожалуйста, повторите попытку позже" };
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
});
