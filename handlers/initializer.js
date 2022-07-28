"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (client, commandDir, featuresDir) => {
    const { default: logger, chnSetup } = require("./logger");
    const { default: commandHandler } = require("./command-init");
    const { default: featurueHandler } = require("./feauture-init");
    const { default: cacheMachine } = require("./cacheMachine");
    require("./sequelize");
    require("./manifestHandler");
    chnSetup(client);
    logger(client);
    commandHandler(client, commandDir);
    featurueHandler(client, featuresDir);
    cacheMachine(client);
};
