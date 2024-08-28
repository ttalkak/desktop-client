import { useState } from "react";
import { Link } from "react-router-dom";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const handleSignUp = () => {
    console.log("회원가입");
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
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
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
        <div>
          <button type="submit">가입하기</button>
        </div>
      </form>
      <Link to={"/login"}>로그인</Link>
    </>
  );
};

export default SignUp;
