"use client";

import { useEffect, useState } from 'react';
import { useScanProgress } from '../context/ScanProgressContext';
import './ScanProgressPill.css';

const ScanProgressPill = () => {
  const { status, found, processed, reset } = useScanProgress();
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [pillStatus, setPillStatus] = useState('');

  useEffect(() => {
    if (status === 'running') {
      setVisible(true);
      setFadingOut(false);
      setPillStatus('');
    } else if (status === 'success' || status === 'error') {
      setPillStatus(status);
      setTimeout(() => {
        setFadingOut(true);
        setTimeout(() => {
          setVisible(false);
          reset();
        }, 500); // Corresponds to the CSS transition duration
      }, 2000); // 2-second delay before fading out
    } else if (status === 'idle') {
      setVisible(false);
      setFadingOut(false);
      setPillStatus('');
    }
  }, [status, reset]);

  if (!visible) {
    return null;
  }

  const getPillText = () => {
    if (status === 'running') {
      return `Scanning... ${processed} / ${found} files`;
    }
    if (pillStatus === 'success') {
      return 'Scan complete!';
    }
    if (pillStatus === 'error') {
      return 'Scan failed!';
    }
    return '';
  };

  return (
    <div className={`scan-progress-pill ${pillStatus} ${fadingOut ? 'fade-out' : ''}`}>
      {getPillText()}
    </div>
  );
};

export default ScanProgressPill;
