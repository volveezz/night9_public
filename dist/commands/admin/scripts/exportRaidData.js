import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import fs from "fs";
import colors from "../../../configs/colors.js";
import raidGuide from "../../../configs/raidGuideData.js";
import { client } from "../../../index.js";
let storageChannel = null;
async function exportRaidGuide(interaction, deferredReply) {
    fs.writeFileSync("exported-raids-guides.js", JSON.stringify(raidGuide));
    const attachment = new AttachmentBuilder("./exported-raids-guides.js");
    const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Raid guide was exported!");
    if (interaction) {
        await deferredReply;
        interaction.editReply({ embeds: [embed], files: [attachment] });
    }
    else {
        if (!storageChannel)
            storageChannel = await client.getAsyncTextChannel(process.env.STORAGE_CHANNEL_ID);
        await storageChannel.send({ embeds: [embed], files: [attachment] });
    }
}
export default exportRaidGuide;
//# sourceMappingURL=exportRaidData.js.map