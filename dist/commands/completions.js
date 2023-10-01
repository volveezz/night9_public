import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { client } from "../index.js";
import { Command } from "../structures/command.js";
import { GetManifest } from "../utils/api/ManifestManager.js";
import { sendApiRequest } from "../utils/api/sendApiRequest.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { convertSeconds } from "../utils/general/convertSeconds.js";
import nameCleaner from "../utils/general/nameClearer.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";
const SlashCommand = new Command({
    name: "закрытия",
    nameLocalizations: { "en-US": "completions", "en-GB": "completions" },
    description: "Проверьте статистику всех активностей в выбранной категории",
    descriptionLocalizations: {
        "en-US": "View statistics of all activities in the selected category",
        "en-GB": "View statistics of all activities in the selected category",
    },
    options: [
        {
            name: "категория",
            nameLocalizations: { "en-US": "category", "en-GB": "category" },
            description: "Укажите категорию проверяемых активностей",
            descriptionLocalizations: {
                "en-US": "Select category to check",
                "en-GB": "Select category to check",
            },
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "рейды", value: `${4}`, nameLocalizations: { "en-US": "raids", "en-GB": "raids" } },
                {
                    name: "подземелья",
                    value: `${82}`,
                    nameLocalizations: { "en-US": "dungeons", "en-GB": "dungeons" },
                },
                {
                    name: "налеты",
                    value: `${18}`,
                    nameLocalizations: { "en-US": "strikes", "en-GB": "strikes" },
                },
                { name: "патруль", value: `${6}`, nameLocalizations: { "en-US": "patrol", "en-GB": "patrol" } },
                { name: "сюжет", value: `${2}`, nameLocalizations: { "en-US": "story", "en-GB": "story" } },
            ],
        },
    ],
    userContextMenu: {
        name: "Закрытия рейдов",
        nameLocalizations: { "en-US": "Raid completions", "en-GB": "Raid completions" },
        type: ApplicationCommandType.User,
    },
    run: async ({ args, interaction: slashInteraction, userMenuInteraction }) => {
        if (getEndpointStatus("activity") !== 1) {
            throw { errorType: "API_UNAVAILABLE" };
        }
        const interaction = userMenuInteraction || slashInteraction;
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const category = parseInt(args?.getString("категория") || "") || 4;
        const targerMember = await client.getMember(interaction.targetId ? interaction.targetId : interaction.user.id);
        if (!targerMember) {
            await deferredReply;
            throw { errorType: "MEMBER_NOT_FOUND" };
        }
        const authData = await AuthData.findByPk(targerMember.id);
        if (!authData) {
            await deferredReply;
            throw { errorType: "DB_USER_NOT_FOUND", errorData: { isSelf: interaction.user.id === targerMember.id } };
        }
        const { platform, bungieId, accessToken } = authData;
        const characterIdList = (await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken)).characters.map((characterData) => characterData.characterId);
        const embed = new EmbedBuilder().setColor(colors.serious).setAuthor({
            name: `Идет обработка ${characterIdList.length} персонажей...`,
            iconURL: icons.loading,
        });
        await deferredReply;
        await interaction.editReply({ embeds: [embed] });
        async function getCompletedActivties() {
            let activities = [];
            let page = 0;
            let characterIndex = 0;
            while (characterIndex < characterIdList.length) {
                const characterId = characterIdList[characterIndex];
                const response = await sendApiRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Character/${characterId}/Stats/Activities/?count=250&mode=${category}&page=${page}`, accessToken);
                if (response.activities)
                    activities = activities.concat(response.activities);
                if (response.activities?.length === 250) {
                    page++;
                }
                else {
                    page = 0;
                    characterIndex++;
                }
            }
            return activities;
        }
        const totalActivitiesCount = await getCompletedActivties();
        async function summarizeActivities(activities) {
            const activtitiesTotal = { completed: 0, total: 0 };
            const activityCounts = {};
            const activityTimes = {};
            const activityTotals = {};
            const activityDates = {};
            const activityDefinition = await GetManifest("DestinyActivityDefinition");
            for (const activity of activities) {
                const referenceId = activity.activityDetails.referenceId;
                if (!activityDefinition[referenceId]) {
                    continue;
                }
                const name = activityDefinition[referenceId].displayProperties.name;
                const isCompleted = activity.values.completionReason.basic.value === 0 && activity.values.completed.basic.value === 1;
                if (!activityCounts[name]) {
                    activityCounts[name] = { completed: 0, total: 0 };
                }
                if (isCompleted) {
                    activtitiesTotal.completed++;
                    activityCounts[name].completed++;
                }
                activityCounts[name].total++;
                activtitiesTotal.total++;
                if (!activityTimes[name]) {
                    activityTimes[name] = {
                        fastest: Number.MAX_VALUE,
                        fastestInstanceId: "0",
                        fastestCompleted: Number.MAX_VALUE,
                        fastestCompletedInstanceId: "0",
                        slowest: 0,
                        slowestInstanceId: "0",
                        slowestCompleted: 0,
                        slowestCompletedInstanceId: "0",
                    };
                }
                if ((!isCompleted && activity.values.activityDurationSeconds.basic.value < activityTimes[name].fastest) ||
                    (isCompleted && activity.values.activityDurationSeconds.basic.value < activityTimes[name].fastestCompleted)) {
                    if (isCompleted) {
                        activityTimes[name].fastestCompleted = activity.values.activityDurationSeconds.basic.value;
                        activityTimes[name].fastestCompletedInstanceId = activity.activityDetails.instanceId;
                    }
                    else {
                        activityTimes[name].fastest = activity.values.activityDurationSeconds.basic.value;
                        activityTimes[name].fastestInstanceId = activity.activityDetails.instanceId;
                    }
                }
                if ((!isCompleted && activity.values.activityDurationSeconds.basic.value > activityTimes[name].slowest) ||
                    (isCompleted && activity.values.activityDurationSeconds.basic.value > activityTimes[name].slowestCompleted)) {
                    if (isCompleted) {
                        activityTimes[name].slowestCompleted = activity.values.activityDurationSeconds.basic.value;
                        activityTimes[name].slowestCompletedInstanceId = activity.activityDetails.instanceId;
                    }
                    else {
                        activityTimes[name].slowest = activity.values.activityDurationSeconds.basic.value;
                        activityTimes[name].slowestInstanceId = activity.activityDetails.instanceId;
                    }
                }
                if (!activityTotals[name]) {
                    activityTotals[name] = { kills: 0, deaths: 0, timeSpent: 0 };
                }
                activityTotals[name].kills += activity.values.kills.basic.value;
                activityTotals[name].deaths += activity.values.deaths.basic.value;
                activityTotals[name].timeSpent += activity.values.timePlayedSeconds.basic.value;
                if (!activityDates[name]) {
                    activityDates[name] = {
                        firstClear: new Date(),
                        firstClearInstanceId: "0",
                        firstCompletedClear: new Date(),
                        firstCompletedClearInstanceId: "0",
                        lastClear: new Date(0),
                        lastClearInstanceId: "0",
                    };
                }
                if (new Date(activity.period).getTime() > activityDates[name].lastClear.getTime()) {
                    activityDates[name].lastClear = new Date(activity.period);
                    activityDates[name].lastClearInstanceId = activity.activityDetails.instanceId;
                }
                if (new Date(activity.period).getTime() < activityDates[name].firstClear.getTime() ||
                    (isCompleted && new Date(activity.period).getTime() < activityDates[name].firstCompletedClear.getTime())) {
                    if (isCompleted) {
                        activityDates[name].firstCompletedClear = new Date(activity.period);
                        activityDates[name].firstCompletedClearInstanceId = activity.activityDetails.instanceId;
                    }
                    else {
                        activityDates[name].firstClear = new Date(activity.period);
                        activityDates[name].firstClearInstanceId = activity.activityDetails.instanceId;
                    }
                }
            }
            return { activityCounts, activityTimes, activityTotals, activityDates, activtitiesTotal };
        }
        const filteredActivities = await summarizeActivities(totalActivitiesCount);
        const fieldArray = [];
        const sortedCounts = Object.keys(filteredActivities.activityCounts).sort();
        function createActivityObject(category) {
            let obj = {
                inActivity: "",
                fastest: "",
                fastestCompleted: "",
                link: "",
                slowest: "",
                slowestCompleted: "",
                activity: "",
            };
            switch (category) {
                case 4:
                    obj.activity = "рейдов";
                    obj.inActivity = "В рейде";
                    obj.fastest = "Самый быстрый";
                    obj.fastestCompleted = "Самый быстрый закрытый";
                    obj.link = "https://raid.report/pgcr/";
                    obj.slowest = "Самый долгий";
                    obj.slowestCompleted = "Самый долгий закрытый";
                    break;
                case 82:
                    obj.activity = "подземелий";
                    obj.inActivity = "В подземелье";
                    obj.fastest = "Самое быстрое";
                    obj.fastestCompleted = "Самое быстрое закрытое";
                    obj.link = "https://dungeon.report/pgcr/";
                    obj.slowest = "Самое долгое";
                    obj.slowestCompleted = "Самое долгое закрытое";
                    break;
                case 18:
                    obj.activity = "налетов";
                    obj.inActivity = "В налете";
                    obj.fastest = "Самый быстрый";
                    obj.fastestCompleted = "Самый быстрый закрытый";
                    obj.link = "https://gm.report/pgcr/";
                    obj.slowest = "Самый долгий";
                    obj.slowestCompleted = "Самый долгий закрытый";
                    break;
                default:
                    obj.activity = "активностей";
                    obj.inActivity = "В активности";
                    obj.fastest = "Самая быстрая";
                    obj.fastestCompleted = "Самая быстрая закрытая";
                    obj.link = "https://www.bungie.net/7/ru/Pgcr/";
                    obj.slowest = "Самая долгая";
                    obj.slowestCompleted = "Самая долгая закрытая";
            }
            return obj;
        }
        const activityText = createActivityObject(category);
        for (const name of sortedCounts) {
            const activityCount = filteredActivities.activityCounts[name];
            const activityDate = filteredActivities.activityDates[name];
            const activityTime = filteredActivities.activityTimes[name];
            const activityTotal = filteredActivities.activityTotals[name];
            const result = [];
            if (activityCount.total > 0) {
                result.push(`Завершено ${activityCount.completed} из ${activityCount.total}｜У: ${activityTotal.kills} С: ${activityTotal.deaths}｜${activityText.inActivity} ${convertSeconds(activityTotal.timeSpent)}`);
            }
            if (activityDate.firstClearInstanceId !== "0" ||
                activityDate.lastClearInstanceId !== "0" ||
                activityDate.firstCompletedClearInstanceId !== "0") {
                const { firstCompletedClear, firstClear, firstCompletedClearInstanceId, firstClearInstanceId, lastClearInstanceId, lastClear } = activityDate;
                result.push(`${firstClearInstanceId !== "0" && firstCompletedClear.getTime() > firstClear.getTime()
                    ? `Впервые <t:${Math.trunc(firstClear.getTime() / 1000)}:R>, [закрытие](${activityText.link}${firstClearInstanceId})｜`
                    : ""}${firstCompletedClearInstanceId !== "0"
                    ? `1 закрытие <t:${Math.trunc(firstCompletedClear.getTime() / 1000)}:R>, [закрытие](${activityText.link}${firstCompletedClearInstanceId})`
                    : ""}${lastClearInstanceId !== firstCompletedClearInstanceId && lastClearInstanceId !== "0"
                    ? `｜Последнее закрытие <t:${Math.trunc(lastClear.getTime() / 1000)}:R>, [закрытие](${activityText.link}${lastClearInstanceId})`
                    : ""}`);
            }
            if (activityTime.fastestInstanceId !== "0" ||
                activityTime.slowestInstanceId !== "0" ||
                activityTime.fastestCompletedInstanceId !== "0" ||
                activityTime.slowestCompletedInstanceId !== "0") {
                const { fastestInstanceId, fastestCompleted, fastestCompletedInstanceId, fastest, slowest, slowestCompleted, slowestCompletedInstanceId, slowestInstanceId, } = activityTime;
                const joiningText = [];
                if (fastestInstanceId !== "0" && fastestInstanceId !== fastestCompletedInstanceId && fastest < fastestCompleted)
                    joiningText.push(`${activityText.fastest} [${convertSeconds(fastest)}](${activityText.link}${fastestInstanceId})`);
                if (fastestCompletedInstanceId !== "0")
                    joiningText.push(`${activityText.fastestCompleted} [${convertSeconds(fastestCompleted)}](${activityText.link}${fastestCompletedInstanceId})`);
                if (slowestInstanceId !== "0" &&
                    slowestInstanceId !== slowestCompletedInstanceId &&
                    fastestInstanceId !== slowestInstanceId &&
                    slowest > slowestCompleted)
                    joiningText.push(`${fastestInstanceId !== "0" && fastestInstanceId !== fastestCompletedInstanceId && fastest < fastestCompleted ? "\n" : ""}${activityText.slowest} [${convertSeconds(slowest)}](${activityText.link}${slowestInstanceId})`);
                if (slowestCompletedInstanceId !== "0" && fastestCompletedInstanceId !== slowestCompletedInstanceId)
                    joiningText.push(`${activityText.slowestCompleted} [${convertSeconds(slowestCompleted)}](${activityText.link}${slowestCompletedInstanceId})`);
                result.push(joiningText.join("｜"));
            }
            const text = result.join("\n");
            fieldArray.push({
                name: name || "неизвестная активность",
                value: text || "подробности по активности отсутствуют",
            });
        }
        embed.setColor(colors.success).setAuthor({
            name: `${nameCleaner(targerMember.displayName)} завершил ${filteredActivities.activtitiesTotal.completed} из ${filteredActivities.activtitiesTotal.total} ${activityText.activity}`,
            iconURL: targerMember.displayAvatarURL() || targerMember.user.displayAvatarURL(),
        });
        for (let i = 0; i < fieldArray.length; i++) {
            const field = fieldArray[i];
            embed.addFields(field);
            if (embed.data.fields?.length === 10) {
                if (i === 9) {
                    await interaction.editReply({ embeds: [embed] });
                }
                else {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                }
                embed.data.fields = [];
            }
            if (i === fieldArray.length - 1 && embed.data.fields?.length !== 0) {
                if (i === 9 || (i === fieldArray.length - 1 && i < 9)) {
                    await interaction.editReply({ embeds: [embed] });
                }
                else {
                    await interaction.followUp({ embeds: [embed], ephemeral: true });
                }
            }
        }
        return;
    },
});
export default SlashCommand;
//# sourceMappingURL=completions.js.map