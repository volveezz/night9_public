import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
import colors from "../../configs/colors.js";
import { Command } from "../../structures/command.js";
import { timer } from "../../utils/general/utilities.js";
export default new Command({
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
    run: async ({ interaction: CommandInteraction }) => {
        const interaction = CommandInteraction;
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = interaction.options.getSubcommand();
        const user = subCommand === "set" ? interaction.options.getMember("user") : null;
        const role = interaction.options.getRole("role", true);
        switch (subCommand) {
            case "clear": {
                let i = 0;
                const members = interaction.guild.members.cache.filter((m) => m.roles.cache.has(role.id));
                for (let n = 0; n < members.size; n++) {
                    const member = members.at(n);
                    i++;
                    await member.roles.remove(role.id, "Cleaning user role").catch((e) => {
                        i--;
                        if (e.code !== 50013) {
                            console.error(`[Error code: 1436]`, e);
                        }
                    });
                    await timer(i * 450);
                }
                const embed = new EmbedBuilder().setColor(colors.success).setDescription(`Роль ${role} была удалена у ${i} участников`);
                (await deferredReply) && interaction.editReply({ embeds: [embed] });
                return;
            }
            case "set": {
                if (user instanceof GuildMember) {
                    const embed = new EmbedBuilder();
                    const u = user.roles
                        .set([role.id])
                        .then(async (m) => {
                        embed.setColor(colors.success).setDescription(`Роль ${role} установлена ${m}`);
                        await deferredReply;
                        interaction.editReply({ embeds: [embed] });
                        return true;
                    })
                        .catch((e) => {
                        if (e.code === 50013) {
                            return false;
                        }
                        else {
                            console.error(`[Error code: 1435]`, e);
                        }
                    });
                    if ((await u) === false) {
                        throw {
                            name: "Ошибка",
                            description: `Недостаточно прав для установки роли ${role} пользователю ${user}`,
                        };
                    }
                }
                break;
            }
        }
    },
});
