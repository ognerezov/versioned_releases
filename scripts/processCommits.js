const fs = require("fs/promises");
const { exec } = require('child_process');

async function fetchPR(commits){
    if(!commits?.length){
        return ""
    }

    return  await Promise.all(commits.map(commit =>
        new Promise(function (resolve, reject){
            exec(`gh pr list --search "${commit}" --state merged --json=title`,
                (error, stdout, _) => {
                    if (error !== null) {
                        console.log(`exec error: ${error}`);
                        reject(error)
                    }
                    let PRs = []
                    try{
                        PRs = stdout ? JSON.parse(stdout) : []
                    }catch (e) {
                        reject(e)
                    }
                    resolve({
                        titles : PRs.map(pr => pr.title),
                        commit
                    })
                });
        })))
}

async function fetchBranches(commits){
    if(!commits?.length){
        return ""
    }

    return  await Promise.all(commits.map(commit =>
        new Promise(function (resolve, reject){
            exec(`git name-rev ${commit}`,
                (error, stdout, _) => {
                    if (error !== null) {
                        console.log(`exec error: ${error}`);
                        reject(error)
                    }
                    let branch = ""
                    try{
                        const data = stdout ? stdout.split(" ") : ["", ""]
                        const fullPath = data.length > 1 ? data[1].trim() : ""
                        const path = fullPath.split("/")
                        const raw = path.length > 2 ? path[2] : fullPath
                        branch = raw.split("~")[0]
                    }catch (e) {
                        reject(e)
                    }
                    resolve({
                        branch,
                        commit
                    })
                });
        })))
}

async function process() {
    try {
        const data = await fs.readFile('./change_log/commits.txt', { encoding: 'utf8' });
        const lines = data.split("\n");
        for(const line of lines){
            console.log(line)
        }

        const prs = await fetchPR(lines)
        console.log("------")
        console.log(prs)

        const res = await fetchBranches(lines);
        console.log("******")
        console.log(res)
    } catch (err) {
        console.log(err);
    }
}
module.exports = process()