const PaymentStatusItem = () => {
  return (
    <div className="card w-1/2">
      <p className="font-sans font-bold text-xl">총 수익</p>
      <p className="font-sans text-color-10">
        지금까지 벌어들인 수익: [금액]원
      </p>
    </div>
  );
};

export default PaymentStatusItem;
