import { userTimezones } from "../core/userStatisticsManagement.js";
import { timeConverter } from "../utils/general/raidFunctions.js";
import { RaidEvent } from "../utils/persistence/sequelize.js";
export default {
    name: "рейд",
    run: async ({ interaction, option }) => {
        if (option.name === "id_рейда") {
            const raidData = interaction.memberPermissions?.has("Administrator")
                ? await RaidEvent.findAll({
                    attributes: ["id", "raid"],
                })
                : await RaidEvent.findAll({
                    where: { creator: interaction.user.id },
                    attributes: ["id", "raid"],
                });
            return await interaction
                .respond(raidData.map((data) => ({
                name: String(data.id),
                value: data.id,
            })))
                .catch((e) => {
                if (e.code !== 10062)
                    return console.error("[Error code: 1045]", e);
            });
        }
        else if (option.name === "новое_время" || option.name === "время") {
            const pasrsedTime = timeConverter(option.value, userTimezones.get(interaction.user.id));
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
            return await interaction
                .respond([
                {
                    name,
                    value: pasrsedTime.toString(),
                },
            ])
                .catch((e) => {
                return console.error(`[Error code: 1681]`, e);
            });
        }
    },
};
