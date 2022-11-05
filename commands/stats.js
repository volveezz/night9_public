import { ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, ChatInputCommandInteraction, ButtonStyle, ComponentType, } from "discord.js";
import { fetchRequest } from "../handlers/webHandler.js";
import { auth_data, discord_activities } from "../handlers/sequelize.js";
import fetch from "node-fetch";
import { CachedDestinyRaceDefinition } from "../handlers/manifestHandler.js";
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
                const response = await fetch("http://bungie.net/Platform/User/Search/GlobalName/0/", {
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
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}`,
            iconURL: targetAvatar,
        })
            .setFooter({ text: `Id: ${targetId}` });
        const parsedData = await auth_data.findOne({
            where: {
                discord_id: targetId,
            },
            include: discord_activities,
            attributes: ["platform", "bungie_id", "access_token"],
        });
        if (!parsedData)
            throw { name: "Запрашиваемый пользователь не зарегистрирован" };
        const { platform, bungie_id } = parsedData;
        const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
        const fieldUrls = [];
        fieldUrls.push(`[Trials.Report](https://trials.report/report/${platform}/${bungie_id})`, `[Raid.Report](https://raid.report/${reportPlatform}/${bungie_id})`, `[Crucible.Report](https://crucible.report/report/${platform}/${bungie_id})`, `[Strike.Report](https://strike.report/${reportPlatform}/${bungie_id})`, `[DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungie_id}/overview)`, `[WastedonDestiny](https://wastedondestiny.com/${bungie_id})`);
        embed.setColor("Green").addFields([
            {
                name: "Ссылки",
                value: fieldUrls.join(", "),
            },
        ]);
        const components = [
            new ButtonBuilder().setCustomId("statsEvent_old_events").setLabel("Статистика старых ивентов").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("statsEvent_pinnacle").setLabel("Доступная сверхмощка").setStyle(ButtonStyle.Secondary),
        ];
        if (parsedData.discord_activity) {
            let vcTime = new Date(parsedData.discord_activity.voice * 1000)
                .toISOString()
                .substring(8, 19)
                .replace("T", "д ")
                .replace(":", "ч ")
                .replace(":", "м ") + "с";
            let vcTimeArr = vcTime.split("");
            vcTimeArr[1] = String(parseInt(vcTimeArr[1]) - 1);
            embed.addFields([
                {
                    name: "Статистика на сервере",
                    value: `Отправлено сообщений: ${parsedData.discord_activity.messages}\nВ голосовых каналах: ${vcTimeArr.join("")}`,
                    inline: true,
                },
                {
                    name: "Статистика в игре",
                    value: `Пройдено рейдов с сокланами: ${parsedData.discord_activity.raids}\nПройдено подземелий с сокланами: ${parsedData.discord_activity.dungeons}`,
                    inline: true,
                },
            ]);
        }
        interaction.editReply({
            embeds: [embed],
            components: optionId ? undefined : [{ type: ComponentType.ActionRow, components: components }],
        });
        fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungie_id}/?components=100,200`)
            .then(async (response) => {
            const data = response?.profile?.data;
            const characterDataArray = [];
            if (!data) {
                embed.setTitle("Произошла ошибка со стороны Bungie").setColor("Red");
                return interaction.editReply({
                    embeds: [embed],
                    components: [],
                });
            }
            fieldUrls.push(`[Guardian](https://guardian.gg/2/profile/${parsedData.bungie_id}/${data.userInfo.bungieGlobalDisplayName})`, `[DestinyKD](https://www.destinykd.com/d2/pc/${data.userInfo.bungieGlobalDisplayName}*${data.userInfo.bungieGlobalDisplayNameCode})`);
            for (const characterId in response.characters.data) {
                const character = response.characters.data[characterId];
                const classEmoji = character.classHash === 671679327
                    ? "<:hunter:995496474978824202>"
                    : character.classHash === 2271682572
                        ? "<:warlock:995496471526920232>"
                        : "<:titan:995496472722284596>";
                const days = Math.trunc(parseInt(character.minutesPlayedTotal) / 60 / 24);
                const hours = Math.trunc(parseInt(character.minutesPlayedTotal) / 60 - days * 24);
                const mins = Math.trunc(parseInt(character.minutesPlayedTotal) - (days * 24 * 60 + hours * 60));
                characterDataArray.push(`${classEmoji}**${CachedDestinyRaceDefinition[character.raceHash].genderedRaceNamesByGenderHash[character.genderHash]}** ${character.light} силы - последний онлайн <t:${Math.trunc(new Date(character.dateLastPlayed).getTime() / 1000)}:R>\n${character.minutesPlayedThisSession}м за последнюю сессию (${String(`${days > 0 ? ` ${days}д ` : ""} ${hours > 0 ? ` ${hours}ч` : ``}${mins > 0 ? ` ${mins}м ` : " "} за всё время`)
                    .trim()
                    .replace(/\s+/g, " ")})`);
                fieldUrls.push(`${classEmoji}[Braytech](https://bray.tech/${parsedData.platform}/${parsedData.bungie_id}/${character.characterId}/)`);
            }
            embed.spliceFields(0, 1, { name: "Ссылки", value: fieldUrls.join(", ") });
            embed.addFields({ name: "Персонажи", value: characterDataArray.join("\n") });
            interaction.editReply({ embeds: [embed] });
            return fetchRequest(`Platform/GroupV2/User/${platform}/${bungie_id}/0/1/`)
                .then((clanBody) => {
                const clanStatus = clanBody.results[0]?.group.groupId === "4123712"
                    ? `участник клана`
                    : clanBody.results[0]
                        ? `участник клана ${clanBody.results[0].group.name}`
                        : `не состоит в клане`;
                embed.data.author.name += ` - ${clanStatus}`;
                return interaction.editReply({ embeds: [embed] });
            })
                .catch((e) => console.log(`[Error code: 1059] Stats second phase error`, e, data.userInfo.membershipId));
        })
            .catch((e) => console.log(`[Error code: 1058] Stats first phase error`, e, parsedData.bungie_id));
    },
};
