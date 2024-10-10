import { axiosInstance } from "./constants";
import { useAuthStore } from "../stores/authStore";
import { useContainerStore } from "../stores/containerStore";

export interface PaymentInfo {
  id: string;
  domain: string;
  deployId: number;
  serviceType?: string;
  senderId?: number;
  address?: string;
}

// 결제 정보 전달
export const postPaymentInfo = async (container: PaymentInfo) => {
  const address = useAuthStore.getState().userSettings?.address;
  const { getContainerIdById } = useContainerStore.getState();
  const containerId = getContainerIdById(container.id);

  try {
    const response = await axiosInstance.post("/payment/pay", {
      domain: container.domain,
      serviceId: container.deployId,
      serviceType: container.serviceType,
      senderId: container.senderId,
      address: address,
    });

    const { success } = response.data;

    if (success) {
      console.log("결제 정산 요청 성공:", container.domain);
      return { success: true };
    } else {
      console.log("결제 정산 요청 실패", container.domain);
      if (containerId) {
        stopPostInterval(container.id);
        window.electronAPI.stopContainer(containerId);
      }
      return { success: false };
    }
  } catch (error) {
    console.log("결제 정산 요청 실패", container.domain);
    if (containerId) {
      stopPostInterval(container.id);
      window.electronAPI.stopContainer(containerId);
    }
    return { success: false };
  }
};

// 전역적으로 interval을 관리하는 Map
export const globalIntervalIds = new Map<string, NodeJS.Timeout>();

// 주기적으로 요청을 시작하는 함수 (컨테이너별)
export const startPostInterval = (container: PaymentInfo) => {
  if (!globalIntervalIds.has(container.id)) {
    const intervalId = setInterval(() => {
      postPaymentInfo(container);
    }, 15 * 60 * 1000); // 15분(300,000밀리초)마다 요청

    globalIntervalIds.set(container.id, intervalId);
    console.log(
      `컨테이너 ${container.id}에 대한 주기적 요청이 시작되었습니다.`
    );
  }
};

// 주기적 요청을 중지하는 함수
export const stopPostInterval = (serviceId: string) => {
  const intervalId = globalIntervalIds.get(serviceId);

  if (intervalId) {
    clearInterval(intervalId);
    globalIntervalIds.delete(serviceId);
    console.log(`컨테이너 ${serviceId}에 대한 주기적 요청이 중지되었습니다.`);
  }
};
