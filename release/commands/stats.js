import { ButtonBuilder, EmbedBuilder, ApplicationCommandOptionType, ChatInputCommandInteraction, ButtonStyle, ComponentType, ApplicationCommandType, } from "discord.js";
import { Command } from "../structures/command.js";
import { AuthData, UserActivityData } from "../handlers/sequelize.js";
import fetch from "node-fetch";
import { CachedDestinyRaceDefinition } from "../functions/manifestHandler.js";
import { fetchRequest } from "../functions/fetchRequest.js";
import { StatsButton } from "../enums/Buttons.js";
import UserErrors from "../enums/UserErrors.js";
export default new Command({
    name: "информация",
    nameLocalizations: {
        "en-US": "information",
    },
    description: "Подробная информация и статистика аккаунта",
    descriptionLocalizations: { "en-US": "Detailed information and statistic about the account" },
    userContextMenu: { name: "Информация", type: ApplicationCommandType.User, nameLocalizations: { "en-US": "Information", "en-GB": "Information" } },
    messageContextMenu: {
        name: "Информация",
        type: ApplicationCommandType.Message,
        nameLocalizations: { "en-US": "Information", "en-GB": "Information" },
    },
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "bungiename",
            description: "Введите BungieName игрока для поиска",
        },
    ],
    run: async ({ interaction: commandInteraction, userMenuInteraction: userInteraction, messageMenuInteraction: messageMenuInteraction }) => {
        const interaction = messageMenuInteraction || userInteraction || commandInteraction;
        await interaction.deferReply({ ephemeral: true });
        const optionId = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString("bungiename") : null;
        let targetId = interaction instanceof ChatInputCommandInteraction
            ? optionId
                ? undefined
                : interaction.user.id
            : interaction.targetId;
        const targetName = optionId ? [] : interaction.guild.members.cache.get(targetId)?.displayName;
        const targetAvatar = optionId ? undefined : interaction.guild.members.cache.get(targetId)?.displayAvatarURL();
        if (optionId) {
            const bName = optionId.split("#");
            if (bName.length === 2) {
                let bungieId, platform, displayName;
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
                                bungieId = membership.membershipId;
                                platform = membership.membershipType;
                                displayName = membership.bungieGlobalDisplayName || membership.displayName;
                                return;
                            }
                        });
                    }
                });
                if (!displayName && !bungieId)
                    throw { name: `${optionId} не найден` };
                const embed = new EmbedBuilder()
                    .setAuthor({
                    name: `Статистика ${displayName}`,
                })
                    .setColor("Green")
                    .setTimestamp()
                    .setFooter({ text: `BId: ${bungieId}` });
                const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
                embed.setColor("Green").addFields([
                    {
                        name: "Ссылки",
                        value: `[Trials.Report](https://trials.report/report/${platform}/${bungieId}), [Raid.Report](https://raid.report/${reportPlatform}/${bungieId}), [Crucible.Report](https://crucible.report/report/${platform}/${bungieId}), [Strike.Report](https://strike.report/${reportPlatform}/${bungieId}), [DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungieId}/overview), [WastedonDestiny](https://wastedondestiny.com/${bungieId})`,
                    },
                ]);
                return interaction.editReply({ embeds: [embed] });
            }
            else {
                throw {
                    name: `Проверьте правильность BungieName (${bName})`,
                    description: `В корректном BungieName обязана присутстовать левая и правые части разделенные знаком #`,
                };
            }
        }
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}`,
            iconURL: targetAvatar,
        })
            .setFooter({ text: `Id: ${targetId}` });
        const parsedData = await AuthData.findOne({
            where: {
                discordId: targetId,
            },
            include: UserActivityData,
            attributes: ["platform", "bungieId", "accessToken"],
        });
        if (!parsedData)
            throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf: interaction.user.id === targetId } };
        const { platform, bungieId: bungieId } = parsedData;
        const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : "stadia";
        const fieldUrls = [];
        fieldUrls.push(`[Trials.Report](https://trials.report/report/${platform}/${bungieId})`, `[Raid.Report](https://raid.report/${reportPlatform}/${bungieId})`, `[Crucible.Report](https://crucible.report/report/${platform}/${bungieId})`, `[Strike.Report](https://strike.report/${reportPlatform}/${bungieId})`, `[DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungieId}/overview)`, `[WastedonDestiny](https://wastedondestiny.com/${bungieId})`);
        embed.setColor("Green").addFields([
            {
                name: "Ссылки",
                value: fieldUrls.join(", "),
            },
        ]);
        const components = [
            new ButtonBuilder().setCustomId(StatsButton.oldEvents).setLabel("Статистика старых ивентов").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(StatsButton.pinnacle).setLabel("Доступная сверхмощка").setStyle(ButtonStyle.Secondary),
        ];
        if (parsedData.UserActivityData) {
            const vcTime = new Date(parsedData.UserActivityData.voice * 1000)
                .toISOString()
                .substring(8, 19)
                .replace("T", "д ")
                .replace(":", "ч ")
                .replace(":", "м ") + "с";
            const vcTimeArr = vcTime.split("");
            vcTimeArr[1] = String(parseInt(vcTimeArr[1]) - 1);
            embed.addFields([
                {
                    name: "Статистика на сервере",
                    value: `Отправлено сообщений: ${parsedData.UserActivityData.messages}\nВ голосовых каналах: ${vcTimeArr.join("")}`,
                    inline: true,
                },
                {
                    name: "Статистика в игре",
                    value: `Пройдено рейдов с сокланами: ${parsedData.UserActivityData.raids}\nПройдено подземелий с сокланами: ${parsedData.UserActivityData.dungeons}`,
                    inline: true,
                },
            ]);
        }
        interaction.editReply({
            embeds: [embed],
            components: optionId ? undefined : [{ type: ComponentType.ActionRow, components: components }],
        });
        fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,200`)
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
            fieldUrls.push(`[Guardian](https://guardian.gg/2/profile/${parsedData.bungieId}/${data.userInfo.bungieGlobalDisplayName.replace(/\s/g, `%20`)})`, `[DestinyKD](https://www.destinykd.com/d2/pc/${data.userInfo.bungieGlobalDisplayName.replace(/\s/g, `%20`)}*${data.userInfo.bungieGlobalDisplayNameCode})`);
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
                fieldUrls.push(`${classEmoji}[Braytech](https://bray.tech/${parsedData.platform}/${parsedData.bungieId}/${character.characterId}/)`);
            }
            embed.spliceFields(0, 1, { name: "Ссылки", value: fieldUrls.join(", ") });
            embed.addFields({ name: "Персонажи", value: characterDataArray.join("\n") });
            interaction.editReply({ embeds: [embed] });
            return fetchRequest(`Platform/GroupV2/User/${platform}/${bungieId}/0/1/`)
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
            .catch((e) => console.log(`[Error code: 1058] Stats first phase error`, e, parsedData.bungieId));
    },
});
