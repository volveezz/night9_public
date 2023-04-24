import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import icons from "../../configs/icons.js";
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
    run: async ({ client, interaction, args }) => {
        const deferredReply = interaction.deferReply({ ephemeral: true });
        const subCommand = args.getSubcommand();
        const role = args.getRole("role", true);
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
                const userId = args.getUser("user", true).id;
                const member = client.getCachedMembers().get(userId) ?? (await client.getCachedGuild().members.fetch(userId));
                const embed = new EmbedBuilder();
                const success = await member.roles
                    .set([role.id])
                    .then(async () => {
                    embed
                        .setColor(colors.success)
                        .setDescription(`Роль ${role} была установлена ${member}`)
                        .setAuthor({ name: `Роль установлена`, iconURL: icons.success });
                    (await deferredReply) && (await interaction.editReply({ embeds: [embed] }));
                    return true;
                })
                    .catch(async (e) => {
                    if (e.code === 50013) {
                        const botHighestRole = member.guild.roles.highest.position;
                        const removableRoles = member.roles.cache.filter((role) => {
                            return role.editable && !role.managed && role.position < botHighestRole;
                        });
                        await member.roles.remove(removableRoles).catch((e) => {
                            console.error(`[Error code: 1712]`, e);
                        });
                        embed
                            .setColor(colors.warning)
                            .setDescription(`Роль ${role} была установлена ${member} после удаления всех возможных ролей`)
                            .addFields({
                            name: "Неудаленные роли",
                            value: member.roles.cache
                                .filter((role) => !removableRoles.has(role.id))
                                .map((role) => `<@&${role.id}>`)
                                .join(", "),
                            inline: false,
                        })
                            .setAuthor({ name: `Ошибка была исправлена`, iconURL: icons.warning });
                        (await deferredReply) && (await interaction.editReply({ embeds: [embed] }));
                    }
                    else {
                        console.error(`[Error code: 1435]`, e);
                        return false;
                    }
                });
                if (success === false) {
                    throw {
                        name: "Ошибка",
                        description: `Недостаточно прав для установки роли ${role} пользователю ${member}`,
                    };
                }
                return;
            }
        }
    },
});
