import { initCommand_register } from "../commands/init.js";
export default {
    callback: async (_client, interaction, _member, _guild, _channel) => {
        await interaction.deferReply({ ephemeral: true });
        const embed = await initCommand_register(interaction);
        return interaction.editReply({ embeds: [embed] });
    },
};
