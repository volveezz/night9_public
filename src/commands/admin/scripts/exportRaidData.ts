import { AttachmentBuilder, CommandInteraction, EmbedBuilder, InteractionResponse, TextChannel } from "discord.js";
import fs from "fs";
import colors from "../../../configs/colors.js";
import raidGuide from "../../../configs/raidGuideData.js";
import { client } from "../../../index.js";

let storageChannel: TextChannel | null = null;

// Function to export code as a text file
async function exportRaidGuide(interaction?: CommandInteraction, deferredReply?: Promise<InteractionResponse<boolean>>) {
	fs.writeFileSync("exported-raids-guides.json", JSON.stringify(raidGuide));

	// Create a message attachment with the exported code file
	const attachment = new AttachmentBuilder("./exported-raids-guides.json");

	// Create an embed to go with the message
	const embed = new EmbedBuilder().setColor(colors.invisible).setTitle("Raid guide was exported!");

	// Reply to the user with the attachment and embed
	if (interaction) {
		await deferredReply;
		interaction.editReply({ embeds: [embed], files: [attachment] });
	} else {
		if (!storageChannel) storageChannel = await client.getTextChannel(process.env.STORAGE_CHANNEL_ID!);
		await storageChannel.send({ embeds: [embed], files: [attachment] });
	}
}

export default exportRaidGuide;
