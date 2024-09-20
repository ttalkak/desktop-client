import axios from "axios";
import { useAuthStore } from "../stores/authStore"; // zustand에서 토큰 상태 관리

// 기본 axios 인스턴스 설정
export const baseUrl: string = "https://api.ttalkak.com/v1";
// export const baseUrl: string = "http://j11c108.p.ssafy.io:8000/v1";

const axiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// 요청 전에 accessToken을 헤더에 포함시키는 인터셉터
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답에서 401 오류가 발생하면 refreshToken을 사용해 토큰 재발급
axiosInstance.interceptors.response.use(
  (response) => response, // 정상 응답은 그대로 반환
  async (error) => {
    const originalRequest = error.config;

    // 401 에러가 발생하면 토큰 갱신 시도
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();

        // refreshToken이 null인 경우 새로운 에러 반환
        if (!refreshToken) {
          throw new Error("Refresh token is missing");
        }

        // refreshToken으로 새로운 accessToken 요청
        const refreshResponse = await axiosInstance.post("/auth/refresh");

        const {
          data: { accessToken: newAccessToken },
          success,
        } = refreshResponse.data;

        if (!success) throw Error("인증 실패");

        // 새로운 accessToken 저장
        useAuthStore.getState().setTokens(newAccessToken, refreshToken);

        // 실패했던 요청을 다시 보내기
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // refreshToken도 만료된 경우 로그아웃 처리
        useAuthStore.getState().clearTokens();
        window.location.href = "/";
        alert("로그인 세션이 만료되었습니다. 다시 로그인해 주세요.");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error); // 그 외 에러는 그대로 처리
  }
);

export { axiosInstance };
