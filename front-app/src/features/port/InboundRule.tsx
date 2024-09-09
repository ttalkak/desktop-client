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

  const container = "bg-white border";

  return (
    <div className={container}>
      <h2>Inbound Rules</h2>
      <table>
        <thead>
          <tr>
            <th>Rule Name</th>
            <th>Local IP</th>
            <th>Local Port</th>
            <th>Enabled</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, index) => (
            <tr key={index}>
              <td>{rule.name}</td>
              <td>{rule.localIP}</td>
              <td>{rule.localPort}</td>
              <td>
                {rule.enabled === "예" ? (
                  <button onClick={() => toggleRule(rule, index)}>
                    Disable
                  </button>
                ) : (
                  <button onClick={() => toggleRule(rule, index)}>
                    Enable
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InboundRule;
