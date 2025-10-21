import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import './Results.css';

export default function Results({ data }) {
  const [fileName, setFileName] = useState('AI_Recommendations.pdf');
  const [showPopup, setShowPopup] = useState(false);

  // Function to get emoji for each emotion
  const getEmotionEmoji = (emotion) => {
    const emotionEmojis = {
      happy: '😊',
      sad: '😢', 
      angry: '😠',
      fear: '😨',
      surprise: '😲',
      disgust: '🤢',
      neutral: '😐'
    };
    return emotionEmojis[emotion.toLowerCase()] || '😐';
  };

  if (!data) {
    return (
      <div className="results-card">
        <h2 className="results-title">AI Recommendations</h2>
        <p className="results-placeholder">No analysis yet. Fill the form and click Analyze.</p>
      </div>
    );
  }

  async function downloadPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ===== HEADER SECTION =====
    // Add decorative border
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(2);
    doc.rect(10, 10, 190, 277, 'S');
    
    // Add inner border
    doc.setLineWidth(0.5);
    doc.rect(15, 15, 180, 267, 'S');

    // Hospital/Clinic Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210);
    doc.text('AUTISM SPECTRUM ASSESSMENT REPORT', 105, 30, { align: 'center' });
    
    // Professional subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('AI-Powered Developmental Evaluation & Therapeutic Recommendations', 105, 38, { align: 'center' });
    
    // Date and time with formal styling
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Report Generated: ${formattedDate} at ${formattedTime}`, 105, 48, { align: 'center' });
    
    // Divider line
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(1);
    doc.line(20, 55, 190, 55);

    let y = 70;

    // ===== CHILD INFORMATION TABLE =====
    if (data._input) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 118, 210);
      doc.text('CHILD INFORMATION', 20, y);
      y += 10;

      // Create professional table
      const tableData = [
        ['Field', 'Information'],
        ['Child\'s Name', data._input.child_name || 'Not Provided'],
        ['Age', `${data._input.age} years old`],
        ['Father\'s Name', data._input.father_name || 'Not Provided'],
        ['Mother\'s Name', data._input.mother_name || 'Not Provided'],
        ['Eye Contact Pattern', data._input.eye_contact],
        ['Communication Level', data._input.speech_level],
        ['Social Interaction', data._input.social_response],
        ['Sensory Processing', data._input.sensory_reactions]
      ];

      // Table styling
      const startX = 20;
      const startY = y;
      const cellWidth = 85;
      const cellHeight = 8;
      
      tableData.forEach((row, rowIndex) => {
        const currentY = startY + (rowIndex * cellHeight);
        
        // Header row styling
        if (rowIndex === 0) {
          doc.setFillColor(25, 118, 210);
          doc.rect(startX, currentY, cellWidth, cellHeight, 'F');
          doc.rect(startX + cellWidth, currentY, cellWidth, cellHeight, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
        } else {
          // Alternating row colors
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 249, 250);
            doc.rect(startX, currentY, cellWidth * 2, cellHeight, 'F');
          }
          doc.setTextColor(50, 50, 50);
          doc.setFont('helvetica', rowIndex === 0 ? 'bold' : 'normal');
          doc.setFontSize(10);
        }
        
        // Draw cell borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(startX, currentY, cellWidth, cellHeight, 'S');
        doc.rect(startX + cellWidth, currentY, cellWidth, cellHeight, 'S');
        
        // Add text
        doc.text(row[0], startX + 2, currentY + 5.5);
        doc.text(row[1], startX + cellWidth + 2, currentY + 5.5);
      });

      y = startY + (tableData.length * cellHeight) + 15;
    }

    // ===== CLINICAL ASSESSMENT SECTIONS =====
    
    // Focus Areas Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 118, 210);
    doc.text('CLINICAL FOCUS AREAS', 20, y);
    y += 8;
    
    doc.setDrawColor(25, 118, 210);
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 10;

    if (data.focus_areas && data.focus_areas.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      data.focus_areas.forEach((area, index) => {
        doc.text(`${index + 1}. ${area}`, 25, y);
        y += 6;
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text('• General developmental support recommended', 25, y);
      y += 6;
    }
    y += 8;

    // Therapy Goals Section
    // Check if we need a new page
    if (y > 220) {
      doc.addPage();
      y = 30;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 118, 210);
    doc.text('THERAPEUTIC OBJECTIVES', 20, y);
    y += 8;
    
    doc.setDrawColor(25, 118, 210);
    doc.line(20, y, 190, y);
    y += 10;

    if (data.therapy_goals && data.therapy_goals.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      data.therapy_goals.forEach((goal, index) => {
        const lines = doc.splitTextToSize(`${index + 1}. ${goal}`, 165);
        lines.forEach(line => {
          if (y > 270) {
            doc.addPage();
            y = 30;
          }
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
    }
    y += 8;

    // Activities Section
    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = 30;
    }
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(25, 118, 210);
    doc.text('RECOMMENDED ACTIVITIES', 20, y);
    y += 8;
    
    doc.setDrawColor(25, 118, 210);
    doc.line(20, y, 190, y);
    y += 10;

    if (data.activities && data.activities.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      data.activities.forEach((activity, index) => {
        const lines = doc.splitTextToSize(`• ${activity}`, 165);
        lines.forEach(line => {
          if (y > 270) {
            doc.addPage();
            y = 30;
          }
          doc.text(line, 25, y);
          y += 5;
        });
        y += 2;
      });
    }
    y += 10;

    // Professional Notes/Recommendations
    if (data.notes || data.clinical_notes) {
      // Check if we need a new page
      if (y > 240) {
        doc.addPage();
        y = 30;
      }
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(25, 118, 210);
      doc.text('CLINICAL NOTES & RECOMMENDATIONS', 20, y);
      y += 8;
      
      doc.setDrawColor(25, 118, 210);
      doc.line(20, y, 190, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const notes = data.clinical_notes || data.notes;
      const noteLines = doc.splitTextToSize(notes, 165);
      noteLines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 30;
        }
        doc.text(line, 25, y);
        y += 5;
      });
    }

    // Check if we need space for footer
    if (y > 260) {
      doc.addPage();
      y = 30;
    }

    // Footer (always at bottom of last page)
    const pageHeight = 297; // A4 height in mm
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text('This report is generated by AI and should be reviewed by qualified healthcare professionals.', 105, pageHeight - 15, { align: 'center' });
    doc.text('For clinical consultation, please contact your pediatric development specialist.', 105, pageHeight - 10, { align: 'center' });

    // Save the PDF
    doc.save(fileName || 'Autism_Assessment_Report.pdf');
    
    // Show success popup
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 3000);
  }

  return (
    <div className="results-card">
      <h2 className="results-title">AI Recommendations</h2>
      
      {/* Input Data section removed from display - only shown in PDF */}

      <div className="results-section">
        <h3 className="results-subtitle">Focus Areas</h3>
        <ul className="results-list">
          {data.focus_areas.map((item, index) => (
            <li key={index} className="results-item">- {item}</li>
          ))}
        </ul>
      </div>

      <div className="results-section">
        <h3 className="results-subtitle">Therapy Goals</h3>
        <ol className="results-list">
          {data.therapy_goals.map((item, index) => (
            <li key={index} className="results-item">{index + 1}. {item}</li>
          ))}
        </ol>
      </div>

      <div className="results-section">
        <h3 className="results-subtitle">Activities</h3>
        <ul className="results-list">
          {data.activities.map((item, index) => (
            <li key={index} className="results-item">- {item}</li>
          ))}
        </ul>
      </div>

      {/* Emotion Analysis Section - Optional */}
      <div className="results-section">
        <h3 className="results-subtitle">🎭 Emotional Assessment</h3>
        {data.emotion_analysis ? (
          <div className="emotion-analysis-card">
            <div className="primary-emotion">
              <span className="emotion-label">Primary Emotion:</span>
              <span className="emotion-value">
                {getEmotionEmoji(data.emotion_analysis.dominant_emotion)} {data.emotion_analysis.dominant_emotion.charAt(0).toUpperCase() + 
                 data.emotion_analysis.dominant_emotion.slice(1)}
              </span>
              <span className="confidence-badge">
                {data.emotion_analysis.confidence?.toFixed(1) || 'N/A'}% confidence
              </span>
            </div>
            <div className="emotion-breakdown">
              <h4>Detailed Emotion Analysis:</h4>
              <div className="emotion-grid">
                {Object.entries(data.emotion_analysis.all_emotions || {}).map(([emotion, percentage]) => (
                  <div key={emotion} className="emotion-item">
                    <span className="emotion-name">{getEmotionEmoji(emotion)} {emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                    <div className="emotion-bar">
                      <div 
                        className="emotion-fill" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                                        <span className="emotion-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="emotion-analysis-card no-emotion">
            <div className="no-emotion-message">
              <span className="no-emotion-icon">📋</span>
              <div className="no-emotion-text">
                <h4>Form-Based Assessment Completed</h4>
                <p>Emotional analysis was not performed as no facial image was provided. Clinical assessment is based on behavioral observations and form responses.</p>
                <small>💡 To include emotion analysis in future assessments, please upload a clear facial image during the form submission.</small>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.therapy_recommendations && (
        <div className="results-section">
          <h3 className="results-subtitle">Professional Therapy Recommendations</h3>
          <ol className="results-list">
            {data.therapy_recommendations.map((item, index) => (
              <li key={index} className="results-item">{index + 1}. {item}</li>
            ))}
          </ol>
        </div>
      )}

      {data.clinical_notes && (
        <div className="results-section">
          <h3 className="results-subtitle">Clinical Notes</h3>
          <p className="results-notes">{data.clinical_notes}</p>
        </div>
      )}

      <div className="download-section">
        <div className="download-container">
          <input
            type="text"
            placeholder="Enter filename"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="filename-input"
          />
          <button className="download-btn" onClick={downloadPDF}>
            📄 Download PDF Report
          </button>
        </div>
      </div>

      {showPopup && (
        <div className="popup">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>✅</span>
            <div>
              <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>Download Complete!</p>
              <p style={{ margin: '5px 0 0', fontSize: '0.9rem', opacity: 0.9 }}>PDF saved successfully</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
