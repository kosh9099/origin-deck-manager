import { NextRequest, NextResponse } from 'next/server';

// API 키는 서버 환경변수에서만 읽음 — 브라우저에 절대 노출 안 됨
// .env.local에 ANTHROPIC_API_KEY=sk-ant-... 설정 필요
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    try {
        const { base64, mediaType } = await request.json();

        if (!base64 || !mediaType) {
            return NextResponse.json({ error: '이미지 데이터가 없습니다.' }, { status: 400 });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                messages: [{
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: { type: 'base64', media_type: mediaType, data: base64 },
                        },
                        {
                            type: 'text',
                            text: `이 스크린샷은 게임의 부양/급매 스케줄 목록입니다.
표에서 각 행의 정보를 추출해주세요.

반드시 아래 형식으로만 응답하세요 (다른 설명 없이):
행사타입\t교역품\t날짜시간\t도시명

규칙:
- 행사타입: "부양" 또는 "급매"
- 날짜시간: YYYY/MM/DD HH:MM 형식 (예: 2026/03/15 14:09)
- 도시명: 관세% 등 부가 정보 제거하고 도시명만
- 각 행은 줄바꿈으로 구분
- 헤더 행 제외
- 예시: 부양\t식료품\t2026/03/15 14:09\t나사우`,
                        },
                    ],
                }],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('Anthropic API error:', err);
            return NextResponse.json({ error: 'AI 분석에 실패했습니다.' }, { status: response.status });
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || '';

        return NextResponse.json({ text });
    } catch (e) {
        console.error('Analyze route error:', e);
        return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
    }
}