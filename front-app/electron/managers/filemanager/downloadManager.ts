import fs from "fs";
import path from "node:path";
import { promisify } from "util";
import { findDockerfile } from "./dokerFileFinder";
import { downloadFile, unzipFile, getTtalkakDirectory } from "../../utils";

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);
const rmAsync = fs.promises.rm || fs.promises.rmdir; // Node.js 14 and above uses rm, below uses rmdir

// Define the base project source directory path
export const projectSourceDirectory = path.join(
  getTtalkakDirectory(), // Get the base directory for Ttalkak
  "project",
  "source"
);

// Function to return the project source directory
export function getProjectSourceDirectory(): string {
  // 1. Check if the project source directory exists
  if (!fs.existsSync(projectSourceDirectory)) {
    fs.mkdirSync(projectSourceDirectory, { recursive: true });
    console.log(`1. Directory created: ${projectSourceDirectory}`);
  }

  // 2. Return the directory path
  return projectSourceDirectory;
}

// Function to download and unzip the repository, then return the Dockerfile and context path
export async function downloadAndUnzip(
  repositoryUrl: string,
  rootDirectory: string
): Promise<{
  success: boolean;
  found: boolean; // Indicates if the Dockerfile was found
  message?: string;
  contextPath?: string;
  dockerfilePath?: string;
}> {
  try {
    // 3. Set download and extraction directories
    const downloadDir = getProjectSourceDirectory();
    const extractDir = getProjectSourceDirectory();

    // 4. Parse URL to extract branch name and repository name
    const urlParts = repositoryUrl.split("/");
    const branch = repositoryUrl.substring(
      repositoryUrl.indexOf("heads/") + 6,
      repositoryUrl.lastIndexOf(".zip")
    );
    const safeBranchName = branch.replace(/\//g, "-"); // Replace slashes in branch name with hyphens
    const repoName = urlParts[4].toLowerCase(); // Extract repository name

    console.log("5. Repository name:", `${repoName}-${safeBranchName}`);

    // 6. Set ZIP file name and path
    const zipFileName = `${repoName}-${safeBranchName}.zip`;
    const zipFilePath = path.join(downloadDir, zipFileName);
    const savePath = `${extractDir}\\${repoName}-${safeBranchName}`;

    console.log("7. Download URL:", repositoryUrl);
    console.log("8. Save path:", savePath);
    console.log("9. Downloading ZIP file...");

    // 10. Delete existing ZIP file if it exists
    if (await existsAsync(zipFilePath)) {
      console.log(`10. Deleting existing file: ${zipFilePath}...`);
      await unlinkAsync(zipFilePath);
      console.log("11. Existing file deleted.");
    }

    // 11. Delete existing extracted folder if it exists
    if (await existsAsync(savePath)) {
      console.log(`11. Deleting existing folder: ${savePath}...`);
      await rmAsync(savePath, { recursive: true, force: true });
      console.log("12. Existing folder deleted.");
    }

    // 12. Download the file
    await downloadFile(repositoryUrl, zipFilePath);
    console.log("13. Download completed:", zipFilePath);

    // 13. Unzip the file
    console.log("14. Unzipping file...");
    await unzipFile(zipFilePath, extractDir);
    console.log("15. Unzipping completed:", extractDir);

    // 16. Set Docker directory based on provided rootDirectory
    let dockerDir = rootDirectory
      ? path.resolve(
          extractDir,
          `${repoName}-${safeBranchName}`,
          ...rootDirectory.split("/")
        ) // Include rootDirectory if provided
      : path.resolve(extractDir, `${repoName}-${safeBranchName}`); // Use default path if rootDirectory is not provided

    console.log(`16. Docker directory: ${dockerDir}`);

    // 17. Return an error if the directory does not exist
    if (!fs.existsSync(dockerDir)) {
      return {
        success: false,
        found: false,
        message: `Directory not found: ${dockerDir}`,
      };
    }

    // 18. Find the Dockerfile path and check if it exists
    const { found, dockerfilePath } = await findDockerfile(dockerDir);
    if (!found) {
      dockerDir = path.join(dockerDir, "Dockerfile").replace(/\\/g, "/"); // Dockerfile 경로 추가 및 슬래시 표준화
      console.log(
        `19. Dockerfile not found. Using default Dockerfile path: ${dockerDir}`
      );
    } else {
      dockerDir = path.join(dockerfilePath).replace(/\\/g, "/"); // Dockerfile 경로 표준화
      console.log(`20. Dockerfile found: ${dockerDir}`);
    }

    const contextPath = path.dirname(dockerDir); // Set the context path as the parent directory of the Dockerfile

    console.log(`21. Context path: ${contextPath}`);
    console.log(`21. Dockerfile Path: ${dockerDir}`);
    // 22. Return the Dockerfile and context path
    return { success: true, found, contextPath, dockerfilePath: dockerDir };
  } catch (error) {
    console.error("23. Error during download and unzip:", error);
    // Return the error message and paths on failure
    return {
      success: false,
      found: false,
      message: (error as Error).message,
      contextPath: "",
      dockerfilePath: "",
    };
  }
}
