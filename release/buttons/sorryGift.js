export default {
    name: "sorryGift",
    run: async ({ interaction }) => {
        return interaction.reply({ content: "Время этой акции истекло", ephemeral: true });
    },
};
