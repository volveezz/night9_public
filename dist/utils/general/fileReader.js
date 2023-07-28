import { readdirSync } from "fs";
const extension = process.env.NODE_ENV === "development" && process.env.LOCAL_ENV === "true" ? ".ts" : ".js";
const getFiles = async (dir, insideDir) => {
    const files = readdirSync(dir, {
        withFileTypes: true,
    });
    let jsFiles = [];
    const directoryPath = insideDir ? insideDir : "";
    let mainFileExists = files.some((file) => file.name === `main${extension}`);
    for (const file of files) {
        if (file.isDirectory()) {
            jsFiles = [...jsFiles, ...(await getFiles(`${dir}${file.name}/`, `${directoryPath}${file.name}/`))];
        }
        else if (file.name.endsWith(extension)) {
            if (mainFileExists) {
                if (file.name === `main${extension}`) {
                    jsFiles.push(directoryPath + file.name);
                }
            }
            else {
                jsFiles.push(directoryPath + file.name);
            }
        }
    }
    return jsFiles;
};
export default getFiles;
//# sourceMappingURL=fileReader.js.map