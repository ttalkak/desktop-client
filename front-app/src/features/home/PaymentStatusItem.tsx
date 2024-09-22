import { FaCoins } from "react-icons/fa";

const PaymentStatusItem = () => {
  return (
    <div className="card w-1/2 ml-1">
      <p className="font-sans font-bold text-lg">총 수익</p>
      <p className="font-sans text-color-10 text-xs">결산액</p>
      <div className="flex items-center mt-2">
        <p className="text-color-6">
          <FaCoins />
        </p>
        <p className="text-lg pl-2">{}</p>
      </div>
    </div>
  );
};

export default PaymentStatusItem;
