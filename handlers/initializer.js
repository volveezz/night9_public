export default async (client, commandDir, featuresDir, eventsDir) => {
    const { default: commandHandler } = await import("./command-handler.js");
    commandHandler(client, commandDir, eventsDir);
    const { default: logger } = await import("./logger.js");
    const { default: featurueHandler } = await import("./feauture-init.js");
    const { default: cacheMachine } = await import("./cacheMachine.js");
    await import("./sequelize.js");
    await import("./manifestHandler.js");
    logger(client);
    featurueHandler(client, featuresDir);
    cacheMachine(client);
    import("./messageHandler.js");
};
