import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
import { Command } from "../../structures/command.js";
import setMemberRoles from "../../utils/discord/setRoles.js";
import { pause } from "../../utils/general/utilities.js";

const SlashCommand = new Command({
	name: "role",
	description: "Управление и удаление ролей у пользователей",
	descriptionLocalizations: { "en-GB": "Managing and removing roles from users", "en-US": "Managing and removing roles from users" },
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "clear",
			description: "Удаление роли у всех пользоваталей",
			descriptionLocalizations: { "en-GB": "Remove the role from all users", "en-US": "Remove the role from all users" },
			options: [
				{
					type: ApplicationCommandOptionType.Role,
					name: "role",
					description: "Укажите забираемую роль",
					descriptionLocalizations: { "en-GB": "Specify the role to be taken away", "en-US": "Specify the role to be taken away" },
					required: true,
				},
			],
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "set",
			description: "Установить определенную роль пользователю",
			descriptionLocalizations: { "en-GB": "Set a specific role for a user", "en-US": "Set a specific role for a user" },
			options: [
				{
					type: ApplicationCommandOptionType.User,
					name: "user",
					description: "Укажите пользователя, которому устанавливаем роль",
					descriptionLocalizations: {
						"en-GB": "Specify the user to whom you want to set the role",
						"en-US": "Specify the user to whom you want to set the role",
					},
					required: true,
				},
				{
					type: ApplicationCommandOptionType.Role,
					name: "role",
					description: "Укажите роль, которая должна быть установлена для пользователя",
					descriptionLocalizations: {
						"en-GB": "Specify the role to be set for the user",
						"en-US": "Specify the role to be set for the user",
					},
					required: true,
				},
			],
		},
	],
	defaultMemberPermissions: ["Administrator"],
	run: async ({ client, interaction, args }) => {
		const deferredReply = interaction.deferReply({ ephemeral: true });

		const subCommand = args.getSubcommand();
		const role = args.getRole("role", true);
		setMemberRoles;
		switch (subCommand) {
			case "clear": {
				let successCount = 0;
				const members = interaction.guild!.members.cache.filter((m: GuildMember) => m.roles.cache.has(role.id));
				const fixedDelay = 450; // Milliseconds

				for (let n = 0; n < members.size; n++) {
					const member = members.at(n)!;
					try {
						await member.roles.remove(role.id, "Cleaning user role");
						successCount++;
					} catch (e: any) {
						if (e.code !== 50013) {
							console.error("[Error code: 1436]", e);
						}
					}

					// Wait for the fixed delay using the existing timer function
					await pause(fixedDelay);
				}

				const embed = new EmbedBuilder()
					.setColor(colors.success)
					.setDescription(`Роль ${role} была удалена у ${successCount} участников`);

				try {
					await deferredReply;
					await interaction.editReply({ embeds: [embed] });
				} catch (e) {
					console.error("[Error code: 1920] Couldn't edit the interaction", e);
				}
				return;
			}

			case "set": {
				const userId = args.getUser("user", true).id;
				const member = await client.getMember(userId);

				const embed = new EmbedBuilder();

				await setMemberRoles({ member, roles: [role.id], reason: "Admin command action" });

				embed
					.setColor(colors.success)
					.setDescription(`Роль ${role} была установлена ${member}`)
					.setAuthor({ name: "Роль установлена", iconURL: icons.success });
				(await deferredReply) && (await interaction.editReply({ embeds: [embed] }));

				return;
			}
		}
	},
});

export default SlashCommand;
