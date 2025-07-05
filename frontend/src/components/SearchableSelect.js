import React, { useState, useEffect } from 'react';

// Composant de sélection avec saisie amélioré
const SearchableSelect = ({ options, value, onChange, placeholder, displayField = "name", valueField = "id", searchFields = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option => {
        // Recherche principale sur le champ d'affichage
        const mainMatch = option[displayField].toLowerCase().includes(searchTerm.toLowerCase());
        
        // Recherche sur les champs additionnels spécifiés
        const additionalMatches = searchFields.some(field => {
          const fieldValue = option[field];
          return fieldValue && fieldValue.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
        
        // Recherche sur les propriétés de l'objet imbriqué (pour les connexions)
        let connectionMatch = false;
        if (option.connection) {
          connectionMatch = 
            option.connection.line_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            option.connection.operator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            option.connection.connection_type?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        return mainMatch || additionalMatches || connectionMatch;
      });
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options, displayField, searchFields]);

  const selectedOption = options.find(option => option[valueField] === value);

  const handleSelect = (option) => {
    onChange(option[valueField]);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative">
      <div
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer bg-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedOption ? selectedOption[displayField] : placeholder}
        <span className="float-right text-gray-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none"
            placeholder="Rechercher par numéro de ligne, gare, opérateur..."
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-sm">
                Aucun résultat pour "{searchTerm}"
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option[valueField]}
                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  onClick={() => handleSelect(option)}
                >
                  <div className="text-sm font-medium text-gray-900">
                    {option[displayField]}
                  </div>
                  {option.connection && (
                    <div className="text-xs text-gray-500 mt-1">
                      🔍 Recherche: {option.connection.line_number} • {option.connection.operator}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {filteredOptions.length > 0 && searchTerm && (
            <div className="px-3 py-2 bg-blue-50 text-xs text-blue-600 border-t">
              💡 {filteredOptions.length} résultat(s) trouvé(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;