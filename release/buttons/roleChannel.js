import { EmbedBuilder } from "discord.js";
import colors from "../configs/colors.js";
import { guildId } from "../configs/ids.js";
import { activityRoles, classRoles, statisticsRoles, titleCategory, trialsRoles, triumphsCategory } from "../configs/roles.js";
import { AuthData } from "../handlers/sequelize.js";
export default {
    name: "roleChannel",
    run: async ({ client, interaction }) => {
        const defferedReply = interaction.deferReply({ ephemeral: true });
        const commandFull = interaction.customId.split("_").slice(1);
        const commandId = commandFull.shift();
        const member = (interaction.member ? interaction.member : client.guilds.cache.get(guildId)?.members.cache.get(interaction.user.id));
        const guild = interaction.guild;
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
                await defferedReply;
                return interaction.editReply({ embeds: [embed] });
            }
            default:
                {
                    const categoryId = Number(commandFull.pop());
                    const roleStatus = commandFull.pop() === "enable";
                    const dbRow = await AuthData.findOne({ where: { discordId: interaction.user.id }, attributes: ["roleCategoriesBits"] });
                    if (!dbRow)
                        throw {
                            name: "Ошибка. Вы не зарегистрированы",
                            description: "Возможность управления категориями доступна только после регистрации",
                        };
                    let { roleCategoriesBits } = dbRow;
                    const embed = new EmbedBuilder().setColor(colors.default);
                    if ((!(roleCategoriesBits & categoryId) && roleStatus) || (roleCategoriesBits & categoryId && !roleStatus)) {
                        const updated = await AuthData.update({ roleCategoriesBits: roleStatus ? roleCategoriesBits | categoryId : roleCategoriesBits & ~categoryId }, { where: { discordId: interaction.user.id }, returning: ["roleCategoriesBits"] });
                        roleCategoriesBits = updated[1][0].roleCategoriesBits;
                        const messageEmbed = embedPrep().setTitle(`Вы ${roleStatus ? "включили" : "отключили"} категорию`);
                        defferedReply.then((v) => interaction.editReply({ embeds: [messageEmbed] }));
                    }
                    else {
                        const messageEmbed = embedPrep().setTitle(`Категория уже ${roleStatus ? "включена" : "отключена"}`);
                        defferedReply.then((v) => interaction.editReply({ embeds: [messageEmbed] }));
                    }
                    function embedPrep() {
                        const categoryChecker = (categoryId) => {
                            return (roleCategoriesBits & categoryId) === 0
                                ? "<:crossmark:1020504750350934026>"
                                : "<:successCheckmark:1018320951173189743>";
                        };
                        return embed.setDescription(`<:dot:1018321568218226788>**Общая статистика** — ${categoryChecker(1)}\n<:dot:1018321568218226788>**Статистика Испытаний Осириса** — ${categoryChecker(2)}\n<:dot:1018321568218226788>**Титулы** — ${categoryChecker(4)}\n<:dot:1018321568218226788>**Триумфы** — ${categoryChecker(8)}\n<:dot:1018321568218226788>**Активность на сервере** — ${categoryChecker(16)}`);
                    }
                    if (roleStatus)
                        return;
                    switch (categoryId) {
                        case 1: {
                            member.roles.remove([...statisticsRoles.allActive, ...statisticsRoles.allKd, statisticsRoles.category]);
                            return;
                        }
                        case 2: {
                            member.roles.remove([...trialsRoles.allKd, ...trialsRoles.allRoles, trialsRoles.category, trialsRoles.wintrader]);
                            return;
                        }
                        case 4: {
                            const topPos = guild.roles.cache.find((r) => r.id === titleCategory).position;
                            const botPos = guild.roles.cache.find((r) => r.id === triumphsCategory).position;
                            member.roles.remove(guild.roles.cache.filter((r) => r.position > botPos && r.position <= topPos));
                            return;
                        }
                        case 8: {
                            const topPos = guild.roles.cache.find((r) => r.id === triumphsCategory).position;
                            const botPos = guild.roles.cache.find((r) => r.id === activityRoles.category).position;
                            member.roles.remove(guild.roles.cache.filter((r) => r.position > botPos && r.position <= topPos));
                            return;
                        }
                        case 16: {
                            member.roles.remove([...activityRoles.allMessages, ...activityRoles.allVoice, activityRoles.category]);
                            return;
                        }
                    }
                }
                return;
        }
    },
};
