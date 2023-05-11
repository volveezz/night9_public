import { ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { AdminDMChannelButtons } from "../../configs/Buttons.js";
import colors from "../../configs/colors.js";
import { channelIds, ownerId } from "../../configs/ids.js";
import { statusRoles } from "../../configs/roles.js";
import { client } from "../../index.js";
import setMemberRoles from "../discord/setRoles.js";
import { addButtonComponentsToMessage } from "../general/addButtonsToMessage.js";
import { escapeString } from "../general/utilities.js";
export async function sendDmLogMessage(member, text, id, interaction) {
    const dmLogChannel = interaction ? null : client.getCachedTextChannel(channelIds.directMessages);
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Отправлено сообщение")
        .setAuthor({
        name: `Отправлено: ${member.displayName || member.user.username}${member.user.username !== member.displayName ? ` (${member.user.username})` : ""}`,
        iconURL: member.displayAvatarURL(),
    })
        .setDescription(text || "nothing")
        .setFooter({ text: `UId: ${member.id} | MId: ${id}` });
    const components = [
        new ButtonBuilder().setCustomId(AdminDMChannelButtons.reply).setLabel("Ответить").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(AdminDMChannelButtons.delete).setLabel("Удалить сообщение").setStyle(ButtonStyle.Danger),
    ];
    const payload = {
        embeds: [embed],
        components: await addButtonComponentsToMessage(components),
    };
    interaction ? interaction.editReply(payload) : dmLogChannel.send(payload);
}
export async function logUserRegistrationAttempt(state, user, isNewUser) {
    const embed = new EmbedBuilder()
        .setColor(colors.serious)
        .setAuthor({
        name: `${user.username} начал регистрацию`,
        iconURL: user.displayAvatarURL(),
    })
        .addFields([
        { name: "Пользователь", value: `<@${user.id}>`, inline: true },
        { name: "State", value: `${state}`, inline: true },
        { name: "Впервые", value: `${isNewUser}`, inline: true },
    ]);
    await (await client.getAsyncTextChannel(channelIds.bot)).send({ embeds: [embed] });
}
export async function updateClanRolesWithLogging(result, join) {
    const member = await client.getAsyncMember(result.discordId);
    const embed = new EmbedBuilder().addFields([
        { name: "Пользователь", value: `<@${result.discordId}>`, inline: true },
        { name: "BungieId", value: result.bungieId, inline: true },
        { name: "Ник в игре", value: `${escapeString(result.displayName)}`, inline: true },
    ]);
    if (member) {
        if (join) {
            const givenRoles = [];
            if (!member.roles.cache.has(statusRoles.clanmember)) {
                givenRoles.push(statusRoles.clanmember);
            }
            if (!member.roles.cache.has(statusRoles.verified)) {
                givenRoles.push(statusRoles.verified);
            }
            if (givenRoles.length > 0) {
                await member.roles.add(givenRoles, "User joined clan");
            }
            if (member.roles.cache.hasAny(statusRoles.kicked, statusRoles.newbie, statusRoles.member)) {
                await member.roles.remove([statusRoles.kicked, statusRoles.newbie, statusRoles.member], "User joined clan");
            }
            embed
                .setAuthor({
                name: `${member.displayName} вступил в клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.success);
            notifyJoinedUser(member);
        }
        else {
            const setRoles = member.roles.cache.has(statusRoles.verified) ? [statusRoles.kicked, statusRoles.verified] : [statusRoles.kicked];
            await setMemberRoles({ member, roles: setRoles, reason: "Member left clan" });
            embed
                .setAuthor({
                name: `${member.displayName} покинул клан`,
                iconURL: member.displayAvatarURL(),
            })
                .setColor(colors.kicked);
        }
    }
    else {
        embed
            .setAuthor({
            name: join ? "Неизвестный на сервере пользователь вступил в клан" : "Неизвестный на сервере пользователь покинул клан",
        })
            .setColor(join ? colors.success : colors.kicked);
    }
    (await client.getAsyncTextChannel(channelIds.clan)).send({ embeds: [embed] });
}
async function notifyJoinedUser(member) {
    const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle("Вы были приняты в клан!")
        .setDescription(`Вы также получили все необходимые роли для доступа к каналам клана\n\nНа сервере разработано множество различных систем, команд и возможностей. При желании Вы можете ввести \`/\` и Discord вам предложит все слеш-команды сервера\nНа сервере есть несколько различных ботов и их команд, но клановыми являются 2: основной - Night 9, <@${client.user.id}> и музыкальный бот - Alfred Jodl, <@719262521768280074>\n\nПо любым вопросам **в любое время** пишите <@${ownerId}> в личные сообщения или <@${client.user.id}> в этом же чате`);
    await member.send({ embeds: [embed] });
}
