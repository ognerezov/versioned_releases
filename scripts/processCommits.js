const fs = require("fs/promises");
const { exec } = require('child_process');

const ISSUE_NUMBER_REGEX = /^ENG-(\d+)/

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
                    let issue
                    try{
                        const data = stdout ? stdout.split(" ") : ["", ""]
                        const fullPath = data.length > 1 ? data[1].trim() : ""
                        const path = fullPath.split("/")
                        const raw = path.length > 2 ? path[2] : fullPath
                        branch = raw.split("~")[0]
                        const match = ISSUE_NUMBER_REGEX.exec(branch);
                        if(match){
                            issue = parseInt(match[1])
                        }
                    }catch (e) {
                        reject(e)
                        return
                    }
                    const res = {
                        branch,
                        commit
                    }
                    if(issue){
                        res['issue'] = issue
                    }
                    resolve(res)
                });
        })))
}

async function process() {
    try {
        const data = await fs.readFile('./change_log/commits.txt', { encoding: 'utf8' });
        const lines = data.split("\n");

        const prs = await fetchPR(lines)
        console.log("------")
        console.log(prs)

        const branches = await fetchBranches(lines);
        console.log("******")
        console.log(branches)

        const connectedBranches = branches.filter(branch => Boolean(branch.issue))

        const commitsMap = {}

        for(const b of connectedBranches){
            commitsMap[b.commit] = `https://linear.app/orchid/issue/ENG-${b.issue}`
        }

        console.log(commitsMap)
        const prMap = {}
        for(const pr of prs){
            if(pr.titles?.length !== 1){
                continue
            }
            const title = pr.titles[0]
            const notes = prMap[title] || []
            if(!commitsMap[pr.commit]){
                prMap[title] = notes
                continue
            }
            if(notes.some(n => n === commitsMap[pr.commit])){
                continue
            }

            notes.push(commitsMap[pr.commit])
            prMap[title] = notes
        }
        console.log(prMap)

        let changes = ""

        Object.keys(prMap).forEach(pr =>{
            changes += `# ${pr}\n`
            if(prMap[pr].length){
                changes +=`\nCompleted tasks:\n`
                prMap[pr].forEach(issue =>{
                    changes +=`- ${issue}\n`
                })
            }else{
                changes +=`\nPR doesn't have related linear issues`
            }
            changes +='\n'
        })

        await fs.writeFile('./change_log/change_log.md', changes)

    } catch (err) {
        console.log(err);
    }
}
module.exports = process()