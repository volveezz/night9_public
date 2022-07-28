"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const file_reader_1 = __importDefault(require("./file-reader"));
exports.default = (client, featuresDir) => {
    const files = (0, file_reader_1.default)(featuresDir);
    for (const command of files) {
        let { default: commandFile } = require(`../features/${command}`);
        try {
            commandFile(client);
        }
        catch (error) {
            console.log(`Feauture error:`, error);
        }
    }
};
