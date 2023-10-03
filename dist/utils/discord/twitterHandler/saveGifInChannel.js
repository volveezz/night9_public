import fs from "fs";
import fetch from "node-fetch";
import stream from "stream";
import { promisify } from "util";
import { client } from "../../../index.js";
let textChannel = null;
async function downloadFile(url, fileName) {
    const response = await fetch(url);
    const fileStream = fs.createWriteStream(fileName);
    await promisify(stream.pipeline)(response.body, fileStream);
    return fileName;
}
async function sendFileToDiscord(filePath, fileType = "gif") {
    if (!textChannel)
        textChannel = await client.getTextChannel(process.env.STORAGE_CHANNEL_ID);
    try {
        const message = await textChannel.send({
            files: [
                {
                    attachment: filePath,
                    name: `boosty.to_night9.${fileType}`,
                },
            ],
        });
        return message;
    }
    catch (error) {
        console.error("[Error code: 2005] Got error while sending file to discord", error);
        return;
    }
}
async function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("[Error code: 2075] Error upon file deletion");
            throw err;
        }
    });
}
export async function processTwitterGifFile(url, message, embed, fileType = "gif") {
    try {
        const filePath = await downloadFile(url, message.id);
        const fileMessage = await sendFileToDiscord(filePath, fileType);
        if (fileMessage) {
            const attachmentUrl = fileMessage.attachments.first().url;
            embed.setImage(attachmentUrl);
            message.edit({ embeds: [embed] });
        }
        await deleteFile(filePath);
    }
    catch (err) {
        console.error("[Error code: 2006]", err);
    }
}
//# sourceMappingURL=saveGifInChannel.js.map