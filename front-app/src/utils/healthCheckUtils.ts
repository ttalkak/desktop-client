import { client } from "./stompService";

interface DockerStoreState {
  state: {
    dockerImages: DockerImage[];
    dockerContainers: DockerContainer[];
  };
  version: number;
}

export const sendContainersHealthCheck = () => {
  console.log("컨테이너 상태 모니터링 시작");

  if (!client || !client.connected) {
    console.error(
      "STOMP client is not initialized or not connected. Health check aborted."
    );
    return;
  }

  const storedDockerData = sessionStorage.getItem("dockerStore");
  if (!storedDockerData) {
    console.error("No docker data found in sessionStorage");
    return;
  }

  const dockerStore: DockerStoreState = JSON.parse(storedDockerData);
  const containers = dockerStore.state.dockerContainers;
  console.log("모니터링할 컨테이너들:", containers);

  containers.forEach((container: DockerContainer) => {
    window.electronAPI
      .getContainerStats(container.Id)
      .then((stats) => {
        console.log(`Container ${container.Id}의 stats:`, stats);
        console.log(
          `Monitoring CPU usage for container ${container.Id} started`
        );

        const parsedStats = parseContainerStats(stats);
        console.log(`Parsed stats for container ${container.Id}:`, parsedStats);

        client?.publish({
          destination: "/pub/container/stats",
          body: JSON.stringify({
            containerId: container.Id,
            ...parsedStats,
          }),
        });
      })
      .catch((error) => {
        console.error(`Error monitoring container ${container.Id}:`, error);
      });
  });
};

function parseContainerStats(stats: any) {
  console.log("Parsing stats:", stats);

  const cpuDelta =
    stats.cpu_stats.cpu_usage.total_usage -
    stats.precpu_stats.cpu_usage.total_usage;
  const systemCpuDelta =
    stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const numberOfCpus = stats.cpu_stats.online_cpus;
  const cpuUsage = (cpuDelta / systemCpuDelta) * numberOfCpus * 100;

  console.log("CPU Usage Calculated:", cpuUsage);

  const blkioStats = stats.blkio_stats.io_service_bytes_recursive;
  const diskRead = blkioStats
    .filter((io: any) => io.op === "Read")
    .reduce((acc: number, io: any) => acc + io.value, 0);
  const diskWrite = blkioStats
    .filter((io: any) => io.op === "Write")
    .reduce((acc: number, io: any) => acc + io.value, 0);

  console.log("Disk Read:", diskRead, "Disk Write:", diskWrite);

  const status = stats.state.Status;
  console.log("Container Status:", status);

  return {
    cpuUsage: cpuUsage.toFixed(2),
    diskRead,
    diskWrite,
    status,
  };
}

// 2. stream 방식
export const sendDockerHealthCheck = () => {};

// export const sendContainersHealthCheck = () => {
//   console.log("stats 출력 테스트, 내용 확인 필요");

//   const containerIds = [
//     "176c669bb15ad24ff3cad031ae51dc6c38300011b3bccb6db4d4f05389cde024",
//     // 추가적인 컨테이너 ID
//   ];

//   containerIds.forEach((containerId) => {
//     window.electronAPI.monitorSingleContainer(containerId).then((stats) => {
//       console.log(`Monitoring CPU usage for container ${containerId} started`);

//       // 필요한 값 파싱
//       const parsedStats = parseContainerStats(stats);
//       console.log(parsedStats);

//       // WebSocket을 통해 파싱된 컨테이너 상태 전송
//       //   client?.publish({
//       //     destination: "/pub/container/stats",
//       //     body: JSON.stringify({
//       //       containerId,
//       //       ...parsedStats,
//       //     }),
//       //   });
//       // })
//       // .catch((error) => {
//       //   console.error(`Error monitoring container ${containerId}:`, error);
//       // });
//     });
//   });
// };

// // 필요한 값을 파싱하는 함수
// function parseContainerStats(stats: ContainerStats) {
//   // CPU 사용률 계산
//   console.log(stats);
//   const cpuDelta =
//     stats.cpu_stats.cpu_usage.total_usage -
//     stats.precpu_stats.cpu_usage.total_usage;
//   const systemCpuDelta =
//     stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
//   const numberOfCpus = stats.cpu_stats.online_cpus;
//   const cpuUsage = (cpuDelta / systemCpuDelta) * numberOfCpus * 100;

//   // 디스크 I/O 읽기 및 쓰기
//   const blkioStats = stats.blkio_stats.io_service_bytes_recursive;
//   const diskRead = blkioStats
//     .filter((io: any) => io.op === "Read")
//     .reduce((acc: number, io: any) => acc + io.value, 0);
//   const diskWrite = blkioStats
//     .filter((io: any) => io.op === "Write")
//     .reduce((acc: number, io: any) => acc + io.value, 0);

//   // 컨테이너의 현재 상태
//   const status = stats.state.Status;

//   return {
//     cpuUsage: cpuUsage.toFixed(2), // 소수점 2자리까지
//     diskRead,
//     diskWrite,
//     status,
//   };
// }
