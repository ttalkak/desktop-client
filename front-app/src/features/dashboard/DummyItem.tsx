
const DummyItem = [
    {
      name: "welcome-to-docker",
      image: "docker/welcome-to-docker:latest",
      status: "Exited (255)",
      ports: "8088:80",
      cpu: "N/A",
      lastStarted: "10 hours ago",
    },
    {
      name: "web-server",
      image: "nginx:latest",
      status: "Running",
      ports: "80:80",
      cpu: "2.5%",
      lastStarted: "2 hours ago",
    },
    {
      name: "db-container",
      image: "mysql:5.7",
      status: "Exited (0)",
      ports: "3306:3306",
      cpu: "N/A",
      lastStarted: "6 hours ago",
    },
    {
      name: "redis-cache",
      image: "redis:alpine",
      status: "Running",
      ports: "6379:6379",
      cpu: "0.7%",
      lastStarted: "4 hours ago",
    },
  ];
  

export default DummyItem