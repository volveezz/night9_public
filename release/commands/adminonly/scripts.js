import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import colors from "../../configs/colors.js";
import { statusRoles } from "../../configs/roles.js";
import { AuthData, UserActivityData } from "../../handlers/sequelize.js";
import { Command } from "../../structures/command.js";
import { SurveyAnswer } from "../../handlers/mongodb.js";
import { client } from "../../index.js";
import convertSeconds from "../../functions/utilities.js";
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
    run: async ({ interaction }) => {
        const defferedReply = interaction.deferReply();
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "rolesweeper": {
                const members = interaction.guild.members.cache.filter((m) => {
                    return ((m.roles.cache.has(statusRoles.member) || m.roles.cache.has(statusRoles.kicked)) &&
                        m.roles.cache.has(statusRoles.verified));
                });
                const updatedMembers = members.map(async (member) => {
                    await member.roles
                        .set([
                        member.roles.cache.has(statusRoles.member)
                            ? statusRoles.member
                            : member.roles.cache.has(statusRoles.kicked)
                                ? statusRoles.kicked
                                : "",
                        member.roles.cache.has(statusRoles.verified) ? statusRoles.verified : "",
                    ])
                        .catch((e) => defferedReply.then((v) => interaction.followUp(`Возникла ошибка во время обновления ${member.displayName}`)));
                    await new Promise((res) => setTimeout(res, 500));
                });
                const embed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle(`${updatedMembers.length} пользователей было обновлено из ${members.size}`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
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
                const clanMembers = client.getCachedMembers().filter((member) => member.roles.cache.has(statusRoles.clanmember));
                const answersDatabase = await SurveyAnswer.find({});
                const meetRequirements = answersDatabase
                    .map((database) => {
                    if (clanMembers.has(database.discordId) &&
                        (!database.answers.find((answer) => answer.questionIndex === 3) ||
                            !database.answers.find((answer) => answer.questionIndex === 4) ||
                            !database.answers.find((answer) => answer.questionIndex === 5))) {
                        return database.discordId;
                    }
                    else {
                        return null;
                    }
                })
                    .filter((v) => v !== null);
                if (!meetRequirements || !meetRequirements[0] || meetRequirements.length === 0) {
                    return (await defferedReply) && interaction.editReply({ content: `Possible matches: ${meetRequirements || 0}` });
                }
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
            case "timetill": {
                const channel = interaction.channel;
                const embed = new EmbedBuilder().setColor(colors.default);
                const array = [];
                array.push(` — Начало 24-часовых тех. работ\n · В течение этого времени сервера игры не будут доступны\n · Предзагрузка следующего обновления станет доступной после начала тех. работ\n⁣ ⁣ ⁣ ⁣Начало: <t:1677517200>, <t:1677517200:R>\n⁣ ⁣ ⁣ ⁣Завершение: <t:1677603600>, <t:1677603600:R>`);
                array.push(` — Запуск следующего дополнения LightFall и старт следующего сезона «Сопротивление»\n⁣ ⁣ ⁣ ⁣<t:1677603600>, <t:1677603600:R>`);
                array.push(` — Старт нового рейда\n · Откроется доступ к новому рейду с сложным "Contest"-модификатором\n · Обычный рейд станет доступен после завершения DayOne\n⁣ ⁣ ⁣ ⁣Начало DayOne: <t:1678467600>, <t:1678467600:R>\n⁣ ⁣ ⁣ ⁣Завершение "DayOne": <t:1678640400>, <t:1678640400:R>`);
                embed.setDescription(array.join("\n\n"));
                channel.send({ embeds: [embed] });
                return;
            }
            default:
                (await defferedReply) && interaction.editReply("Base response");
                break;
        }
    },
});
