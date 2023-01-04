import "dotenv/config";
const releaseStatusRoles = {
    clanmember: "677554696566734899",
    member: "678945074113019914",
    newbie: "696309469235380335",
    kicked: "724592037868863569",
    verified: "797468596498464808",
};
const releaseSeasonalRoles = { curSeasonRole: "938681964494454844", nonCurSeasonRole: "938682145923280947" };
const releaseDLCRoles = {
    vanilla: "938682627332919306",
    frs: "938682287929839656",
    sk: "938682322692231208",
    bl: "938682371992080384",
    anni: "938682432637521981",
    twq: "938682450098389053",
    lf: "1008002337622720523",
};
const releaseClassRoles = [
    { className: "hunter", id: "708383261163913218" },
    { className: "warlock", id: "708383326045601805" },
    { className: "titan", id: "708383397050974329" },
];
const releaseTriumphsCategory = "694117833650602004";
const releaseRaidRoles = {
    allRoles: ["791393286182535169", "694193991733739611", "695205572454252555", "744832404153172048"],
    roles: [
        { roleId: "791393286182535169", individualClears: 50, totalClears: 500 },
        { roleId: "694193991733739611", individualClears: 30, totalClears: 300 },
        { roleId: "695205572454252555", individualClears: 7, totalClears: 70 },
        { roleId: "744832404153172048", individualClears: 2, totalClears: 20 },
    ],
};
const releaseClanJoinDateRoles = {
    allRoles: [
        "1015833639101136936",
        "737249705922396270",
        "1015833273131343972",
        "720011638689890316",
        "720011719270727831",
        "720011931842248707",
        "945239463435599954",
    ],
    roles: [
        { roleId: "1015833639101136936", days: 1 * 365 * 3 },
        { roleId: "737249705922396270", days: 1 * 365 * 2 },
        { roleId: "1015833273131343972", days: 1 * 365 },
        { roleId: "720011638689890316", days: 1 * 189 },
        { roleId: "720011719270727831", days: 1 * 63 },
        { roleId: "720011931842248707", days: 1 * 21 },
        { roleId: "945239463435599954", days: 1 * 7 },
    ],
};
const releaseStatisticsRoles = {
    category: "744835253490941952",
    allActive: [
        "850783884341805126",
        "850782655602884628",
        "790529941107114014",
        "790530331181842432",
        "790529910405464074",
        "789925088114900992",
        "790528202686070795",
        "790529881171558432",
        "790529840913842246",
        "790529780008484884",
    ],
    active: [
        { roleId: "850783884341805126", triumphScore: 22500 },
        { roleId: "850782655602884628", triumphScore: 20000 },
        { roleId: "790529941107114014", triumphScore: 17500 },
        { roleId: "790530331181842432", triumphScore: 15000 },
        { roleId: "790529910405464074", triumphScore: 12500 },
        { roleId: "789925088114900992", triumphScore: 10000 },
        { roleId: "790528202686070795", triumphScore: 7500 },
        { roleId: "790529881171558432", triumphScore: 5000 },
        { roleId: "790529840913842246", triumphScore: 2500 },
        { roleId: "790529780008484884", triumphScore: 1000 },
    ],
    allKd: [
        "1006747462645588079",
        "744835877414633565",
        "744835836251471935",
        "744835785660039188",
        "744835746770452490",
        "744835705481592904",
        "744835657280651284",
        "744835610493321307",
        "744835441563533435",
        "804632530451824640",
        "1006749274652024872",
        "1060107270618349629",
    ],
    kd: [
        { roleId: "1006747462645588079", kd: 1.5 },
        { roleId: "744835877414633565", kd: 1.4 },
        { roleId: "744835836251471935", kd: 1.3 },
        { roleId: "744835785660039188", kd: 1.2 },
        { roleId: "744835746770452490", kd: 1.1 },
        { roleId: "744835705481592904", kd: 1.0 },
        { roleId: "744835657280651284", kd: 0.9 },
        { roleId: "744835610493321307", kd: 0.8 },
        { roleId: "744835441563533435", kd: 0.7 },
        { roleId: "804632530451824640", kd: 0.6 },
        { roleId: "1006749274652024872", kd: 0.5 },
        { roleId: "1060107270618349629", kd: 0 },
    ],
};
const releaseActivityRoles = {
    category: "713055691535024249",
    allVoice: ["1006749934395084820", "1006750189110960258", "1006750356182675527", "713054787389620245"],
    allMessages: ["1006751299393560687", "1006751293857071185", "1006751278912766103", "713055203682943007"],
    voice: [
        { roleId: "1006749934395084820", voiceMinutes: 60 * 60 * 20 },
        { roleId: "1006750189110960258", voiceMinutes: 60 * 60 * 10 },
        { roleId: "1006750356182675527", voiceMinutes: 60 * 60 * 3 },
        { roleId: "713054787389620245", voiceMinutes: 60 * 60 * 1 },
    ],
    messages: [
        { roleId: "1006751299393560687", messageCount: 300 },
        { roleId: "1006751293857071185", messageCount: 150 },
        { roleId: "1006751278912766103", messageCount: 50 },
        { roleId: "713055203682943007", messageCount: 5 },
    ],
};
const releaseTitleCategory = "694116514881601537";
const releaseTrialsRoles = {
    allRoles: [
        "804998006054453248",
        "804997990334595122",
        "1006754324321411072",
        "804997973951250442",
        "804997951347753012",
        "804997935397601281",
        "804997869223280651",
    ],
    category: "744846971029684265",
    roles: [
        { roleId: "804998006054453248", totalFlawless: 50 },
        { roleId: "804997990334595122", totalFlawless: 25 },
        { roleId: "1006754324321411072", totalFlawless: 15 },
        { roleId: "804997973951250442", totalFlawless: 10 },
        { roleId: "804997951347753012", totalFlawless: 5 },
        { roleId: "804997935397601281", totalFlawless: 3 },
        { roleId: "804997869223280651", totalFlawless: 1 },
    ],
    allKd: [
        "805000272761716746",
        "805000253556260876",
        "805000235368841216",
        "805000219179089940",
        "805000194365718529",
        "805000177050976276",
        "805000117467086858",
        "960079354522660904",
        "1015812096069472367",
    ],
    kd: [
        { roleId: "805000272761716746", kd: 1.4 },
        { roleId: "805000253556260876", kd: 1.3 },
        { roleId: "805000235368841216", kd: 1.2 },
        { roleId: "805000219179089940", kd: 1.1 },
        { roleId: "805000194365718529", kd: 1.0 },
        { roleId: "805000177050976276", kd: 0.9 },
        { roleId: "805000117467086858", kd: 0.8 },
        { roleId: "960079354522660904", kd: 0.7 },
        { roleId: "1015812096069472367", kd: 0 },
    ],
    wintrader: "805003682361245697",
};
const devStatusRoles = {
    clanmember: "1007814171586474048",
    member: "1007814171586474044",
    newbie: "1007814171569688595",
    kicked: "1007814171569688594",
    verified: "1007814171586474046",
};
const devSeasonalRoles = { curSeasonRole: "1007814171569688589", nonCurSeasonRole: "1007814171569688588" };
const devDLCRoles = {
    vanilla: "1007814171552907331",
    frs: "1007814171569688587",
    sk: "1007814171569688586",
    bl: "1007814171552907334",
    anni: "1007814171552907333",
    twq: "1007814171552907332",
    lf: "1007814171552907332",
};
const devClassRoles = [
    { className: "hunter", id: "708383261163913218" },
    { className: "warlock", id: "708383326045601805" },
    { className: "titan", id: "708383397050974329" },
];
const devrTriumphsCategory = "1007814171326435417";
const devRaidRoles = {
    allRoles: ["1007814171586474052", "1007814171586474051", "1007814171586474050", "1007814171586474049"],
    roles: [
        { roleId: "1007814171586474052", individualClears: 50, totalClears: 500 },
        { roleId: "1007814171586474051", individualClears: 30, totalClears: 300 },
        { roleId: "1007814171586474050", individualClears: 7, totalClears: 70 },
        { roleId: "1007814171586474049", individualClears: 2, totalClears: 20 },
    ],
};
const devClanJoinDateRoles = {
    allRoles: [
        "1015833639101136936",
        "737249705922396270",
        "1015833273131343972",
        "720011638689890316",
        "720011719270727831",
        "720011931842248707",
        "945239463435599954",
    ],
    roles: [
        { roleId: "1015833639101136936", days: 1 * 365 * 3 },
        { roleId: "737249705922396270", days: 1 * 365 * 2 },
        { roleId: "1015833273131343972", days: 1 * 365 },
        { roleId: "720011638689890316", days: 1 * 189 },
        { roleId: "720011719270727831", days: 1 * 63 },
        { roleId: "720011931842248707", days: 1 * 21 },
        { roleId: "945239463435599954", days: 1 * 7 },
    ],
};
const devStatisticsRoles = {
    category: "1007814171552907330",
    allActive: [
        "1007814171527749735",
        "1007814171527749734",
        "1007814171527749734",
        "1007814171527749732",
        "1007814171502579744",
        "1007814171502579743",
        "1007814171502579742",
        "1007814171502579741",
        "1007814171502579740",
        "1007814171502579739",
    ],
    active: [
        { roleId: "1007814171527749735", triumphScore: 22500 },
        { roleId: "1007814171527749734", triumphScore: 20000 },
        { roleId: "1007814171527749734", triumphScore: 17500 },
        { roleId: "1007814171527749732", triumphScore: 15000 },
        { roleId: "1007814171502579744", triumphScore: 12500 },
        { roleId: "1007814171502579743", triumphScore: 10000 },
        { roleId: "1007814171502579742", triumphScore: 7500 },
        { roleId: "1007814171502579741", triumphScore: 5000 },
        { roleId: "1007814171502579740", triumphScore: 2500 },
        { roleId: "1007814171502579739", triumphScore: 1000 },
    ],
    allKd: [
        "1007814171552907329",
        "1007814171552907328",
        "1007814171552907327",
        "1007814171552907326",
        "1007814171552907325",
        "1007814171527749741",
        "1007814171527749740",
        "1007814171527749739",
        "1007814171527749738",
        "1007814171527749737",
        "1007814171527749736",
    ],
    kd: [
        { roleId: "1007814171552907329", kd: 1.5 },
        { roleId: "1007814171552907328", kd: 1.4 },
        { roleId: "1007814171552907327", kd: 1.3 },
        { roleId: "1007814171552907326", kd: 1.2 },
        { roleId: "1007814171552907325", kd: 1.1 },
        { roleId: "1007814171527749741", kd: 1.0 },
        { roleId: "1007814171527749740", kd: 0.9 },
        { roleId: "1007814171527749739", kd: 0.8 },
        { roleId: "1007814171527749738", kd: 0.7 },
        { roleId: "1007814171527749737", kd: 0.6 },
        { roleId: "1007814171527749736", kd: 0.5 },
    ],
};
const devActivityRoles = {
    allVoice: ["1007814171301265560", "1007814171267707010", "1007814171267707009", "1007814171267707008"],
    allMessages: ["1007814171267707007", "1007814171267707006", "1007814171267707005", "1007814171267707004"],
    category: "1007814171301265561",
    voice: [
        { roleId: "1007814171301265560", voiceMinutes: 60 * 1000 },
        { roleId: "1007814171267707010", voiceMinutes: 60 * 300 },
        { roleId: "1007814171267707009", voiceMinutes: 60 * 60 },
        { roleId: "1007814171267707008", voiceMinutes: 60 * 1 },
    ],
    messages: [
        { roleId: "1007814171267707007", messageCount: 300 },
        { roleId: "1007814171267707006", messageCount: 150 },
        { roleId: "1007814171267707005", messageCount: 30 },
        { roleId: "1007814171267707004", messageCount: 1 },
    ],
};
const devTitleCategory = "1007814171443867685";
const devTrialsRoles = {
    category: "1007814171502579738",
    allRoles: [
        "1007814171473231956",
        "1007814171473231955",
        "1007814171473231954",
        "1007814171473231953",
        "1007814171443867688",
        "1007814171443867687",
        "1007814171443867686",
    ],
    roles: [
        { roleId: "1007814171473231956", totalFlawless: 50 },
        { roleId: "1007814171473231955", totalFlawless: 25 },
        { roleId: "1007814171473231954", totalFlawless: 15 },
        { roleId: "1007814171473231953", totalFlawless: 10 },
        { roleId: "1007814171443867688", totalFlawless: 5 },
        { roleId: "1007814171443867687", totalFlawless: 3 },
        { roleId: "1007814171443867686", totalFlawless: 1 },
    ],
    allKd: [
        "1007814171502579737",
        "1007814171502579736",
        "1007814171502579735",
        "1007814171473231962",
        "1007814171473231961",
        "1007814171473231960",
        "1007814171473231959",
        "1007814171473231958",
    ],
    kd: [
        { roleId: "1007814171502579737", kd: 1.4 },
        { roleId: "1007814171502579736", kd: 1.3 },
        { roleId: "1007814171502579735", kd: 1.2 },
        { roleId: "1007814171473231962", kd: 1.1 },
        { roleId: "1007814171473231961", kd: 1.0 },
        { roleId: "1007814171473231960", kd: 0.9 },
        { roleId: "1007814171473231959", kd: 0.8 },
        { roleId: "1007814171473231958", kd: 0.7 },
    ],
    wintrader: "1007814171473231957",
};
export const statusRoles = process.env.DEV_BUILD !== "dev" ? releaseStatusRoles : devStatusRoles;
export const seasonalRoles = process.env.DEV_BUILD !== "dev" ? releaseSeasonalRoles : devSeasonalRoles;
export const dlcRoles = process.env.DEV_BUILD !== "dev" ? releaseDLCRoles : devDLCRoles;
export const classRoles = process.env.DEV_BUILD !== "dev" ? releaseClassRoles : devClassRoles;
export const triumphsCategory = process.env.DEV_BUILD !== "dev" ? releaseTriumphsCategory : devrTriumphsCategory;
export const raidRoles = process.env.DEV_BUILD !== "dev" ? releaseRaidRoles : devRaidRoles;
export const clanJoinDateRoles = process.env.DEV_BUILD !== "dev" ? releaseClanJoinDateRoles : devClanJoinDateRoles;
export const statisticsRoles = process.env.DEV_BUILD !== "dev" ? releaseStatisticsRoles : devStatisticsRoles;
export const activityRoles = process.env.DEV_BUILD !== "dev" ? releaseActivityRoles : devActivityRoles;
export const titleCategory = process.env.DEV_BUILD !== "dev" ? releaseTitleCategory : devTitleCategory;
export const trialsRoles = process.env.DEV_BUILD !== "dev" ? releaseTrialsRoles : devTrialsRoles;
