import { GoQuestion } from "react-icons/go";
import { BsBoxArrowRight } from "react-icons/bs";
import { useState } from "react";

const Footer = () => {
  const [isHelpTooltipVisible, setIsHelpTooltipVisible] = useState(false);
  const [isJoinTooltipVisible, setIsJoinTooltipVisible] = useState(false);

  const content =
    "flex items-center text-color-5 hover:text-color-5 py-0.5 px-2 cursor-pointer";
  const tooltip =
    "absolute bottom-full mb-1 bg-white border text-xs rounded py-1 shadow-lg filter-none opacity-100 text-black z-50";

  return (
    <div className="bg-white fixed bottom-0 left-0 w-full h-6 border-t border-color-2 text-xs flex items-center justify-between px-2.5 pb-0.5 relative">
      <div className="relative flex items-center">
        <a
          href="https://ttalkak.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={content}
          onMouseEnter={() => {
            setIsJoinTooltipVisible(true);
          }}
          onMouseLeave={() => {
            setIsJoinTooltipVisible(false);
          }}
        >
          <BsBoxArrowRight />
          <div className="ml-1.5">Join our website</div>
        </a>

        {isJoinTooltipVisible && (
          <div className={`${tooltip} w-48 left-0`}>
            <p className="text-center">직접 프로젝트를 배포하고 싶다면</p>
            <p className="text-center">웹사이트를 이용하세요</p>
          </div>
        )}
      </div>

      <div className="relative flex items-center">
        <a
          href="https://ttalkak.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={content}
          onMouseEnter={() => {
            setIsHelpTooltipVisible(true);
          }}
          onMouseLeave={() => {
            setIsHelpTooltipVisible(false);
          }}
        >
          <GoQuestion />
          <div className="ml-1">help</div>
        </a>

        {isHelpTooltipVisible && (
          <div className={`${tooltip} w-36 right-0`}>
            <p className="text-center">사용 방법을 제공하는</p>
            <p className="text-center">페이지가 열립니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Footer;
