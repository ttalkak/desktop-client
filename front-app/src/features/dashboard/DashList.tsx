import DashListItem from "./DashListItem"

const DummyData = [
    {
      "project_name": "Website Redesign",
      "start_date": "2024-08-01",
      "start_time": "09:00 AM",
      "is_started": false
    },
    {
      "project_name": "Mobile App Development",
      "start_date": "2024-08-03",
      "start_time": "11:00 AM",
      "is_started": true
    },
    {
      "project_name": "SEO Optimization",
      "start_date": "2024-08-05",
      "start_time": "02:00 PM",
      "is_started": false
    },
    {
      "project_name": "Marketing Campaign",
      "start_date": "2024-08-07",
      "start_time": "10:30 AM",
      "is_started": true
    },
    {
      "project_name": "Backend API Integration",
      "start_date": "2024-08-10",
      "start_time": "01:00 PM",
      "is_started": false
    },
    {
      "project_name": "Product Launch Preparation",
      "start_date": "2024-08-15",
      "start_time": "09:30 AM",
      "is_started": true
    },
    {
      "project_name": "Data Migration",
      "start_date": "2024-08-18",
      "start_time": "03:00 PM",
      "is_started": false
    },
    {
      "project_name": "User Feedback Analysis",
      "start_date": "2024-08-20",
      "start_time": "10:00 AM",
      "is_started": true
    }
  ]
  
console.log(DummyData)
const DashList = () => {
  return (
    <>
    <div>DashList</div>
    
    <DashListItem/>
    </>
  )
}

export default DashList