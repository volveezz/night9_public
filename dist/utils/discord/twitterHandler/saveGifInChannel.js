import fs from "fs";
import fetch from "node-fetch";
import stream from "stream";
import { promisify } from "util";
import { client } from "../../../index.js";
const textChannel = await client.getAsyncTextChannel(process.env.STORAGE_CHANNEL_ID);
async function downloadFile(url, fileName) {
    const response = await fetch(url);
    const fileStream = fs.createWriteStream(fileName);
    await promisify(stream.pipeline)(response.body, fileStream);
    return fileName;
}
async function sendFileToDiscord(filePath) {
    return await textChannel.send({
        files: [
            {
                attachment: filePath,
                name: "boosty.to_night9.gif",
            },
        ],
    });
}
async function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err)
            throw err;
    });
}
export async function processTwitterGifFile(url, message, embed) {
    try {
        const filePath = await downloadFile(url, message.id);
        const fileMessage = await sendFileToDiscord(filePath);
        const gifUrl = fileMessage.attachments.first().url;
        embed.setImage(gifUrl);
        message.edit({ embeds: [embed] });
        await deleteFile(filePath);
    }
    catch (err) {
        console.error(err);
    }
}
//# sourceMappingURL=saveGifInChannel.js.map