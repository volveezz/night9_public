import { raids } from "../handlers/sequelize.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        const raidData = interaction.memberPermissions?.has("Administrator")
            ? await raids.findAll({
                attributes: ["id", "raid"],
            })
            : await raids.findAll({
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
    },
};
