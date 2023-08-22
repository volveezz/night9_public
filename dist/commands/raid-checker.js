import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { AuthData } from "../utils/persistence/sequelize.js";
const SlashCommand = new Command({
    name: "закрытия_рейдов",
    nameLocalizations: {
        "en-US": "raid-checker",
        "en-GB": "raid-checker",
    },
    description: "Статистика закрытых рейдов на каждом классе (это старая команда, новая: /закрытия)",
    descriptionLocalizations: {
        "en-US": "Statistics of completed raids for each character",
        "en-GB": "Statistics of completed raids for each character",
    },
    options: [
        {
            type: ApplicationCommandOptionType.User,
            name: "пользователь",
            nameLocalizations: { "en-US": "user", "en-GB": "user" },
            description: "Укажите искомого пользователя",
            descriptionLocalizations: { "en-US": "Select the user", "en-GB": "Select the user" },
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "все-активности",
            nameLocalizations: { "en-US": "all-activities", "en-GB": "all-activities" },
            description: "Проверить все пройденные активности",
            descriptionLocalizations: { "en-US": "Check all completed activities", "en-GB": "Check all completed activities" },
        },
    ],
    run: async ({ interaction, args }) => {
        if (getEndpointStatus("activity") !== 1) {
            throw { errorType: "API_UNAVAILABLE" };
        }
        const ephemeralReply = interaction.deferReply({ ephemeral: true });
        const targetUser = args.getUser("пользователь")?.id || interaction.user.id;
        const authData = await AuthData.findOne({
            where: { discordId: targetUser },
            attributes: ["bungieId", "platform", "accessToken"],
        });
        if (!authData) {
            throw { errorType: "DB_USER_NOT_FOUND", errorData: { isSelf: targetUser === interaction.user.id } };
        }
        const profileUrl = `/Platform/Destiny2/${authData.platform}/Profile/${authData.bungieId}/?components=200`;
        const userProfile = await sendApiRequest(profileUrl, authData.accessToken);
        if (!userProfile || !userProfile.characters?.data)
            throw { name: "Произошла ошибка на стороне Bungie" };
        const activityDefinition = await GetManifest("DestinyActivityDefinition");
        const activityManifest = args.getBoolean("все-активности") === true
            ? activityDefinition
            : Object.keys(activityDefinition).reduce((accumulator, current) => {
                if (activityDefinition[Number(current)].activityTypeHash === 2043403989)
                    accumulator[String(current)] = activityDefinition[Number(current)];
                return accumulator;
            }, {});
        const activityArray = [];
        Object.keys(activityManifest).forEach(async (key) => {
            activityArray.push({
                activity: key,
                activityName: activityManifest[Number(key)].displayProperties.name,
                clears: 0,
            });
        });
        const characterKeys = Object.keys(userProfile.characters.data);
        const activityMap = new Map();
        const characterSet = characterKeys.map((characterKey) => {
            const characterClassHash = userProfile.characters.data[characterKey]?.classHash;
            let characterClass;
            switch (characterClassHash) {
                case 671679327:
                    characterClass = "<:hunter:995496474978824202>";
                    break;
                case 2271682572:
                    characterClass = "<:warlock:995496471526920232>";
                    break;
                default:
                    characterClass = "<:titan:995496472722284596>";
            }
            return [new Map(), characterClass];
        });
        await Promise.all(characterKeys.map(async (characterKey, index) => {
            const activityStatsUrl = `/Platform/Destiny2/${authData.platform}/Account/${authData.bungieId}/Character/${characterKey}/Stats/AggregateActivityStats/`;
            const { activities: freshActivities } = await sendApiRequest(activityStatsUrl, authData);
            if (!freshActivities)
                throw { name: "Произошла ошибка на стороне Bungie" };
            activityArray.forEach(async (activityData) => {
                const activityCompletion = freshActivities.filter((activity) => activity.activityHash === Number(activityData.activity))[0]
                    ?.values.activityCompletions.basic.value;
                if (activityCompletion !== undefined && activityCompletion >= 1) {
                    activityMap.set(activityData.activityName, {
                        activity: activityData.activityName,
                    });
                    const characterMap = characterSet[index][0];
                    if (characterMap.has(activityData.activityName)) {
                        const previousClears = characterMap.get(activityData.activityName)?.clears || 0;
                        characterMap.set(activityData.activityName, {
                            clears: activityCompletion + previousClears,
                        });
                    }
                    else {
                        characterMap.set(activityData.activityName, {
                            clears: activityCompletion,
                        });
                    }
                }
            });
        }));
        const embed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(args.getBoolean("все-активности") === true
            ? "Статистика закрытх активностей по классам"
            : "Статистка закрытых рейдов по классам")
            .setFooter({ text: "Удаленные персонажи не проверяются" });
        const sortedActivityMap = new Map([...activityMap.entries()].sort());
        let hasReplied = false;
        for (let [key, _activityName] of sortedActivityMap) {
            try {
                const fieldValues = characterSet
                    .map((character) => {
                    const characterClears = character[0]?.get(key)?.clears;
                    return characterClears ? `${character[1]} ${characterClears}` : "";
                })
                    .join(" ");
                embed.addFields([
                    {
                        name: key || "blankNameOrNameNotFound",
                        value: fieldValues,
                    },
                ]);
                if (embed.data.fields?.length === 25) {
                    await ephemeralReply;
                    if (!hasReplied) {
                        await interaction.editReply({ embeds: [embed] });
                        hasReplied = true;
                    }
                    else {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    }
                    embed.data.fields = [];
                }
            }
            catch (error) {
                console.error("[Error code: 1835]", error);
            }
        }
        if (embed.data.fields?.length || 0 > 0) {
            await ephemeralReply;
            if (!hasReplied) {
                await interaction.editReply({ embeds: [embed] }).catch((error) => {
                    console.error("[Error code: 1834]", error);
                    interaction.editReply({ content: "Ошибка :(" });
                });
            }
            else {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        }
        else {
            embed.setDescription("Нет данных по закрытым рейдам\nВозможно, пользователь не закрыл ни одного рейда");
            await interaction.editReply({ embeds: [embed] });
        }
    },
});
export default SlashCommand;
//# sourceMappingURL=raid-checker.js.map