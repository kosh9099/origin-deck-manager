import { toBlob } from 'html-to-image';

/**
 * 특정 DOM 요소를 캡처하여 클립보드에 복사합니다.
 */
export const captureAndDownload = async (elementId: string, _filename?: string) => {
  const element = document.getElementById(elementId);

  if (!element) {
    alert('캡처 대상을 찾을 수 없습니다.');
    return;
  }

  try {
    // ClipboardItem에 Promise를 직접 전달하여
    // 비동기 처리 중에도 사용자 제스처 컨텍스트를 유지합니다.
    const blobPromise: Promise<Blob> = toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#0a0f16',
      cacheBust: true,
    }).then(b => { if (!b) throw new Error('blob 생성 실패'); return b; });

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blobPromise }),
    ]);

    alert('📋 클립보드에 복사됐습니다! (Ctrl+V로 붙여넣기)');

  } catch (error) {
    console.error('캡처 중 오류 발생:', error);
    alert('클립보드 복사 중 오류가 발생했습니다.\n브라우저가 클립보드 이미지 복사를 지원하지 않을 수 있습니다.');
  }
};
