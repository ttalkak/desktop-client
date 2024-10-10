import { axiosInstance } from "./constants";

// 결제 정보 전달
export const postPaymentInfo = async (
  domain: string,
  serviceId: number,
  serviceType: string,
  senderId: number,
  address: string
) => {
  try {
    const response = await axiosInstance.post("/payment/pay", {
      domain,
      serviceId,
      serviceType,
      senderId,
      address,
    });

    const { success } = response.data;

    if (success) {
      console.log("결제 정보 전달 성공:");
      return { success: true };
    } else {
      console.log("결제 정보 전달 실패");
      return { success: false };
    }
  } catch (error) {
    console.log("결제 정보 전달 실패");
  }
};
