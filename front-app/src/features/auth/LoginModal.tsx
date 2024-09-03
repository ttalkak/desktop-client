import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./../../axios/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 상태 초기화 함수
  const resetFields = () => {
    setUsername("");
    setPassword("");
    setErrorMessage(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        resetFields();
        onClose("modal");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, isOpen]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await login(username, password);

    if (result.success) {
      resetFields();
      onClose("modal");
    } else {
      setErrorMessage(result.message);
    }
  };

  const handleSignupClick = () => {
    navigate("/signup");
    resetFields();
    onClose("modal");
  };

  const ipt =
    "shadow-inner border border-color-2 px-2 py-1.5 mb-2 w-72 rounded placeholder:text-sm";
  const loginBtn = "bg-color-6 text-white w-full py-1.5 rounded mt-1.5";

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="absolute top-full right-4 bg-white px-4 pt-8 pb-5 rounded shadow-lg z-50 mt-1 border border-color-2"
    >
      <form onSubmit={handleLogin}>
        <input
          className={ipt}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="아이디 입력"
          required
        />
        <input
          className={ipt}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          required
        />
        {errorMessage && (
          <div className="text-color-8 text-sm">{errorMessage}</div>
        )}
        <button className={loginBtn} type="submit">
          Login
        </button>
      </form>
      <button
        onClick={handleSignupClick}
        className="px-2 mx-auto text-center text-color-10 mt-4 block text-sm flex items-center"
      >
        회원가입
      </button>
    </div>
  );
};

export default LoginModal;
