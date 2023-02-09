import { EmbedBuilder, ComponentType, ButtonBuilder } from "discord.js";
import { ids } from "../configs/ids.js";
import colors from "../configs/colors.js";
import { SurveyButtons } from "../enums/Buttons.js";
import { surveyQuestionGenerator } from "../functions/surveyQuestionGenerator.js";
import { surveyQuestions } from "../configs/survey.js";
import { lastestSurveyModalsIds } from "./surveyEvent.js";
export default {
    name: "surveyModal",
    run: async ({ client, modalSubmit: interaction }) => {
        const deferredInteraction = interaction.deferReply({ ephemeral: true });
        const customIdArgs = interaction.customId.split("_");
        const lastestSurveyId = lastestSurveyModalsIds.get(interaction.user.id);
        const guild = client.getCachedGuild() || interaction.guild;
        const modalChannel = (guild.channels.cache.get(ids.modalOutputChannelId) ||
            (await guild.channels.fetch(ids.modalOutputChannelId)));
        const member = (interaction.member ||
            guild.members.cache.get(interaction.user.id) ||
            (await guild.members.fetch(interaction.user.id)));
        if (!guild || !modalChannel || !member) {
            console.error(`[Error code: 1430]`, guild, modalChannel, member);
            throw { name: "Критическая ошибка" };
        }
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${member.displayName} — ${member.id}`, iconURL: member.displayAvatarURL() })
            .setTitle(`${interaction.customId}`)
            .setColor(colors.default);
        await Promise.all(interaction.fields.fields.map((field) => {
            if (!field.value)
                return;
            embed.addFields({ name: field.customId.split("_").pop() || "Заголовок не найден", value: field.value || "ничего не указано" });
        }));
        const surverMessageButtonRows = interaction.message.components.map((actionRow) => {
            const surveyMessageButtons = actionRow.components.map((component) => {
                if (component.type === ComponentType.Button) {
                    if (component.customId === lastestSurveyId) {
                        return ButtonBuilder.from(component).setCustomId(SurveyButtons.alreadyVoted);
                    }
                    else {
                        return ButtonBuilder.from(component).setDisabled(true);
                    }
                }
                else {
                    throw { name: "Критическая ошибка", component, log: `[Error code: 1431] Found unknown join button type` };
                }
            });
            return surveyMessageButtons;
        });
        modalChannel.send({
            embeds: [embed],
        });
        const modalConfirm = new EmbedBuilder().setColor(colors.success).setTitle("Ваш ответ сохранен");
        (await deferredInteraction) &&
            interaction.message.edit({
                components: surverMessageButtonRows.map((components) => {
                    return { components, type: ComponentType.ActionRow };
                }),
            });
        (await deferredInteraction) && interaction.editReply({ embeds: [modalConfirm] });
        const surveyQuestion = parseInt(customIdArgs[1]) ?? surveyQuestions.length - 2;
        const { embeds, components } = surveyQuestionGenerator(surveyQuestion + 1);
        (interaction.user.dmChannel || (await interaction.user.createDM())).send({ embeds, components });
    },
};
