import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, } from "discord.js";
import { Command } from "../structures/command.js";
import { AuthData } from "../handlers/sequelize.js";
import UserErrors from "../enums/UserErrors.js";
import { fetchRequest } from "../functions/fetchRequest.js";
import colors from "../configs/colors.js";
import { CachedDestinyActivityDefinition } from "../functions/manifestHandler.js";
import timerConverter from "../functions/convertSeconds.js";
import { client } from "../index.js";
import nameCleaner from "../functions/nameClearer.js";
export default new Command({
    name: "закрытия",
    nameLocalizations: { "en-US": "completions" },
    description: "Проверьте статистику всех активностей в выбранной категории",
    descriptionLocalizations: { "en-US": "Check statistic of all activities in the selected category" },
    options: [
        {
            name: "категория",
            nameLocalizations: { "en-US": "category" },
            description: "Укажите категорию проверяемых активностей",
            descriptionLocalizations: {
                "en-US": "Choose category for checking",
            },
            type: ApplicationCommandOptionType.String,
            choices: [
                { name: "рейды", value: `${4}`, nameLocalizations: { "en-US": "raids" } },
                { name: "подземелья", value: `${82}`, nameLocalizations: { "en-US": "dungeons" } },
                { name: "налеты", value: `${18}`, nameLocalizations: { "en-US": "strikes" } },
                { name: "патруль", value: `${6}`, nameLocalizations: { "en-US": "patrol" } },
                { name: "сюжет", value: `${2}`, nameLocalizations: { "en-US": "story" } },
            ],
        },
    ],
    messageContextMenu: { name: "Закрытия рейдов", nameLocalizations: { "en-US": "completions" }, type: ApplicationCommandType.Message },
    userContextMenu: { name: "Закрытия рейдов", nameLocalizations: { "en-US": "completions" }, type: ApplicationCommandType.User },
    run: async ({ args, interaction: slashInteraction, userMenuInteraction, messageMenuInteraction }) => {
        const interaction = messageMenuInteraction || userMenuInteraction || slashInteraction;
        const deferredInteraction = interaction.deferReply({ ephemeral: true });
        const category = parseInt(args?.getString("категория") || "") || 4;
        const targerMember = client
            .getCachedMembers()
            .get(interaction.isChatInputCommand()
            ? interaction.user.id
            : (interaction || interaction).targetId);
        if (!targerMember)
            throw { errorType: UserErrors.MEMBER_NOT_FOUND };
        const authData = await AuthData.findByPk(targerMember.id);
        if (!authData)
            throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf: interaction.user.id === targerMember.id } };
        const { platform, bungieId, accessToken } = authData;
        const characterIdList = (await fetchRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Stats/?groups=1`, accessToken)).characters.map((characterData) => characterData.characterId);
        const embed = new EmbedBuilder().setColor(colors.serious).setAuthor({
            name: `Идет обработка ${characterIdList.length} персонажей...`,
            iconURL: "https://cdn.discordapp.com/attachments/1007814172425330710/1054658580239876156/239_1.gif",
        });
        (await deferredInteraction) && interaction.editReply({ embeds: [embed] });
        async function getCompletedActivties() {
            let activities = [];
            let page = 0;
            let characterIndex = 0;
            while (characterIndex < characterIdList.length) {
                const characterId = characterIdList[characterIndex];
                const response = await fetchRequest(`/Platform/Destiny2/${platform}/Account/${bungieId}/Character/${characterId}/Stats/Activities/?count=250&mode=${category}&page=${page}`, accessToken);
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
        function summarizeActivities(activities) {
            const activtitiesTotal = { completed: 0, total: 0 };
            const activityCounts = {};
            const activityTimes = {};
            const activityTotals = {};
            const activityDates = {};
            for (const activity of activities) {
                const referenceId = activity.activityDetails.referenceId;
                if (!CachedDestinyActivityDefinition[referenceId]) {
                    continue;
                }
                const name = CachedDestinyActivityDefinition[referenceId].displayProperties.name;
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
        const filteredActivities = summarizeActivities(totalActivitiesCount);
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
                    obj.link = "https://strike.report/pgcr/";
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
                result.push(`Завершено ${activityCount.completed} из ${activityCount.total}｜У: ${activityTotal.kills} С: ${activityTotal.deaths}｜${activityText.inActivity} ${timerConverter(activityTotal.timeSpent)}`);
            }
            if (activityDate.firstClearInstanceId !== "0" ||
                activityDate.lastClearInstanceId !== "0" ||
                activityDate.firstCompletedClearInstanceId !== "0") {
                const { firstCompletedClear, firstClear, firstCompletedClearInstanceId, firstClearInstanceId, lastClearInstanceId, lastClear } = activityDate;
                result.push(`${firstClearInstanceId !== "0" && firstCompletedClear.getTime() > firstClear.getTime()
                    ? `Впервые [<t:${Math.trunc(firstClear.getTime() / 1000)}>](${activityText.link}${firstClearInstanceId})｜`
                    : ""}${firstCompletedClearInstanceId !== "0"
                    ? `1 закрытие [<t:${Math.trunc(firstCompletedClear.getTime() / 1000)}>](${activityText.link}${firstCompletedClearInstanceId})`
                    : ""}${lastClearInstanceId !== firstCompletedClearInstanceId && lastClearInstanceId !== "0"
                    ? `｜Последнее закрытие [<t:${Math.trunc(lastClear.getTime() / 1000)}>](${activityText.link}${lastClearInstanceId})`
                    : ""}`);
            }
            if (activityTime.fastestInstanceId !== "0" ||
                activityTime.slowestInstanceId !== "0" ||
                activityTime.fastestCompletedInstanceId !== "0" ||
                activityTime.slowestCompletedInstanceId !== "0") {
                const { fastestInstanceId, fastestCompleted, fastestCompletedInstanceId, fastest, slowest, slowestCompleted, slowestCompletedInstanceId, slowestInstanceId, } = activityTime;
                const joiningText = [];
                if (fastestInstanceId !== "0" && fastestInstanceId !== fastestCompletedInstanceId && fastest < fastestCompleted)
                    joiningText.push(`${activityText.fastest} [${timerConverter(fastest)}](${activityText.link}${fastestInstanceId})`);
                if (fastestCompletedInstanceId !== "0")
                    joiningText.push(`${activityText.fastestCompleted} [${timerConverter(fastestCompleted)}](${activityText.link}${fastestCompletedInstanceId})`);
                if (slowestInstanceId !== "0" && slowestInstanceId !== slowestCompletedInstanceId && fastestInstanceId !== slowestInstanceId)
                    joiningText.push(`${fastestInstanceId !== "0" && fastestInstanceId !== fastestCompletedInstanceId && fastest < fastestCompleted ? "\n" : ""}${activityText.slowest} [${timerConverter(slowest)}](${activityText.link}${slowestInstanceId})`);
                if (slowestCompletedInstanceId !== "0" && fastestCompletedInstanceId !== slowestCompletedInstanceId)
                    joiningText.push(`${activityText.slowestCompleted} [${timerConverter(slowestCompleted)}](${activityText.link}${slowestCompletedInstanceId})`);
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
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    interaction.followUp({ embeds: [embed], ephemeral: true });
                }
                embed.data.fields = [];
            }
            if (i === fieldArray.length - 1 && embed.data.fields?.length !== 0) {
                if (i === 9 || (i === fieldArray.length - 1 && i < 9)) {
                    interaction.editReply({ embeds: [embed] });
                }
                else {
                    interaction.followUp({ embeds: [embed], ephemeral: true });
                }
            }
        }
        return;
    },
});