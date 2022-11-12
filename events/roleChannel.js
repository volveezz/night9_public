import { EmbedBuilder } from "discord.js";
import { colors } from "../base/colors.js";
import { classRoles, rActivity, rStats, rTitles, rTrials, rTriumphs } from "../base/roles.js";
import { auth_data } from "../handlers/sequelize.js";
export default {
    callback: async (_client, interaction, member, guild, _channel) => {
        const defferedReply = interaction.deferReply({ ephemeral: true });
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
                    const categoryId = Number(commandFull.pop());
                    const roleStatus = commandFull.pop() === "enable";
                    const dbRow = await auth_data.findOne({ where: { discord_id: interaction.user.id }, attributes: ["roles_cat"] });
                    if (!dbRow)
                        throw { name: "Ошибка. Вы не зарегистрированы", message: "Возможность управления категориями доступна только после регистрации" };
                    var { roles_cat } = dbRow;
                    const embed = new EmbedBuilder().setColor(colors.default);
                    if ((!(roles_cat & categoryId) && roleStatus) || (roles_cat & categoryId && !roleStatus)) {
                        const updated = await auth_data.update({ roles_cat: roleStatus ? roles_cat | categoryId : roles_cat & ~categoryId }, { where: { discord_id: interaction.user.id }, returning: ["roles_cat"] });
                        roles_cat = updated[1][0].roles_cat;
                        const messageEmbed = embedPrep().setTitle(`Вы ${roleStatus ? "включили" : "отключили"} категорию`);
                        defferedReply.then((v) => interaction.editReply({ embeds: [messageEmbed] }));
                    }
                    else {
                        const messageEmbed = embedPrep().setTitle(`Категория уже ${roleStatus ? "включена" : "отключена"}`);
                        defferedReply.then((v) => interaction.editReply({ embeds: [messageEmbed] }));
                    }
                    function embedPrep() {
                        const categoryChecker = (categoryId) => {
                            return (roles_cat & categoryId) === 0 ? "<:crossmark:1020504750350934026>" : "<:successCheckmark:1018320951173189743>";
                        };
                        return embed.setDescription(`<:dot:1018321568218226788>**Общая статистика** — ${categoryChecker(1)}\n<:dot:1018321568218226788>**Статистика Испытаний Осириса** — ${categoryChecker(2)}\n<:dot:1018321568218226788>**Титулы** — ${categoryChecker(4)}\n<:dot:1018321568218226788>**Триумфы** — ${categoryChecker(8)}\n<:dot:1018321568218226788>**Активность на сервере** — ${categoryChecker(16)}`);
                    }
                    if (roleStatus)
                        return;
                    switch (categoryId) {
                        case 1: {
                            member.roles.remove([...rStats.allActive, ...rStats.allKd, rStats.category]);
                            return;
                        }
                        case 2: {
                            member.roles.remove([...rTrials.allKd, ...rTrials.allRoles, rTrials.category, rTrials.wintrader]);
                            return;
                        }
                        case 4: {
                            const topPos = guild.roles.cache.find((r) => r.id === rTitles.category).position;
                            const botPos = guild.roles.cache.find((r) => r.id === rTriumphs.category).position;
                            member.roles.remove(guild.roles.cache.filter((r) => r.position > botPos && r.position <= topPos));
                            return;
                        }
                        case 8: {
                            const topPos = guild.roles.cache.find((r) => r.id === rTriumphs.category).position;
                            const botPos = guild.roles.cache.find((r) => r.id === rActivity.category).position;
                            member.roles.remove(guild.roles.cache.filter((r) => r.position > botPos && r.position <= topPos));
                            return;
                        }
                        case 16: {
                            member.roles.remove([...rActivity.allMessages, ...rActivity.allVoice, rActivity.category]);
                            return;
                        }
                    }
                }
                return;
        }
    },
};
