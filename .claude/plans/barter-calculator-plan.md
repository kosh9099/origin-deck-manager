# 물교 계산기 (Barter Calculator) + 장바구니 시스템

## Context
교역 매니저에 새 탭 "물교 계산기"를 추가한다. 물물교환 품목을 장바구니에 담고, 1회분 수량과 교환 횟수를 입력하면 최하위 재료 총 필요량을 자동 계산해준다. 기존 `/api/barter` 엔드포인트와 `barter_materials.csv` 데이터를 재활용한다.

## 핵심 흐름
1. 물교 계산기 탭 진입 → 품목 검색/선택 → 장바구니 추가
2. 각 품목의 재료 트리 표시 + 1회분 수량 입력 + 교환 횟수 입력
3. 품목별 최하위 재료 수량 계산 + 장바구니 전체 합계 표시
4. 장바구니는 localStorage에 저장 (새로고침 유지)

## 수정/생성 파일

### 수정 (2개)
- `app/trade/page.tsx` — 탭에 `'calculator'` 추가, BarterCalculator 렌더
- `app/api/barter/route.ts` — `GET` 핸들러 추가 (물교품 이름 목록 반환)

### 생성 (5개)
- `lib/trade/barterCalc.ts` — 순수 계산 함수 (수량 전파, 리프 추출, 합계 집계)
- `components/trade/BarterCalculator.tsx` — 메인 탭 컴포넌트 (검색 + 장바구니 + 합계)
- `components/trade/BarterCartItem.tsx` — 개별 장바구니 아이템 카드
- `components/trade/BarterQuantityNode.tsx` — 재귀 트리 노드 (수량 입력 포함)
- `components/trade/BarterGrandTotal.tsx` — 전체 장바구니 합계 패널

## 데이터 구조

### 장바구니 아이템 (localStorage 저장)
```ts
interface BarterCartItem {
  id: string;                          // crypto.randomUUID()
  itemName: string;                    // "파이프"
  exchanges: number;                   // 교환 횟수 (기본 1)
  quantities: Record<string, number>;  // 경로 키 → 1회분 수량
}
// localStorage key: 'barter_cart_v1'
// 트리 데이터는 저장하지 않음 (매번 API에서 fetch — 시즌 데이터 반영)
```

### 경로 키 (path key)
동일 재료명이 트리의 다른 위치에 나타날 수 있으므로 경로로 구분:
- `"파이프>흑단"` vs `"파이프>네눈사슴>흑단"` (만약 있다면)

## 계산 알고리즘 (`lib/trade/barterCalc.ts`)

```ts
// 재귀적으로 리프 노드까지 수량 전파
function computeLeafTotals(
  node: BarterNode,
  quantities: Record<string, number>,
  parentMultiplier: number,
  path: string
): Record<string, number> {
  const nodeQty = quantities[path] ?? 1;
  const effective = parentMultiplier * nodeQty;

  if (!node.children?.length) {
    return { [node.name]: effective };  // 리프 = 구매 재료
  }

  const totals: Record<string, number> = {};
  for (const child of node.children) {
    const childPath = `${path}>${child.name}`;
    const childTotals = computeLeafTotals(child, quantities, effective, childPath);
    for (const [mat, qty] of Object.entries(childTotals)) {
      totals[mat] = (totals[mat] ?? 0) + qty;
    }
  }
  return totals;
}

// 교환 횟수 곱하기
function getCartItemLeafTotals(tree, cartItem): Record<string, number>

// 장바구니 전체 합계
function getGrandTotal(trees, items): Record<string, number>
```

### 예시: 파이프 (교환 2회, 모든 1회분=1)
```
파이프 ×2
├── 흑단 (리프) → 2개
├── 네눈사슴 (물교)
│   ├── 돼지 → 2개
│   ├── 거위 → 2개
│   └── 닭 → 2개
└── 기니피그 (물교)
    ├── 단호박 → 2개
    ├── 염소 → 2개
    └── 마떼 → 2개
```

## UI 구성

### BarterCalculator (메인)
1. **품목 검색바** — 자동완성 드롭다운 (GET /api/barter로 100개 품목명 fetch)
2. **장바구니 카드 목록** — 세로 스택, 접기/펼치기 가능
3. **전체 합계 패널** — 하단 고정, 모든 리프 재료 합산

### BarterCartItem (개별 카드)
- 헤더: 품목명 + 교환 횟수 NumberInput + 삭제 버튼
- 바디: BarterQuantityNode 재귀 트리
- 푸터: 해당 품목의 리프 재료 합계

### BarterQuantityNode (재귀 노드)
- 기존 BarterDetailModal의 RenderNode 패턴 재활용
- barter/hybrid 노드: 1회분 수량 NumberInput + 계산된 필요 수량 배지
- trade 리프 노드: 재료명 + 시즌 배지 + 필요 수량

## API 변경

`app/api/barter/route.ts`에 GET 핸들러 추가:
```ts
export async function GET() {
  const { recipes } = getAllData();
  return NextResponse.json({ items: Object.keys(recipes) });
}
```

## 구현 순서
1. `GET /api/barter` 핸들러 추가
2. `lib/trade/barterCalc.ts` 계산 로직
3. `BarterQuantityNode.tsx` 재귀 노드
4. `BarterCartItem.tsx` 카드 컴포넌트
5. `BarterGrandTotal.tsx` 합계 패널
6. `BarterCalculator.tsx` 메인 (검색 + 장바구니 + localStorage)
7. `app/trade/page.tsx` 탭 추가

## 검증 방법
1. 물교 계산기 탭 진입 → 품목 검색 → 장바구니 추가 확인
2. 1회분 수량 변경 → 하위 재료 수량 자동 재계산 확인
3. 교환 횟수 변경 → 전체 수량 비례 증가 확인
4. 여러 품목 추가 → 전체 합계에 리프 재료 합산 확인
5. F5 새로고침 → 장바구니 유지 확인
6. 브라우저 Preview로 UI 직접 확인
