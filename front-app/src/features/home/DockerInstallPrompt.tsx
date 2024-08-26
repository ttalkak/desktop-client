import React, { useState } from 'react';

const DockerInstallPrompt: React.FC = () => {
  // 토글 상태 관리
  const [showDetails, setShowDetails] = useState<boolean>(false);

  // 토글 버튼 클릭 시 상태 변경
  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div style={styles.container}>
      <h2>Docker Desktop 설치 안내</h2>
      <p>
        Docker를 사용하여 애플리케이션을 실행하거나 개발하기 위해서는 로컬 환경에 Docker Desktop을 설치해야 합니다.
      </p>

      {/* Docker Desktop 다운로드 링크 */}
      <a href="https://www.docker.com/products/docker-desktop" target="_blank" rel="noopener noreferrer" style={styles.link}>
        Docker Desktop 다운로드 페이지
      </a>

      {/* 토글 버튼 */}
      <button onClick={toggleDetails} style={styles.toggleButton}>
        {showDetails ? '설치 안내 숨기기' : '설치 안내 보기'}
      </button>

      {/* 토글된 내용 */}
      {showDetails && (
        <div style={styles.details}>
          <h3>Docker Desktop 설치 방법:</h3>
          <ol>
            <li>
              <strong>Docker Desktop 다운로드:</strong>
              <p>
                위의 링크를 클릭하여 Docker 공식 웹사이트에서 Docker Desktop을 다운로드하세요.
              </p>
            </li>
            <li>
              <strong>설치 가이드:</strong>
              <p>
                다운로드가 완료되면, 설치 프로그램을 실행하여 안내에 따라 설치를 진행합니다. 설치 과정 중에 기본 설정을 유지하거나, 필요에 따라 설정을 변경할 수 있습니다.
              </p>
            </li>
            <li>
              <strong>Docker Desktop 실행:</strong>
              <p>
                설치가 완료되면, Docker Desktop을 실행합니다. 처음 실행 시 Docker가 시스템에서 작동할 수 있도록 권한을 요청할 수 있습니다. Docker Desktop이 정상적으로 실행되면, Docker 아이콘이 시스템 트레이(Windows) 또는 메뉴 바(macOS)에 표시됩니다.
              </p>
            </li>
            <li>
              <strong>Docker CLI 확인:</strong>
              <p>
                터미널(명령 프롬프트 또는 PowerShell)에서 <code>docker --version</code> 명령어를 입력하여 Docker가 정상적으로 설치되었는지 확인할 수 있습니다. Docker 버전이 출력되면, Docker가 정상적으로 설치된 것입니다.
              </p>
            </li>
          </ol>

          <h3>참고:</h3>
          <ul>
            <li>Docker Desktop은 Windows 10 이상, macOS 10.15 이상에서 지원됩니다.</li>
            <li>설치 중 문제가 발생하면, Docker 공식 문서나 설치 가이드를 참고하세요.</li>
          </ul>

          <h3>도움이 필요하신가요?</h3>
          <p>
            Docker 설치 및 설정에 대한 자세한 내용은 <a href="https://docs.docker.com/get-docker/" target="_blank" rel="noopener noreferrer" style={styles.link}>공식 문서</a>를 참조하세요. 설치 후 Docker를 어떻게 사용하는지에 대해 더 알고 싶다면 <a href="https://docs.docker.com/get-started/" target="_blank" rel="noopener noreferrer" style={styles.link}>Docker 시작하기</a> 가이드를 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
};

// 스타일링
const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
  } as React.CSSProperties,
  link: {
    color: '#007bff',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '10px',
  } as React.CSSProperties,
  toggleButton: {
    marginTop: '10px',
    padding: '10px 15px',
    fontSize: '16px',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
  } as React.CSSProperties,
  details: {
    marginTop: '20px',
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '5px',
    boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
};

export default DockerInstallPrompt;
