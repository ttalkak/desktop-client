import React, { useEffect, useState } from "react";
import { InboundRuleDto, parseInboundRule } from "./parseInboundRule";
import { Switch } from "./../../components/ui/switch";

const InboundRule: React.FC = () => {
  const [rules, setRules] = useState<InboundRuleDto[]>([]);

  useEffect(() => {
    if (window.electronAPI) {
      // 로컬 포트 정보 불러오기
      const fetchInboundRules = async () => {
        try {
          const result = await window.electronAPI.getInboundRules();
          const parsedRules = parseInboundRule(result);
          setRules(parsedRules);
        } catch (error) {
          console.error("Failed to load inbound rules:", error);
        }
      };
      fetchInboundRules();
    } else {
      console.error("electronAPI is not defined");
    }
  }, []);

  // 포트 정보를 최대 7개씩 출력
  const renderPorts = (portsString: string) => {
    const portsArray = portsString.split(",");
    const groupedPorts = [];
    for (let i = 0; i < portsArray.length; i += 7) {
      groupedPorts.push(portsArray.slice(i, i + 7).join(", "));
    }
    return groupedPorts.map((group, index) => <div key={index}>{group}</div>);
  };

  // 스위치를 토글하여 활성화/비활성화
  const toggleRule = async (rule: InboundRuleDto, index: number) => {
    try {
      const newEnabledState = rule.enabled === "예" ? "no" : "yes";
      await window.electronAPI.togglePort(rule.name, newEnabledState);

      setRules((prevRules) =>
        prevRules.map((r, i) =>
          i === index
            ? { ...r, enabled: rule.enabled === "예" ? "아니요" : "예" }
            : r
        )
      );
    } catch (error) {
      console.error("Failed to toggle rule:", error);
    }
  };

  return (
    <div className="card w-full h-full overflow-hidden">
      <div className="overflow-auto custom-scrollbar h-full w-full">
        <table className="w-full bg-white border-gray-300 text-sm">
          <thead className="sticky z-10 top-0 text-sm bg-white-gradient">
            <tr className="border-b">
              <th className="p-1">Rule Name</th>
              <th className="p-1">Local IP</th>
              <th className="p-1">Local Port</th>
              <th className="p-1">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, index) => (
              <tr key={index} className="border-b">
                <td className="min-w-96 max-w-lg py-2 px-1.5 text-center">
                  {rule.name}
                </td>
                <td className="min-w-32 text-center">{rule.localIP}</td>
                <td className="max-w-md text-center">
                  {renderPorts(rule.localPort)}
                </td>
                <td className="min-w-24 text-center">
                  <Switch
                    checked={rule.enabled === "예"}
                    onCheckedChange={() => toggleRule(rule, index)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InboundRule;
