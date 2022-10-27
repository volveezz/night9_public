import { EmbedBuilder } from "discord.js";
import { classRoles, rActivity, rClanJoinDate, rStats, rTitles, rTrials, rTriumphs } from "../base/roles.js";
import { auth_data, role_data } from "../handlers/sequelize.js";
export default {
    callback: async (_client, interaction, member, _guild, _channel) => {
        if (interaction.isButton() && interaction.customId.startsWith("roleChannel")) {
            const commandFull = interaction.customId.split("_").slice(1);
            const commandId = commandFull.shift();
            switch (commandId) {
                case "classRoles": {
                    const className = commandFull.pop();
                    member.roles
                        .remove(classRoles
                        .filter((r) => r.className !== className)
                        .map((r) => {
                        return r.id;
                    }))
                        .then((_r) => {
                        if (className === "disable")
                            return;
                        setTimeout(() => {
                            member.roles.add(classRoles.find((r) => r.className === className).id);
                        }, 1500);
                    });
                    const embed = new EmbedBuilder()
                        .setColor("Green")
                        .setTitle(className === "disable"
                        ? "Вы отключили основной класс"
                        : `Вы установили ${className === "hunter"
                            ? "<:hunter:995496474978824202>Охотника"
                            : className === "warlock"
                                ? "<:warlock:995496471526920232>Варлока"
                                : "<:titan:995496472722284596>Титана"} как основной класс`);
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
                default:
                    {
                        const categoryId = String(Number(commandFull.pop()) + 1);
                        auth_data.sequelize
                            ?.query(`UPDATE auth_data SET roles_cat[${categoryId}]=NOT roles_cat[${categoryId}] WHERE discord_id=${interaction.user.id} RETURNING roles_cat`)
                            .then(async (d) => {
                            const changedRows = d[1].rows[0].roles_cat.map((b) => {
                                return b === false ? "<:crossmark:1020504750350934026>" : "<:successCheckmark:1018320951173189743>";
                            });
                            const embed = new EmbedBuilder()
                                .setColor("Green")
                                .setTitle(`Вы ${d[1].rows[0].roles_cat[Number(categoryId) - 1] ? "включили" : "отключили"} роли за ${categoryId === "1"
                                ? "общую статистику"
                                : categoryId === "2"
                                    ? "статистику Испытаний Осириса"
                                    : categoryId === "3"
                                        ? "титулы"
                                        : categoryId === "4"
                                            ? "триумфы"
                                            : "активность на сервере"}`)
                                .setDescription(`<:dot:1018321568218226788>Общая статистика - ${changedRows[0]}\n<:dot:1018321568218226788>Статистика Испытаний Осириса - ${changedRows[1]}\n<:dot:1018321568218226788>Титулы - ${changedRows[2]}\n<:dot:1018321568218226788>Триумфы - ${changedRows[3]}\n<:dot:1018321568218226788>Активность на сервере - ${changedRows[4]}`);
                            interaction.reply({ embeds: [embed], ephemeral: true });
                            if (d[1].rows[0].roles_cat[Number(categoryId) - 1] === true)
                                return;
                            let removedRoles = [];
                            switch (Number(categoryId) - 1) {
                                case 0:
                                    removedRoles.push(rStats.category);
                                    member.roles.remove(removedRoles.concat(rStats.allActive, rStats.allKd, removedRoles));
                                    break;
                                case 1:
                                    removedRoles.push(rTrials.category, rTrials.wintrader);
                                    member.roles.remove(removedRoles.concat(rTrials.allKd, rTrials.allRoles, removedRoles));
                                    break;
                                case 2:
                                    const allTitlesRoles = await role_data.findAll({ where: { category: 3 } });
                                    removedRoles.push(rTitles.category);
                                    allTitlesRoles.forEach((r) => {
                                        removedRoles.push(r.role_id);
                                        r.guilded_roles && r.guilded_roles.length > 0 ? (removedRoles = removedRoles.concat(r.guilded_roles)) : [];
                                    });
                                    member.roles.remove(removedRoles.filter((r) => r !== null));
                                    break;
                                case 3:
                                    const allTriumphsRoles = await role_data.findAll({ where: { category: 4 } });
                                    removedRoles.push(rTriumphs.category);
                                    allTriumphsRoles.forEach((r) => {
                                        removedRoles.push(r.role_id);
                                        r.guilded_roles && r.guilded_roles.length > 0 ? (removedRoles = removedRoles.concat(r.guilded_roles)) : [];
                                    });
                                    member.roles.remove(removedRoles.concat(rClanJoinDate.allRoles));
                                    break;
                                case 4:
                                    removedRoles.push(rActivity.category);
                                    member.roles.remove(removedRoles.concat(rActivity.allMessages, rActivity.allVoice, removedRoles));
                                    break;
                            }
                        });
                    }
                    break;
            }
        }
    },
};
