import pandas as pd

# 1. 원본 파일 로드
try:
    df = pd.read_csv('db.csv')
except Exception as e:
    print(f"파일 로딩 오류: {e}")
    exit()

# 2. 분석할 스킬 목록
target_skills = [
    "투쟁적인 탐험가", "호전적인 탐험가", "꼼꼼한 탐험가", "주의깊은 탐험가", "성실한 탐험가", "부지런한 탐험가",
    "험지 평정", "전투적인 채집", "전투적인 관찰", "해적 척결", "맹수 척결", "해적 사냥", "맹수 사냥",
    "관찰 공부", "관측 후 채집", "관측 후 전투", "생물 관찰", "관찰 채집", "험지 관찰", "관찰 심화",
    "생물 채집", "채집 우선 전투", "채집 우선 관찰", "험지 채집", "채집 심화", "채집 공부", "탐사의 기본"
]

# 스킬이 적힌 원본 컬럼들
skill_cols = [
    'Lv 10 직업 효과', 'Lv 10 직업 효과.1', 'Lv 30 인물 효과', 'Lv 30 인물 효과.1',
    'LV 50 직업 효과', 'LV 50 직업 효과.1', 'LV 70 인물 효과', 'LV 70 인물 효과.1',
    '잠재 효과 1', '잠재 효과 2', '인연 연대기 추가 효과 1', '인연 연대기 추가 효과 2'
]

def get_lv(val, skill_name):
    if pd.isna(val): return 0
    val = str(val).strip()
    if skill_name in val:
        if "LV2" in val or "LV 2" in val: return 2
        return 1
    return 0

result_rows = []
for _, row in df.iterrows():
    # 모든 헤더를 사용자님의 db.csv와 동일한 한글로 유지
    item = {
        "이름": str(row['이름']).strip() if not pd.isna(row['이름']) else "Unknown",
        "등급": str(row['등급']).strip() if not pd.isna(row['등급']) else "C",
        "타입": str(row['타입']).strip() if not pd.isna(row['타입']) else "모험",
        "직업": str(row['직업']).strip() if not pd.isna(row['직업']) else "",
        "제독여부": True if str(row['등급']).strip() == 'S+' else False,
        "백병": int(row['백병']) if not pd.isna(row['백병']) else 0,
        "박물": int(row['박물']) if not pd.isna(row['박물']) else 0,
        "보급": int(row['보급']) if not pd.isna(row['보급']) else 0,
        "심미": int(row['심미']) if not pd.isna(row['심미']) else 0,
        "척후": int(row['척후']) if not pd.isna(row['척후']) else 0,
    }
    
    for skill in target_skills:
        lv = 0
        for col in skill_cols:
            if col in row:
                lv = max(lv, get_lv(row[col], skill))
        item[skill] = lv
    
    result_rows.append(item)

# 3. 결과 저장 (한글 깨짐 방지를 위해 utf-8-sig 사용)
final_df = pd.DataFrame(result_rows)
final_df.to_csv('sailors_final.csv', index=False, encoding='utf-8-sig')
print("성공! 이제 sailors_final.csv는 모두 한글 헤더로 되어 있습니다.")