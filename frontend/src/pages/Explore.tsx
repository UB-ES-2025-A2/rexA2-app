import { useState, useEffect } from 'react';


type RouteType = {
  id: string;
  name: string;
};
function Explore() {
  const [routes] = useState<RouteType[]>([]);
  useEffect(() => {
    
  }, []);
  return (
    <div>
      <h1>Explorar Rutas</h1>
      <ul>
        {routes.map(r => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
    </div>
  );
}
export default Explore;
