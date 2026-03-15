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

    // 웹폰트 완전 로딩 대기
    await document.fonts.ready;

    // ── 캡처 전: 요소와 내부 스크롤 컨테이너의 높이 제한 제거 ──
    // 스크롤되어 잘리는 현상 방지
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

    // 캡처 루트 요소
    expandForCapture(element);

    // 내부 스크롤 가능한 자식 요소들도 모두 확장
    const scrollables = element.querySelectorAll<HTMLElement>('*');
    scrollables.forEach(child => {
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

    // 렌더링 반영 대기
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => requestAnimationFrame(resolve));

    // 워밍업 (폰트 캐시)
    await toPng(element);

    // 실제 캡처
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: window.devicePixelRatio || 2,
      backgroundColor: '#ffffff',
    });

    // ── 캡처 후: 원래 스타일 복원 ──
    originalStyles.forEach((styles, el) => {
      el.style.overflow = styles.overflow;
      el.style.height = styles.height;
      el.style.maxHeight = styles.maxHeight;
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
      // 클립보드 실패 시 다운로드 fallback
    }

    // 파일 다운로드
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `capture-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (error) {
    // 오류 발생 시에도 스타일 복원 보장
    console.error('캡처 오류:', error);
    alert('캡처 중 오류가 발생했습니다.');
  }
}