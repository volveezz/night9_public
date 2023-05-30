import { ApplicationCommandType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, EmbedBuilder, } from "discord.js";
import { StatsButton } from "../configs/Buttons.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { bungieNames } from "../core/userStatisticsManagement.js";
import { apiStatus } from "../structures/apiStatus.js";
import { Command } from "../structures/command.js";
import { fetchRequest } from "../utils/api/fetchRequest.js";
import { CachedDestinyRaceDefinition } from "../utils/api/manifestHandler.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import { AuthData, UserActivityData } from "../utils/persistence/sequelize.js";
export default new Command({
    name: "информация",
    nameLocalizations: {
        "en-US": "information",
        "en-GB": "information",
    },
    description: "Подробная информация и статистика аккаунта",
    descriptionLocalizations: {
        "en-US": "Detailed account information and statistics",
        "en-GB": "Detailed account information and statistics",
    },
    userContextMenu: {
        name: "Информация",
        type: ApplicationCommandType.User,
        nameLocalizations: { "en-US": "Information", "en-GB": "Information" },
    },
    run: async ({ client, interaction: commandInteraction, userMenuInteraction: userInteraction, messageMenuInteraction: messageMenuInteraction, }) => {
        if (apiStatus.status !== 1) {
            throw { errorType: UserErrors.API_UNAVAILABLE };
        }
        const interaction = messageMenuInteraction || userInteraction || commandInteraction;
        const deferPromise = interaction.deferReply({ ephemeral: true });
        const optionId = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString("bungiename") : null;
        let targetId = interaction instanceof ChatInputCommandInteraction
            ? optionId
                ? undefined
                : interaction.user.id
            : interaction.targetId;
        const targetMember = optionId ? undefined : await client.getAsyncMember(targetId);
        const targetName = targetMember ? (await client.getAsyncMember(targetId))?.displayName : undefined;
        const targetAvatar = targetMember ? (await client.getAsyncMember(targetId))?.displayAvatarURL() : undefined;
        const bunigeName = bungieNames.get(targetId || interaction.user.id);
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}${bunigeName ? ` - ${bunigeName}` : ""}`,
            iconURL: targetAvatar,
        })
            .setFooter({ text: `Id: ${targetId}` });
        const parsedData = await AuthData.findOne({
            where: {
                discordId: targetId,
            },
            include: { model: UserActivityData },
            attributes: ["platform", "bungieId", "accessToken"],
        });
        if (!parsedData) {
            await deferPromise;
            throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf: interaction.user.id === targetId } };
        }
        const { platform, bungieId } = parsedData;
        const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : platform === 6 ? "epic" : "stadia";
        const fieldUrls = [];
        fieldUrls.push(`[Trials.Report](https://trials.report/report/${platform}/${bungieId})`, `[Raid.Report](https://raid.report/${reportPlatform}/${bungieId})`, `[Dungeon.Report](https://dungeon.report/${reportPlatform}/${bungieId})`, `[Crucible.Report](https://crucible.report/report/${platform}/${bungieId})`, `[Strike.Report](https://strike.report/${reportPlatform}/${bungieId})`, `[DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : platform === 6 ? "epic" : "stadia"}/${bungieId}/overview)`, `[WastedonDestiny](https://wastedondestiny.com/${bungieId})`);
        embed.setColor(colors.success).addFields({
            name: "Ссылки",
            value: fieldUrls.join(", "),
        });
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
        await deferPromise;
        await interaction.editReply({
            embeds: [embed],
            components: optionId ? undefined : [{ type: ComponentType.ActionRow, components }],
        });
        const fetchProfileAndCharacters = async () => {
            try {
                const response = await fetchRequest(`Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,200`);
                const data = response?.profile?.data;
                const characterDataArray = [];
                if (!data) {
                    embed.setTitle("Произошла ошибка со стороны Bungie").setColor(colors.error);
                    await deferPromise;
                    return await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
                fieldUrls.push(`[Guardian](https://guardian.gg/2/profile/${bungieId}/${data.userInfo.bungieGlobalDisplayName.replace(/\s/g, "%20")})`, `[DestinyKD](https://www.destinykd.com/d2/pc/${data.userInfo.bungieGlobalDisplayName.replace(/\s/g, "%20")}*${data.userInfo.bungieGlobalDisplayNameCode})`);
                for (const characterId in response.characters.data) {
                    const character = response.characters.data[characterId];
                    const classEmoji = character.classHash === 671679327
                        ? "<:hunter:995496474978824202>"
                        : character.classHash === 2271682572
                            ? "<:warlock:995496471526920232>"
                            : "<:titan:995496472722284596>";
                    const lastSessionTime = (parseInt(character.minutesPlayedThisSession) || 0) * 60;
                    const totalTime = (parseInt(character.minutesPlayedTotal) || 0) * 60;
                    const raceName = CachedDestinyRaceDefinition[character.raceHash].genderedRaceNamesByGenderHash[character.genderHash];
                    characterDataArray.push(`${classEmoji}**${raceName}** ${character.light} силы - последний онлайн <t:${Math.floor(new Date(character.dateLastPlayed).getTime() / 1000)}:R>\n- ${convertSeconds(lastSessionTime)} за последнюю сессию (${convertSeconds(totalTime)})`);
                    fieldUrls.push(`${classEmoji}[Braytech](https://bray.tech/${platform}/${bungieId}/${character.characterId}/)`);
                }
                embed.spliceFields(0, 1, { name: "Ссылки", value: fieldUrls.join(", ") });
                embed.addFields({ name: "Персонажи", value: characterDataArray.join("\n") });
                await deferPromise;
                await interaction.editReply({ embeds: [embed] });
            }
            catch (e) {
                console.error(`[Error code: 1058] ${bungieId}`, e);
            }
        };
        const fetchClanData = async () => {
            try {
                const clanBody = await fetchRequest(`Platform/GroupV2/User/${platform}/${bungieId}/0/1/`);
                const clanStatus = clanBody.results[0]?.group.groupId === "4123712"
                    ? "участник клана"
                    : clanBody.results[0]
                        ? `участник клана ${clanBody.results[0].group.name}`
                        : "не состоит в клане";
                embed.data.author.name += ` - ${clanStatus}`;
                await deferPromise;
                await interaction.editReply({ embeds: [embed] });
                return;
            }
            catch (e) {
                console.error(`[Error code: 1059] ${platform}/${bungieId}`, e);
            }
        };
        await Promise.all([fetchProfileAndCharacters(), fetchClanData()]);
    },
});
