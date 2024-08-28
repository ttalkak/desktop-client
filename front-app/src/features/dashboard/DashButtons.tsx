
const DashButtons = () => {
  
  
  return ( <>
  
  
  <div className="border-2 border-slate-400">

  <p>현재 유저에게 할당된 github소스코드</p>


  <p>소스 코드 목록 : back에서 할당해준거 받아온 목록</p>
  <ul>
  <li>dummy 들어감</li>
  </ul>
  <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800" 
  onClick={()=>{console.log('클릭')}}>깃 파일 zip으로 다운받기</button>
  </div>
    <br />
    
<div className="border-2 border-slate-400">


  <p>유저 프로필</p>
  <p>현재 번 돈 : </p>
  <p>총 작업시간 : </p>

  </div>
  </>

  )
}

export default DashButtons