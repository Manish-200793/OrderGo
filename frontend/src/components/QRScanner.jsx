import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';

export default function QRScanner({ onScanSuccess, onScanError }) {
  const scannerContainerRef = useRef(null);
  const callbacksRef = useRef({ onScanSuccess, onScanError });

  // Update callbacks without re-triggering effect
  useEffect(() => {
    callbacksRef.current = { onScanSuccess, onScanError };
  }, [onScanSuccess, onScanError]);

  useEffect(() => {
    // Only initialize if it hasn't been initialized
    if (scannerContainerRef.current) return;
    scannerContainerRef.current = true;

    const html5QrCode = new Html5Qrcode("qr-reader");

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText, decodedResult) => {
        if (callbacksRef.current.onScanSuccess) {
          callbacksRef.current.onScanSuccess(decodedText, decodedResult);
        }
      },
      (errorMessage) => {
        if (callbacksRef.current.onScanError) {
          callbacksRef.current.onScanError(errorMessage);
        }
      }
    ).catch(err => {
      console.error("Error starting camera:", err);
      scannerContainerRef.current = false;
      if (callbacksRef.current.onScanError) {
        callbacksRef.current.onScanError("Failed to start camera. Please ensure permissions are granted.");
      }
    });

    return () => {
      // Cleanup
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => console.error("Failed to stop scanner:", err));
      }
      scannerContainerRef.current = false;
    };
  }, []);

  return (
    <div className="qr-scanner-container">
      <div id="qr-reader" style={{ width: '100%' }}></div>
    </div>
  );
}
