// lib/utils/capture.ts
// 설치 필요: npm install html-to-image

export type CaptureResult = 'clipboard' | 'download' | 'error';

export async function captureAndDownload(
  elementId: string,
  filename?: string
): Promise<CaptureResult> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`캡처 대상 요소를 찾을 수 없습니다: #${elementId}`);
    return 'error';
  }

  // 캡처 전: 스크롤 확장 (잘림 방지)
  const originalStyles = new Map<HTMLElement, { overflow: string; height: string; maxHeight: string }>();
  const expandForCapture = (el: HTMLElement) => {
    originalStyles.set(el, {
      overflow: el.style.overflow,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
    });
    el.style.overflow = 'visible';
    el.style.height = 'auto';
    el.style.maxHeight = 'none';
  };
  const restoreStyles = () => {
    originalStyles.forEach((styles, el) => {
      el.style.overflow = styles.overflow;
      el.style.height = styles.height;
      el.style.maxHeight = styles.maxHeight;
    });
  };

  try {
    const { toPng, toBlob } = await import('html-to-image');
    await document.fonts.ready;

    expandForCapture(element);
    element.querySelectorAll<HTMLElement>('*').forEach(child => {
      const computed = window.getComputedStyle(child);
      if (
        computed.overflow === 'auto' ||
        computed.overflow === 'scroll' ||
        computed.overflowY === 'auto' ||
        computed.overflowY === 'scroll' ||
        computed.overflow === 'hidden'
      ) {
        expandForCapture(child);
      }
    });

    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 워밍업 (폰트 캐시)
    await toPng(element);

    // 클립보드 복사 시도: ClipboardItem에 Promise를 넘기면 user activation이 유지됨
    const supportsClipboard =
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function' &&
      typeof window.ClipboardItem !== 'undefined';

    if (supportsClipboard) {
      try {
        // document focus 회복 시도 (자동화/탭 전환 후 호출되는 경우 대비)
        if (!document.hasFocus()) {
          window.focus();
        }

        const blobPromise = toBlob(element, {
          quality: 1,
          pixelRatio: window.devicePixelRatio || 2,
          backgroundColor: '#ffffff',
        }).then(b => {
          if (!b) throw new Error('Blob 생성 실패');
          return b;
        });

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blobPromise }),
        ]);

        restoreStyles();
        return 'clipboard';
      } catch (clipErr) {
        const errMsg = clipErr instanceof Error ? clipErr.message : String(clipErr);
        if (errMsg.includes('not focused')) {
          console.warn('[capture] 페이지 focus 잃음 — 다운로드로 fallback. (실제 사용자 클릭 시에는 발생하지 않음)');
        } else {
          console.warn('[capture] clipboard.write 실패, 다운로드로 fallback:', clipErr);
        }
      }
    } else {
      console.warn('[capture] 브라우저가 ClipboardItem을 지원하지 않음, 다운로드로 fallback');
    }

    // Fallback: 파일 다운로드
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: window.devicePixelRatio || 2,
      backgroundColor: '#ffffff',
    });
    restoreStyles();

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `capture-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return 'download';

  } catch (error) {
    restoreStyles();
    console.error('[capture] 오류:', error);
    return 'error';
  }
}
