import { Command } from "../../structures/command.js";
import { ownerId } from "../../configs/ids.js";
import { EmbedBuilder, ApplicationCommandOptionType, GuildMember, ButtonBuilder, ButtonStyle, ComponentType, Collection } from "discord.js";
import colors from "../../configs/colors.js";
import { SurveyButtons } from "../../enums/Buttons.js";
import { SurveyAnswer } from "../../handlers/mongodb.js";
import { surveyResults } from "../../buttons/surveyEvent.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export default new Command({
    name: "survey",
    description: "Survey system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "start",
            description: "Starts survey system",
            options: [{ type: ApplicationCommandOptionType.User, name: "target", description: "User target for starting the survey" }],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "reset",
            description: "Resets survey status",
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "discordid",
                    description: "Discord Id of target for resetting",
                    required: true,
                },
            ],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "add",
            description: "adds new value to survey database",
            options: [
                { type: ApplicationCommandOptionType.String, name: "discordid", description: "discordid", required: true },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "questionindex",
                    description: "questionIndex",
                    required: true,
                    minValue: 0,
                    maxValue: 1000,
                },
                {
                    type: ApplicationCommandOptionType.Integer,
                    name: "answerindex",
                    description: "answerIndex",
                    required: true,
                    minValue: 0,
                    maxValue: 1000,
                },
                {
                    type: ApplicationCommandOptionType.String,
                    name: "answervalue",
                    description: "answerValue",
                },
            ],
        },
    ],
    run: async ({ interaction, args, client }) => {
        if (interaction.user.id !== ownerId)
            return;
        const command = args.getSubcommand(true);
        if (command === "start") {
            const target = !args.getUser("target")
                ? (client.getCachedMembers() || interaction.guild.members.cache)
                : (client.getCachedMembers() || interaction.guild?.members.cache).get(args.getUser("target").id);
            if (!target)
                throw { name: `${args.getUser("target")?.username} not found as guild member` };
            const embed = new EmbedBuilder()
                .setColor(colors.default)
                .setTitle(`Начать опрос ${target instanceof GuildMember ? target.displayName : `${target.size} пользователей`}?`);
            const components = [
                new ButtonBuilder()
                    .setCustomId(`command_` + SurveyButtons.start)
                    .setLabel("Начать")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`command_` + SurveyButtons.cancel)
                    .setLabel("Отменить")
                    .setStyle(ButtonStyle.Danger),
            ];
            const collector = (await interaction.reply({ embeds: [embed], components: [{ type: ComponentType.ActionRow, components }], ephemeral: true })).createMessageComponentCollector({ max: 1 });
            collector.on("collect", async (button) => {
                if (button.customId === `command_` + SurveyButtons.start) {
                    const targets = target instanceof GuildMember ? new Collection().set(target.id, target) : target;
                    const initialEmbed = new EmbedBuilder()
                        .setColor(colors.serious)
                        .setTitle(`Опрос по клану и серверу`)
                        .setDescription(`Вы получили опрос. Для начала прохождения нажмите кнопку 'Начать' ниже.\n\nВопросы разделены на несколько категорий. За выбор некоторых ответов вы можете быть исключены из клана или с сервера.\nВыбирайте ответы честно и обдуманно.\nОтветы не анонимны, но они не будут распространяться в чатах/в личных сообщениях. Только в общих цифрах.\n\nЦель этого опроса - узнать мнение, интересы, желания и возможности участников сервера.\n\nОпрос можно проходить в любое удобное время, но обязательную часть ([*]) необходимо завершить не позднее 15 марта.`);
                    const initialComponents = [
                        new ButtonBuilder().setCustomId(SurveyButtons.start).setLabel("Начать").setStyle(ButtonStyle.Primary),
                    ];
                    for await (const memberArray of targets) {
                        const member = memberArray[1];
                        if (member.user.bot || !member)
                            continue;
                        (await member.createDM())
                            .send({ embeds: [initialEmbed], components: [{ type: ComponentType.ActionRow, components: initialComponents }] })
                            .catch((e) => {
                            console.error(`[Error code: 1433] Failed to send message to ${member.displayName || member.user.username}`, { e });
                        });
                        console.debug(`Message sent to ${member.displayName || member.user.username}`);
                        await timer(5000);
                    }
                }
                else {
                    interaction.editReply({ embeds: [], components: [], content: "Отменено" });
                    collector.stop();
                    return;
                }
            });
        }
        else if (command === "reset") {
            const deferredReply = interaction.deferReply({ ephemeral: true });
            const discordId = args.getString("discordid", true);
            const database = await SurveyAnswer.findOne({ discordId });
            const cachedDatabase = surveyResults.get(discordId);
            const reply = [];
            if (cachedDatabase) {
                surveyResults.delete(discordId);
                reply.push("Cached data was wiped");
            }
            if (database) {
                await SurveyAnswer.deleteOne({ discordId }).then((c) => {
                    reply.push(`${c.acknowledged ? "Success" : "Error"}, ${c.deletedCount} deleted`);
                });
            }
            (await deferredReply) && interaction.editReply({ content: `Data was wiped: ${reply.join(", ") || "nothing"}` });
        }
        else if (command === "add") {
            const defferedReply = interaction.deferReply({ ephemeral: true });
            const discordId = args.getInteger("discordid", true);
            const questionIndex = args.getInteger("questionindex", true);
            const answerIndex = args.getInteger("answerindex", true);
            const answerValue = args.getString("answervalue") || "plain";
            const database = await SurveyAnswer.findOne({ discordId });
            if (!database)
                throw { name: "User not found" };
            database.answers.push({ questionIndex, answerIndex, answerValue });
            await database.save();
            return (await defferedReply) && interaction.editReply({ content: `User <@${discordId}> updated` });
        }
        else {
            interaction.reply({ content: "Wrong command", ephemeral: true });
            console.error(`[Error code: 1434]`, interaction);
        }
    },
});
