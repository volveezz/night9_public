import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Button } from "../structures/button.js";
const ButtonCommand = new Button({
    name: "helpMessage",
    run: async ({ interaction }) => {
        const category = interaction.customId.split("_")[1].toLowerCase();
        const embed = new EmbedBuilder().setColor(colors.invisible);
        switch (category) {
            case "raidcreate":
                embed
                    .setTitle("Создание рейда через команду")
                    .setDescription(`Введите команду </рейд создать:1036145721696600134> и укажите в неё такие параметры как:\n- \`рейд\` - рейд, на который собирается набор\n- \`время\` - время старта рейда\nОстальные параметры необязательны\n\nПо вопросам обращайтесь к технической администрации, прочтите описание параметра (или команды) или уточните в руководстве по созданию рейдов`);
                break;
            default:
                interaction.deferUpdate();
        }
        await interaction.reply({ ephemeral: true, embeds: [embed] });
    },
});
export default ButtonCommand;
//# sourceMappingURL=helpMessage.js.map