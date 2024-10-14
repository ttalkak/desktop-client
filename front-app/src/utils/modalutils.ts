
// 모달을 열기
export function openModal(setIsOpen: React.Dispatch<React.SetStateAction<boolean>>, setContent: React.Dispatch<React.SetStateAction<string>>, content: string) {
    setContent(content);   
    setIsOpen(true);        
}
// 모달을 닫기
export function closeModal(setIsOpen: React.Dispatch<React.SetStateAction<boolean>>) {
setIsOpen(false);     
}
