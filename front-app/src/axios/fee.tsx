import { axiosInstance } from "./constants";
import { useCoinStore } from "../stores/coinStore";

// 결제 정보 전달
export const getCoinInfo = async () => {
  try {
    const response = await axiosInstance.get("/payment/coin");

    const { message, status, data } = response.data;

    if (status === 200) {
      const { setCoin } = useCoinStore.getState(); // 스토어에서 setCoin 함수를 가져옴
      setCoin(Number(data.coin)); // 받은 토큰 값을 저장
      return { success: true };
    } else {
      console.warn("정산 정보 처리 실패: ", message);
      return { success: false };
    }
  } catch (error) {
    console.warn("정산 정보 반환 실패", error);
    return { success: false };
  }
};
let coinIntervalId: NodeJS.Timeout | null = null;

// 주기적으로 요청
export const setCoinInterval = () => {
  console.log("주기적 요청 시작");
  if (!coinIntervalId) {
    coinIntervalId = setInterval(async () => {
      const result = await getCoinInfo(); 

      if (result.success) {
        console.log("코인 정보가 성공적으로 업데이트되었습니다.");
      } else {
        console.warn("코인 정보 업데이트 실패");
      }
    }, 10 * 1000); //10초 주기로 업데이트
  }
};

// 주기적 요청을 중지하는 함수
export const stopCoinInterval = () => {
  if (coinIntervalId) {
    clearInterval(coinIntervalId);
    coinIntervalId = null;

    console.log(`정산 요청이 중지되었습니다.`);
  }
};
