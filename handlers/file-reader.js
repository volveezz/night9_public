import { readdirSync } from "fs";
export const getFiles = (dir) => {
    const files = readdirSync(dir, {
        withFileTypes: true,
    });
    let jsFiles = [];
    for (const file of files) {
        if (file.isDirectory()) {
            jsFiles = getFiles(`${dir}/${file.name}`);
        }
        else if (file.name.endsWith(".js")) {
            jsFiles.push(file.name);
        }
    }
    return jsFiles;
};
