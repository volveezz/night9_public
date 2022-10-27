import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { statusRoles } from "../base/roles.js";
export default {
    name: "scripts",
    description: "script system",
    defaultMemberPermissions: ["Administrator"],
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "script",
            description: "script",
            required: true,
        },
    ],
    callback: async (_client, interaction, _member, _guild, _channel) => {
        await interaction.deferReply({ ephemeral: true });
        const scriptId = interaction.options.getString("script", true).toLowerCase();
        switch (scriptId) {
            case "rolesweeper": {
                const members = interaction.guild.members.cache.filter((m) => {
                    return (m.roles.cache.has(statusRoles.member) || m.roles.cache.has(statusRoles.kicked)) && m.roles.cache.has(statusRoles.verified);
                });
                const updatedMembers = members.map((member) => {
                    member.roles
                        .set([
                        member.roles.cache.has(statusRoles.member)
                            ? statusRoles.member
                            : member.roles.cache.has(statusRoles.kicked)
                                ? statusRoles.kicked
                                : "",
                        member.roles.cache.has(statusRoles.verified) ? statusRoles.verified : "",
                    ])
                        .catch((e) => {
                        interaction.followUp(`Возникла ошибка во время обновления ${member.displayName}`);
                    });
                });
                const embed = new EmbedBuilder().setColor("Green").setTitle(`${updatedMembers.length} пользователей было обновлено из ${members.size}`);
                interaction.editReply({ embeds: [embed] });
                return;
            }
            default:
                break;
        }
    },
};
