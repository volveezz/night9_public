import { EmbedBuilder, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, ComponentType, } from "discord.js";
import colors from "../../configs/colors.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
import { SurveyAnswer } from "../../handlers/mongodb.js";
import convertSeconds from "../../functions/utilities.js";
import { SurveyButtons } from "../../enums/Buttons.js";
export default new Command({
    name: "scripts",
    description: "script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "script",
            required: true,
        },
    ],
    run: async ({ client, interaction }) => {
        const defferedReply = interaction.deferReply();
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "activitytop": {
                const dbData = (await AuthData.findAll({ include: UserActivityData, attributes: ["displayName", "discordId"] })).filter((v) => v.UserActivityData && (v.UserActivityData.messages > 0 || v.UserActivityData.voice > 0));
                const messageTop = dbData
                    .filter((v) => v.UserActivityData.messages > 0)
                    .sort((a, b) => b.UserActivityData.messages - a.UserActivityData.messages);
                const voiceTop = dbData
                    .filter((v) => v.UserActivityData.voice > 0)
                    .sort((a, b) => b.UserActivityData.voice - a.UserActivityData.voice);
                const msgEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по текстовому активу")
                    .setFooter(messageTop.length > 50 ? { text: `И еще ${messageTop.length - 50} участников` } : null)
                    .setDescription(`${messageTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${v.UserActivityData.messages} ${v.UserActivityData.messages === 1 ? "сообщение" : "сообщений"}`;
                })
                    .join("\n")}`);
                const voiceEmbed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle("Топ по голосовому активу")
                    .setFooter(voiceTop.length > 49 ? { text: `И еще ${voiceTop.length - 50} участников` } : null)
                    .setDescription(`${voiceTop
                    .splice(0, 50)
                    .map((v, i) => {
                    return `${i + 1}. <@${v.discordId}> — ${convertSeconds(v.UserActivityData.voice)}`;
                })
                    .join("\n")
                    .slice(0, 2048)}`);
                return (await defferedReply) && interaction.editReply({ embeds: [msgEmbed, voiceEmbed] });
            }
            case "resendsurvey": {
                const answersDatabase = (await SurveyAnswer.find({})).map((r) => r.discordId);
                const guildMembers = client
                    .getCachedMembers()
                    .filter((v) => !v.user.bot && v.joinedTimestamp && v.joinedTimestamp < 1675987200000);
                const notCompleted = guildMembers
                    .map((v) => {
                    if (!answersDatabase.includes(v.user.id)) {
                        return `<@${v.user.id}>`;
                    }
                    else {
                        return undefined;
                    }
                })
                    .filter((v) => v !== undefined);
                const embed = new EmbedBuilder()
                    .setColor(colors.default)
                    .setTitle(`Предупреждение о скором завершении опроса`)
                    .setDescription(`Ранее вы получили сообщение насчёт прохождения опроса, но так и не прошли его.\n\nЧерез несколько дней опрос завершится. Если Вы не успеете пройти обязательную часть опроса до 15 марта, Вы будете исключены с сервера, а если Вы были в клане, то и из клана.`);
                const initialComponents = [
                    new ButtonBuilder().setCustomId(SurveyButtons.start).setLabel("Начать").setStyle(ButtonStyle.Primary),
                ];
                interaction.user.send({ embeds: [embed], components: [{ type: ComponentType.ActionRow, components: initialComponents }] });
                console.log(`For resending: ${answersDatabase.length}/${notCompleted.length}/${guildMembers.size}\n`, notCompleted.join(", "));
                return;
            }
            case "countsurvey": {
                const count = await SurveyAnswer.countDocuments();
                return (await defferedReply) && interaction.editReply({ content: `Total documents: ${count}` });
            }
            case "countresults": {
                const results = new Array(19).fill(0).map(() => new Array(6).fill(0));
                const surveyAnswers = await SurveyAnswer.find();
                surveyAnswers.forEach((surveyAnswer) => {
                    surveyAnswer.answers.forEach((answer) => {
                        results[answer.questionIndex][answer.answerIndex]++;
                    });
                });
                return console.log(results);
            }
            default:
                (await defferedReply) && interaction.editReply("Base response");
                break;
        }
    },
});
