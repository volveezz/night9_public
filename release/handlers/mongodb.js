import mongoose from "mongoose";
mongoose.set("strictQuery", true);
const Schema = mongoose.Schema;
const answerSchema = new Schema({
    questionIndex: {
        type: Number,
        required: true,
    },
    answerIndex: {
        type: Number,
        required: true,
    },
    answerValue: {
        type: String,
    },
});
const surveyAnswerSchema = new Schema({
    discordId: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    answers: [answerSchema],
});
const surveyanswers = mongoose.model("surveyanswers", surveyAnswerSchema);
const connection = mongoose.connect(process.env.MONGO_URL, {
    minPoolSize: 10,
});
mongoose.connection.on("error", console.error.bind(console, "connection error:"));
export { connection as mongo, surveyanswers as SurveyAnswer, answerSchema as SurveyUserAnswerSchema };
