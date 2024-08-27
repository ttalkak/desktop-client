import { useEffect, useRef, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';

interface WebSocketMessage {
  value: string; // 예: 상태 값의 타입 정의
}

const useWebSocket = (url: string, topic: string) => {
  const [message, setMessage] = useState<WebSocketMessage | null>(null);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    // STOMP 클라이언트 설정
    const client = new Client({
      brokerURL: url, // WebSocket 서버의 URL
      reconnectDelay: 5000, // 재연결 시도 간격 (5초)
      heartbeatIncoming: 4000, // 서버로부터의 heartbeats 간격 (4초)
      heartbeatOutgoing: 4000, // 서버로의 heartbeats 간격 (4초)
      onConnect: () => {
        console.log('Connected to WebSocket server');

        // 특정 경로를 구독하여 메시지를 수신
        client.subscribe(topic, (message: IMessage) => {
          const newMessage: WebSocketMessage = JSON.parse(message.body);
          setMessage(newMessage);
        });
      },
      onDisconnect: () => {
        console.log('Disconnected from WebSocket server');
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      },
    });

    client.activate();
    clientRef.current = client;

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [url, topic]);

  return message;
};

export default useWebSocket;
