import { ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import raidsGuide from "../configs/raidguide.js";
export default {
    name: "editRaidGuide",
    run: async ({ selectMenu: interaction }) => {
        const customIdData = interaction.values[0].split("_");
        const raidName = customIdData[0];
        const encounterIndex = parseInt(customIdData[1]);
        const encounterGuideIndex = parseInt(customIdData[2]);
        const embedIndex = parseInt(customIdData[3]);
        console.debug("DEBUG DATA", interaction.values[0]);
        const raidGuide = raidsGuide[raidName];
        const raidGuideEncounter = raidGuide[encounterIndex].buttons?.[encounterGuideIndex].embeds?.[embedIndex];
        if (!raidGuideEncounter) {
            const embed = new EmbedBuilder().setColor(colors.error).setAuthor({ name: "Ошибка. Гайд не найден", iconURL: icons.error });
            interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }
        const modal = new ModalBuilder().setTitle("Измените сообщение рейда").setCustomId(`editedRaidGuide`);
        const raidGuide_name = new TextInputBuilder()
            .setLabel("Заголовок")
            .setStyle(TextInputStyle.Short)
            .setCustomId(`editedRaidGuide_${raidName}_${encounterIndex}_${encounterGuideIndex}_${embedIndex}_name`)
            .setPlaceholder("Укажите заголовок гайда")
            .setValue(raidGuideEncounter.name)
            .setMaxLength(256)
            .setRequired(true);
        const raidGuide_description = new TextInputBuilder()
            .setLabel("Описание")
            .setStyle(TextInputStyle.Paragraph)
            .setCustomId(`editedRaidGuide_${raidName}_${encounterIndex}_${encounterGuideIndex}_${embedIndex}_description`)
            .setPlaceholder("Укажите описание гайда")
            .setValue(raidGuideEncounter.description)
            .setRequired(false);
        const raidGuide_image = new TextInputBuilder()
            .setLabel("Ссылка на изображение")
            .setStyle(TextInputStyle.Short)
            .setCustomId(`editedRaidGuide_${raidName}_${encounterIndex}_${encounterGuideIndex}_${embedIndex}_image`)
            .setPlaceholder("Укажите изображение гайда")
            .setRequired(false);
        if (raidGuideEncounter.image) {
            raidGuide_image.setValue(raidGuideEncounter.image);
        }
        modal.setComponents([
            new ActionRowBuilder().addComponents(raidGuide_name),
            new ActionRowBuilder().addComponents(raidGuide_description),
            new ActionRowBuilder().addComponents(raidGuide_image),
        ]);
        await interaction.showModal(modal);
    },
};
