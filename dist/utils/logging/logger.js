import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from "discord.js";
import colors from "../../configs/colors.js";
import { ids } from "../../configs/ids.js";
import { statusRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import { escapeString } from "../general/utilities.js";
export async function logClientDmMessages(member, text, id, interaction) {
    const dmLogChannel = interaction ? null : client.getCachedTextChannel(ids.dmMsgsChnId);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL(),
    })
        .setTimestamp()
        .setDescription(text || "nothing")
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    const payload = {
        embeds: [embed],
        components: [
            {
                type: ComponentType.ActionRow,
                components: [
                    new ButtonBuilder().setCustomId("dmChnFunc_reply").setLabel("Ответить").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("dmChnFunc_delete").setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
                ],
            },
        ],
    };
    interaction ? interaction.editReply(payload) : dmLogChannel.send(payload);
}
export function logRegistrationLinkRequest(state, user, rowCreated) {
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: `${state}`, inline: true },
        { name: "Впервые", value: `${rowCreated}`, inline: true },
    ]);
    client.getCachedTextChannel(ids.botChnId).send({ embeds: [embed] });
}
export async function updateClanRolesWithLogging(result, join) {
    const member = client.getCachedGuild().members.cache.get(result.discordId);
    const embed = new EmbedBuilder().addFields([
        { name: "Пользователь", value: `<@${result.discordId}>`, inline: true },
        { name: "BungieId", value: result.bungieId, inline: true },
        { name: "Ник в игре", value: result.displayName, inline: true },
    ]);
    if (member) {
        if (join) {
            member.roles
                .add(statusRoles.clanmember, "Clan join")
                .then((m) => m.roles.remove([statusRoles.kicked, statusRoles.newbie, statusRoles.member]));
            embed
                .setAuthor({
                name: `${escapeString(member.displayName)} вступил в клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.success);
        }
        else {
            member.roles.set(member.roles.cache.has(statusRoles.verified) ? [statusRoles.kicked, statusRoles.verified] : [statusRoles.kicked], "Member left clan");
            embed
                .setAuthor({
                name: `${escapeString(member.displayName)} покинул клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.kicked);
        }
    }
    else {
        if (join) {
            embed
                .setAuthor({
                name: `Неизвестный на сервере пользователь вступил в клан`,
            })
                .setColor(colors.success);
        }
        else {
            embed
                .setAuthor({
                name: `Неизвестный на сервере пользователь покинул клан`,
            })
                .setColor(colors.kicked);
        }
    }
    client.getCachedTextChannel(ids.clanChnId).send({ embeds: [embed] });
}