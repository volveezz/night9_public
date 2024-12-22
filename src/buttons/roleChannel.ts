import { EmbedBuilder } from "discord.js";
import UserErrors from "../configs/UserErrors.js";
import colors from "../configs/colors.js";
import { activityRoles, classRoles, statisticsRoles, trialsRoles } from "../configs/roles.js";
import { Button } from "../structures/button.js";
import { pause } from "../utils/general/utilities.js";
import { AuthData } from "../utils/persistence/sequelizeModels/authData.js";

const ButtonCommand = new Button({
	name: "roleChannel",
	run: async ({ client, interaction }) => {
		const deferredReply = interaction.deferReply({ ephemeral: true });
		const commandFull = interaction.customId.split("_").slice(1);
		const commandId = commandFull.shift()!;
		const member = await client.getMember(interaction.user.id);
		const guild = client.getCachedGuild();

		switch (commandId) {
			case "classRoles": {
				const className = commandFull.pop()!;
				const removedRoles = classRoles
					.filter((r) => r.className !== className)
					.map((r) => {
						return r.id;
					});
				await member.roles.remove(removedRoles);

				if (className !== "disable") {
					await member.roles.add(classRoles.find((r) => r.className === className)!.id);
				}

				const embedTitle =
					className === "disable"
						? "Вы отключили основной класс"
						: `Вы установили ${
								className === "hunter"
									? "<:hunter:995496474978824202>Охотника"
									: className === "warlock"
									? "<:warlock:995496471526920232>Варлока"
									: "<:titan:995496472722284596>Титана"
						  } как основной класс`;

				const embed = new EmbedBuilder().setColor(colors.success).setTitle(embedTitle);

				await deferredReply;
				await interaction.editReply({ embeds: [embed] });

				return;
			}

			default:
				{
					const categoryId = Number(commandFull.pop());
					const roleStatus: boolean = commandFull.pop() === "enable";
					const dbRow = await AuthData.findOne({ where: { discordId: interaction.user.id }, attributes: ["roleCategoriesBits"] });

					if (!dbRow) throw { errorType: UserErrors.DB_USER_NOT_FOUND };
					let { roleCategoriesBits } = dbRow;

					const embed = new EmbedBuilder().setColor(colors.serious);
					if ((!(roleCategoriesBits & categoryId) && roleStatus) || (roleCategoriesBits & categoryId && !roleStatus)) {
						const updated = await AuthData.update(
							{ roleCategoriesBits: roleStatus ? roleCategoriesBits | categoryId : roleCategoriesBits & ~categoryId },
							{ where: { discordId: interaction.user.id }, returning: ["roleCategoriesBits"] }
						);
						roleCategoriesBits = updated[1][0].roleCategoriesBits;
						const messageEmbed = embedPrep().setTitle(`Вы ${roleStatus ? "включили" : "отключили"} категорию`);

						await deferredReply;
						await interaction.editReply({ embeds: [messageEmbed] });
					} else {
						const messageEmbed = embedPrep().setTitle(`Категория уже ${roleStatus ? "включена" : "отключена"}`);

						await deferredReply;
						await interaction.editReply({ embeds: [messageEmbed] });
					}

					function embedPrep() {
						const categoryChecker = (categoryId: number) => {
							return (roleCategoriesBits & categoryId) === 0
								? "<:crossmark:1020504750350934026>"
								: "<:successCheckmark:1018320951173189743>";
						};
						return embed.setDescription(
							`- **Общая статистика** — ${categoryChecker(1)}\n- **Статистика Испытаний Осириса** — ${categoryChecker(
								2
							)}\n- **Титулы** — ${categoryChecker(4)}\n- **Триумфы** — ${categoryChecker(
								8
							)}\n- **Активность на сервере** — ${categoryChecker(16)}`
						);
					}

					if (roleStatus) return;

					let rolesToRemove: string[] = [];

					switch (categoryId) {
						case 1:
							rolesToRemove = [...statisticsRoles.allActive, ...statisticsRoles.allKd, process.env.STATISTICS_CATEGORY!];
							break;
						case 2:
							rolesToRemove = [...trialsRoles.allKd, ...trialsRoles.allRoles, trialsRoles.category, trialsRoles.wintrader];
							break;
						case 4:
							const topPos4 = guild.roles.cache.find((r) => r.id === process.env.TITLE_CATEGORY!)!.position;
							const botPos4 = guild.roles.cache.find((r) => r.id === process.env.TRIUMPHS_CATEGORY!)!.position;
							rolesToRemove = Array.from(
								guild.roles.cache.filter((r) => r.position > botPos4 && r.position <= topPos4).map((r) => r.id)
							);
							break;
						case 8:
							const topPos8 = guild.roles.cache.find((r) => r.id === process.env.TRIUMPHS_CATEGORY!)!.position;
							const botPos8 = guild.roles.cache.find((r) => r.id === activityRoles.category)!.position;
							rolesToRemove = Array.from(
								guild.roles.cache.filter((r) => r.position > botPos8 && r.position <= topPos8).map((r) => r.id)
							);
							break;
						case 16:
							rolesToRemove = [...activityRoles.allMessages, ...activityRoles.allVoice, activityRoles.category];
							break;
					}

					await member.roles.remove(rolesToRemove);

					// wait for a short period to allow Discord API to update the member's roles
					await pause(2500);

					// remove any roles that were not removed for any reasons
					if ((await member.fetch()).roles.cache.hasAny(...rolesToRemove)) {
						console.error(`[Error code: 1643] Member had roles that should be removed so we removed them again\n${rolesToRemove}`);
						await member.roles.remove(rolesToRemove);
					}
				}
				return;
		}
	},
});

export default ButtonCommand;
