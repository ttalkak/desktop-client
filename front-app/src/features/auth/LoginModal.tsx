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

  const ipt = "border px-2 py-1.5 w-72 rounded";
  const loginBtn = "border w-full py-1 rounded";

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className="absolute top-full right-4 bg-white px-4 py-6 rounded shadow-lg z-50 mt-1 border border-color-1"
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
          <div className="text-color-8 mt-2">{errorMessage}</div>
        )}
        <button className={loginBtn} type="submit">
          로그인
        </button>
      </form>
      <button onClick={handleSignupClick} className="text-blue-500 mt-4 block">
        회원가입
      </button>
    </div>
  );
};

export default LoginModal;
