import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';

export default function CannedResponseManager({ onSelect }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadResponses = async () => {
    setLoading(true);
    apiRequest('/canned-responses')
      .then(setResponses)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next && responses.length === 0) {
        loadResponses();
      }
      return next;
    });
  };

  return (
    <div className="canned-response-manager">
      <button 
        type="button" 
        className="btn-ghost btn-sm"
        onClick={handleToggle}
      >
        ⚡ Respuestas Rápidas
      </button>

      {isOpen && (
        <div className="canned-dropdown">
          <div className="dropdown-header">
            <span>Plantillas disponibles</span>
            <button onClick={() => setIsOpen(false)}>&times;</button>
          </div>
          <div className="dropdown-content">
            {loading ? (
              <p>Cargando...</p>
            ) : responses.length === 0 ? (
              <p>No hay plantillas configuradas.</p>
            ) : (
              responses.map(resp => (
                <div 
                  key={resp.id} 
                  className="canned-item"
                  onClick={() => {
                    onSelect(resp.content);
                    setIsOpen(false);
                  }}
                >
                  <strong>{resp.title}</strong>
                  <span className="category">{resp.category}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
