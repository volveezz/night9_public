import { ComponentType, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import { TimezoneButtons } from "../enums/Buttons.js";
export default new Command({
    name: "timezone",
    description: "Укажите свой часовой пояс",
    descriptionLocalizations: { "en-US": "Choose your timezone" },
    global: true,
    run: async ({ interaction }) => {
        const embed = new EmbedBuilder()
            .setColor(colors.default)
            .setTitle(`Установите свой часовой пояс`)
            .setDescription(`Если не знаете свой - в описании каждого часового пояса есть текущее время по нему`);
        const tzBlank = new StringSelectMenuBuilder()
            .setCustomId(TimezoneButtons.selectMenu)
            .setPlaceholder("Часовой пояс не выбран")
            .addOptions([
            {
                label: "+2 — Калининград",
                description: "-1 относительно Московского времени",
                value: "2",
            },
            {
                label: "+3 — Москва",
                description: "Московское время",
                value: "3",
            },
            {
                label: "+4 — Самара",
                description: "+1 относительно Московского времени",
                value: "4",
            },
            {
                label: "+5 — Екатеринбург",
                description: "+2 относительно Московского времени",
                value: "5",
            },
            {
                label: "+6 — Омск",
                description: "+3 относительно Московского времени",
                value: "6",
            },
            {
                label: "+7 — Красноярск",
                description: "+4 относительно Московского времени",
                value: "7",
            },
            {
                label: "+8 — Иркутск",
                description: "+5 относительно Московского времени",
                value: "8",
            },
            {
                label: "+9 — Якутск",
                description: "+6 относительно Московского времени",
                value: "9",
            },
            {
                label: "+10 — Владивосток",
                description: "+7 относительно Московского времени",
                value: "10",
            },
            {
                label: "+11 — Магадан",
                description: "+8 относительно Московского времени",
                value: "11",
            },
            {
                label: "+12 — Камчатка",
                description: "+9 относительно Московского времени",
                value: "12",
            },
        ]);
        const tzTime = new Date();
        tzTime.setHours(tzTime.getHours() + 2);
        tzBlank.options.forEach((option, i) => {
            option.setDescription(`${tzTime.getHours()}:${tzTime.getMinutes()}:${tzTime.getSeconds()} - время сейчас по +${i + 2} часовому поясу`);
            tzTime.setHours(tzTime.getHours() + 1);
        });
        interaction.reply({ ephemeral: true, embeds: [embed], components: [{ type: ComponentType.ActionRow, components: [tzBlank] }] });
    },
});
