import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateEmotionPDF = (emotionData) => {
  try {
    console.log('🔄 Starting PDF generation with data:', emotionData);
    const pdf = new jsPDF();
    
    const primaryColor = [102, 126, 234];
    const secondaryColor = [118, 75, 162];
    const textColor = [33, 37, 41];
    
    // Header
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 40, 'F');
    
    // Title
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🧠 Emotion Analysis Report', 20, 25);
    
    // Timestamp
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const timestamp = new Date(emotionData.timestamp).toLocaleString();
    pdf.text(`Generated on: ${timestamp}`, 20, 35);
    
    // Reset text color
    pdf.setTextColor(...textColor);
    
    // Primary Emotion Section
    let yPosition = 60;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Primary Emotion Detected', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    
    // Primary emotion box
    pdf.setFillColor(240, 248, 255);
    pdf.rect(20, yPosition - 5, 170, 30, 'F');
    pdf.setDrawColor(...primaryColor);
    pdf.rect(20, yPosition - 5, 170, 30);
    
    const primaryEmotion = emotionData.dominant_emotion.charAt(0).toUpperCase() + 
                          emotionData.dominant_emotion.slice(1);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${primaryEmotion}`, 25, yPosition + 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Confidence: ${emotionData.confidence.toFixed(1)}%`, 25, yPosition + 20);
    
    // Detailed Breakdown Section
    yPosition += 50;
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detailed Emotion Breakdown', 20, yPosition);
    
    // Prepare table data
    const tableData = Object.entries(emotionData.all_emotions)
      .sort(([,a], [,b]) => b - a)
      .map(([emotion, percentage]) => [
        emotion.charAt(0).toUpperCase() + emotion.slice(1),
        `${percentage.toFixed(1)}%`,
        getEmotionLevel(percentage)
      ]);
    
    yPosition += 10;
    
    // Create table
    pdf.autoTable({
      startY: yPosition,
      head: [['Emotion', 'Percentage', 'Level']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 11,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'center' },
        2: { halign: 'center' }
      }
    });
    
    // Analysis Summary
    yPosition = pdf.lastAutoTable.finalY + 20;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Analysis Summary', 20, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Total Emotions Detected:', Object.keys(emotionData.all_emotions).length.toString()],
      ['Highest Confidence:', `${Math.max(...Object.values(emotionData.all_emotions)).toFixed(1)}%`],
      ['Analysis Method:', 'Local AI Processing'],
      ['Privacy Status:', '🔒 Processed locally - No data shared']
    ];
    
    pdf.autoTable({
      startY: yPosition,
      body: summaryData,
      theme: 'plain',
      styles: {
        fontSize: 11,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 100 }
      }
    });
    
    // Footer
    const pageHeight = pdf.internal.pageSize.height;
    pdf.setFillColor(...secondaryColor);
    pdf.rect(0, pageHeight - 25, 210, 25, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Autism Screening Tool - Emotion Analysis Report', 20, pageHeight - 15);
    pdf.text('🔒 Your privacy is protected - All analysis done locally', 20, pageHeight - 8);
    
    // Generate filename with timestamp
    const fileName = `emotion-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Download the PDF
    pdf.save(fileName);
    
    return { success: true, fileName };
    
  } catch (error) {
    console.error('PDF generation error:', error);
    return { success: false, error: error.message };
  }
};

const getEmotionLevel = (percentage) => {
  if (percentage > 50) return 'High';
  if (percentage > 30) return 'Moderate';
  if (percentage > 15) return 'Low';
  return 'Minimal';
};