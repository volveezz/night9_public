import CloudConvert from "cloudconvert";
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_KEY);
async function convertMp4ToGif(inputUrl) {
    const job = await cloudConvert.jobs.create({
        tasks: {
            "import-my-file": {
                operation: "import/url",
                url: inputUrl,
            },
            "convert-my-file": {
                operation: "convert",
                input: "import-my-file",
                output_format: "gif",
                input_format: "mp4",
                video_codec: "gif",
                fps: 20,
                width: 460,
            },
            "export-my-file": {
                operation: "export/url",
                input: "convert-my-file",
            },
        },
    });
    const jobResult = await cloudConvert.jobs.wait(job.id);
    const exportTask = jobResult.tasks.filter((task) => task.operation === "export/url" && task.status === "finished")[0];
    return exportTask.result?.files?.[0]?.url;
}
export default convertMp4ToGif;
//# sourceMappingURL=mp4IntoGif.js.map