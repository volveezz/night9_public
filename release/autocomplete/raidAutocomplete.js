import { timerConverter } from "../functions/raidFunctions.js";
import { RaidEvent } from "../handlers/sequelize.js";
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
            interaction
                .respond(raidData.map((data) => ({
                name: String(data.id),
                value: data.id,
            })))
                .catch((e) => {
                if (e.code !== 10062)
                    console.error("[Error code: 1045]", e);
            });
        }
        else if (option.name === "новое_время" || option.name === "время") {
            const pasrsedTime = await timerConverter(option.value);
            interaction.respond([
                {
                    name: `${new Date(pasrsedTime * 1000).toLocaleString("ru-RU", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    })}`,
                    value: pasrsedTime.toString(),
                },
            ]);
        }
    },
};
