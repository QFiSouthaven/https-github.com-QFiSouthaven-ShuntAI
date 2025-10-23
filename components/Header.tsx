
import React from 'react';
import { ShuntIcon } from './icons';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-10 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        <ShuntIcon className="w-8 h-8 mr-3 text-cyan-400" />
        <h1 className="text-2xl font-bold tracking-wider text-gray-100">
          AI Content <span className="text-cyan-400">Shunt</span>
        </h1>
      </div>
    </header>
  );
};

export default Header;
