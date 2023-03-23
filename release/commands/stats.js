import { ApplicationCommandType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, } from "discord.js";
import colors from "../configs/colors.js";
import { StatsButton } from "../enums/Buttons.js";
import UserErrors from "../enums/UserErrors.js";
import { fetchRequest } from "../functions/fetchRequest.js";
import { CachedDestinyRaceDefinition } from "../functions/manifestHandler.js";
import convertSeconds from "../functions/utilities.js";
import { AuthData, UserActivityData } from "../handlers/sequelize.js";
import { Command } from "../structures/command.js";
export default new Command({
    name: "информация",
    nameLocalizations: {
        "en-US": "information",
        "en-GB": "information",
    },
    description: "Подробная информация и статистика аккаунта",
    descriptionLocalizations: {
        "en-US": "Detailed information and statistic about the account",
        "en-GB": "Detailed information and statistic about the account",
    },
    userContextMenu: {
        name: "Информация",
        type: ApplicationCommandType.User,
        nameLocalizations: { "en-US": "Information", "en-GB": "Information" },
    },
    messageContextMenu: {
        name: "Информация",
        type: ApplicationCommandType.Message,
        nameLocalizations: { "en-US": "Information", "en-GB": "Information" },
    },
    run: async ({ interaction: commandInteraction, userMenuInteraction: userInteraction, messageMenuInteraction: messageMenuInteraction, }) => {
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
        fieldUrls.push(`[Trials.Report](https://trials.report/report/${platform}/${bungieId})`, `[Raid.Report](https://raid.report/${reportPlatform}/${bungieId})`, `[Dungeon.Report](https://dungeon.report/${reportPlatform}/${bungieId})`, `[Crucible.Report](https://crucible.report/report/${platform}/${bungieId})`, `[Strike.Report](https://strike.report/${reportPlatform}/${bungieId})`, `[DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : "stadia"}/${bungieId}/overview)`, `[WastedonDestiny](https://wastedondestiny.com/${bungieId})`);
        embed.setColor(colors.success).addFields([
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
            embed.addFields([
                {
                    name: "Статистика на сервере",
                    value: `Отправлено сообщений: ${parsedData.UserActivityData.messages}\nВ голосовых каналах: ${convertSeconds(parsedData.UserActivityData.voice)}`,
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
            components: optionId ? undefined : [{ type: ComponentType.ActionRow, components }],
        });
        fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,200`)
            .then(async (response) => {
            const data = response?.profile?.data;
            const characterDataArray = [];
            if (!data) {
                embed.setTitle("Произошла ошибка со стороны Bungie").setColor(colors.error);
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
                characterDataArray.push(`${classEmoji}**${CachedDestinyRaceDefinition[character.raceHash].genderedRaceNamesByGenderHash[character.genderHash]}** ${character.light} силы - последний онлайн <t:${Math.floor(new Date(character.dateLastPlayed).getTime() / 1000)}:R>\n${convertSeconds((parseInt(character.minutesPlayedThisSession) || 0) * 60)} за последнюю сессию (${convertSeconds((parseInt(character.minutesPlayedTotal) || 0) * 60)})`);
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
