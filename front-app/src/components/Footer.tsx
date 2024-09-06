import { GoQuestion } from "react-icons/go";
import { BsBoxArrowRight } from "react-icons/bs";

const Footer = () => {
  const content =
    "flex items-center text-color-4 hover:text-color-5 py-0.5 px-2 cursor-pointer";

  return (
    <div className="bg-white fixed bottom-0 left-0 w-full h-6 border-t border-color-2 text-xs flex items-center justify-between px-2.5 pb-0.5">
      <div className={content}>
        <BsBoxArrowRight />
        <div className="ml-1.5">Join our website</div>
      </div>
      <div className={content}>
        <GoQuestion />
        <div className="ml-1">help</div>
      </div>
    </div>
  );
};

export default Footer;
