import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate 추가
import { login } from "./../../axios/auth";

interface LoginModalProps {
  isOpen: boolean;
  onClose: (source: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // useNavigate 훅 사용

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
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

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    const data = login(username, password);
    console.log("로그인 성공:", data);
  };

  const handleSignupClick = () => {
    navigate("/signup"); // /signup 페이지로 이동
    onClose("signup"); // 모달을 닫음
  };

  const ipt = "border px-2 py-1.5 w-72";

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

        <button type="submit">로그인</button>
      </form>
      <button onClick={handleSignupClick} className="text-blue-500 mt-4 block">
        회원가입
      </button>
    </div>
  );
};

export default LoginModal;
