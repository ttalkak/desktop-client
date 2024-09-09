import React, { useEffect, useState } from "react";
import { InboundRuleDto, parseInboundRule } from "./parseInboundRule";

const InboundRule: React.FC = () => {
  const [rules, setRules] = useState<InboundRuleDto[]>([]);

  useEffect(() => {
    console.log("1. Port component mounted");

    if (window.electronAPI) {
      console.log("electronAPI exists:", window.electronAPI);

      // 로컬 포트 정보 불러오기
      const fetchInboundRules = async () => {
        try {
          console.log("2. Calling getInboundRules");
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

  // 해당 포트 토글(활성/비활성)
  const toggleRule = async (rule: InboundRuleDto, index: number) => {
    try {
      console.log(`Toggle ${rule.name} | 이전 상태: ${rule.enabled}`);
      const newEnabledState = rule.enabled === "예" ? "no" : "yes";
      await window.electronAPI.togglePort(rule.name, newEnabledState);

      // 상태 업데이트
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
      <div className="overflow-auto custom-scrollbar h-full">
        <table className="w-full bg-white border-gray-300 text-sm">
          <thead className="sticky top-0 text-sm bg-white-gradient">
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
                <td className="py-2 text-center">{rule.name}</td>
                <td className="text-center">{rule.localIP}</td>
                <td className="">{rule.localPort}</td>
                <td className="text-center">
                  {rule.enabled === "예" ? (
                    <button
                      className="px-3 py-1 rounded"
                      onClick={() => toggleRule(rule, index)}
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      className="px-3 py-1 rounded"
                      onClick={() => toggleRule(rule, index)}
                    >
                      Enable
                    </button>
                  )}
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
