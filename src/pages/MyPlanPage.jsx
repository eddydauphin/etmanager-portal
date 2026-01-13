// MyPlanPage - Redirects to Development Center
// The Development Center now handles all coaching/development activities

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function MyPlanPage() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Development Center which handles all development activities
    navigate('/development', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
