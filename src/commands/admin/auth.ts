import { ApplicationCommandOptionType, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import Sequelize from "sequelize";
import UserErrors from "../../configs/UserErrors.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { requestTokenRefresh } from "../../core/tokenManagement.js";
import { Command } from "../../structures/command.js";
import { isSnowflake } from "../../utils/general/utilities.js";
import { AuthData } from "../../utils/persistence/sequelizeModels/authData.js";
const { Op } = Sequelize;

const SlashCommand = new Command({
	name: "auth",
	description: "Refresh of the user's authorisation data for the selected user",
	defaultMemberPermissions: ["Administrator"],
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "id",
			description: "Specify the user whose permissions are to be updated",
			required: true,
		},
	],
	run: async ({ interaction }) => {
		const deferredReply = interaction.deferReply({ ephemeral: true });

		const id =
			(interaction as ChatInputCommandInteraction).options.getString("id") === "me"
				? interaction.user.id
				: (interaction as ChatInputCommandInteraction).options.getString("id", true);

		if (!isSnowflake(id)) {
			await deferredReply;
			throw { errorType: UserErrors.WRONG_ID };
		}

		const data = await AuthData.findOne({
			where: { [Op.or]: [{ discordId: id }, { bungieId: id }] },
			attributes: ["discordId", "displayName", "refreshToken"],
		});

		if (!data) {
			await deferredReply;
			const isSelf = id === interaction.user.id || id === "";
			throw { errorType: UserErrors.DB_USER_NOT_FOUND, errorData: { isSelf } };
		}

		try {
			var token = await requestTokenRefresh({ refresh_token: data.refreshToken, userId: data.discordId });
		} catch (err: any) {
			throw { name: "[Error code: 1233] Request error", description: err?.error?.error_description || "no description available", err };
		}

		if (token && token.access_token && token.refresh_token && token.membership_id) {
			await AuthData.update(
				{
					accessToken: token.access_token,
					refreshToken: token.refresh_token,
				},
				{
					where: {
						membershipId: token.membership_id,
					},
				}
			);

			const embed = new EmbedBuilder().setFooter({ text: `MembershipId: ${token.membership_id}` });

			if (id != null && token.membership_id != null) {
				embed.setColor(colors.success).setAuthor({ name: `${data.displayName} был обновлен`, iconURL: icons.success });
			} else {
				embed
					.setColor(colors.error)
					.setAuthor({ name: `Произошла ошибка во время обновления токена ${data.displayName}`, iconURL: icons.close });
			}

			await deferredReply;
			await interaction.editReply({ embeds: [embed] });

			return;
		} else {
			console.error("[Error code: 1700]", token, data);
			const errorEmbed = new EmbedBuilder()
				.setColor(colors.error)
				.setAuthor({ name: `Произошла ошибка во время обновления токена ${data.displayName}`, iconURL: icons.error });

			await deferredReply;
			await interaction.editReply({ embeds: [errorEmbed] });

			return;
		}
	},
});

export default SlashCommand;
