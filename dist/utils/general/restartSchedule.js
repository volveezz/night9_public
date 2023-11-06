import { schedule } from "node-cron";
schedule("57 10 * * *", () => {
    console.debug("Restarting");
    process.exit(1);
}, {
    timezone: "GMT",
});
//# sourceMappingURL=restartSchedule.js.map