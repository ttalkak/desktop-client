export interface InboundRuleDto {
  name: string;
  localIP: string;
  localPort: string;
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
        if (currentRule.name && currentRule.localIP && currentRule.localPort) {
          rules.push({
            name: currentRule.name,
            localIP: currentRule.localIP,
            localPort: currentRule.localPort,
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
  });

  return rules;
}
