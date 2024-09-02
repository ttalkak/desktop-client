import { axiosInstance } from "./constants";
import { useAuthStore } from "./../stores/authStore";

export const login = async (username: string, password: string) => {
  const setTokens = useAuthStore.getState().setTokens;

  try {
    const response = await axiosInstance.post("/auth/sign-in", {
      username,
      password,
    });

    const { success, message, data } = response.data;
    console.log(response.data);

    if (success) {
      const { accessToken, refreshToken } = data;
      setTokens(accessToken, refreshToken);
      return { success: true };
    } else {
      return { success: false, message };
    }
  } catch (error) {
    console.log(error);
    return { success: false, message: "An unexpected error occurred." };
  }
};
