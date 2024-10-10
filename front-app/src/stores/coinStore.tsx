import { create } from "zustand";

interface CoinState {
  coin: number;
  setCoin: (coin: number) => void;
  clearCoin: () => void;
}

export const useCoinStore = create<CoinState>((set) => ({
  // sessionStorage에서 coin 값을 가져와 number로 변환 (null일 경우 0으로 처리)
  coin: Number(sessionStorage.getItem("coin")) || 0,

  // coin 값을 설정하고 sessionStorage에 저장
  setCoin: (coin) => {
    sessionStorage.setItem("coin", String(coin)); // 숫자를 문자열로 변환해서 저장
    set({ coin });
  },

  // 코인 값을 초기화하고 sessionStorage에서도 삭제
  clearCoin: () => {
    sessionStorage.removeItem("coin");
    set({ coin: 0 });
  },
}));
