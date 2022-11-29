import { guildId } from "../base/ids.js";
import { getFiles } from "./file-reader.js";
export default async (client, featuresDir) => {
    if (guildId === "1007814171267707001")
        return;
    const files = getFiles(featuresDir);
    for (const command of files) {
        let { default: commandFile } = await import(`../features/${command}`);
        try {
            commandFile(client);
        }
        catch (error) {
            console.error(`[Error code: 1043] Feauture error:`, error);
        }
    }
};
