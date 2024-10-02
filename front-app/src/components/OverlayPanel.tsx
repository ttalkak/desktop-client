import { BsExclamationCircleFill } from "react-icons/bs";

const OverlayPanel = () => {
  const panel =
    "absolute top-0 left-0 right-0 z-40 flex justify-center items-center h-full";

  return (
    <div className={panel}>
      <div className="absolute top-0 left-0 right-0 bottom-0 bg-color-1 opacity-65"></div>
      <div className="flex items-center space-x-2 z-10 rounded bg-color-16 py-1 px-2">
        <BsExclamationCircleFill color="#222222ff" size={15} className="mr-2" />
        로그인이 필요한 서비스입니다.
      </div>
    </div>
  );
};

export default OverlayPanel;
