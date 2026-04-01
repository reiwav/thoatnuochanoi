/**
 * Process and watermark an image file with timestamp and address.
 * 
 * @param {File} file - The original image file
 * @param {string} address - The address string to watermark
 * @returns {Promise<File>} - A Promise that resolves to the processed File object
 */
export const processAndWatermark = async (file, address) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1280; // Slightly higher resolution for better quality
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Styling tokens
        const baseFontSize = Math.max(width * 0.02, 16);
        const padding = baseFontSize * 1.5;
        const timeFontSize = baseFontSize * 3;
        const dateFontSize = baseFontSize * 0.9;
        const addressFontSize = baseFontSize * 1.1;
        
        // Prepare Data
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = `${now.getDate()} Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
        const weekdayStr = now.toLocaleDateString('vi-VN', { weekday: 'long' });
        const displayAddress = address || 'Không xác định tọa độ';

        // MEASUREMENTS
        ctx.font = `bold ${timeFontSize}px Arial, sans-serif`;
        const timeWidth = ctx.measureText(timeStr).width;
        
        // Calculate dynamic height for background
        const margin = baseFontSize * 0.5;
        const addressLines = wrapText(ctx, displayAddress, width - (padding * 2), `bold ${addressFontSize}px Arial`);
        const rectHeight = timeFontSize + (addressLines.length * addressFontSize * 1.4) + (padding * 2);

        // DRAW BACKGROUND (Gradient for premium look)
        const gradient = ctx.createLinearGradient(0, height - rectHeight, 0, height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.3, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, height - rectHeight, width, rectHeight);

        // COMMON TEXT STYLE
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = 'white';
        ctx.textBaseline = 'top';

        // 1. DRAW TIME
        ctx.font = `bold ${timeFontSize}px Arial, sans-serif`;
        const timeY = height - rectHeight + padding;
        ctx.fillText(timeStr, padding, timeY);

        // 2. DRAW VERTICAL SEPARATOR (Orange/Yellow)
        const sepX = padding + timeWidth + (baseFontSize * 0.8);
        const sepHeight = timeFontSize * 0.8;
        const sepY = timeY + (timeFontSize * 0.1);
        ctx.shadowBlur = 0; // Disable shadow for separator
        ctx.fillStyle = '#FFB300'; // Amber/Orange
        ctx.fillRect(sepX, sepY, 3, sepHeight);

        // 3. DRAW DATE & WEEKDAY
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `bold ${dateFontSize}px Arial, sans-serif`;
        ctx.fillText(dateStr, sepX + 10, sepY);
        ctx.fillText(weekdayStr, sepX + 10, sepY + (dateFontSize * 1.5));

        // 4. DRAW ADDRESS
        ctx.fillStyle = 'white';
        const addressY = timeY + timeFontSize + (baseFontSize * 0.5);
        addressLines.forEach((line, index) => {
          ctx.font = `bold ${addressFontSize}px Arial, sans-serif`;
          ctx.fillText(line, padding, addressY + (index * addressFontSize * 1.3));
        });

        // Convert back to File
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob conversion failed'));
            return;
          }
          const processedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(processedFile);
        }, 'image/jpeg', 0.9);
      };

      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};

// Helper to wrap text
function wrapText(ctx, text, maxWidth, font) {
  ctx.font = font;
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}
