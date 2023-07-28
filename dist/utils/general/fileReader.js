import { readdirSync } from "fs";
const extension = process.env.NODE_ENV === "development" && process.env.LOCAL_ENV === "true" ? ".ts" : ".js";
const getFiles = async (dir, insideDir, subdirectory = false) => {
    const files = readdirSync(dir, {
        withFileTypes: true,
    });
    let jsFiles = [];
    for (const file of files) {
        if (file.isDirectory()) {
            const insideDirV = `${insideDir ? insideDir : ""}${file.name}`;
            jsFiles = [...jsFiles, ...(await getFiles(`${dir}${file.name}`, insideDirV, true))];
        }
        else if (file.name.endsWith(extension)) {
            if (insideDir && !subdirectory && file.name !== `main${extension}`) {
                continue;
            }
            jsFiles.push((insideDir ? `${insideDir}/` : "") + file.name);
        }
    }
    return jsFiles;
};
export default getFiles;
//# sourceMappingURL=fileReader.js.map