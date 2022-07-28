"use strict";
const fs_1 = require("fs");
const getFiles = (dir) => {
    const files = (0, fs_1.readdirSync)(dir, {
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
module.exports = getFiles;
