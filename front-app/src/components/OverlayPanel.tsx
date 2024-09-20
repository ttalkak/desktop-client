import { BsExclamationCircleFill } from "react-icons/bs";

const OverlayPanel = () => {
  const panel =
    "fixed justify-center flex z-40 bg-white rounded-lg opacity-50 shadow-md";

  return (
    <div className={panel}>
      <div className="flex ">
        <BsExclamationCircleFill />
        <p className="text-lg text-color-5">로그인이 필요한 서비스입니다.</p>
      </div>
    </div>
  );
};

export default OverlayPanel;
