// BoostForm 의 부양/급매 등록 + 삭제와 TradeDashboard 의 자동 새로고침을 잇는 이벤트 버스.
// 컴포넌트 트리가 분리되어 있어 prop drilling 대신 window CustomEvent 사용.

const BOOST_CHANGED_EVENT = 'trade:boost-changed';

export function emitBoostChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BOOST_CHANGED_EVENT));
}

export function onBoostChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(BOOST_CHANGED_EVENT, handler);
  return () => window.removeEventListener(BOOST_CHANGED_EVENT, handler);
}
