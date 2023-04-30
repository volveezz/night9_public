import { EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { TimezoneButtons } from "../configs/Buttons.js";
import { timezoneSelectMenuData } from "../configs/SelectMenuOptions.js";
import colors from "../configs/colors.js";
import { addButtonComponentsToMessage } from "../utils/general/addButtonsToMessage.js";
export default {
    name: "timezoneButton",
    run: async ({ interaction }) => {
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTitle("Установите свой часовой пояс")
            .setDescription("Если не знаете свой - в описании каждого часового пояса есть текущее время по нему\nЧасовой пояс устанавливается от Гринвича! От +00:00, а не от Московского времени");
        const tzBlank = new StringSelectMenuBuilder()
            .setCustomId(TimezoneButtons.selectMenu)
            .setPlaceholder("Часовой пояс не выбран")
            .addOptions(timezoneSelectMenuData);
        const tzTime = new Date();
        tzTime.setHours(tzTime.getHours() + 1);
        tzBlank.options.forEach((option, i) => {
            option.setDescription(`${tzTime.getHours()}:${tzTime.getMinutes()}:${tzTime.getSeconds()} - время сейчас по +${i + 1} часовому поясу`);
            tzTime.setHours(tzTime.getHours() + 1);
        });
        interaction.reply({ ephemeral: true, embeds: [embed], components: await addButtonComponentsToMessage([tzBlank]) });
    },
};
