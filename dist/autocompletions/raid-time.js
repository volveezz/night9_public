import { Autocomplete } from "../structures/autocomplete.js";
import convertTimeStringToNumber from "../utils/general/raidFunctions/convertTimeStringToNumber.js";
import { userTimezones } from "../utils/persistence/dataStore.js";
const AutocompleteFile = new Autocomplete({
    name: "время",
    aliases: ["новое-время", "time", "new-time"],
    run: async ({ interaction, option }) => {
        const convertedTime = convertTimeStringToNumber(option.value, userTimezones.get(interaction.user.id));
        const name = !convertedTime || isNaN(convertedTime) || convertedTime < 2
            ? "Проверьте корректность времени. Формат даты: ЧЧ:ММ ДД/мм"
            : new Date(convertedTime * 1000 + (userTimezones.get(interaction.user.id) ?? 3) * 60 * 60 * 1000).toLocaleString("ru-RU", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        if (name === "Invalid Date")
            return interaction.respond([{ name: "Проверьте корректность времени. Формат даты: ЧЧ:ММ ДД/мм", value: 0 }]);
        await interaction
            .respond([
            {
                name,
                value: convertedTime.toString(),
            },
        ])
            .catch((e) => {
            return console.error("[Error code: 1681]", e);
        });
    },
});
export default AutocompleteFile;
//# sourceMappingURL=raid-time.js.map