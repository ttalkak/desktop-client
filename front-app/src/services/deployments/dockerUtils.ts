// 도커 상태 확인 함수
export const checkDockerStatus = async (): Promise<
  "running" | "not running" | "unknown"
> => {
  try {
    const status = await window.electronAPI.checkDockerStatus();
    console.log("Docker status check result:", status);
    return status;
  } catch (error) {
    console.error("Error checking Docker status:", error);
    return "unknown";
  }
};

// 도커 시작 함수 => 나중에 경로 바뀔 수도 있음
export const startDocker = async () => {
  try {
    const resolvedPath =
      "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe";
    console.log("Starting Docker Desktop from:", resolvedPath);
    await window.electronAPI.openDockerDesktop(resolvedPath);
    await waitForDockerToStart();
    console.log("Docker started successfully");
  } catch (error) {
    console.error("Error starting Docker:", error);
    throw error;
  }
};

// 도커 시작을 기다리는 함수
export const waitForDockerToStart = async (
  maxRetries = 10,
  interval = 3000
): Promise<void> => {
  let retries = 0;
  while (retries < maxRetries) {
    console.log(`Waiting for Docker to start, attempt ${retries + 1}`);
    const status = await checkDockerStatus();
    if (status === "running") {
      console.log("Docker is now running");
      return;
    }
    retries += 1;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Docker failed to start within the expected time.");
};
