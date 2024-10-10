import { axiosInstance } from "./constants";
import { useAuthStore } from "../stores/authStore";
import { setCoinInterval } from "./fee";
import { getCoinInfo } from "./fee";

// 로그인 요청
export const login = async (username: string, password: string) => {
  const setTokens = useAuthStore.getState().setTokens;

  try {
    const response = await axiosInstance.post("/auth/sign-in", {
      username,
      password,
    });

    const { success, message, data } = response.data;

    if (success) {
      const { accessToken, refreshToken } = data;
      // zustand store에 토큰 저장
      setTokens(accessToken, refreshToken);
      getCoinInfo();
      setCoinInterval();
      return { success: true };
    } else {
      return { success: false, message };
    }
  } catch (error) {
    console.log("로그인 실패:", error);
    return { success: false, message: "로그인 중 오류가 발생했습니다." };
  }
};

// 사용자 설정 정보 저장
export const getUserSettings = async () => {
  const setUserSettings = useAuthStore.getState().setUserSettings;

  try {
    const response = await axiosInstance.get("/compute/status");
    const { success, data } = response.data;

    let checkadress: string = "";
    const address = data.address;
    if (address && address.trim !== "") {
      checkadress = address;
    }
    console.log(checkadress);
    if (success) {
      const userSettings = {
        userId: data.userId,
        maxCPU: data.maxCPU,
        maxMemory: data.maxMemory,
        maxCompute: data.maxCompute,
        availablePortStart: data.availablePortStart,
        availablePortEnd: data.availablePortEnd,
        address: checkadress,
      };

      setUserSettings(userSettings);
    } else {
      console.log("설정을 불러오지 못했습니다.");
    }
  } catch (error) {
    console.log("설정 불러오기 실패:", error);
  }
};
