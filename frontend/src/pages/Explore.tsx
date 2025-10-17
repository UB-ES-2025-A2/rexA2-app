import React, { useState, useEffect } from 'react';
//
function Explore() {
  const [routes, setRoutes] = useState<RouteType[]>([]);
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
