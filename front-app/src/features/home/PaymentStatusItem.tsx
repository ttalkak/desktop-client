import { FaCoins } from "react-icons/fa";
import { useCoinStore } from "../../stores/coinStore";

const PaymentStatusItem = () => {
  const coin = useCoinStore((state) => state.coin);

  return (
    <div className="card w-1/2 ml-1">
      <p className="font-sans font-bold text-lg">총 수익</p>
      <p className="font-sans text-color-10 text-xs">결산액</p>
      <div className="flex items-center mt-2">
        <p className="text-color-6">
          <FaCoins color="#7FC0EF" />
        </p>
        <p className="text-sm pl-2">{coin} SSF</p>
      </div>
    </div>
  );
};

export default PaymentStatusItem;
