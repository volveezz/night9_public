import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { Command } from "../structures/command.js";
import tokenRefresher from "../structures/tokenRefresher.js";
import { getEndpointStatus } from "../utils/api/statusCheckers/statusTracker.js";
import { longOffline } from "../utils/persistence/dataStore.js";

const SlashCommand = new Command({
	name: "wasibanned",
	description: "Проверьте свой статус бана",
	descriptionLocalizations: {
		"en-GB": "Check whether your statistics are currently being checked",
		"en-US": "Check whether your statistics are currently being checked",
	},
	run: async ({ interaction }) => {
		const embed = new EmbedBuilder().setColor(colors.invisible);

		const textNotification = longOffline.has(interaction.user.id) ? "Да. Вы забанены" : "Вы не в бане :)";

		embed.setTitle(textNotification).setFooter({
			text: `API Status: ${getEndpointStatus("account")}|${getEndpointStatus("activity")}|${getEndpointStatus(
				"api"
			)}|${getEndpointStatus("oauth")}|${tokenRefresher.wasRefreshedRecently()} | Banned amount: ${longOffline.size}`,
		});

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
});

export default SlashCommand;
