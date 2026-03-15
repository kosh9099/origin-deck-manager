// lib/utils/capture.ts
// 설치 필요: npm install html-to-image

export async function captureAndDownload(
  elementId: string,
  filename?: string
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`캡처 대상 요소를 찾을 수 없습니다: #${elementId}`);
    return;
  }

  try {
    const { toPng } = await import('html-to-image');

    // 웹폰트 완전 로딩 대기 (한글 깨짐 방지)
    await document.fonts.ready;

    // 첫 번째 렌더링은 폰트 캐시를 위한 워밍업
    await toPng(element);

    // 두 번째 렌더링이 실제 결과 — 폰트가 캐시되어 정상 렌더링됨
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: window.devicePixelRatio || 2,
      backgroundColor: '#ffffff',
      // 폰트 임베딩 강제
      fontEmbedCSS: '',
      // 캡처 전 스타일 고정
      style: {
        overflow: 'visible',
      },
    });

    // 클립보드 복사 시도
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return;
    } catch {
      // 클립보드 실패 시 다운로드로 fallback
    }

    // 파일 다운로드
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `capture-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (error) {
    console.error('캡처 오류:', error);
    alert('캡처 중 오류가 발생했습니다.');
  }
}