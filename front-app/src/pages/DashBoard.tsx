import DashList from "../features/dashboard/DashList";
import DashSummary from "../features/dashboard/DashSummary";
import { useState } from "react";

const DashBoard = () => {
  const [SelectedItem , setSelectedItem] = useState(null)

  const handleSelectedItem = (item)  => {
    setSelectedItem(con)
  }




  return (
    <>

    <DashList/>
    <DashSummary/>
    </>
  ) 
};

export default DashBoard;
