import { raids } from "../handlers/sequelize.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        if (interaction.memberPermissions?.has("Administrator")) {
            const raidData = await raids.findAll({
                attributes: ["id", "raid"],
            });
            interaction
                .respond(raidData.map((data) => ({
                name: `${data.id}-${data.raid}`,
                value: data.id,
            })))
                .catch((e) => {
                if (e.code !== 10062) {
                    console.error(e);
                }
            });
        }
        else {
            const raidData = await raids.findAll({
                where: { creator: interaction.user.id },
                attributes: ["id", "raid"],
            });
            interaction
                .respond(raidData.map((data) => ({
                name: `${data.id}-${data.raid}`,
                value: data.id,
            })))
                .catch((e) => {
                if (e.code !== 10062) {
                    console.error(e);
                }
            });
        }
    },
};
