import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import icons from "../configs/icons.js";
import { Button } from "../structures/button.js";
import { updateNotifications } from "../utils/general/raidFunctions/raidNotifications.js";
import { RaidUserNotification } from "../utils/persistence/sequelize.js";
const ButtonCommand = new Button({
    name: "changeCustomRaidNotifications",
    run: async ({ modalSubmit: interaction }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const { id: discordId } = interaction.user;
        const userInputedTime = interaction.fields.getTextInputValue("raidNotifications_modal_time");
        let timesArray = userInputedTime
            .split(/[\s|/\\.,]+/)
            .map(Number)
            .filter((n) => !isNaN(n) && n >= 1 && n <= 1440);
        timesArray = [...new Set(timesArray)];
        if (!timesArray.includes(15)) {
            timesArray.push(15);
        }
        timesArray.sort((a, b) => a - b).slice(0, 100);
        try {
            const userNotification = await RaidUserNotification.findOne({ where: { discordId } });
            if (userNotification) {
                userNotification.notificationTimes = timesArray;
                await userNotification.save();
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Вы изменили своё время оповещений", iconURL: icons.success })
                    .setDescription(`Новое время оповещений: \`${timesArray.join("`, `")}\``);
                updateNotifications(discordId);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            }
            else {
                await RaidUserNotification.create({
                    discordId,
                    notificationTimes: timesArray,
                });
                updateNotifications(discordId);
                const embed = new EmbedBuilder()
                    .setColor(colors.success)
                    .setAuthor({ name: "Вы установили своё время оповещений", iconURL: icons.success })
                    .setDescription(`Установленное время оповещений: \`${timesArray.join("`, `")}\``);
                await deferredReply;
                await interaction.editReply({ embeds: [embed] });
            }
        }
        catch (error) {
            if (error.code === "23503") {
                throw { errorType: "DB_USER_NOT_FOUND" };
            }
            else {
                console.error("[Error code: 1912]", error.code, error.body?.code, error.status, error.body?.status);
            }
        }
    },
});
export default ButtonCommand;
//# sourceMappingURL=changeCustomRaidNotifications.js.map