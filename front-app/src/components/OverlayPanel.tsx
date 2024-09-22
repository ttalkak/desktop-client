import { BsExclamationCircleFill } from "react-icons/bs";

const OverlayPanel = () => {
  const panel =
    "absolute top-0 left-0 right-0 z-40 bg-white opacity-50 flex justify-center items-center h-full";

  return (
    <div className={panel}>
      <div className="flex items-center space-x-2">
        <BsExclamationCircleFill />
        <p className="text-lg text-color-5">로그인이 필요한 서비스입니다.</p>
      </div>
    </div>
  );
};

export default OverlayPanel;
