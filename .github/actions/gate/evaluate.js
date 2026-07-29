const fs = require("node:fs");

function parseMultiline(value) {
    return value
        .split('\n')
        .map(x => x.trim())
        .filter(Boolean);
}

function isFeatureBranch(branch) {
    return /^feature\/.+/.test(branch);
}

const runsForInput = parseMultiline(process.env.TARGET || "");
const forceLabelsInput = parseMultiline(process.env.FORCE_LABELS || "");

const eventName = process.env.EVENT_NAME;
const refName = process.env.REF_NAME;
const baseRef = process.env.BASE_REF;

const target = {};
const forceLabels = {};

target["main"] = false;
target["feature"] = false;
target["task"] = false;

if (refName === "main") {
    target["main"] = true;
}

if (isFeatureBranch(refName)) {
    target["feature"] = true;
}

if (
    eventName === "pull_request" &&
    (baseRef === "main" || isFeatureBranch(baseRef))
) {
    target["task"] = true;
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

    const prRefName = payload.pull_request?.head?.ref;
    
    if (isFeatureBranch(prRefName)) {
        target["feature"] = true;
    }
}

let branchCondition = false;

for (const entry of runsForInput) {
    if (target[entry]) {
        branchCondition = true;
        break;
    }
}

const shouldRun = branchCondition || labelCondition;

console.log(`should-run=${shouldRun}`);
console.log(`target=${JSON.stringify(target)}`);
console.log(`force-labels=${JSON.stringify(forceLabels)}`);
