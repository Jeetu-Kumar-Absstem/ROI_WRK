import React from 'react';

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-3">Absstem Technologies</h3>
            <p className="text-sm">Experts in PSA Gas Generation.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="https://absstem.com/aboutus/" target="_blank" rel="noreferrer" className="hover:text-white">About Us</a></li>
              <li><a href="https://absstem.com/" target="_blank" rel="noreferrer" className="hover:text-white">Products</a></li>
              <li><a href="https://absstem.com/" target="_blank" rel="noreferrer" className="hover:text-white">Solutions</a></li>
              <li><a href="https://absstem.com/" target="_blank" rel="noreferrer" className="hover:text-white">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="https://absstem.com/" target="_blank" rel="noreferrer" className="hover:text-white">Website</a></li>
              <li><a href="https://absstem.com/aboutus/" target="_blank" rel="noreferrer" className="hover:text-white">Company Story</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-700 text-sm text-gray-400 flex flex-wrap items-center justify-between">
          <p>© {year} Absstem Technologies. All rights reserved.</p>
          <a href="https://absstem.com/" target="_blank" rel="noreferrer" className="hover:text-white">Visit absstem.com</a>
        </div>
      </div>
    </footer>
  );
}