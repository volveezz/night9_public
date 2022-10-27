import { ApplicationCommandOptionType, EmbedBuilder, GuildMember } from "discord.js";
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
export default {
    name: "role",
    description: "Удаление ролей у пользователей",
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "clear",
            description: "Удаление роли у всех пользоваталей",
            options: [{ type: ApplicationCommandOptionType.Role, name: "role", description: "Забираемая роль", required: true }],
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "set",
            description: "Установить определенную роль пользователю",
            options: [
                { type: ApplicationCommandOptionType.Role, name: "role", description: "Устанавливаемая роль", required: true },
                { type: ApplicationCommandOptionType.User, name: "user", description: "Пользователь, которому устанавливаем роль", required: true },
            ],
        },
    ],
    defaultMemberPermissions: ["Administrator"],
    callback: async (_client, interaction, _member, guild, _channel) => {
        await interaction.deferReply({ ephemeral: true });
        const subCommand = interaction.options.getSubcommand();
        const user = subCommand === "set" ? interaction.options.getMember("user") : null;
        const role = interaction.options.getRole("role", true);
        switch (subCommand) {
            case "clear": {
                let i = 0;
                const members = guild.members.cache.filter((m) => m.roles.cache.has(role.id));
                for (let n = 0; n < members.size; n++) {
                    const member = members.at(n);
                    i++;
                    member.roles.remove(role.id, "Cleaning users role").catch((e) => {
                        i--;
                        if (e.code !== 50013) {
                            console.error(e);
                        }
                    });
                    await timer(i * 366);
                }
                const embed = new EmbedBuilder().setColor("Green").setDescription(`Роль ${role} была удалена у ${i} участников`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
            case "set": {
                if (user instanceof GuildMember) {
                    const embed = new EmbedBuilder();
                    const u = user.roles
                        .set([role.id])
                        .then((m) => {
                        embed.setColor("Green").setDescription(`Роль ${role} установлена ${m}`);
                        interaction.editReply({ embeds: [embed] });
                        return true;
                    })
                        .catch((e) => {
                        if (e.code === 50013) {
                            return false;
                        }
                        else {
                            console.log(e);
                        }
                    });
                    if ((await u) === false) {
                        throw { name: "Ошибка", message: `Недостаточно прав для установки роли ${role} пользователю ${user}`, falseAlarm: true };
                    }
                }
                break;
            }
        }
    },
};
