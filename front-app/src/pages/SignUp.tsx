import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../axios/constants";
import { login } from "../axios/auth";
import { SlArrowDown, SlArrowUp } from "react-icons/sl";
import logoImg from "./../assets/images/logo.png";

const SignUp = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null); // 아이디 길이
  const [pwLengthError, setPwLengthError] = useState<string | null>(null); // 비밀번호 길이
  const [passwordError, setPasswordError] = useState<string | null>(null); // 비밀번호 불일치
  const [emailError, setEmailError] = useState<string | null>(null); // 이메일 유효성
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false); // 토글 상태
  const [isAgreementHighlighted, setIsAgreementHighlighted] = useState(false); // 동의하지 않으면 하이라이트
  const [dynamicMargin, setDynamicMargin] = useState("mt-4");
  const navigate = useNavigate();

  useEffect(() => {
    if (username.length > 0 && username.length < 8) {
      setUsernameError("아이디는 8자 이상이어야 합니다");
    } else {
      setUsernameError(null);
    }
  }, [username]);

  useEffect(() => {
    if (password1.length > 0 && password1.length < 8) {
      setPwLengthError("비밀번호는 8자 이상이어야 합니다");
    } else {
      setPwLengthError(null);
    }
  }, [password1]);

  useEffect(() => {
    if (email.length > 0 && !email.includes("@")) {
      setEmailError("이메일 형식이 아닙니다");
    } else {
      setEmailError(null);
    }
  }, [email]);

  useEffect(() => {
    if (
      password1.length > 0 &&
      password2.length > 0 &&
      password1 !== password2
    ) {
      setPasswordError("비밀번호가 일치하지 않습니다");
    } else {
      setPasswordError(null);
    }
  }, [password1, password2]);

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
        setErrorMessage(message);
      }
    } catch (error) {
      console.log(error);
      setErrorMessage("회원가입 중 오류가 발생했습니다.");
    }
  };

  const handleSignUp = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAgreed) {
      setIsAgreementHighlighted(true);
      return;
    }
    if (passwordError) {
      return;
    }
    if (usernameError) {
      return;
    }
    setErrorMessage(null);
    signUp();
  };

  useEffect(() => {
    // 화면 높이에 따라 동적으로 마진을 설정하는 함수
    const applyMarginBasedOnHeight = () => {
      const height = window.innerHeight;

      if (height < 700) {
        setDynamicMargin("mt-3");
      } else if (height < 800) {
        setDynamicMargin("mt-8");
      } else {
        setDynamicMargin("mt-14");
      }
    };

    applyMarginBasedOnHeight();
    window.addEventListener("resize", applyMarginBasedOnHeight);

    return () => {
      window.removeEventListener("resize", applyMarginBasedOnHeight);
    };
  }, []);

  const lbl = "text-sm mb-0.5 text-color-4";
  const ipt =
    "shadow-inner border border-color-2 p-2 mb-2 w-full rounded text-sm";
  const haveMsg = "flex items-center";
  const btn = `mt-6 rounded w-full bg-color-9 text-white py-2`;
  const errorMsg = "ml-2 text-color-8 text-sm";

  return (
    <div className="h-full card overflow-auto custom-scrollbar">
      <div className={`w-4/12 min-w-96 mx-auto pt-3 pb-4 ${dynamicMargin}`}>
        <div className="flex justify-center mb-6">
          <img
            style={{ width: "40px", height: "22px" }}
            src={logoImg}
            alt="Ttalkak"
          />
        </div>
        <form onSubmit={handleSignUp}>
          <div className="flex flex-col">
            <label className={`${lbl} ${haveMsg}`} htmlFor="userId">
              <div>아이디</div>
              {usernameError && <div className={errorMsg}>{usernameError}</div>}
            </label>
            <input
              id="userId"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={ipt}
            />
          </div>

          <div className="flex flex-col">
            <label className={`${lbl} ${haveMsg}`} htmlFor="email">
              <div>이메일</div>
              {email && <div className={errorMsg}>{emailError}</div>}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={ipt}
            />
          </div>

          <div className="flex flex-col">
            <label className={`${lbl} ${haveMsg}`} htmlFor="password1">
              <div>비밀번호</div>
              {pwLengthError && <div className={errorMsg}>{pwLengthError}</div>}
            </label>
            <input
              id="password1"
              type="password"
              value={password1}
              onChange={(e) => setPassword1(e.target.value)}
              required
              className={ipt}
            />
          </div>

          <div className="flex flex-col">
            <label className={`${lbl} ${haveMsg}`} htmlFor="password2">
              <div>비밀번호 확인</div>
              {passwordError && <div className={errorMsg}>{passwordError}</div>}
            </label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className={ipt}
            />
          </div>

          <hr className="mt-2 mb-2 border-color-2" />

          <div
            className={`mt-4 border rounded px-4 py-2.5 bg-white ${
              isAgreementHighlighted && !isAgreed
                ? "border-color-8"
                : "border-color-2"
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => {
                    setIsAgreed(e.target.checked);
                    setIsAgreementHighlighted(false); // 동의하면 하이라이트 제거
                  }}
                  className="mr-2"
                />
                [필수] 인증 약관 전체동의
              </label>
              <button
                type="button"
                className="flex items-center"
                onClick={() => setIsTermsOpen(!isTermsOpen)}
              >
                {isTermsOpen ? (
                  <SlArrowUp size={12} color="#919191" />
                ) : (
                  <SlArrowDown size={12} color="#919191" />
                )}
              </button>
            </div>

            {isTermsOpen && (
              <div className="mt-4 border-l-4 border-color-2 pl-4 text-sm">
                <div className="mb-1.5">컴퓨터 자원 사용 및 로그 수집</div>
                <div className="mb-1.5">프로그램 자동 설치 및 실행</div>
                <div>수익 배분 및 수수료 부과</div>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="text-color-8 text-sm mt-2.5">{errorMessage}</div>
          )}
          <div>
            <button className={btn} type="submit">
              가입하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
