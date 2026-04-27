import React from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { getISTDateTimeForFilename } from '../utils/formatting';
import { supabase } from '../utils/supabaseClient';

interface DownloadPdfButtonProps {
  contentToPrint: React.RefObject<HTMLDivElement>;
  tabName: string;
  inputs?: any;
}

const DownloadPdfButton: React.FC<DownloadPdfButtonProps> = ({ contentToPrint, tabName, inputs }) => {
  const handleDownloadPdf = async () => {
    if (contentToPrint.current) {
      try {
        contentToPrint.current.classList.add('export-mode');

        const captureScale = 1.5;
        const pageJpegQuality = 0.82;
        const letterheadJpegQuality = 0.75;
        const letterheadTargetWidthPx = 1240;
        const letterheadTargetHeightPx = 1754;

        const toDataUrl = async (url: string) => {
          const res = await fetch(url);
          const blob = await res.blob();
          return await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        };

        const letterheadDataUrl = await toDataUrl('/letterhead.jpg.jpeg');

        const loadImage = (src: string) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
          });

        const letterheadImg = await loadImage(letterheadDataUrl);

        const compressImageToJpegDataUrl = (img: HTMLImageElement, widthPx: number, heightPx: number, quality: number) => {
          const canvas = document.createElement('canvas');
          canvas.width = widthPx;
          canvas.height = heightPx;
          const ctx = canvas.getContext('2d');
          if (!ctx) return letterheadDataUrl;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          return canvas.toDataURL('image/jpeg', quality);
        };

        const letterheadCompressedDataUrl = compressImageToJpegDataUrl(
          letterheadImg,
          letterheadTargetWidthPx,
          letterheadTargetHeightPx,
          letterheadJpegQuality
        );

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const marginLeft = 10;
        const marginRight = 10;
        const topMargin = 25;
        const bottomMargin = 20;

        const contentWidth = pdfWidth - marginLeft - marginRight;
        const contentPageHeight = pdfHeight - topMargin - bottomMargin;

        const pageNodes = contentToPrint.current.querySelectorAll('.print-page');
        const canvases: HTMLCanvasElement[] = [];

        if (pageNodes.length > 0) {
          for (const node of Array.from(pageNodes)) {
            const canvas = await html2canvas(node as HTMLElement, {
              scale: captureScale,
              useCORS: true,
              backgroundColor: '#ffffff',
            });
            canvases.push(canvas);
          }
        } else {
          const canvas = await html2canvas(contentToPrint.current, {
            scale: captureScale,
            useCORS: true,
            backgroundColor: '#ffffff',
          });
          canvases.push(canvas);
        }

        let isFirstPage = true;
        let currentPage = 1;
        const totalPages = canvases.length;

        for (const canvas of canvases) {
          if (!isFirstPage) pdf.addPage();
          isFirstPage = false;

          pdf.addImage(letterheadCompressedDataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

          const imgData = canvas.toDataURL('image/jpeg', pageJpegQuality);
          pdf.addImage(imgData, 'JPEG', marginLeft, topMargin, contentWidth, contentPageHeight);

          pdf.setFontSize(9);
          pdf.text(`Page ${currentPage} of ${totalPages}`, pdfWidth / 2, pdfHeight - 8, { align: 'center' });

          currentPage++;
        }

        const taSafe = tabName.replace(/\s+/g, '_');
        const timestamp = getISTDateTimeForFilename();
        const filename = `Report-${taSafe}-${timestamp}.pdf`;

        const blob = pdf.output('blob');
        const pdfBase64 = pdf.output('datauristring');

        // ✅ Get session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
          alert('User not authenticated');
          return;
        }

        // ✅ Save calculation (unchanged)
        if (inputs) {
          await supabase.from('calculations').insert({
            user_id: session.user.id,
            user_email: session.user.email,
            tab_type: tabName,
            inputs,
            pdf_downloaded: true,
            pdf_downloaded_at: new Date().toISOString(),
          });
        }

        // ✅ FIXED: Direct fetch instead of functions.invoke
        try {
          console.log("Calling email API...");

          const response = await fetch(
            "https://opsjzgbzwtocquwwraui.supabase.co/functions/v1/send-calculation-email",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                pdfBase64,
                tabName,
              }),
            }
          );

          const result = await response.json();

          if (!response.ok) {
            console.error("API error:", result);
          } else {
            console.log("Email sent:", result);
          }

        } catch (err) {
          console.error("EMAIL ERROR:", err);
        }

        // Download PDF
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 15000);

      } finally {
        contentToPrint.current?.classList.remove('export-mode');
      }
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md"
    >
      <Download className="mr-2 h-4 w-4" />
      Download PDF
    </button>
  );
};

export default DownloadPdfButton;