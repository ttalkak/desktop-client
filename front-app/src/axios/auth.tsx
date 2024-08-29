import { axiosInstance } from "./constants";

export const login = async (username: string, password: string) => {
  try {
    const response = await axiosInstance.post("/auth/sign-in", {
      username,
      password,
    });
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
  }
};
