import { ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, ChatInputCommandInteraction, ButtonStyle, ComponentType, } from "discord.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { auth_data } from "../handlers/sequelize.js";
import fetch from "node-fetch";
export default {
    name: "stats",
    nameLocalizations: {
        "en-US": "statistic",
        ru: "статистика",
    },
    description: "Подробная статистика об аккаунте",
    type: [true, true, false],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "bungiename",
            description: "Введите BungieName игрока для поиска",
        },
    ],
    callback: async (_client, interaction, _member, _guild, _channel) => {
        await interaction.deferReply({ ephemeral: true });
        const optionId = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString("bungiename") : null;
        let targetId = interaction instanceof ChatInputCommandInteraction ? (optionId ? undefined : interaction.user.id) : interaction.targetId;
        const targetName = optionId ? [] : interaction.guild.members.cache.get(targetId)?.displayName;
        const targetAvatar = optionId ? undefined : interaction.guild.members.cache.get(targetId)?.displayAvatarURL();
        if (optionId) {
            const bName = optionId.split("#");
            if (bName.length === 2) {
                let bungie_id, platform, displayName;
                const response = await fetch("https://www.bungie.net/Platform/User/Search/GlobalName/0/", {
                    method: "POST",
                    headers: {
                        "X-API-KEY": process.env.XAPI,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ displayNamePrefix: bName[0] }),
                }).then((d) => {
                    return d.json().Response;
                });
                response.searchResults.forEach(async (result) => {
                    if (result.bungieGlobalDisplayName === bName[0] && result.bungieGlobalDisplayNameCode === Number(bName[1])) {
                        return result.destinyMemberships.forEach(async (membership) => {
                            if (membership.membershipType === 3) {
                                bungie_id = membership.membershipId;
                                platform = membership.membershipType;
                                displayName = membership.bungieGlobalDisplayName || membership.displayName;
                                return;
                            }
                        });
                    }
                });
                if (!displayName && !bungie_id)
                    throw { name: `${optionId} не найден` };
                const embed = new EmbedBuilder()
                    .setAuthor({
                    name: `Статистика ${displayName}`,
                })
                    .setColor("Green")
                    .setTimestamp()
                    .setFooter({ text: `BId: ${bungie_id}` });
                const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
                embed.setColor("Green").addFields([
                    {
                        name: "Ссылки",
                        value: `[Trials.Report](https://trials.report/report/${platform}/${bungie_id}), [Raid.Report](https://raid.report/${reportPlatform}/${bungie_id}), [Crucible.Report](https://crucible.report/report/${platform}/${bungie_id}), [Strike.Report](https://strike.report/${reportPlatform}/${bungie_id}), [DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungie_id}/overview), [WastedonDestiny](https://wastedondestiny.com/${bungie_id})`,
                    },
                ]);
                return interaction.editReply({ embeds: [embed] });
            }
            else {
                throw {
                    name: `Проверьте правильность BungieName (${bName})`,
                    message: `В корректном BungieName обязана присутстовать левая и правые части разделенные знаком #`,
                };
            }
        }
        var embed = new EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}`,
            iconURL: targetAvatar,
        })
            .setTimestamp()
            .setFooter({ text: `Id: ${targetId}` });
        var data = await auth_data.findOne({
            where: {
                discord_id: targetId,
            },
            attributes: ["platform", "bungie_id", "access_token"],
        });
        if (data !== null) {
            const parsedData = data.toJSON();
            const { platform, bungie_id, access_token } = parsedData;
            const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
            embed.setColor("Green").addFields([
                {
                    name: "Ссылки",
                    value: `[Trials.Report](https://trials.report/report/${platform}/${bungie_id}), [Raid.Report](https://raid.report/${reportPlatform}/${bungie_id}), [Crucible.Report](https://crucible.report/report/${platform}/${bungie_id}), [Strike.Report](https://strike.report/${reportPlatform}/${bungie_id}), [DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungie_id}/overview), [WastedonDestiny](https://wastedondestiny.com/${bungie_id})`,
                },
            ]);
            const components = [
                new ButtonBuilder().setCustomId("statsEvent_old_events").setLabel("Статистика старых ивентов").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("statsEvent_pinnacle").setLabel("Доступная сверхмощка").setStyle(ButtonStyle.Secondary),
            ];
            interaction.editReply({
                embeds: [embed],
                components: optionId ? undefined : [{ type: ComponentType.ActionRow, components: components }],
            });
            fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=100`)
                .then((response) => {
                const data = response.profile.data;
                if (!data) {
                    embed.setTitle("Произошла ошибка со стороны Bungie").setColor("Red");
                    return interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
                const lastPlayed = Math.trunc(new Date(data.dateLastPlayed).getTime() / 1000);
                const chars = data.characterIds.length;
                embed.addFields([
                    {
                        name: `Последний онлайн`,
                        value: `<t:${lastPlayed}:R>`,
                        inline: true,
                    },
                    { name: "Персонажей", value: String(chars), inline: true },
                ]);
                interaction.editReply({ embeds: [embed] });
                fetchRequest(`Platform/GroupV2/User/${platform}/${bungie_id}/0/1/`)
                    .then((clanBody) => {
                    const clanStatus = clanBody.results[0]?.group.groupId === "4123712"
                        ? `Участник клана`
                        : clanBody.results[0]
                            ? `Клан ${clanBody.results[0].group.name}`
                            : `не состоит в клане`;
                    embed.addFields([{ name: `Клан`, value: clanStatus, inline: true }]);
                    return interaction.editReply({ embeds: [embed] });
                })
                    .catch((e) => console.log(`Stats second phase error`, e.statusCode, data.userInfo.membershipId));
            })
                .catch((e) => console.log(`Stats first phase error`, e.statusCode, data?.bungie_id));
        }
        else {
            embed.setDescription(`Запрашиваемый пользователь не зарегистрирован`);
            return interaction.editReply({ embeds: [embed] });
        }
    },
};
