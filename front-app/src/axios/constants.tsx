import axios, { AxiosRequestConfig } from "axios";

export const baseUrl: string = "https://www.ttalkak.kro.kr";

const config: AxiosRequestConfig = { baseURL: baseUrl };
export const axiosInstance = axios.create(config);
