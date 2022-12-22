import { readdirSync } from "fs";
const getFiles = (dir, insideDir) => {
    const files = readdirSync(dir, {
        withFileTypes: true,
    });
    let jsFiles = [];
    for (const file of files) {
        if (file.isDirectory()) {
            jsFiles = [...jsFiles, ...getFiles(`${dir}/${file.name}`, `${file.name}/`)];
        }
        else if (file.name.endsWith(".js") && !file.name.startsWith("!")) {
            jsFiles.push((insideDir ?? "") + file.name);
        }
    }
    return jsFiles;
};
export default getFiles;
