import React, { useState, useRef, useEffect } from 'react';
import './InlineFaceScanner.css';

function InlineFaceScanner({ onEmotionDetected, onImageUpload }) {
  const [mode, setMode] = useState('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [mode]);

  // Strict face detection - only accept clear face images
  const validateFaceImage = async (imageElement) => {
    return new Promise((resolve) => {
      try {
        // Create canvas for image analysis
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const width = imageElement.naturalWidth || imageElement.videoWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.videoHeight || imageElement.height;
        
        // Minimum size requirement for face detection
        if (width < 150 || height < 150) {
          console.log('❌ Image too small for face detection (minimum 150x150px)');
          resolve(false);
          return;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas
        ctx.drawImage(imageElement, 0, 0, width, height);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Advanced face detection metrics
        let skinPixels = 0;
        let eyeAreaPixels = 0;
        let totalPixels = 0;
        let validColorPixels = 0;
        let faceShapePixels = 0;
        
        // Analyze image in regions for face features
        const centerX = width / 2;
        const centerY = height / 2;
        const faceRegionSize = Math.min(width, height) * 0.4; // Expected face region
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            
            totalPixels++;
            
            // Distance from center (for face region analysis)
            const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
            const isInFaceRegion = distFromCenter < faceRegionSize;
            
            // Strict skin tone detection (multiple ranges for different ethnicities)
            const isSkin = (
              // Light skin tones
              (r >= 180 && g >= 140 && b >= 120 && r > g && g > b && (r - b) > 30) ||
              // Medium skin tones
              (r >= 140 && r <= 200 && g >= 100 && g <= 150 && b >= 80 && b <= 120 && r > g && g >= b) ||
              // Olive skin tones  
              (r >= 120 && r <= 180 && g >= 110 && g <= 150 && b >= 70 && b <= 110 && Math.abs(r - g) < 30) ||
              // Darker skin tones
              (r >= 80 && r <= 140 && g >= 60 && g <= 110 && b >= 40 && b <= 90 && r > g && g > b)
            );
            
            if (isSkin) {
              skinPixels++;
              if (isInFaceRegion) {
                faceShapePixels++;
              }
            }
            
            // Eye area detection (darker pixels in upper face region)
            const isInEyeRegion = y < height * 0.6 && y > height * 0.2 && 
                                 x > width * 0.2 && x < width * 0.8;
            if (isInEyeRegion && r < 100 && g < 100 && b < 100) {
              eyeAreaPixels++;
            }
            
            // Count pixels with meaningful color variation (not pure backgrounds)
            if (!(r < 30 && g < 30 && b < 30) && !(r > 220 && g > 220 && b > 220)) {
              validColorPixels++;
            }
          }
        }
        
        // Calculate ratios for face detection
        const skinRatio = skinPixels / totalPixels;
        const validColorRatio = validColorPixels / totalPixels;
        const faceShapeRatio = faceShapePixels / (totalPixels * 0.16); // Expected face area
        const eyeRatio = eyeAreaPixels / (totalPixels * 0.24); // Expected eye area
        
        // Strict criteria for face detection
        const hasSufficientSkin = skinRatio > 0.08;        // At least 8% skin pixels
        const hasValidContent = validColorRatio > 0.5;      // At least 50% meaningful content
        const hasFaceShape = faceShapeRatio > 0.3;          // Face-like shape in center
        const hasEyeFeatures = eyeRatio > 0.02;             // Some darker areas for eyes
        
        // Additional quality checks
        const hasGoodResolution = width >= 200 && height >= 200;
        const aspectRatioOk = (width / height) > 0.5 && (width / height) < 2.0; // Not too stretched
        
        console.log('Face validation metrics:', {
          skinRatio: skinRatio.toFixed(3),
          validColorRatio: validColorRatio.toFixed(3), 
          faceShapeRatio: faceShapeRatio.toFixed(3),
          eyeRatio: eyeRatio.toFixed(3),
          resolution: `${width}x${height}`,
          aspectRatio: (width/height).toFixed(2)
        });
        
        // All criteria must pass for face validation
        const faceDetected = hasSufficientSkin && hasValidContent && hasFaceShape && 
                            hasEyeFeatures && hasGoodResolution && aspectRatioOk;
        
        console.log(`Face validation result: ${faceDetected ? '✅ PASS' : '❌ FAIL'}`);
        resolve(faceDetected);
        
      } catch (error) {
        console.error('Face validation error:', error);
        resolve(false); // Reject if validation fails
      }
    });
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied. Please enable camera or try upload mode.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setError('');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Validate face in captured image
    const faceDetected = await validateFaceImage(video);
    
    if (!faceDetected) {
      setError('❌ No clear face detected. Please ensure: \n• Child\'s face is clearly visible and centered\n• Good lighting on the face\n• Minimum 200x200 pixel resolution\n• Face takes up significant portion of image');
      setIsProcessing(false);
      return;
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        setError('');
        // Notify parent that valid face image is ready
        if (onImageUpload) {
          onImageUpload(true);
        }
        console.log('✅ Valid face image captured and ready for analysis');
      }
      setIsProcessing(false);
    }, 'image/jpeg', 0.8);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('❌ Please select a valid image file (JPG, PNG, GIF)');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create image element for face detection
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      img.onload = async () => {
        // Validate face in uploaded image
        const faceDetected = await validateFaceImage(img);
        
        if (!faceDetected) {
          setError('❌ No clear face detected in uploaded image. Please ensure: \n• Child\'s face is the main subject\n• Face is clearly visible and not blurry\n• Good lighting without shadows\n• Image is at least 200x200 pixels\n• Avoid group photos or distant shots');
          setIsProcessing(false);
          URL.revokeObjectURL(imageUrl);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }

        // Valid face detected
        setCapturedImage(imageUrl);
        setError('');
        // Notify parent that valid face image is uploaded
        if (onImageUpload) {
          onImageUpload(true);
        }
        console.log('✅ Valid face image uploaded and ready for analysis');
        setIsProcessing(false);
      };

      img.onerror = () => {
        setError('❌ Failed to load image. Please try another image.');
        setIsProcessing(false);
        URL.revokeObjectURL(imageUrl);
      };

      img.src = imageUrl;
    } catch (err) {
      console.error('Upload error:', err);
      setError('❌ Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  const analyzeEmotion = async (imageBlob) => {
    setIsProcessing(true);
    setError('');

    try {
      // Enhanced emotion analysis with 7 basic emotions
      await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate processing time
      
      // 7 basic emotions for autism assessment
      const emotions = ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral'];
      
      // Generate realistic emotion distribution
      const emotionData = {};
      let remainingPercentage = 100;
      
      // Pick dominant emotion
      const dominantEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const dominantPercentage = Math.floor(Math.random() * 40) + 35; // 35-74%
      emotionData[dominantEmotion] = dominantPercentage;
      remainingPercentage -= dominantPercentage;
      
      // Distribute remaining percentage among other emotions
      const otherEmotions = emotions.filter(e => e !== dominantEmotion);
      otherEmotions.forEach((emotion, index) => {
        if (index === otherEmotions.length - 1) {
          // Last emotion gets remaining percentage
          emotionData[emotion] = Math.max(1, remainingPercentage);
        } else {
          const percentage = Math.floor(Math.random() * (remainingPercentage / 2)) + 1;
          emotionData[emotion] = percentage;
          remainingPercentage -= percentage;
        }
      });
      
      const mockResult = {
        dominant_emotion: dominantEmotion,
        confidence: dominantPercentage,
        all_emotions: emotionData,
        analysis_timestamp: new Date().toISOString(),
        total_emotions_detected: 7
      };

      console.log('🎭 Enhanced emotion analysis completed:', mockResult);
      onEmotionDetected(mockResult);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze emotions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setError('');
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageUpload) {
      onImageUpload(false); // Notify parent that image is removed
    }
    if (mode === 'camera') {
      startCamera();
    }
  };

  return (
    <div className="inline-face-scanner">
      <label className="form-label">
        <span className="form-icon">�</span> Child's Face Photo for Emotion Analysis (Optional)
      </label>
      <p className="face-requirement-note">
        💡 <strong>Face Required:</strong> Only photos with clear faces will be accepted for emotion analysis.
      </p>
      
      <div className="scanner-container">
        <div className="mode-tabs">
          <button 
            type="button"
            className={`mode-tab ${mode === 'camera' ? 'active' : ''}`}
            onClick={() => setMode('camera')}
          >
            📹 Live Camera
          </button>
          <button 
            type="button"
            className={`mode-tab ${mode === 'upload' ? 'active' : ''}`}
            onClick={() => setMode('upload')}
          >
            📁 Upload Photo
          </button>
        </div>

        {mode === 'camera' && (
          <div className="camera-section">
            {!capturedImage ? (
              <div className="camera-container">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="camera-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {cameraActive && (
                  <button 
                    type="button"
                    onClick={captureImage}
                    disabled={isProcessing}
                    className="capture-button"
                  >
                    {isProcessing ? '🔄 Analyzing...' : '📸 Capture Photo'}
                  </button>
                )}
              </div>
            ) : (
              <div className="captured-preview">
                <img src={capturedImage} alt="Captured Child's Photo" className="captured-image" />
                <button 
                  type="button"
                  onClick={resetScanner}
                  className="retake-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? '🔄 Analyzing...' : '🔄 Retake Photo'}
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="upload-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            
            {!capturedImage ? (
              <div 
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-content">
                  <span className="upload-icon">👶</span>
                  <p>Upload Clear Face Photo</p>
                  <small>JPG, PNG up to 5MB • Face must be clearly visible</small>
                </div>
              </div>
            ) : (
              <div className="uploaded-preview">
                <img src={capturedImage} alt="Child's Photo" className="uploaded-image" />
                <button 
                  type="button"
                  onClick={resetScanner}
                  className="change-image-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? '🔄 Analyzing...' : '🔄 Change Photo'}
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="scanner-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isProcessing && (
          <div className="processing-status">
            <span className="processing-icon">🔄</span>
            <span>Analyzing child's emotions...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InlineFaceScanner;