import { Users } from 'lucide-react';

function UsersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-600">Manage user accounts</p>
      </div>
      
      <div className="text-center py-12 bg-white rounded-lg border">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600">User management will be available here</p>
      </div>
    </div>
  );
}

export default UsersPage;