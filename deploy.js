const simpleGit = require("simple-git");
const path = require("path");
const fs = require("fs");
const os = require("os");

const tempDir = path.join(
    os.tmpdir(),
    "gh-pages-" + Math.random().toString(36).substring(7)
);
const buildDir = path.join(__dirname, "dist");
const repoUrl = "https://github.com/willvn2021/f8-zoom-module-1.git";

async function deploy() {
    try {
        fs.mkdirSync(tempDir, { recursive: true });

        console.log("Deploying to GitHub Pages...");
        console.log("Temporary directory:", tempDir);

        const git = simpleGit();
        console.log("Cloning repository...");

        try {
            await git.clone(repoUrl, tempDir, [
                "--branch",
                "gh-pages",
                "--single-branch",
            ]);
            console.log("Successfully cloned gh-pages branch");
        } catch (e) {
            console.log(
                "gh-pages branch does not exist yet, cloning main branch instead"
            );
            await git.clone(repoUrl, tempDir);
        }

        const repoGit = simpleGit(tempDir);

        try {
            await repoGit.checkout("gh-pages");
            console.log("Checked out existing gh-pages branch");
        } catch (e) {
            console.log("Creating new gh-pages branch");
            await repoGit.checkoutLocalBranch("gh-pages");
        }

        console.log("Cleaning directory...");
        const files = fs
            .readdirSync(tempDir)
            .filter((f) => f !== ".git")
            .map((f) => path.join(tempDir, f));

        for (const file of files) {
            fs.rmSync(file, { recursive: true, force: true });
        }

        console.log("Copying build files to repo...");
        copyFolderSync(buildDir, tempDir);

        const status = await repoGit.status();

        if (status.files.length > 0) {
            console.log("Adding changes...");
            await repoGit.add(".");
            console.log("Committing changes...");
            await repoGit.commit("Update from deploy script");

            console.log("Pushing to GitHub...");
            await repoGit.push("origin", "gh-pages", ["--set-upstream"]);
            console.log("Deployment successful!");
        } else {
            console.log("No changes to deploy");
        }
    } catch (error) {
        console.error("Deployment failed:", error);
    } finally {
        try {
            console.log("Cleaning up temporary directory...");
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) {
            console.error("Failed to clean up temp directory:", e);
        }
    }
}

function copyFolderSync(source, target) {
    if (!fs.existsSync(source)) {
        throw new Error(`Source directory does not exist: ${source}`);
    }

    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);

    files.forEach((file) => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.lstatSync(sourcePath).isDirectory()) {
            copyFolderSync(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

deploy();
