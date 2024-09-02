import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../axios/constants";
import { login } from "../axios/auth";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const signUp = async () => {
    try {
      const response = await axiosInstance.post("/auth/sign-up", {
        username,
        email,
        password: password1,
      });

      const { success, message } = response.data;

      if (success) {
        const loginResult = await login(username, password1);
        if (loginResult.success) {
          navigate("/");
        }
      } else {
        setErrorMessage(message || "회원가입에 실패했습니다.");
      }
    } catch (error) {
      console.log(error);
      setErrorMessage("회원가입 중 오류가 발생했습니다.");
    }
  };

  const handleSignUp = (event: React.FormEvent) => {
    event.preventDefault();
    if (password1 !== password2) {
      setErrorMessage("비밀번호가 일치하지 않습니다.");
      return;
    }
    setErrorMessage(null); // 이전 에러 메시지 초기화
    signUp();
  };

  return (
    <>
      <div>회원가입 페이지</div>
      <form onSubmit={handleSignUp}>
        <div>
          <label htmlFor="userId">아이디</label>
          <input
            id="userId"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password1">비밀번호</label>
          <input
            id="password1"
            type="password"
            value={password1}
            onChange={(e) => setPassword1(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password2">비밀번호 확인</label>
          <input
            id="password2"
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            required
          />
        </div>
        {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
        <div>
          <button type="submit">가입하기</button>
        </div>
      </form>
      <Link to={"/login"}>로그인</Link>
    </>
  );
};

export default SignUp;
