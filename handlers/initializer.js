"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (client, commandDir, featuresDir, eventsDir) => {
    const { default: logger } = require("./logger");
    const { default: commandHandler } = require("./command-handler");
    const { default: featurueHandler } = require("./feauture-init");
    const { default: cacheMachine } = require("./cacheMachine");
    require("./sequelize");
    require("./manifestHandler");
    logger(client);
    commandHandler(client, commandDir, eventsDir);
    featurueHandler(client, featuresDir);
    cacheMachine(client);
};
