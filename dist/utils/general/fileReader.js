import { readdir } from "fs/promises";
const extension = process.env.NODE_ENV === "development" && process.env.LOCAL_ENV === "true" ? ".ts" : ".js";
const getFiles = async (dir, insideDir = "") => {
    try {
        const files = await readdir(dir, { withFileTypes: true });
        let mainFileExists = files.some((file) => file.name === `main${extension}`);
        const promises = files.map(async (file) => {
            const filePath = dir.endsWith("/") ? `${dir}${file.name}` : `${dir}/${file.name}`;
            const directoryPath = insideDir ? `${insideDir}${file.name}/` : file.name;
            if (file.isDirectory()) {
                return getFiles(`${filePath}/`, directoryPath);
            }
            else if (file.name.endsWith(extension)) {
                if (mainFileExists) {
                    if (file.name === `main${extension}`) {
                        return [filePath];
                    }
                    return [];
                }
                else {
                    return [filePath];
                }
            }
            return [];
        });
        const results = await Promise.all(promises);
        return results.flat();
    }
    catch (err) {
        console.error(`[Error code: 2061] Error reading directory ${dir}:`, err);
        return [];
    }
};
export default getFiles;
//# sourceMappingURL=fileReader.js.map