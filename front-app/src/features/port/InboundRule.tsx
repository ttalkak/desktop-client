import React, { useEffect, useState } from "react";
import { InboundRuleDto, parseInboundRule } from "./parseInboundRule";

const InboundRule: React.FC = () => {
  const [rules, setRules] = useState<InboundRuleDto[]>([]);

  useEffect(() => {
    console.log("1. Port component mounted");

    if (window.electronAPI) {
      console.log("electronAPI exists:", window.electronAPI);

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

  return (
    <div>
      <h2>Inbound Rules</h2>
      <table>
        <thead>
          <tr>
            <th>Rule Name</th>
            <th>Local IP</th>
            <th>Local Port</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule, index) => (
            <tr key={index}>
              <td>{rule.name}</td>
              <td>{rule.localIP}</td>
              <td>{rule.localPort}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InboundRule;
