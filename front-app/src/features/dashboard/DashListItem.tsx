import React from 'react';

interface DashListItemProps {
  item: {
    id: string;
    name: string;
    description: string;
    status: string;
  };
}

const DashListItem: React.FC<DashListItemProps> = ({ item }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
      <p className="text-gray-600 mt-2">{item.description}</p>
      <div className="mt-4">
        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${item.status === 'Running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {item.status}
        </span>
      </div>
    </div>
  );
};

export default DashListItem;
