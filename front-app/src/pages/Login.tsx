import { useState } from "react";
import { Link } from "react-router-dom";

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    console.log(userId, password);
  };

  return (
    <>
      <div>로그인 페이지</div>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="userId">아이디</label>
          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="아이디를 입력하세요"
            required
          />
        </div>

        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            required
          />
        </div>
        <div>
          <button type="submit">로그인</button>
        </div>
      </form>
      <Link to={"/signup"}>회원가입</Link>
    </>
  );
};

export default Login;
