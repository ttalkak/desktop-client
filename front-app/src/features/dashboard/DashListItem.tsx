

const DashListItem = ({ project }) => {
  return (
    <tr>
      <td className="py-2 px-4 border-b">{project.name}</td>
      <td className="py-2 px-4 border-b">
        <a href="#" className="text-blue-600 underline">
          {project.image}
        </a>
      </td>
      <td
        className={`py-2 px-4 border-b ${
          project.status.includes('Running') ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {project.status}
      </td>
      <td className="py-2 px-4 border-b">{project.ports}</td>
      <td className="py-2 px-4 border-b">{project.cpu}</td>
      <td className="py-2 px-4 border-b">{project.lastStarted}</td>
      <td className="py-2 px-4 border-b">
        <div className="flex space-x-2">
          <button className="text-green-600">Start</button>
          <button className="text-gray-600">...</button>
          <button className="text-red-600">Delete</button>
        </div>
      </td>
    </tr>
  );
};

export default DashListItem;
