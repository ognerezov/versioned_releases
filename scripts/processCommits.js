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

async function process() {
    try {
        const data = await fs.readFile('./change_log/commits.txt', { encoding: 'utf8' });
        const lines = data.split("\n");
        for(const line of lines){
            console.log(line)
        }

        const res = await fetchPR(lines)
        console.log("------")
        console.log(res)
    } catch (err) {
        console.log(err);
    }
}
module.exports = process()