import { RaidEvent } from "../utils/persistence/sequelize.js";
export default {
    name: "id-рейда",
    run: async ({ interaction }) => {
        const raidData = interaction.memberPermissions?.has("Administrator")
            ? await RaidEvent.findAll({
                attributes: ["id", "raid"],
            })
            : await RaidEvent.findAll({
                where: { creator: interaction.user.id },
                attributes: ["id", "raid"],
            });
        await interaction
            .respond(raidData.map((data) => ({
            name: `${data.id}`,
            value: data.id,
        })))
            .catch((e) => {
            if (e.code !== 10062)
                return console.error("[Error code: 1045]", e);
        });
    },
};
