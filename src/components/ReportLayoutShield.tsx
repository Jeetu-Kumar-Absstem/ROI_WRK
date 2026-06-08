import React from 'react';

interface ReportLayoutProps {
  title: string;
  summary: React.ReactNode;
  pageOneContent?: React.ReactNode;
  children: React.ReactNode;
}

export const ReportLayoutShield = React.forwardRef<HTMLDivElement, ReportLayoutProps>(({ title, summary, pageOneContent, children }, ref) => {

  return (
    <div ref={ref} className="print-container hidden print:block bg-transparent min-h-screen font-sans" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
      {/* Shield Letterhead background — class defined in index.css */}
      <div className="print-letterhead-shield-fixed" aria-hidden="true" />

      {/* Main Content — top padding clears letterhead header, bottom padding clears letterhead footer */}
      <div className="px-7 report-content" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
        <div className="print-page">
          {/* Title Section */}
          <div className="text-center mb-8 border-b-4 border-blue-700 pb-7">
            <h1 className="text-4xl text-gray-800 mb-3" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>{title}</h1>
            <div className="w-32 h-1.5 bg-gradient-to-r from-blue-700 to-green-500 mx-auto rounded-full"></div>
          </div>

          {/* Executive Summary */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-8 border-blue-700 p-6 rounded-r-xl shadow-lg">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white text-lg" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>ES</span>
                </div>
                <h2 className="text-2xl text-gray-800" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>Executive Summary</h2>
              </div>
              <div className="text-gray-700 leading-relaxed text-base text-justify" style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
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
        }
      `}</style>
    </div>
  );
});