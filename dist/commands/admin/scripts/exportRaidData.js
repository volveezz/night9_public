import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import fs from "fs";
import colors from "../../../configs/colors.js";
import raidGuide from "../../../configs/raidGuideData.js";
async function exportCodeToFile(interaction, defferedReply) {
    fs.writeFileSync("exportedCode.js", JSON.stringify(raidGuide));
    const attachment = new AttachmentBuilder("./exportedCode.js");
    const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Raid guide was exported!");
    await defferedReply;
    interaction.editReply({ embeds: [embed], files: [attachment] });
}
export default exportCodeToFile;
//# sourceMappingURL=exportRaidData.js.map