import { ApplicationCommandType, ButtonBuilder, ButtonStyle, CommandInteraction, EmbedBuilder, } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { addButtonsToMessage } from "../utils/general/addButtonsToMessage.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import { bungieNames } from "../utils/persistence/dataStore.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
import { UserActivityData } from "../utils/persistence/sequelizeModels/userActivityData.js";
const SlashCommand = new Command({
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
        if (getEndpointStatus("account") !== 1) {
            throw { errorType: "API_UNAVAILABLE" };
        }
        const interaction = messageMenuInteraction || userInteraction || commandInteraction;
        const deferredPromise = interaction.deferReply({ ephemeral: true });
        const targetId = interaction instanceof CommandInteraction
            ? interaction.user.id
            : interaction.targetId;
        const databasePromise = AuthData.findOne({
            where: {
                discordId: targetId,
            },
            include: { model: UserActivityData },
            attributes: ["platform", "bungieId", "accessToken", "membershipId"],
        });
        const memberPromise = client.getCachedMembers().get(targetId) || client.getMember(targetId);
        const [targetMember, databaseData] = await Promise.all([memberPromise, databasePromise]);
        if (!databaseData) {
            await deferredPromise;
            throw { errorType: "DB_USER_NOT_FOUND", errorData: { isSelf: interaction.user.id === targetId } };
        }
        const targetName = targetMember && targetMember.displayName;
        const targetAvatar = targetMember && targetMember.displayAvatarURL();
        const bunigeName = bungieNames.get(targetId || interaction.user.id);
        const embed = new EmbedBuilder()
            .setAuthor({
            name: `Статистика ${targetName}${bunigeName ? ` - ${bunigeName}` : ""}`,
            iconURL: targetAvatar,
        })
            .setFooter({ text: `Id: ${targetId}` });
        const { platform, bungieId, membershipId } = databaseData;
        const reportPlatform = platform === 3 ? "pc" : platform === 2 ? "ps" : platform === 1 ? "xb" : platform === 6 ? "epic" : "stadia";
        const fieldUrls = [];
        fieldUrls.push(`[Bungie.net](https://www.bungie.net/ru/Profile/254/${membershipId})`, `[Trials.Report](https://trials.report/report/${platform}/${bungieId})`, `[Raid.Report](https://raid.report/${reportPlatform}/${bungieId})`, `[Dungeon.Report](https://dungeon.report/${reportPlatform}/${bungieId})`, `[Crucible.Report](https://crucible.report/report/${platform}/${bungieId})`, `[Gm.Report](https://gm.report/${bungieId})`, `[Guardian.Report](https://guardian.report/?guardians=${bungieId})`, `[DestinyTracker](https://destinytracker.com/destiny-2/profile/${platform === 3 ? "steam" : platform === 2 ? "psn" : platform === 1 ? "xbl" : platform === 6 ? "epic" : "stadia"}/${bungieId}/overview)`, `[WastedOnDestiny](https://wastedondestiny.com/${bungieId})`);
        embed.setColor(colors.success).addFields({
            name: "Ссылки",
            value: fieldUrls.join(", "),
        });
        const components = [
            new ButtonBuilder().setCustomId("statsEvent_old_events").setLabel("Репутация у торговцев").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("statsEvent_pinnacle").setLabel("Доступная сверхмощка").setStyle(ButtonStyle.Secondary),
        ];
        if (databaseData.UserActivityData) {
            embed.addFields([
                {
                    name: "Статистика на сервере",
                    value: `Отправлено сообщений: ${databaseData.UserActivityData.messages}\nВ голосовых каналах: ${convertSeconds(databaseData.UserActivityData.voice)}`,
                    inline: true,
                },
                {
                    name: "Статистика в игре",
                    value: `Пройдено рейдов с сокланами: ${databaseData.UserActivityData.raids}\nПройдено подземелий с сокланами: ${databaseData.UserActivityData.dungeons}`,
                    inline: true,
                },
            ]);
        }
        const fetchProfileAndCharacters = async () => {
            try {
                const raceDefinitionPromise = GetManifest("DestinyRaceDefinition");
                const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Profile/${bungieId}/?components=100,200`);
                const data = response?.profile?.data;
                if (!data) {
                    embed.setTitle("Произошла ошибка со стороны Bungie").setColor(colors.error);
                    await deferredPromise;
                    return interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });
                }
                let bungieName = bungieNames.get(targetId || interaction.user.id);
                if (!bungieName) {
                    bungieName = `${data.userInfo.bungieGlobalDisplayName}#${data.userInfo.bungieGlobalDisplayNameCode
                        ?.toString()
                        .padStart(4, "0")}`;
                    bungieNames.set(targetId || interaction.user.id, bungieName);
                    embed.data.author.name += ` - ${bungieName}`;
                }
                fieldUrls.push(`[Guardian.gg](https://guardian.gg/2/profile/${bungieId}/${data.userInfo.bungieGlobalDisplayName.replace(/\s/g, "%20")})`);
                const raceDefinition = await raceDefinitionPromise;
                const characterDataArray = [];
                for (const characterId in response.characters.data) {
                    const character = response.characters.data[characterId];
                    const classEmoji = character.classHash === 671679327
                        ? "<:hunter:995496474978824202>"
                        : character.classHash === 2271682572
                            ? "<:warlock:995496471526920232>"
                            : "<:titan:995496472722284596>";
                    const lastSessionTime = (parseInt(character.minutesPlayedThisSession) || 0) * 60;
                    const totalTime = (parseInt(character.minutesPlayedTotal) || 0) * 60;
                    const raceName = raceDefinition[character.raceHash].genderedRaceNamesByGenderHash[character.genderHash];
                    characterDataArray.push(`${classEmoji}**${raceName}** ${character.light} силы - последний онлайн <t:${Math.floor(new Date(character.dateLastPlayed).getTime() / 1000)}:R>\n- ${convertSeconds(lastSessionTime)} за последнюю сессию (${convertSeconds(totalTime)})`);
                    fieldUrls.push(`${classEmoji}[Braytech](https://bray.tech/${platform}/${bungieId}/${character.characterId}/)`);
                }
                embed.spliceFields(0, 1, { name: "Ссылки", value: fieldUrls.join(", ") });
                embed.addFields({ name: "Персонажи", value: characterDataArray.join("\n") });
            }
            catch (e) {
                console.error(`[Error code: 1058] ${bungieId}`, e);
            }
        };
        const fetchClanData = async () => {
            try {
                const clanBody = await sendApiRequest(`/Platform/GroupV2/User/${platform}/${bungieId}/0/1/`);
                const clanStatus = clanBody.results[0]?.group.groupId === process.env.GROUP_ID
                    ? "участник клана"
                    : clanBody.results[0]
                        ? `участник клана ${clanBody.results[0].group.name}`
                        : "не состоит в клане";
                embed.data.author.name += ` - ${clanStatus}`;
            }
            catch (e) {
                console.error(`[Error code: 1059] ${platform}/${bungieId}`, e);
            }
        };
        await Promise.all([fetchProfileAndCharacters(), fetchClanData()]);
        (await deferredPromise) &&
            interaction.editReply({
                embeds: [embed],
                components: addButtonsToMessage(components),
            });
    },
});
export default SlashCommand;
//# sourceMappingURL=information.js.map