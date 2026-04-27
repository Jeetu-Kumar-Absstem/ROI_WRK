import React from 'react';
const logoUrl = 'https://absstem.com/wp-content/uploads/2025/03/Absstem_logo.svg';

export default function SiteHeader() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="flex items-center space-x-3">
            <img src={logoUrl} alt="Absstem" className="h-8 w-auto" loading="lazy" />
            <span className="sr-only">Absstem Technologies</span>
          </a>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="text-gray-700 hover:text-blue-700 font-medium">Home</a>
            <a href="https://absstem.com/aboutus/" target="_blank" rel="noreferrer" className="text-gray-700 hover:text-blue-700 font-medium">About Us</a>
            <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="text-gray-700 hover:text-blue-700 font-medium">Products</a>
            <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="text-gray-700 hover:text-blue-700 font-medium">Solutions</a>
            <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="text-gray-700 hover:text-blue-700 font-medium">Contact</a>
          </nav>
          <div className="md:hidden">
            <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-700 hover:bg-blue-50">Visit Website</a>
          </div>
        </div>
      </div>
    </header>
  );
}