import { userTimezones } from "../core/userStatisticsManagement.js";
import convertTimeStringToNumber from "../utils/general/raidFunctions/convertTimeStringToNumber.js";
export default {
    name: "время",
    aliases: ["новое-время"],
    run: async ({ interaction, option }) => {
        const pasrsedTime = convertTimeStringToNumber(option.value, userTimezones.get(interaction.user.id));
        const name = pasrsedTime === 0
            ? "Проверьте корректность времени. Формат даты: ЧЧ:ММ ДД/мм"
            : new Date(pasrsedTime * 1000 + (userTimezones.get(interaction.user.id) ?? 3) * 60 * 60 * 1000).toLocaleString("ru-RU", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        await interaction
            .respond([
            {
                name,
                value: pasrsedTime.toString(),
            },
        ])
            .catch((e) => {
            return console.error("[Error code: 1681]", e);
        });
    },
};
//# sourceMappingURL=raidTime.js.map