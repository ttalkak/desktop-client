import { useAuthStore, usePortStore } from "../../stores/authStore";

export interface InboundRuleDto {
  name: string;
  localIP: string;
  localPort: string;
  enabled: string;
}

export function parseInboundRule(data: string): InboundRuleDto[] {
  const lines = data.split("\n");
  const rules: InboundRuleDto[] = [];
  let currentRule: (Partial<InboundRuleDto> & { direction?: string }) | null =
    null;

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("규칙 이름:")) {
      if (currentRule && currentRule.direction === "들어오는 메시지") {
        if (
          currentRule.name &&
          currentRule.localIP &&
          currentRule.localPort &&
          currentRule.enabled
        ) {
          rules.push({
            name: currentRule.name,
            localIP: currentRule.localIP,
            localPort: currentRule.localPort,
            enabled: currentRule.enabled,
          });
        }
      }
      currentRule = { name: trimmedLine.split("규칙 이름:")[1].trim() };
    }

    if (trimmedLine.startsWith("방향:") && currentRule) {
      currentRule.direction = trimmedLine.split("방향:")[1].trim();
    }

    if (trimmedLine.startsWith("LocalIP:") && currentRule) {
      currentRule.localIP = trimmedLine.split("LocalIP:")[1].trim();
    }

    if (trimmedLine.startsWith("LocalPort:") && currentRule) {
      currentRule.localPort = trimmedLine.split("LocalPort:")[1].trim();
    }

    if (trimmedLine.startsWith("사용:") && currentRule) {
      currentRule.enabled = trimmedLine.split("사용:")[1].trim();
    }
  });

  return rules;
}

// 포트 관리를 위한 setPort 생성
export function parsePortNumber(rules: string[]): void {
  const portSet = new Set<number>();

  rules.forEach((rule) => {
    if (rule !== "모두") {
      // ','로 나눠서 각각의 포트 숫자 처리
      const ports = rule.split(",").map((port) => Number(port.trim()));

      // 각 포트 번호를 Set에 추가 (중복 제거)
      ports.forEach((port) => {
        if (!isNaN(port)) {
          portSet.add(port);
        }
      });
    }
  });

  const setPortSet = usePortStore.getState().setPortSet;
  setPortSet(portSet); // 전역 상태 업데이트

  console.log(portSet);
}

// 사용 중인 포트 대역 반환
export function getUsedPortsInRange(): number[] {
  const { portSet } = usePortStore.getState();
  const { userSettings } = useAuthStore.getState();

  // userSettings가 없는 경우 빈 배열 반환
  if (!userSettings) {
    return [];
  }

  const { availablePortStart, availablePortEnd } = userSettings;

  const usedPorts = Array.from(portSet).filter(
    (port) => port >= availablePortStart && port <= availablePortEnd
  );

  return usedPorts;
}
