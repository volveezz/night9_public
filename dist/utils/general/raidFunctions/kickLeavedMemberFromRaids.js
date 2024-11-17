import { EmbedBuilder, GuildMember } from "discord.js";
import SequelizeModule from "sequelize";
import colors from "../../../configs/colors.js";
import { client } from "../../../index.js";
import { RaidEvent } from "../../persistence/sequelizeModels/raidEvent.js";
import nameCleaner from "../nameClearer.js";
import { updateRaidMessage } from "../raidFunctions.js";
import updatePrivateRaidMessage from "./privateMessage/updatePrivateMessage.js";
import { transferRaidCreator } from "./raidCreatorHandler.js";
const { Op, Sequelize } = SequelizeModule;
export default async function kickLeavedUserFromRaids(member) {
    const userId = member.user.id;
    const updateQuery = {
        joined: Sequelize.fn("array_remove", Sequelize.col("joined"), `${userId}`),
        hotJoined: Sequelize.fn("array_remove", Sequelize.col("hotJoined"), `${userId}`),
        alt: Sequelize.fn("array_remove", Sequelize.col("alt"), `${userId}`),
    };
    const searchQuery = {
        [Op.or]: [{ joined: { [Op.contains]: [userId] } }, { hotJoined: { [Op.contains]: [userId] } }, { alt: { [Op.contains]: [userId] } }],
    };
    const [rowsUpdated, raidEvents] = await RaidEvent.update(updateQuery, {
        where: searchQuery,
        returning: true,
    });
    if (rowsUpdated > 0) {
        raidEvents.forEach(async (raidEvent) => {
            try {
                if (raidEvent.creator === userId)
                    await transferRaidCreator(raidEvent);
            }
            catch (error) {
                console.error("[Error code: 1941]", error.stack);
            }
            try {
                await updateRaidMessage({ raidEvent });
            }
            catch (error) {
                console.error("[Error code: 1942]", error.stack);
            }
            try {
                await updatePrivateRaidMessage(raidEvent);
            }
            catch (error) {
                console.error("[Error code: 1943]", error.stack);
            }
            try {
                const username = (member instanceof GuildMember ? member.displayName : member.user.username) || "Неизвестный пользователь";
                const userAvatar = member instanceof GuildMember ? member.displayAvatarURL() : member.user.displayAvatarURL();
                const embed = new EmbedBuilder()
                    .setColor(colors.error)
                    .setAuthor({
                    name: `${nameCleaner(username)}: ❌`,
                    iconURL: userAvatar || undefined,
                })
                    .setFooter({
                    text: `Пользователь выписан системой, поскольку покинул сервер`,
                });
                const raidChannel = await client.getTextChannel(raidEvent.channelId);
                if (raidChannel) {
                    await raidChannel.send({ embeds: [embed] });
                }
            }
            catch (error) {
                console.error("[Error code: 1940] Error while sending embed to raid channel", error.stack);
            }
        });
    }
}
//# sourceMappingURL=kickLeavedMemberFromRaids.js.map