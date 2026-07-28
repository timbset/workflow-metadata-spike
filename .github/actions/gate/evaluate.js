const fs = require("node:fs");

function parseMultiline(value) {
    return value
        .split("\n")
        .map(x => x.trim())
        .filter(Boolean);
}

function isFeatureBranch(branch) {
    return /^feature\/.+/.test(branch);
}

const runsForInput = parseMultiline(process.env.RUNS_FOR || "");
const forceLabelsInput = parseMultiline(process.env.FORCE_LABELS || "");

const eventName = process.env.EVENT_NAME;
const refName = process.env.REF_NAME;
const baseRef = process.env.BASE_REF;

const runsFor = {};
const forceLabels = {};

runsFor["main"] = false;
runsFor["feature"] = false;
runsFor["task"] = false;

if (refName === "main") {
    runsFor["main"] = true;
}

if (isFeatureBranch(refName)) {
    runsFor["feature"] = true;
}

if (
    eventName === "pull_request" &&
    (baseRef === "main" || isFeatureBranch(baseRef))
) {
    runsFor["task"] = true;
}

let branchCondition = false;

for (const entry of runsForInput) {
    if (runsFor[entry]) {
        branchCondition = true;
        break;
    }
}

let labelCondition = false;

for (const label of forceLabelsInput) {
    forceLabels[label] = false;
}

if (eventName === "pull_request" || eventName === "pull_request_target") {
    const payload = JSON.parse(
        fs.readFileSync(process.env.EVENT_PATH, "utf8")
    );

    const labels =
        payload.pull_request?.labels?.map(l => l.name) ?? [];

    for (const label of forceLabelsInput) {
        if (labels.includes(label)) {
            forceLabels[label] = true;
            labelCondition = true;
        }
    }
}

const shouldRun = branchCondition || labelCondition;

console.log(`shouldRun=${shouldRun}`);
console.log(`runsFor=${JSON.stringify(runsFor)}`);
console.log(`forceLabels=${JSON.stringify(forceLabels)}`);
