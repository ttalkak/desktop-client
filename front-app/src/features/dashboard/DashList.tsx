import DashListItem from "./DashListItem"
import DummyItem from "./DummyItem"


const DashList = () => {
  
const DummyData =  DummyItem

  return (
    <>
    <p className="font-mono text-4xl">DashBoard</p>
    
    {DummyData.map((project, index) => (
        <DashListItem  key={index} project={project} />
      ))}
    </>
  )
}

export default DashList