import React from 'react';

interface ReportLayoutProps {
  title: string;
  summary: React.ReactNode;
  pageOneContent?: React.ReactNode;
  children: React.ReactNode;
}

export const ReportLayout = React.forwardRef<HTMLDivElement, ReportLayoutProps>(({ title, summary, pageOneContent, children }, ref) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div ref={ref} className="print-container hidden print:block bg-transparent min-h-screen font-sans" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
      {/* Company Letterhead (print-only, fixed on every page) */}
      <div className="print-letterhead-fixed" aria-hidden="true" />
      
      {/* Header with Logo and Report Date */}
      <div className="relative pt-24 pb-4 px-8 flex justify-between items-center">
        <img src="https://absstem.com/wp-content/uploads/2025/03/Absstem_logo.svg" alt="Absstem Logo" className="h-12" loading="lazy" crossOrigin="anonymous" />
        <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Report Date: {currentDate}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-6 report-content">
        <div className="print-page">
          {/* Title Section */}
          <div className="text-center mb-10 border-b-4 border-blue-700 pb-8">
            <h1 className="text-5xl text-gray-800 mb-3" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{title}</h1>
            <div className="w-32 h-1.5 bg-gradient-to-r from-blue-700 to-green-500 mx-auto rounded-full"></div>
          </div>

          {/* Executive Summary */}
          <div className="mb-10">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-8 border-blue-700 p-8 rounded-r-xl shadow-lg">
              <div className="flex items-center mb-5">
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-lg" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>ES</span>
                </div>
                <h2 className="text-3xl text-gray-800" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Executive Summary</h2>
              </div>
              <div className="text-gray-700 leading-relaxed text-lg text-justify" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                {summary}
              </div>
            </div>
          </div>
          {pageOneContent}
        </div>

        {/* Report Content */}
        <div className="space-y-10">
          {children}
        </div>
      </div>

      {/* Page Break and Footer Styles for PDF */}
      <style>{`
        @font-face {
          font-family: 'Lufga';
          src: url('/fonts/Lufga-Regular.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Lufga';
          src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
          font-weight: 600;
          font-style: normal;
        }
        @media print {
          .print-container {
            font-family: 'Lufga', 'Helvetica', 'Arial', sans-serif;
          }
          .print-page {
            page-break-after: always;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          .print-page-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 10px 40px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 9pt;
            color: #4b5563;
            background: transparent;
          }
        }
      `}</style>
    </div>
  );
});