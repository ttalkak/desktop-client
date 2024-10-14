interface ModalProps {
    isOpen : boolean;
    onClose : ()=>void;
    content :  string;
}


const Modal: React.FC<ModalProps> = ({isOpen, onClose, content}) => {
    if (!isOpen) return null;

    return(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold">Login</h2>
            <p className="mt-4">{content}</p>
            <button
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded"
              onClick={onClose}  
              >
            Close
            </button>
        </div>
      </div>
    )


}

export default Modal
