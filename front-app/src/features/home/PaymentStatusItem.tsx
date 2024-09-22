import { FaCoins } from "react-icons/fa";

const PaymentStatusItem = () => {
  return (
    <div className="card w-1/2 ml-1">
      <p className="font-sans font-bold text-xl">총 수익</p>
      <p className="font-sans text-color-10 text-xs">결산액</p>
      <p className="flex items-center mt-2">
        <p className="text-color-6">
          <FaCoins />
        </p>
        <p className="text-lg pl-2">ddd</p>
      </p>
    </div>
  );
};

export default PaymentStatusItem;
