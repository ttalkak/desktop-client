const stopAllTasks = (): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    try {
      console.log("Stopping all tasks...");
      setTimeout(() => {
        resolve(); // 성공 시 void 반환
      }, 1000);
    } catch (error) {
      if (error instanceof Error) {
        reject(new Error("Failed to stop tasks: " + error.message));
      } else {
        reject(new Error("Unknown error occurred during task termination."));
      }
    }
  });
};

// 종료 명령 수신 후 기능 종료 처리
window.electronAPI.terminateTasks = async () => {
  try {
    await stopAllTasks(); // 모든 기능 종료
    // 종료 성공 시 메인 프로세스로 신호 전달
    window.electronAPI.send("terminated");
  } catch (error) {
    window.electronAPI.onTerminateError(error.message); // 에러 발생 시 메인 프로세스에 알림
  }
};
