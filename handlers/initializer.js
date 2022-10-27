export default async (client, commandDir, featuresDir, eventsDir) => {
    const { default: logger } = await import("./logger.js");
    const { default: commandHandler } = await import("./command-handler.js");
    const { default: featurueHandler } = await import("./feauture-init.js");
    const { default: cacheMachine } = await import("./cacheMachine.js");
    await import("./sequelize.js");
    await import("./manifestHandler.js");
    logger(client);
    commandHandler(client, commandDir, eventsDir);
    featurueHandler(client, featuresDir);
    cacheMachine(client);
};
